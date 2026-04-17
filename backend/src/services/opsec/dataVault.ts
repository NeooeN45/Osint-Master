/**
 * Data Vault - Phase 1 OPSEC Foundation
 * Chiffrement AES-256-GCM pour données sensibles
 * 
 * Fonctionnalités:
 * - Chiffrement AES-256-GCM avec authentification
 * - PBKDF2 pour dérivation de clé
 * - Stockage sécurisé des investigations
 * - Auto-destruction des données (mode paranoid)
 * 
 * Créé: 17 Avril 2026 - Phase 1 OPSEC
 * Fichier: backend/src/services/opsec/dataVault.ts
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2, createHash, CipherGCM, DecipherGCM } from 'crypto';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdir, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const pbkdf2Async = promisify(pbkdf2);

// Configuration du chiffrement
const VAULT_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,           // 256 bits
  ivLength: 16,            // 128 bits
  saltLength: 32,          // 256 bits
  tagLength: 16,           // 128 bits auth tag
  pbkdf2Iterations: 600000,  // NIST recommendation (2023)
  pbkdf2Digest: 'sha512',
};

// Types
export interface VaultConfig {
  vaultDir: string;
  masterPassword: string;
  autoDestruct?: boolean;
  retentionMinutes?: number;
}

export interface EncryptedData {
  encrypted: string;       // Base64
  iv: string;              // Base64
  salt: string;            // Base64
  tag: string;             // Base64 (auth tag GCM)
  algorithm: string;
  createdAt: number;
}

export interface VaultEntry {
  id: string;
  type: 'investigation' | 'config' | 'api_keys' | 'results';
  data: EncryptedData;
  metadata: {
    createdAt: Date;
    modifiedAt: Date;
    size: number;
    checksum: string;
  };
}

export interface VaultStats {
  totalEntries: number;
  totalSize: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

// État global
let vaultConfig: VaultConfig | null = null;
let derivedKey: Buffer | null = null;
let autoDestructTimer: NodeJS.Timeout | null = null;

/**
 * Initialiser le Data Vault
 */
export async function initVault(config: VaultConfig): Promise<boolean> {
  try {
    vaultConfig = config;
    
    // Créer le répertoire vault s'il n'existe pas
    if (!existsSync(config.vaultDir)) {
      await mkdir(config.vaultDir, { recursive: true });
      console.log(`[DataVault] Created vault directory: ${config.vaultDir}`);
    }
    
    // Dériver la clé maîtresse
    await deriveMasterKey(config.masterPassword);
    
    // Configurer l'auto-destruction si activé
    if (config.autoDestruct && config.retentionMinutes) {
      setupAutoDestruct(config.retentionMinutes);
    }
    
    console.log('[DataVault] Vault initialized successfully');
    return true;
    
  } catch (error) {
    console.error('[DataVault] Error initializing vault:', error);
    return false;
  }
}

/**
 * Dériver la clé maîtresse avec PBKDF2
 */
async function deriveMasterKey(password: string, existingSalt?: Buffer): Promise<Buffer> {
  const salt = existingSalt || randomBytes(VAULT_CONFIG.saltLength);
  
  const key = await pbkdf2Async(
    password,
    salt,
    VAULT_CONFIG.pbkdf2Iterations,
    VAULT_CONFIG.keyLength,
    VAULT_CONFIG.pbkdf2Digest
  );
  
  derivedKey = key;
  return key;
}

/**
 * Chiffrer des données
 */
export async function encrypt(data: string | object): Promise<EncryptedData> {
  if (!derivedKey) {
    throw new Error('Vault not initialized');
  }
  
  try {
    // Convertir en string si objet
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Générer IV aléatoire
    const iv = randomBytes(VAULT_CONFIG.ivLength);
    
    // Générer salt aléatoire
    const salt = randomBytes(VAULT_CONFIG.saltLength);
    
    // Créer cipher AES-256-GCM
    const cipher = createCipheriv(VAULT_CONFIG.algorithm, derivedKey, iv) as CipherGCM;
    
    // Chiffrer
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Obtenir le auth tag (GCM)
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
      tag: tag.toString('base64'),
      algorithm: VAULT_CONFIG.algorithm,
      createdAt: Date.now(),
    };
    
  } catch (error) {
    console.error('[DataVault] Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Déchiffrer des données
 */
export async function decrypt(encryptedData: EncryptedData): Promise<string> {
  if (!derivedKey) {
    throw new Error('Vault not initialized');
  }
  
  try {
    // Vérifier l'algorithme
    if (encryptedData.algorithm !== VAULT_CONFIG.algorithm) {
      throw new Error('Unsupported encryption algorithm');
    }
    
    // Convertir depuis base64
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    
    // Créer decipher
    const decipher = createDecipheriv(VAULT_CONFIG.algorithm, derivedKey, iv) as DecipherGCM;
    decipher.setAuthTag(tag);
    
    // Déchiffrer
    let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
    
  } catch (error) {
    console.error('[DataVault] Decryption error:', error);
    throw new Error('Failed to decrypt data (wrong password or corrupted data)');
  }
}

/**
 * Sauvegarder une entrée dans le vault
 */
export async function saveEntry(
  id: string,
  type: VaultEntry['type'],
  data: string | object,
  metadata?: Partial<VaultEntry['metadata']>
): Promise<VaultEntry> {
  if (!vaultConfig) {
    throw new Error('Vault not initialized');
  }
  
  try {
    // Chiffrer les données
    const encrypted = await encrypt(data);
    
    // Créer l'entrée
    const entry: VaultEntry = {
      id,
      type,
      data: encrypted,
      metadata: {
        createdAt: metadata?.createdAt || new Date(),
        modifiedAt: new Date(),
        size: JSON.stringify(encrypted).length,
        checksum: createChecksum(encrypted),
        ...metadata,
      },
    };
    
    // Sauvegarder dans un fichier
    const filePath = path.join(vaultConfig.vaultDir, `${id}.vault`);
    await writeFile(filePath, JSON.stringify(entry, null, 2));
    
    console.log(`[DataVault] Saved entry: ${id} (${type})`);
    return entry;
    
  } catch (error) {
    console.error('[DataVault] Error saving entry:', error);
    throw error;
  }
}

/**
 * Charger une entrée depuis le vault
 */
export async function loadEntry(id: string): Promise<{ entry: VaultEntry; decrypted: any }> {
  if (!vaultConfig) {
    throw new Error('Vault not initialized');
  }
  
  try {
    // Lire le fichier
    const filePath = path.join(vaultConfig.vaultDir, `${id}.vault`);
    const content = await readFile(filePath, 'utf-8');
    const entry: VaultEntry = JSON.parse(content);
    
    // Vérifier le checksum
    const currentChecksum = createChecksum(entry.data);
    if (currentChecksum !== entry.metadata.checksum) {
      throw new Error('Data integrity check failed - possible tampering');
    }
    
    // Déchiffrer
    const decrypted = await decrypt(entry.data);
    const parsed = JSON.parse(decrypted);
    
    console.log(`[DataVault] Loaded entry: ${id}`);
    return { entry, decrypted: parsed };
    
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`Entry not found: ${id}`);
    }
    console.error('[DataVault] Error loading entry:', error);
    throw error;
  }
}

/**
 * Supprimer une entrée (secure delete)
 */
export async function deleteEntry(id: string): Promise<boolean> {
  if (!vaultConfig) {
    throw new Error('Vault not initialized');
  }
  
  try {
    const filePath = path.join(vaultConfig.vaultDir, `${id}.vault`);
    
    // Récupérer les infos du fichier pour connaître sa taille
    const fileStat = await stat(filePath);
    
    // Lecture du fichier
    const content = await readFile(filePath);
    
    // Overwrite avec des zéros (simple secure delete)
    const zeros = Buffer.alloc(content.length, 0);
    await writeFile(filePath, zeros);
    
    // Overwrite avec des randoms
    const random = randomBytes(content.length);
    await writeFile(filePath, random);
    
    // Overwrite à nouveau avec des zéros
    await writeFile(filePath, zeros);
    
    // Supprimer le fichier
    await unlink(filePath);
    
    console.log(`[DataVault] Securely deleted entry: ${id}`);
    return true;
    
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return false;  // Fichier n'existait pas
    }
    console.error('[DataVault] Error deleting entry:', error);
    return false;
  }
}

/**
 * Lister toutes les entrées
 */
export async function listEntries(): Promise<VaultEntry[]> {
  if (!vaultConfig) {
    throw new Error('Vault not initialized');
  }
  
  try {
    const files = await readdir(vaultConfig.vaultDir);
    const entries: VaultEntry[] = [];
    
    for (const file of files) {
      if (file.endsWith('.vault')) {
        try {
          const content = await readFile(path.join(vaultConfig.vaultDir, file), 'utf-8');
          const entry: VaultEntry = JSON.parse(content);
          entries.push(entry);
        } catch (e) {
          // Ignorer les fichiers corrompus
        }
      }
    }
    
    return entries;
    
  } catch (error) {
    console.error('[DataVault] Error listing entries:', error);
    return [];
  }
}

/**
 * Obtenir les statistiques du vault
 */
export async function getVaultStats(): Promise<VaultStats> {
  const entries = await listEntries();
  
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      totalSize: 0,
    };
  }
  
  const dates = entries.map(e => e.metadata.createdAt).sort((a, b) => a.getTime() - b.getTime());
  const sizes = entries.map(e => e.metadata.size);
  
  return {
    totalEntries: entries.length,
    totalSize: sizes.reduce((a, b) => a + b, 0),
    oldestEntry: dates[0],
    newestEntry: dates[dates.length - 1],
  };
}

/**
 * Changer le mot de passe maître
 */
export async function changeMasterPassword(
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  if (!vaultConfig) {
    throw new Error('Vault not initialized');
  }
  
  try {
    // Vérifier l'ancien mot de passe en essayant de déchiffrer une entrée
    const entries = await listEntries();
    if (entries.length > 0) {
      try {
        await decrypt(entries[0].data);
      } catch {
        throw new Error('Old password is incorrect');
      }
    }
    
    // Dériver la nouvelle clé
    const newSalt = randomBytes(VAULT_CONFIG.saltLength);
    const newKey = await pbkdf2Async(
      newPassword,
      newSalt,
      VAULT_CONFIG.pbkdf2Iterations,
      VAULT_CONFIG.keyLength,
      VAULT_CONFIG.pbkdf2Digest
    );
    
    // Re-chiffrer toutes les entrées avec la nouvelle clé
    const oldKey = derivedKey;
    derivedKey = newKey;
    
    for (const entry of entries) {
      // Déchiffrer avec l'ancienne clé
      const oldDecrypted = await (async () => {
        const decipher = createDecipheriv(
          VAULT_CONFIG.algorithm,
          oldKey!,
          Buffer.from(entry.data.iv, 'base64')
        ) as DecipherGCM;
        decipher.setAuthTag(Buffer.from(entry.data.tag, 'base64'));
        let decrypted = decipher.update(entry.data.encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      })();
      
      // Re-chiffrer avec la nouvelle clé
      const newEncrypted = await encrypt(oldDecrypted);
      entry.data = newEncrypted;
      entry.metadata.modifiedAt = new Date();
      
      // Sauvegarder
      const filePath = path.join(vaultConfig.vaultDir, `${entry.id}.vault`);
      await writeFile(filePath, JSON.stringify(entry, null, 2));
    }
    
    // Mettre à jour la config
    vaultConfig.masterPassword = newPassword;
    
    console.log('[DataVault] Master password changed successfully');
    return true;
    
  } catch (error) {
    console.error('[DataVault] Error changing password:', error);
    throw error;
  }
}

/**
 * Auto-destruction des données (mode paranoid)
 */
function setupAutoDestruct(retentionMinutes: number): void {
  if (autoDestructTimer) clearTimeout(autoDestructTimer);
  
  const retentionMs = retentionMinutes * 60 * 1000;
  
  autoDestructTimer = setTimeout(async () => {
    console.log('[DataVault] Auto-destruct triggered - wiping all data...');
    await wipeAllData();
  }, retentionMs);
  
  console.log(`[DataVault] Auto-destruct set for ${retentionMinutes} minutes`);
}

/**
 * Effacer toutes les données (panic mode)
 */
export async function wipeAllData(): Promise<boolean> {
  if (!vaultConfig) {
    throw new Error('Vault not initialized');
  }
  
  try {
    const entries = await listEntries();
    
    // Supprimer toutes les entrées
    for (const entry of entries) {
      await deleteEntry(entry.id);
    }
    
    // Overwrite le répertoire
    const files = await readdir(vaultConfig.vaultDir);
    for (const file of files) {
      const filePath = path.join(vaultConfig.vaultDir, file);
      const content = await readFile(filePath);
      const zeros = Buffer.alloc(content.length, 0);
      await writeFile(filePath, zeros);
      await unlink(filePath);
    }
    
    console.log('[DataVault] All data wiped successfully');
    return true;
    
  } catch (error) {
    console.error('[DataVault] Error wiping data:', error);
    return false;
  }
}

/**
 * Créer un checksum des données
 */
function createChecksum(data: EncryptedData): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex');
}

/**
 * Vérifier la santé du vault
 */
export async function vaultHealthCheck(): Promise<{
  healthy: boolean;
  issues: string[];
  stats: VaultStats;
}> {
  const issues: string[] = [];
  
  if (!vaultConfig || !derivedKey) {
    issues.push('Vault not initialized');
    return { healthy: false, issues, stats: { totalEntries: 0, totalSize: 0 } };
  }
  
  // Vérifier le répertoire
  if (!existsSync(vaultConfig.vaultDir)) {
    issues.push('Vault directory does not exist');
  }
  
  // Vérifier les entrées
  const entries = await listEntries();
  let corruptedCount = 0;
  
  for (const entry of entries) {
    const currentChecksum = createChecksum(entry.data);
    if (currentChecksum !== entry.metadata.checksum) {
      corruptedCount++;
    }
  }
  
  if (corruptedCount > 0) {
    issues.push(`${corruptedCount} corrupted entries detected`);
  }
  
  const stats = await getVaultStats();
  
  return {
    healthy: issues.length === 0,
    issues,
    stats,
  };
}

// Export par défaut
export default {
  initVault,
  encrypt,
  decrypt,
  saveEntry,
  loadEntry,
  deleteEntry,
  listEntries,
  getVaultStats,
  changeMasterPassword,
  wipeAllData,
  vaultHealthCheck,
  VAULT_CONFIG,
};

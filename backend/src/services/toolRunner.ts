/**
 * Tool Runner Core - Phase 1 OPSEC Foundation
 * Exécution automatisée des outils CLI OSINT
 * 
 * Fonctionnalités:
 * - Auto-installation des outils (pip, npm, go, docker)
 * - Exécution parallèle avec gestion des ressources
 * - Parsing des résultats (JSON, XML, texte)
 * - Intégration OPSEC (Tor, Proxy, Fingerprint)
 * - Gestion des timeouts et retries
 * 
 * Créé: 17 Avril 2026 - Phase 1 OPSEC Foundation
 * Fichier: backend/src/services/toolRunner.ts
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { logger } from '../utils/logger';
import { opsecManager } from './opsecManager';

const execAsync = promisify(exec);

// Types
export interface ToolManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  source: {
    type: 'pip' | 'npm' | 'go' | 'docker' | 'git' | 'binary';
    package?: string;
    repository?: string;
    binary?: string;
  };
  install: {
    command: string;
    checkCommand?: string;
    dependencies?: string[];
  };
  execution: {
    command: string;
    args: string[];
    timeout: number;  // ms
    env?: Record<string, string>;
    workingDir?: string;
    opsec: 'standard' | 'cautious' | 'paranoid';
  };
  parser: {
    type: 'json' | 'xml' | 'regex' | 'line' | 'custom';
    pattern?: string;
    customParser?: string;  // Function name for custom parsers
  };
  targetTypes: string[];  // ['username', 'email', 'domain', 'ip', 'phone']
  categories: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  isAvailable: boolean;
  installedPath?: string;
}

export interface ToolExecution {
  id: string;
  toolId: string;
  target: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  startTime?: Date;
  endTime?: Date;
  output?: string;
  error?: string;
  result?: any;
  exitCode?: number;
  duration?: number;  // ms
}

export interface ToolRunnerConfig {
  maxParallel: number;
  defaultTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  workingDir: string;
  toolsDir: string;
  useOPSEC: boolean;
}

// Configuration par défaut
const DEFAULT_CONFIG: ToolRunnerConfig = {
  maxParallel: 5,
  defaultTimeout: 300000,  // 5 minutes
  retryAttempts: 2,
  retryDelay: 5000,
  workingDir: './data/investigations',
  toolsDir: './tools',
  useOPSEC: true,
};

// Registry des tools
let toolRegistry: Map<string, ToolManifest> = new Map();
let config: ToolRunnerConfig = { ...DEFAULT_CONFIG };

/**
 * Initialiser le Tool Runner
 */
export async function initToolRunner(userConfig?: Partial<ToolRunnerConfig>): Promise<boolean> {
  config = { ...DEFAULT_CONFIG, ...userConfig };
  
  try {
    // Créer les répertoires nécessaires
    if (!existsSync(config.workingDir)) {
      await fs.mkdir(config.workingDir, { recursive: true });
    }
    if (!existsSync(config.toolsDir)) {
      await fs.mkdir(config.toolsDir, { recursive: true });
    }
    
    logger.info(`[ToolRunner] Initialized with config:`, config);
    return true;
  } catch (error) {
    logger.error('[ToolRunner] Initialization error:', error);
    return false;
  }
}

/**
 * Charger les manifests d'outils
 */
export async function loadToolManifests(manifests: ToolManifest[]): Promise<void> {
  for (const manifest of manifests) {
    toolRegistry.set(manifest.id, manifest);
  }
  logger.info(`[ToolRunner] Loaded ${manifests.length} tool manifests`);
}

/**
 * Charger les manifests depuis un fichier JSON
 */
export async function loadManifestsFromFile(filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const manifests: ToolManifest[] = JSON.parse(content);
    await loadToolManifests(manifests);
  } catch (error) {
    logger.error(`[ToolRunner] Error loading manifests from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Vérifier si un outil est installé
 */
export async function isToolInstalled(toolId: string): Promise<boolean> {
  const tool = toolRegistry.get(toolId);
  if (!tool) {
    logger.warn(`[ToolRunner] Tool ${toolId} not found in registry`);
    return false;
  }
  
  // Si une commande de check est définie, l'utiliser
  if (tool.install.checkCommand) {
    try {
      await execAsync(tool.install.checkCommand);
      return true;
    } catch {
      return false;
    }
  }
  
  // Sinon, vérifier si le binaire existe
  if (tool.source.binary) {
    try {
      await execAsync(`which ${tool.source.binary}`);
      return true;
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Installer un outil
 */
export async function installTool(toolId: string): Promise<boolean> {
  const tool = toolRegistry.get(toolId);
  if (!tool) {
    logger.error(`[ToolRunner] Cannot install: tool ${toolId} not found`);
    return false;
  }
  
  logger.info(`[ToolRunner] Installing ${tool.name}...`);
  
  try {
    // Vérifier si déjà installé
    if (await isToolInstalled(toolId)) {
      logger.info(`[ToolRunner] ${tool.name} is already installed`);
      tool.isAvailable = true;
      return true;
    }
    
    // Exécuter la commande d'installation
    const { stdout, stderr } = await execAsync(tool.install.command, {
      timeout: 300000,  // 5 minutes max pour l'install
    });
    
    if (stderr && !stderr.includes('WARNING')) {
      logger.warn(`[ToolRunner] Install warnings for ${tool.name}:`, stderr);
    }
    
    // Vérifier l'installation
    if (await isToolInstalled(toolId)) {
      logger.info(`[ToolRunner] ${tool.name} installed successfully`);
      tool.isAvailable = true;
      return true;
    } else {
      logger.error(`[ToolRunner] ${tool.name} installation failed - tool not found after install`);
      return false;
    }
    
  } catch (error: any) {
    logger.error(`[ToolRunner] Error installing ${tool.name}:`, error.message);
    return false;
  }
}

/**
 * Installer tous les outils prioritaires
 */
export async function installCriticalTools(): Promise<{ installed: string[]; failed: string[] }> {
  const criticalTools = Array.from(toolRegistry.values())
    .filter(t => t.priority === 'critical' && !t.isAvailable);
  
  const installed: string[] = [];
  const failed: string[] = [];
  
  logger.info(`[ToolRunner] Installing ${criticalTools.length} critical tools...`);
  
  for (const tool of criticalTools) {
    const success = await installTool(tool.id);
    if (success) {
      installed.push(tool.id);
    } else {
      failed.push(tool.id);
    }
    
    // Petit délai entre les installations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  logger.info(`[ToolRunner] Critical tools: ${installed.length} installed, ${failed.length} failed`);
  return { installed, failed };
}

/**
 * Exécuter un outil
 */
export async function runTool(
  toolId: string,
  target: string,
  options?: {
    args?: string[];
    timeout?: number;
    env?: Record<string, string>;
    workingDir?: string;
  }
): Promise<ToolExecution> {
  const tool = toolRegistry.get(toolId);
  if (!tool) {
    throw new Error(`Tool ${toolId} not found`);
  }
  
  const execution: ToolExecution = {
    id: crypto.randomUUID(),
    toolId,
    target,
    status: 'pending',
  };
  
  // Vérifier si l'outil est disponible
  if (!tool.isAvailable) {
    logger.warn(`[ToolRunner] Tool ${tool.name} is not available, attempting install...`);
    const installed = await installTool(toolId);
    if (!installed) {
      execution.status = 'failed';
      execution.error = 'Tool not installed and installation failed';
      return execution;
    }
  }
  
  // Préparer l'environnement OPSEC
  let opsecContext: any;
  if (config.useOPSEC) {
    opsecContext = await opsecManager.prepareRequest(target, toolId);
  }
  
  // Construire la commande
  const args = [...tool.execution.args];
  if (options?.args) {
    args.push(...options.args);
  }
  
  // Remplacer les placeholders
  const processedArgs = args.map(arg => {
    return arg
      .replace('{{target}}', target)
      .replace('{{output}}', path.join(config.workingDir, `${execution.id}.json`));
  });
  
  const command = tool.execution.command;
  const workingDir = options?.workingDir || tool.execution.workingDir || config.workingDir;
  const timeout = options?.timeout || tool.execution.timeout || config.defaultTimeout;
  
  logger.info(`[ToolRunner] Running ${tool.name} on ${target}...`);
  
  execution.status = 'running';
  execution.startTime = new Date();
  
  try {
    const output = await executeCommand(command, processedArgs, {
      cwd: workingDir,
      timeout,
      env: { ...tool.execution.env, ...options?.env },
    });
    
    execution.output = output.stdout;
    execution.error = output.stderr;
    execution.exitCode = output.exitCode;
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
    
    if (output.exitCode === 0) {
      execution.status = 'completed';
      
      // Parser les résultats
      execution.result = await parseOutput(tool, output.stdout);
      
      logger.info(`[ToolRunner] ${tool.name} completed in ${execution.duration}ms`);
    } else {
      execution.status = 'failed';
      logger.error(`[ToolRunner] ${tool.name} failed with exit code ${output.exitCode}`);
    }
    
  } catch (error: any) {
    execution.status = error.message.includes('timeout') ? 'timeout' : 'failed';
    execution.error = error.message;
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - (execution.startTime?.getTime() || 0);
    
    logger.error(`[ToolRunner] Error running ${tool.name}:`, error.message);
  }
  
  return execution;
}

/**
 * Exécuter une commande système
 */
function executeCommand(
  command: string,
  args: string[],
  options: {
    cwd: string;
    timeout: number;
    env?: Record<string, string>;
  }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      detached: false,
    });
    
    let stdout = '';
    let stderr = '';
    
    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('timeout'));
    }, options.timeout);
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({
        stdout,
        stderr,
        exitCode: code || 0,
      });
    });
    
    child.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}

/**
 * Parser la sortie d'un outil
 */
async function parseOutput(tool: ToolManifest, output: string): Promise<any> {
  switch (tool.parser.type) {
    case 'json':
      try {
        return JSON.parse(output);
      } catch {
        return { raw: output };
      }
      
    case 'xml':
      // TODO: Implémenter parser XML
      return { raw: output };
      
    case 'regex':
      if (tool.parser.pattern) {
        const regex = new RegExp(tool.parser.pattern, 'gm');
        const matches = output.matchAll(regex);
        return Array.from(matches);
      }
      return { raw: output };
      
    case 'line':
      return output.split('\n').filter(line => line.trim());
      
    case 'custom':
      // Utiliser un parser custom si défini
      if (tool.parser.customParser && customParsers[tool.parser.customParser]) {
        return customParsers[tool.parser.customParser](output);
      }
      return { raw: output };
      
    default:
      return { raw: output };
  }
}

/**
 * Parsers custom pour des outils spécifiques
 */
const customParsers: Record<string, (output: string) => any> = {
  // Parser pour sherlock
  sherlock: (output: string) => {
    const lines = output.split('\n');
    const results: Array<{ site: string; url: string; status: string }> = [];
    
    for (const line of lines) {
      const match = line.match(/\[\+\] (.+): (.+)/);
      if (match) {
        results.push({
          site: match[1],
          url: match[2],
          status: 'found',
        });
      }
    }
    
    return results;
  },
  
  // Parser pour theHarvester
  theharvester: (output: string) => {
    const emails: string[] = [];
    const hosts: string[] = [];
    const ips: string[] = [];
    
    const lines = output.split('\n');
    let currentSection = '';
    
    for (const line of lines) {
      if (line.includes('Emails found:')) {
        currentSection = 'emails';
        continue;
      }
      if (line.includes('Hosts found:')) {
        currentSection = 'hosts';
        continue;
      }
      if (line.includes('IPs found:')) {
        currentSection = 'ips';
        continue;
      }
      
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('[') && !trimmed.startsWith('-')) {
        if (currentSection === 'emails' && trimmed.includes('@')) {
          emails.push(trimmed);
        } else if (currentSection === 'hosts') {
          hosts.push(trimmed);
        } else if (currentSection === 'ips') {
          ips.push(trimmed);
        }
      }
    }
    
    return { emails, hosts, ips };
  },
};

/**
 * Exécuter plusieurs outils en parallèle
 */
export async function runToolsParallel(
  toolIds: string[],
  target: string,
  options?: {
    maxParallel?: number;
    timeout?: number;
  }
): Promise<ToolExecution[]> {
  const maxParallel = options?.maxParallel || config.maxParallel;
  
  logger.info(`[ToolRunner] Running ${toolIds.length} tools in parallel (max ${maxParallel})...`);
  
  const executions: ToolExecution[] = [];
  const queue = [...toolIds];
  
  // Exécuter par batches
  while (queue.length > 0) {
    const batch = queue.splice(0, maxParallel);
    const batchPromises = batch.map(toolId => runTool(toolId, target, options));
    
    const batchResults = await Promise.all(batchPromises);
    executions.push(...batchResults);
    
    logger.info(`[ToolRunner] Batch completed: ${batch.length} tools`);
  }
  
  const completed = executions.filter(e => e.status === 'completed').length;
  const failed = executions.filter(e => e.status === 'failed').length;
  
  logger.info(`[ToolRunner] All tools completed: ${completed} success, ${failed} failed`);
  
  return executions;
}

/**
 * Obtenir la liste des outils disponibles
 */
export function getAvailableTools(): ToolManifest[] {
  return Array.from(toolRegistry.values())
    .filter(t => t.isAvailable)
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

/**
 * Obtenir la liste de tous les outils
 */
export function getAllTools(): ToolManifest[] {
  return Array.from(toolRegistry.values());
}

/**
 * Obtenir les outils par catégorie
 */
export function getToolsByCategory(category: string): ToolManifest[] {
  return Array.from(toolRegistry.values())
    .filter(t => t.categories.includes(category));
}

/**
 * Obtenir les outils par type de cible
 */
export function getToolsByTargetType(targetType: string): ToolManifest[] {
  return Array.from(toolRegistry.values())
    .filter(t => t.targetTypes.includes(targetType));
}

/**
 * Créer un manifest pour un nouvel outil
 */
export function createToolManifest(manifest: Omit<ToolManifest, 'isAvailable'>): ToolManifest {
  const fullManifest: ToolManifest = {
    ...manifest,
    isAvailable: false,
  };
  
  toolRegistry.set(manifest.id, fullManifest);
  return fullManifest;
}

/**
 * Supprimer un outil du registry
 */
export function removeTool(toolId: string): boolean {
  return toolRegistry.delete(toolId);
}

/**
 * Health check du Tool Runner
 */
export async function toolRunnerHealthCheck(): Promise<{
  healthy: boolean;
  tools: { total: number; available: number; critical: number };
  issues: string[];
}> {
  const allTools = getAllTools();
  const availableTools = getAvailableTools();
  const criticalTools = allTools.filter(t => t.priority === 'critical');
  const availableCritical = criticalTools.filter(t => t.isAvailable);
  
  const issues: string[] = [];
  
  if (availableCritical.length < criticalTools.length) {
    issues.push(`${criticalTools.length - availableCritical.length} critical tools not available`);
  }
  
  // Vérifier les répertoires
  if (!existsSync(config.workingDir)) {
    issues.push('Working directory does not exist');
  }
  if (!existsSync(config.toolsDir)) {
    issues.push('Tools directory does not exist');
  }
  
  return {
    healthy: issues.length === 0,
    tools: {
      total: allTools.length,
      available: availableTools.length,
      critical: availableCritical.length,
    },
    issues,
  };
}

// Export par défaut
export default {
  initToolRunner,
  loadToolManifests,
  loadManifestsFromFile,
  installTool,
  installCriticalTools,
  runTool,
  runToolsParallel,
  getAvailableTools,
  getAllTools,
  getToolsByCategory,
  getToolsByTargetType,
  createToolManifest,
  removeTool,
  isToolInstalled,
  toolRunnerHealthCheck,
};

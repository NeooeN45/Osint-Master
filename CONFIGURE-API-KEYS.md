# Configuration des Clés API - OSINT Master Pro

## 🔑 Clés API Requises pour l'Exécution Réelle des Outils

Pour que les outils OSINT s'exécutent **réellement** (pas en simulation), vous devez configurer les clés API suivantes:

---

## 📋 Liste des Clés API Nécessaires

### 1. **Shodan** (IP Intelligence)
- **Site**: https://account.shodan.io/
- **Plan**: Free (100 requêtes/mois) ou Paid
- **Variable**: `SHODAN_API_KEY`
- **Usage**: Scan de ports, services, vulnérabilités

### 2. **VirusTotal** (Malware/Hash Analysis)
- **Site**: https://www.virustotal.com/gui/join-us
- **Plan**: Free (4 requêtes/min) ou Paid
- **Variable**: `VIRUSTOTAL_API_KEY`
- **Usage**: Analyse de hashes, URLs, fichiers

### 3. **Have I Been Pwned** (Breach Data)
- **Site**: https://haveibeenpwned.com/API/Key
- **Plan**: $3.50/mois minimum
- **Variable**: `HIBP_API_KEY`
- **Usage**: Recherche de fuites de données

### 4. **Hunter.io** (Email Discovery)
- **Site**: https://hunter.io/api
- **Plan**: Free (25 recherches/mois) ou Paid
- **Variable**: `HUNTER_API_KEY`
- **Usage**: Découverte et vérification d'emails

### 5. **IPinfo** (IP Geolocation)
- **Site**: https://ipinfo.io/signup
- **Plan**: Free (50k requêtes/mois) ou Paid
- **Variable**: `IPINFO_TOKEN`
- **Usage**: Géolocalisation précise des IP

### 6. **Clearbit** (Person/Company Intelligence)
- **Site**: https://dashboard.clearbit.com/signup
- **Plan**: Free trial, puis Paid
- **Variable**: `CLEARBIT_API_KEY`
- **Usage**: Enrichissement de données personnes/entreprises

### 7. **MaxMind GeoIP2** (Precision IP Location)
- **Site**: https://www.maxmind.com/en/geolite2/signup
- **Plan**: Free (GeoLite2) ou Paid (GeoIP2 Precision)
- **Variable**: `MAXMIND_LICENSE_KEY`
- **Usage**: Localisation précise des IP (ville/code postal)

### 8. **Google Geolocation API** (Cell Tower/WiFi Location)
- **Site**: https://developers.google.com/maps/documentation/geolocation/get-api-key
- **Plan**: Pay-as-you-go ($5 per 1000 requêtes)
- **Variable**: `GOOGLE_GEOLOCATION_API_KEY`
- **Usage**: Localisation par triangulation cellulaire/WiFi

### 9. **OpenCellID** (Cell Tower Database)
- **Site**: https://opencellid.org/#action=register
- **Plan**: Free (avec attribution)
- **Variable**: `OPENCELLID_API_KEY`
- **Usage**: Base de données des antennes relais

### 10. **WiGLE** (WiFi Network Database)
- **Site**: https://wigle.net/
- **Plan**: Free avec compte
- **Variables**: `WIGLE_API_NAME`, `WIGLE_API_TOKEN`
- **Usage**: Localisation par adresse MAC WiFi

---

## ⚙️ Configuration

### Méthode 1: Fichier .env (Recommandé)

Créez un fichier `backend/.env`:

```env
# OSINT API Keys
SHODAN_API_KEY=your_shodan_key_here
VIRUSTOTAL_API_KEY=your_virustotal_key_here
HIBP_API_KEY=your_hibp_key_here
HUNTER_API_KEY=your_hunter_key_here
IPINFO_TOKEN=your_ipinfo_token_here
CLEARBIT_API_KEY=your_clearbit_key_here
MAXMIND_LICENSE_KEY=your_maxmind_key_here
GOOGLE_GEOLOCATION_API_KEY=your_google_key_here
OPENCELLID_API_KEY=your_opencellid_key_here
WIGLE_API_NAME=your_wigle_username
WIGLE_API_TOKEN=your_wigle_token
```

### Méthode 2: Variables d'Environnement Système

**Windows (PowerShell)**:
```powershell
$env:SHODAN_API_KEY = "your_key_here"
$env:VIRUSTOTAL_API_KEY = "your_key_here"
# etc...
```

**Linux/Mac**:
```bash
export SHODAN_API_KEY="your_key_here"
export VIRUSTOTAL_API_KEY="your_key_here"
# etc...
```

### Méthode 3: Configuration dans l'Application

Vous pouvez aussi configurer les clés via l'interface Settings de l'application (à implémenter).

---

## 🧪 Test de Configuration

Pour vérifier que vos clés fonctionnent:

```bash
cd backend
npm run test:apis
```

Ou utilisez le endpoint API:
```
POST /api/test/connection
{
  "toolId": "shodan",
  "target": "8.8.8.8"
}
```

---

## 🛡️ Sécurité des Clés API

### ⚠️ IMPORTANT

1. **NE JAMAIS** commiter les fichiers `.env` dans git
2. **Utilisez** `.gitignore` pour exclure les fichiers sensibles
3. **Restreignez** les IP autorisées sur les dashboards des APIs
4. **Surveillez** l'utilisation pour détecter les abus
5. **Faites** rotation régulière des clés

### .gitignore Recommandé

```gitignore
# Environment variables
.env
.env.local
.env.production

# API Keys
*.key
secrets.json

# Logs
logs/
*.log
```

---

## 📊 Quotas et Limites

| Service | Gratuit | Payant | Reset |
|---------|---------|--------|-------|
| Shodan | 100/mois | Illimité | Mensuel |
| VirusTotal | 4/min | Illimité | Continue |
| HIBP | $3.50/mois | $3.50/mois | Mensuel |
| Hunter | 25/mois | Illimité | Mensuel |
| IPinfo | 50k/mois | Illimité | Mensuel |
| Clearbit | Trial | Illimité | - |
| MaxMind | - | Illimité | - |
| Google Geo | $200 crédit | $5/1000 | Mensuel |
| OpenCellID | Illimité | - | - |
| WiGLE | Illimité | - | - |

---

## 🔧 Dépannage

### Erreur "Rate limit exceeded"
- Attendez la fenêtre de rate limit
- Passez à un plan payant
- Utilisez plusieurs clés (rotation)

### Erreur "API key invalid"
- Vérifiez la clé dans le fichier .env
- Régénérez la clé sur le site du service
- Vérifiez les espaces/caractères spéciaux

### Erreur "Service unreachable"
- Vérifiez votre connexion internet
- Vérifiez si le service est en maintenance
- Essayez avec un VPN si géo-bloqué

---

## 🚀 Optimisation

### Cache des Résultats
Les résultats sont mis en cache 30 minutes pour éviter de consommer les quotas inutilement.

### Exécution Parallèle
Configurez `parallel: true` pour exécuter plusieurs outils simultanément.

### Retry Automatique
Les échecs temporaires sont automatiquement retry (3 tentatives par défaut).

---

## 📚 Ressources

- [Shodan API Docs](https://developer.shodan.io/api)
- [VirusTotal API Docs](https://developers.virustotal.com/reference)
- [HIBP API Docs](https://haveibeenpwned.com/API/v3)
- [Hunter API Docs](https://hunter.io/api-documentation)
- [IPinfo Docs](https://ipinfo.io/developers)

---

**Sans ces clés API, l'application fonctionnera en mode "simulation" avec des données fictives.**

Pour une expérience OSINT professionnelle, configurez au moins 3-4 clés API.

# OSINT Master Pro - Système d'Intelligence et Explications

## 🧠 Nouveau: Intelligence Engine

Le système analyse automatiquement les résultats OSINT et fournit des **explications contextuelles**, **évaluations de risque** et **recommandations personnalisées**.

---

## 📊 Exemple Réel: Analyse de `camille_perraudeau`

### Résultat de l'Intelligence Engine

```json
{
  "riskScore": 36,
  "riskLevel": "medium",
  "categories": {
    "Adult": 2,        // ChaturBate, Redtube
    "Crypto": 1,       // OpenSea
    "Professional": 2, // Kaggle, Hashnode
    "Gaming": 2        // Roblox, OP.GG
  },
  "recommendations": [
    "⚡ Opportunité d'amélioration: Réviser les paramètres de confidentialité",
    "🔞 Contenu adulte détecté: Utiliser des pseudonymes uniques et navigation privée",
    "₿ Exposition crypto: Surveiller les transactions publiques",
    "✅ Profils professionnels actifs: Opportunité de renforcer la présence positive"
  ]
}
```

---

## 🎯 Explications par Plateforme

### 🔴 Risque Élevé

**ChaturBate** (Chaturbate.com)
- **Type**: Adult
- **Risque**: HIGH
- **Explication**: Plateforme de streaming adulte
- **Données exposées**: Identité de streaming, Activité en ligne, Préférences
- **Recommandations**:
  - ✅ Utiliser un pseudonyme différent
  - ✅ Vérifier les paramètres de confidentialité
  - ✅ Être conscient de l'empreinte numérique

**Redtube** (Redtube.com)
- **Type**: Adult
- **Risque**: HIGH
- **Explication**: Plateforme de contenu adulte
- **Données exposées**: Préférences de visionnage, Historique, Interactions
- **Recommandations**:
  - ✅ Utiliser la navigation privée
  - ✅ Ne pas utiliser d'email principal

---

### 🟢 Risque Faible

**Kaggle** (Kaggle.com)
- **Type**: Professional
- **Risque**: LOW
- **Explication**: Plateforme de data science et machine learning
- **Données exposées**: Compétences techniques, Projets publics, Contributions
- **Recommandations**:
  - ✅ Cela renforce le profil professionnel
  - ✅ Positif pour la carrière

**Roblox** (Roblox.com)
- **Type**: Gaming
- **Risque**: LOW
- **Explication**: Plateforme de jeux en ligne pour enfants/adolescents
- **Données exposées**: Profil public, Amis, Créations
- **Recommandations**:
  - ✅ Activer la confidentialité des amis
  - ✅ Surveiller les interactions

---

### 🟡 Risque Moyen

**OpenSea** (Opensea.io)
- **Type**: Crypto
- **Risque**: MEDIUM
- **Explication**: Marché NFT et crypto-monnaies
- **Données exposées**: Portefeuille blockchain, Transactions NFT, Valeur des actifs
- **Recommandations**:
  - ✅ Surveiller les transactions publiques
  - ✅ Utiliser des wallets dédiés

**Threads** (Threads.net)
- **Type**: Social
- **Risque**: MEDIUM
- **Explication**: Réseau social de Meta (Instagram)
- **Données exposées**: Posts publics, Connexions, Activité sociale
- **Recommandations**:
  - ✅ Vérifier les paramètres de confidentialité
  - ✅ Surveiller les tags et mentions

---

## 🚀 Endpoints API Intelligence

### 1. Analyse Complète
```bash
POST /api/intelligence/analyze
```

**Request**:
```json
{
  "target": "camille_perraudeau",
  "entities": [
    {
      "type": "social_profile",
      "value": "https://chaturbate.com/camille_perraudeau",
      "confidence": 90,
      "source": "maigret"
    }
  ]
}
```

**Response**:
```json
{
  "summary": {
    "target": "camille_perraudeau",
    "riskScore": 36,
    "riskLevel": "medium",
    "totalEntities": 42,
    "categories": { "Adult": 2, "Crypto": 1, ... },
    "keyFindings": [...],
    "recommendations": [...]
  },
  "report": "# Rapport Markdown...",
  "html": "<!DOCTYPE html>..."
}
```

---

### 2. Explication d'une Entité
```bash
POST /api/intelligence/explain
```

**Request**:
```json
{
  "value": "https://opensea.io/accounts/camille_perraudeau",
  "type": "social_profile",
  "confidence": 85,
  "source": "maigret"
}
```

**Response**:
```json
{
  "explanation": {
    "entity": "https://opensea.io/accounts/camille_perraudeau",
    "type": "social_profile",
    "confidence": 85,
    "explanation": "Marché NFT et crypto-monnaies...",
    "riskLevel": "medium",
    "category": "Crypto",
    "recommendations": [...],
    "relatedPlatforms": ["coinbase.com", "binance.com"]
  }
}
```

---

### 3. Évaluation des Risques
```bash
POST /api/intelligence/risk-assessment
```

**Response**:
```json
{
  "riskScore": 36,
  "riskLevel": "medium",
  "categories": { ... },
  "criticalFindings": [...],
  "recommendations": [...]
}
```

---

### 4. Génération de Rapport
```bash
POST /api/intelligence/report
```

**Request**:
```json
{
  "target": "camille_perraudeau",
  "entities": [...],
  "format": "html"  // ou "markdown"
}
```

**Response**: Téléchargement du fichier HTML ou Markdown

---

## 📈 Base de Données d'Intelligence

### Plateformes Connues (50+)

| Plateforme | Catégorie | Risque | Description |
|------------|-----------|--------|-------------|
| ChaturBate | Adult | 🔴 HIGH | Streaming adulte |
| Redtube | Adult | 🔴 HIGH | Contenu adulte |
| AdultFriendFinder | Adult | 🔴 CRITICAL | Rencontres adultes |
| OpenSea | Crypto | 🟡 MEDIUM | NFT/Crypto |
| Kaggle | Professional | 🟢 LOW | Data science |
| Roblox | Gaming | 🟢 LOW | Jeux en ligne |
| OP.GG | Gaming | 🟢 LOW | Stats LoL |
| Hashnode | Professional | 🟢 LOW | Blog tech |
| Threads | Social | 🟡 MEDIUM | Réseau social |
| MercadoLivre | E-commerce | 🟡 MEDIUM | Marketplace |

---

## 🎨 Rapport HTML Généré

Le système génère automatiquement des rapports HTML beaux et professionnels avec :

- ✅ **Header coloré** avec gradient
- ✅ **Cartes de statistiques** (entités, score, catégories)
- ✅ **Badge de risque** coloré (🟢🟡🟠🔴)
- ✅ **Sections clairement délimitées**
- ✅ **Explications détaillées** pour chaque découverte
- ✅ **Recommandations prioritaires**
- ✅ **Design responsive** et moderne

### Aperçu du Rapport

```
┌─────────────────────────────────────────┐
│ 🔍 Rapport d'Analyse OSINT              │
│ Cible: camille_perraudeau               │
├─────────────────────────────────────────┤
│ 42          36         4               │
│ Entités     Score      Catégories      │
├─────────────────────────────────────────┤
│ ⚠️ Évaluation du Risque                 │
│ Niveau: 🟡 MEDIUM                       │
│ Score: 36/100                           │
├─────────────────────────────────────────┤
│ 📊 Répartition par Catégorie            │
│ Adult: 2  Crypto: 1  Gaming: 2          │
├─────────────────────────────────────────┤
│ 🔎 Découvertes Clés                     │
│ 🟢 Roblox - Gaming (75%)                │
│ 🟡 OpenSea - Crypto (85%)               │
│ 🔴 ChaturBate - Adult (90%)             │
├─────────────────────────────────────────┤
│ 💡 Recommandations                      │
│ ⚡ Réviser paramètres confidentialité   │
│ 🔞 Utiliser pseudonymes uniques          │
│ ✅ Renforcer présence professionnelle   │
└─────────────────────────────────────────┘
```

---

## 💡 Algorithmes d'Intelligence

### 1. Classification Automatique
```typescript
// Extrait la plateforme de l'URL
extractPlatform("https://opensea.io/accounts/camille") 
// → "opensea.io"

// Recherche dans la base de connaissances
PLATFORM_INTELLIGENCE["opensea.io"]
// → { category: "Crypto", riskLevel: "medium", ... }
```

### 2. Calcul du Score de Risque
```typescript
// Pondération par niveau de risque
const weights = { "low": 25, "medium": 50, "high": 75, "critical": 100 }

// Multiplicateurs par catégorie
const CATEGORY_RISK = {
  "Adult": 90,
  "Crypto": 60,
  "Social": 40,
  "Gaming": 20,
  "Professional": 10
}

// Score final (0-100)
riskScore = weightedAverage(entityRisks)
```

### 3. Génération de Recommandations
```typescript
// Basé sur le niveau de risque global
if (riskLevel === "critical" || riskLevel === "high") {
  recommendations.push("⚠️ URGENT: Audit de confidentialité");
}

// Basé sur les catégories détectées
if (categories.has("Adult")) {
  recommendations.push("🔞 Contenu adulte détecté");
}

if (categories.has("Professional")) {
  recommendations.push("✅ Opportunité de renforcer présence positive");
}
```

---

## 🔗 Intégration avec le Streaming

Le système d'intelligence peut être utilisé **en temps réel** pendant les analyses :

```javascript
// Pendant l'analyse streaming
eventSource.addEventListener('find', (e) => {
  const data = JSON.parse(e.data);
  
  // Obtenir explication immédiate
  fetch('/api/intelligence/explain', {
    method: 'POST',
    body: JSON.stringify(data.data)
  })
  .then(res => res.json())
  .then(({ explanation }) => {
    // Afficher avec explication contextuelle
    showDiscovery(data.data, explanation);
  });
});
```

---

## 📁 Fichiers Créés

1. **`backend/src/services/intelligenceEngine.ts`**
   - Moteur d'analyse intelligent
   - Base de données des plateformes
   - Algorithmes de scoring

2. **`backend/src/routes/intelligence.ts`**
   - Routes API pour l'intelligence
   - Génération de rapports HTML
   - Endpoints d'analyse

---

## ✅ Validation avec Données Réelles

Test effectué avec les vrais résultats de `camille_perraudeau`:

```bash
curl -X POST /api/intelligence/risk-assessment \
  -d '{"entities": [chaturbate, opensea, kaggle, roblox...]}'
```

**Résultat**:
- ✅ Risk Score: **36/100** (MEDIUM)
- ✅ Catégories détectées: Adult (2), Crypto (1), Professional (2), Gaming (2)
- ✅ Recommandations pertinentes générées
- ✅ Explications contextuelles fournies

---

## 🚀 Prochaines Améliorations

- [ ] **Machine Learning**: Détection automatique de nouvelles plateformes
- [ ] **Graphe de relations**: Visualiser les connexions entre entités
- [ ] **Alertes en temps réel**: Notifications pour les découvertes critiques
- [ ] **Comparaison temporelle**: Évolution de l'empreinte numérique
- [ ] **Export PDF**: Rapports PDF professionnels

---

**Le système est maintenant capable d'expliquer CE qui a été trouvé et POURQUOI c'est important !** 🎉

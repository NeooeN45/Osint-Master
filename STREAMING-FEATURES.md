# OSINT Master Pro - Streaming & Real-time Features

## 🎉 Nouvelles Fonctionnalités de Streaming

### 1. Streaming en Temps Réel (SSE)

**Endpoint**: `GET /api/stream/analysis/:sessionId`

Connectez-vous via Server-Sent Events pour recevoir des mises à jour en temps réel :
- Progression de l'analyse (0-100%)
- Découvertes instantanées
- Logs détaillés
- Statut des outils

**Événements SSE**:
- `connected` - Connexion établie
- `start` - Début de l'analyse
- `progress` - Progression (barre de progression)
- `find` - Découverte d'une entité
- `complete` - Analyse terminée
- `error` - Erreur survenue

### 2. Routes API Streaming

#### Lancer une analyse avec streaming
```bash
POST /api/osint/execute-stream/:toolId
```

**Request**:
```json
{
  "target": "test@gmail.com",
  "sessionId": "optional-custom-id"
}
```

**Response**:
```json
{
  "sessionId": "scan-1234567890-abc123",
  "toolId": "holehe",
  "target": "test@gmail.com",
  "streamUrl": "/api/stream/analysis/scan-1234567890-abc123",
  "status": "started"
}
```

#### Scan multi-outils avec streaming
```bash
POST /api/osint/scan-stream
```

**Request**:
```json
{
  "target": "test@gmail.com",
  "targetType": "email" // optional, auto-detected if not provided
}
```

**Response**:
```json
{
  "sessionId": "scan-1234567890-abc123",
  "target": "test@gmail.com",
  "targetType": "email",
  "tools": ["holehe", "h8mail", "ghunt", "emailrep"],
  "streamUrl": "/api/stream/analysis/scan-1234567890-abc123",
  "status": "started"
}
```

### 3. Composant React AnalysisMonitor

```tsx
import { AnalysisMonitor } from "@/components/AnalysisMonitor";

function MyComponent() {
  return (
    <AnalysisMonitor
      sessionId="scan-1234567890-abc123"
      streamUrl="/api/stream/analysis/scan-1234567890-abc123"
      onComplete={(results) => console.log("Done!", results)}
      onError={(error) => console.error("Error:", error)}
    />
  );
}
```

**Fonctionnalités du composant**:
- ✅ Barre de progression animée
- ✅ Logs en temps réel avec scroll auto
- ✅ Découvertes récentes affichées
- ✅ Statistiques live (temps, items, outil actuel)
- ✅ Indicateur de connexion
- ✅ Icônes colorées par type de découverte

### 4. Stream Manager Backend

**Fichier**: `backend/src/services/streamManager.ts`

Fonctions clés:
```typescript
// Créer une session
streamManager.createSession(sessionId, target, targetType, tools);

// S'abonner aux événements
streamManager.subscribe(sessionId, (event) => {
  console.log(event.type, event.message, event.progress);
});

// Émettre un événement
streamManager.toolStarted(sessionId, toolId, target);
streamManager.toolProgress(sessionId, toolId, target, message, details);
streamManager.itemFound(sessionId, toolId, target, type, value, confidence);
streamManager.toolCompleted(sessionId, toolId, target, result);
streamManager.sessionCompleted(sessionId);
streamManager.sessionError(sessionId, error);
```

### 5. Améliorations des Logs

**Logs détaillés avec emojis**:
- 🔗 Connecté au stream
- 🚀 Analyse démarrée
- ⏳ Progression des outils
- 🔍 Découvertes d'entités
- ✅ Outil terminé
- 🎉 Analyse complète
- ❌ Erreur

**Format des événements**:
```typescript
interface ProgressEvent {
  type: "start" | "progress" | "find" | "complete" | "error";
  toolId: string;
  target: string;
  message: string;
  progress: number; // 0-100
  details?: {
    currentStep?: string;
    totalSteps?: number;
    currentStepNumber?: number;
    itemsFound?: number;
    currentItem?: string;
    eta?: number;
    toolResults?: number;
    duration?: number;
  };
  timestamp: string;
  data?: any; // Résultats complets
}
```

### 6. Exécution Commande avec Progress Callback

**Fichier**: `backend/src/services/osintEngine.ts`

Les commandes OSINT supportent maintenant un callback de progression temps réel:
```typescript
const { stdout, stderr, exitCode } = await executeCommand(
  command, 
  { 
    timeout: 120000,
    onProgress: (line) => {
      // Appelé pour chaque ligne de sortie
      console.log("Real-time:", line);
    }
  }
);
```

### 7. Interface Utilisateur Améliorée

**Nouveau composant AnalysisMonitor**:
- 🎨 Design moderne avec Tailwind CSS
- 📊 Barre de progression animée (gradient)
- 📜 Logs live avec scroll automatique
- 🏷️ Badges colorés par catégorie
- ⚡ Animations Framer Motion
- 📱 Responsive design

**Cartes de statistiques**:
- Temps écoulé
- Items trouvés
- Outil en cours
- Nombre d'événements

### 8. Endpoints de Status

```bash
# Status d'une session
GET /api/stream/status/:sessionId

# Toutes les sessions actives
GET /api/stream/active

# Historique complet
GET /api/stream/history/:sessionId

# Polling (fallback)
GET /api/stream/poll/:sessionId?lastEventId=timestamp
```

### 9. Exemple d'Utilisation Complète

```javascript
// 1. Démarrer une analyse avec streaming
const startResponse = await fetch('/api/osint/scan-stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ target: 'test@gmail.com' })
});

const { sessionId, streamUrl } = await startResponse.json();

// 2. Connecter au stream SSE
const eventSource = new EventSource(`http://localhost:3002${streamUrl}`);

eventSource.addEventListener('progress', (e) => {
  const data = JSON.parse(e.data);
  updateProgressBar(data.progress);
  updateCurrentTool(data.toolId);
});

eventSource.addEventListener('find', (e) => {
  const data = JSON.parse(e.data);
  addDiscovery(data.data); // { type, value, confidence }
});

eventSource.addEventListener('complete', (e) => {
  const data = JSON.parse(e.data);
  showResults(data.data);
  eventSource.close();
});
```

### 10. Avantages du Streaming

✅ **Feedback immédiat** - Plus d'attente aveugle  
✅ **Barre de progression** - Visualisation claire de l'avancement  
✅ **Logs temps réel** - Voir ce qui se passe en arrière-plan  
✅ **Découvertes instantanées** - Voir les résultats dès qu'ils arrivent  
✅ **Meilleure UX** - Interface moderne et réactive  
✅ **Debug facilité** - Logs détaillés pour chaque étape  

### 11. Démonstration Visuelle

```
┌─────────────────────────────────────────────┐
│ 🔬 Analysis in Progress                     │
│ Session: scan-123-abc                        │
│ ● Live                                       │
├─────────────────────────────────────────────┤
│ Progress: [████████████████████░░░░] 75%   │
├─────────────────────────────────────────────┤
│ ⏱️ 2:34    📊 12 items    🔧 holehe         │
├─────────────────────────────────────────────┤
│ 🔍 Recent Discoveries                       │
│ 👤 Found [social] amazon.com profile        │
│ 📧 Found [social] spotify.com profile       │
├─────────────────────────────────────────────┤
│ 📝 Live Logs (42 entries)                   │
│ [10:30:15] 🚀 Starting analysis...          │
│ [10:30:16] ⏳ Running holehe (0%)           │
│ [10:30:45] 🔍 Found [social] amazon.com    │
│ [10:31:02] ⏳ holehe completed - 6 items    │
│ [10:31:05] ✅ h8mail completed - 0 items    │
└─────────────────────────────────────────────┘
```

---

## 🚀 Améliorations Futures

- [ ] WebSocket pour bidirectionnel
- [ ] Notifications push navigateur
- [ ] Export live des résultats
- [ ] Mode "théâtre" plein écran
- [ ] Graphique de progression en temps réel
- [ ] Suggestions d'outils basées sur les découvertes

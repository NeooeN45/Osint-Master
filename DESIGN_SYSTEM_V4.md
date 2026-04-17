# DESIGN SYSTEM v4.0 - GOOGLE DARK MINIMALIST

> **Direction**: UI à la Google (épurée, minimaliste) en noir & blanc avec points de couleur stratégiques pour effet "wow"
> **Inspiration**: Google Material Design + Apple Dark Mode + Notion Minimalism
> **Mood**: Pro, sérieux, mystérieux, "cyber-investigation"

---

## PALETTE DE COULEURS

### Fondamentaux (90% de l'interface)

| Token | Valeur | Usage |
|-------|--------|-------|
| **bg-primary** | `#000000` | Fond principal (vrai noir) |
| **bg-secondary** | `#0A0A0A` | Cartes, panels |
| **bg-tertiary** | `#141414` | Inputs, hover states |
| **bg-elevated** | `#1A1A1A` | Modals, dropdowns |
| **text-primary** | `#FFFFFF` | Titres, texte principal |
| **text-secondary** | `#A3A3A3` | Description, labels |
| **text-tertiary** | `#737373` | Placeholders, disabled |
| **border-subtle** | `#262626` | Bordures fines |
| **border-default** | `#404040` | Bordures visibles |

### Accents "Wow" (10% de l'interface - POINTS DE COULEUR)

| Token | Valeur | Usage | Effet |
|-------|--------|-------|-------|
| **accent-cyan** | `#00F0FF` | Actions principales, CTA | Énergie, technologie |
| **accent-purple** | `#A855F7` | Corrélation, liens | Mystère, intelligence |
| **accent-emerald** | `#10B981` | Succès, validé, sécurisé | Confiance, OPSEC actif |
| **accent-amber** | `#F59E0B` | Alertes, attention | Urgence, warning |
| **accent-rose** | `#F43F5E` | Danger, erreur, critique | Bloqué, risque élevé |
| **accent-gradient** | `linear-gradient(135deg, #00F0FF 0%, #A855F7 50%, #F43F5E 100%)` | Hero, branding | Premium, unique |

---

## PRINCIPES DE DESIGN

### 1. Le "90/10 Rule"
- **90%** Noir & blanc (élégance, focus)
- **10%** Couleurs d'accent (impact, guidance)

### 2. Effet "Wow" - Où mettre la couleur

```typescript
const wowPoints = {
  // 1. POINT D'ENTRÉE - Première impression
  hero: {
    gradientText: "linear-gradient(90deg, #00F0FF, #A855F7)",
    glowEffect: "0 0 60px rgba(0, 240, 255, 0.3)",
    animatedBackground: "subtle particles",
  },
  
  // 2. ACTIONS CRITIQUES - Ce qui compte
  primaryButtons: {
    background: "#00F0FF",
    text: "#000000",
    hover: "0 0 30px rgba(0, 240, 255, 0.5)",
    glow: true,
  },
  
  // 3. INDICATEURS D'ÉTAT - Feedback instantané
  status: {
    opsecActive: "#10B981",      // Vert doux
    investigationRunning: "#00F0FF", // Cyan pulse
    alert: "#F59E0B",            // Amber
    danger: "#F43F5E",           // Rose vif
  },
  
  // 4. DATA VISUALIZATION - Insights
  charts: {
    primary: "#00F0FF",
    secondary: "#A855F7",
    tertiary: "#F43F5E",
    gradient: "cyan → purple → rose",
  },
  
  // 5. GRAPH & MAP - La corrélation
  graph: {
    nodes: {
      person: "#00F0FF",
      email: "#A855F7",
      phone: "#F59E0B",
      location: "#10B981",
    },
    edges: {
      strong: "#00F0FF",
      medium: "#A855F7",
      weak: "#737373",
    },
    glow: "0 0 20px rgba(0, 240, 255, 0.4)",
  },
  
  // 6. TOOL EXECUTION - Feedback live
  progress: {
    bar: "linear-gradient(90deg, #00F0FF, #A855F7)",
    pulse: "cyan glow animation",
    complete: "#10B981 flash",
  },
  
  // 7. RÉSULTATS - Les découvertes
  findings: {
    highConfidence: "#00F0FF border",
    mediumConfidence: "#A855F7 border",
    newDiscovery: "glow animation #10B981",
  }
}
```

### 3. Typographie

```typescript
const typography = {
  // Font principal - Google Sans / Inter
  sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
  
  // Font mono - Code / Data
  mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
  
  // Scale
  sizes: {
    hero: '4rem',      // 64px - Landing title
    h1: '2.5rem',      // 40px - Page titles
    h2: '1.875rem',    // 30px - Section headers
    h3: '1.5rem',      // 24px - Card titles
    body: '1rem',      // 16px - Texte
    small: '0.875rem', // 14px - Labels
    tiny: '0.75rem',   // 12px - Captions
  },
  
  // Weights
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Letter spacing
  tracking: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.05em',
  }
}
```

---

## COMPOSANTS CLÉS

### 1. HERO SECTION (Effet "Wow" max)

```tsx
// Hero avec gradient animé et glow
function HeroSection() {
  return (
    <div className="relative min-h-[80vh] flex items-center justify-center bg-black">
      {/* Background particles (subtle) */}
      <div className="absolute inset-0 opacity-20">
        <ParticleBackground count={50} color="#00F0FF" />
      </div>
      
      {/* Glow effect behind text */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                      w-[600px] h-[600px] bg-gradient-to-r from-cyan-500/20 to-purple-500/20 
                      blur-[120px] rounded-full" />
      
      <div className="relative z-10 text-center">
        {/* Gradient text - LE wow point */}
        <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-rose-400 
                       bg-clip-text text-transparent animate-gradient">
          OSINT MASTER
        </h1>
        
        <p className="mt-4 text-xl text-neutral-400">
          1000+ outils. Une interface. <span className="text-cyan-400">Zero limites.</span>
        </p>
        
        {/* CTA Button - Glow cyan */}
        <button className="mt-8 px-8 py-4 bg-cyan-400 text-black font-semibold rounded-full
                          hover:shadow-[0_0_40px_rgba(0,240,255,0.5)] transition-all duration-300">
          Lancer une investigation
        </button>
      </div>
    </div>
  )
}
```

### 2. SIDEBAR NAVIGATION (Noir pur, accents subtils)

```tsx
function Sidebar() {
  return (
    <aside className="w-72 h-screen bg-black border-r border-neutral-800">
      {/* Logo - Gradient */}
      <div className="p-6 border-b border-neutral-800">
        <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 
                         bg-clip-text text-transparent">
          OSINT
        </span>
      </div>
      
      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {items.map(item => (
          <a
            key={item.id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all
              ${active === item.id 
                ? 'bg-neutral-900 text-cyan-400 border-l-2 border-cyan-400' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}
            `}
          >
            <item.icon className={active === item.id ? 'text-cyan-400' : 'text-neutral-500'} />
            <span>{item.label}</span>
            
            {/* Badge de statut - POINT DE COULEUR */}
            {item.status === 'running' && (
              <span className="ml-auto w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            )}
          </a>
        ))}
      </nav>
      
      {/* OPSEC Status - Vert quand actif */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-800">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-emerald-400">OPSEC Active</span>
        </div>
      </div>
    </aside>
  )
}
```

### 3. DASHBOARD GRID (Cartes sombres, data en couleur)

```tsx
function DashboardCard({ title, value, trend, type }) {
  // Couleur selon le type de donnée
  const colorMap = {
    findings: 'text-cyan-400',
    alerts: 'text-amber-400',
    risks: 'text-rose-400',
    secure: 'text-emerald-400',
  }
  
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 
                    hover:border-neutral-700 transition-all">
      <h3 className="text-neutral-500 text-sm font-medium uppercase tracking-wide">
        {title}
      </h3>
      
      <div className="mt-2 flex items-baseline gap-2">
        {/* VALUE - Point de couleur principal */}
        <span className={`text-3xl font-bold ${colorMap[type]}`}>
          {value}
        </span>
        
        {/* Trend - Subtile */}
        <span className="text-neutral-600 text-sm">
          {trend}
        </span>
      </div>
      
      {/* Progress bar avec gradient */}
      <div className="mt-4 h-1 bg-neutral-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-cyan-400 to-purple-400"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
```

### 4. TOOL RUNNER (Animation pulse pendant exécution)

```tsx
function ToolRunner({ tool, status }) {
  return (
    <div className="bg-black border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Icon avec glow si running */}
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            ${status === 'running' 
              ? 'bg-cyan-400/10 border border-cyan-400/30' 
              : 'bg-neutral-900 border border-neutral-800'}
          `}>
            <ToolIcon className={status === 'running' ? 'text-cyan-400' : 'text-neutral-500'} />
          </div>
          
          <div>
            <h4 className="text-white font-medium">{tool.name}</h4>
            <p className="text-neutral-500 text-sm">{tool.description}</p>
          </div>
        </div>
        
        {/* Status indicator - COULEUR */}
        <div className="flex items-center gap-2">
          {status === 'running' && (
            <>
              <span className="text-cyan-400 text-sm">Running...</span>
              <div className="w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
            </>
          )}
          {status === 'complete' && (
            <CheckCircle className="text-emerald-400" />
          )}
          {status === 'error' && (
            <XCircle className="text-rose-400" />
          )}
        </div>
      </div>
      
      {/* Progress bar animée */}
      {status === 'running' && (
        <div className="mt-4 h-0.5 bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-400 animate-progress" />
        </div>
      )}
    </div>
  )
}
```

### 5. GRAPH DE CORRÉLATION (Nodes en couleur)

```tsx
function CorrelationGraph() {
  const nodeColors = {
    person: '#00F0FF',      // Cyan
    email: '#A855F7',       // Purple
    phone: '#F59E0B',       // Amber
    location: '#10B981',    // Emerald
    username: '#F43F5E',    // Rose
    domain: '#3B82F6',      // Blue
  }
  
  return (
    <div className="w-full h-[600px] bg-black rounded-xl border border-neutral-800 relative overflow-hidden">
      {/* Background grid subtile */}
      <div className="absolute inset-0 opacity-5" 
           style={{
             backgroundImage: `linear-gradient(#333 1px, transparent 1px),
                               linear-gradient(90deg, #333 1px, transparent 1px)`,
             backgroundSize: '40px 40px'
           }} 
      />
      
      {/* ReactFlow avec nodes colorés */}
      <ReactFlow
        nodes={nodes.map(n => ({
          ...n,
          style: {
            background: '#141414',
            border: `2px solid ${nodeColors[n.type]}`,
            color: nodeColors[n.type],
            boxShadow: `0 0 20px ${nodeColors[n.type]}40`, // 40 = 25% opacity
          }
        }))}
        edges={edges}
      />
    </div>
  )
}
```

### 6. MAP (Dark mode avec heatmap en couleur)

```tsx
function OSINTMap() {
  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-neutral-800">
      <MapContainer 
        center={[48.8566, 2.3522]} 
        zoom={13}
        className="w-full h-full"
      >
        {/* Dark map tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Heatmap layer - Gradient cyan → purple */}
        <HeatmapLayer
          points={locationPoints}
          gradient={{
            0.4: '#00F0FF',
            0.6: '#A855F7',
            0.8: '#F43F5E',
            1.0: '#F43F5E'
          }}
        />
        
        {/* Markers avec glow */}
        {markers.map(m => (
          <Marker position={m.position}>
            <div className="w-4 h-4 bg-cyan-400 rounded-full 
                          shadow-[0_0_20px_rgba(0,240,255,0.6)] animate-pulse" />
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
```

### 7. INPUT TARGET (Focus glow cyan)

```tsx
function TargetInput() {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="@username, email@domain.com, +33..."
        className="w-full px-6 py-4 bg-neutral-900 border border-neutral-800 rounded-xl
                   text-white placeholder-neutral-600
                   focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20
                   transition-all"
      />
      
      {/* Glow effect on focus */}
      <div className="absolute inset-0 rounded-xl opacity-0 focus-within:opacity-100 
                    transition-opacity pointer-events-none
                    shadow-[0_0_30px_rgba(0,240,255,0.15)]" />
      
      <button className="absolute right-2 top-1/2 -translate-y-1/2
                        px-6 py-2 bg-cyan-400 text-black font-medium rounded-lg
                        hover:bg-cyan-300 transition-colors">
        Rechercher
      </button>
    </div>
  )
}
```

---

## ANIMATIONS & EFFETS

### 1. Animations de base (Framer Motion)

```typescript
const animations = {
  // Fade in up
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
  },
  
  // Stagger children
  stagger: {
    animate: { transition: { staggerChildren: 0.1 } }
  },
  
  // Glow pulse
  glowPulse: {
    animate: {
      boxShadow: [
        '0 0 20px rgba(0, 240, 255, 0.2)',
        '0 0 40px rgba(0, 240, 255, 0.4)',
        '0 0 20px rgba(0, 240, 255, 0.2)',
      ],
      transition: { duration: 2, repeat: Infinity }
    }
  },
  
  // Gradient text
  gradientText: {
    background: 'linear-gradient(90deg, #00F0FF, #A855F7, #F43F5E, #00F0FF)',
    backgroundSize: '300% 100%',
    animation: 'gradient 8s linear infinite',
  }
}
```

### 2. Effets spéciaux avec GSAP

```typescript
// ScrollTrigger pour reveal au scroll
gsap.registerPlugin(ScrollTrigger)

// Parallax subtil
gsap.to('.parallax-bg', {
  yPercent: 50,
  ease: 'none',
  scrollTrigger: {
    trigger: '.parallax-container',
    start: 'top bottom',
    end: 'bottom top',
    scrub: true
  }
})

// Reveal staggered
gsap.from('.reveal-item', {
  y: 50,
  opacity: 0,
  duration: 0.8,
  stagger: 0.1,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '.reveal-container',
    start: 'top 80%'
  }
})
```

### 3. Micro-interactions

```css
/* Hover glow */
.hover-glow {
  transition: box-shadow 0.3s ease;
}
.hover-glow:hover {
  box-shadow: 0 0 30px rgba(0, 240, 255, 0.3);
}

/* Focus ring cyan */
.focus-cyan:focus {
  outline: none;
  border-color: #00F0FF;
  box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.2);
}

/* Gradient border */
.gradient-border {
  position: relative;
  background: #0A0A0A;
  border-radius: 12px;
}
.gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  padding: 1px;
  background: linear-gradient(135deg, #00F0FF, #A855F7);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
}

/* Pulse animation */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(0, 240, 255, 0.3); }
  50% { box-shadow: 0 0 40px rgba(0, 240, 255, 0.6); }
}
.pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

---

## LAYOUT PRINCIPAL

```tsx
function AppLayout() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar - Fixed */}
      <Sidebar />
      
      {/* Main Content */}
      <main className="ml-72">
        {/* Header - Minimal */}
        <header className="h-16 border-b border-neutral-800 flex items-center px-8">
          <Breadcrumb className="text-neutral-500" />
          
          {/* Status indicators - POINTS DE COULEUR */}
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm text-neutral-400">Tor Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-sm text-neutral-400">3 Investigations</span>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
```

---

## INSTALLATION STACK UI

```bash
# Core components
npx shadcn-ui@latest init
npx shadcn add button card input badge

# Animation libraries
npm install framer-motion gsap @gsap/react

# Additional UI
npm install aceternity-ui magic-ui

# Icons
npm install lucide-react

# Charts
npm install recharts tremor

# Tables
npm install @tanstack/react-table
```

---

## RÈGLES D'OR

1. **Jamais plus de 2 couleurs d'accent visibles en même temps**
2. **Toujours des transitions douces (300ms ease)**
3. **Les glows sont subtils (opacity 20-40%)**
4. **Le texte reste blanc ou gris, jamais de couleurs vives**
5. **Les points de couleur = actions ou données importantes uniquement**
6. **Dark first - le noir est la base, pas une option**

---

*Design System v4.0 - OSINT Master*
*Direction: Google Dark Minimalist + Points de couleur stratégiques*

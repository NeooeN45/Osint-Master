<div align="center">

# 🎯 OSINT Master

**Plateforme d'intelligence open-source tout-en-un.**  
Corrélation de données, graphe de relations, IA d'analyse — inspiré de Vortimo OSINT Tool.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/Licence-MIT-orange)](LICENSE)

</div>

---

## ✨ Fonctionnalités

| Module | Description |
|--------|-------------|
| 🗂️ **Dossiers** | Gestion de cas d'investigation avec persistance locale |
| 🕸️ **Graphe** | Visualisation des relations entre entités (ReactFlow) |
| 🤖 **IA Chat** | Corrélation et analyse par OpenRouter (Gemma 4, GPT-4, Claude…) |
| 🔧 **Outils OSINT** | WHOIS, DNS, IP Geo, Shodan, HIBP, Username Search, Crypto… |
| ⏱️ **Timeline** | Chronologie des événements et découvertes |
| 🔑 **API Keys** | Gestion sécurisée des clés par outil |

---

## 🔧 Outils intégrés

| Outil | Catégorie | Clé requise |
|-------|-----------|-------------|
| WHOIS Lookup | Domaine | ❌ |
| DNS Lookup | Domaine | ❌ |
| IP Geolocation | Réseau | ❌ |
| Shodan | Réseau | ✅ |
| HaveIBeenPwned | Fuites | ✅ |
| Username Search | Social | ❌ |
| Nominatim Geocoder | Géolocalisation | ❌ |
| Phone Lookup | Téléphone | ❌ |
| Blockchain Explorer | Crypto | ❌ |
| Google Dorking | Identité | ❌ |

---

## 🚀 Installation

```bash
git clone https://github.com/NeooeN45/Osint-Master.git
cd Osint-Master
npm install
npm run dev   # → http://localhost:3001
```

---

## 🤖 Configuration IA

1. Obtenez une clé gratuite sur [openrouter.ai](https://openrouter.ai)
2. Ouvrez **Paramètres** (icône en bas à gauche)
3. Collez votre clé OpenRouter
4. Le chat IA utilise `google/gemma-3-27b-it:free` par défaut

---

## 🏗️ Architecture

```
src/
├── components/     # Sidebar, SettingsModal
├── views/          # Dashboard, GraphView, ChatView, ToolsView, TimelineView
├── store/          # Zustand store (dossiers, entités, relations, chat)
├── lib/            # Outils OSINT (WHOIS, Shodan, HIBP, etc.)
└── types/          # Types TypeScript partagés
```

---

<div align="center">

**Fait pour l'investigation OSINT — usage légal et éthique uniquement**

[⭐ Star](https://github.com/NeooeN45/Osint-Master) · [🐛 Issues](https://github.com/NeooeN45/Osint-Master/issues)

</div>

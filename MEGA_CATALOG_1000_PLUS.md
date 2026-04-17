# MEGA CATALOGUE OSINT - 1000+ OUTILS À INTÉGRER

> **Mission**: Écumer tous les repos GitHub OSINT et intégrer chaque outil implémentable
> **Sources**: jivoi/awesome-osint, cipher387/osint_stuff_tool_collection, Ph055a/OSINT_Collection, Astrosp/Awesome-OSINT-For-Everything, tracelabs/awesome-osint, brandonhimpfen/awesome-osint, sinwindie/OSINT, lockfale/OSINT-Framework, apurvsinghgautam/robin, s0md3v/Photon, Alfredredbird/tookie-osint, lanmaster53/recon-ng, et 50+ autres repos

> **Frontend Stack v4**: React + Shadcn UI + Aceternity + Framer Motion + GSAP + Anime.js + Three.js + Swiper.js + AOS + Tippy.js

---

## STATISTIQUES

| Catégorie | Nombre d'Outils | Status |
|-----------|-------------------|--------|
| CLI Tools (Python/Go/JS/Rust) | 350+ | À intégrer |
| Web/API Services | 400+ | À wrapper |
| Browser Extensions | 50+ | À documenter |
| Frameworks complets | 30+ | À intégrer |
| Datasets & DBs | 100+ | À connecter |
| AI/ML Tools | 50+ | À intégrer |
| **TOTAL** | **1000+** | **Objectif** |

---

## TABLE DES MATIÈRES

1. [Outils CLI - Batch 1: Essentiels (CRITIQUE)](#1-cli-batch-1-critique)
2. [Outils CLI - Batch 2: Username/Email/Phone](#2-cli-batch-2-identity)
3. [Outils CLI - Batch 3: Web/Recon](#3-cli-batch-3-web-recon)
4. [Outils CLI - Batch 4: Social Media](#4-cli-batch-4-social)
5. [Outils CLI - Batch 5: Infrastructure/Network](#5-cli-batch-5-infra)
6. [Outils CLI - Batch 6: Dark Web/Security](#6-cli-batch-6-security)
7. [Outils CLI - Batch 7: Image/Video/Geo](#7-cli-batch-7-media)
8. [Outils CLI - Batch 8: Dorks/Search](#8-cli-batch-8-search)
9. [Outils CLI - Batch 9: Misc/Utils](#9-cli-batch-9-utils)
10. [APIs Web - Batch 1: Bases de Données](#10-apis-batch-1)
11. [APIs Web - Batch 2: Search Engines](#11-apis-batch-2)
12. [APIs Web - Batch 3: Social Media](#12-apis-batch-3)
13. [APIs Web - Batch 4: Breaches](#13-apis-batch-4)
14. [APIs Web - Batch 5: Geo/Maps](#14-apis-batch-5)
15. [Frameworks Complets](#15-frameworks)
16. [Stratégie d'Implémentation](#16-strategie)

---

## 1. CLI BATCH 1: CRITIQUE (Implémenter en premier)

### 1.1 Reconnaissance de Base

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 1 | **theHarvester** | Python | Emails, subdomains, noms | `pip install theHarvester` | CRITIQUE | ⬜ |
| 2 | **SpiderFoot** | Python | 200+ modules OSINT auto | `pip install spiderfoot` | CRITIQUE | ⬜ |
| 3 | **Recon-ng** | Python | Framework reconnaissance | `pip install recon-ng` | CRITIQUE | ⬜ |
| 4 | **Amass** | Go | Attack surface mapping | `go install github.com/owasp-amass/amass` | CRITIQUE | ⬜ |
| 5 | **Subfinder** | Go | Passive subdomain enum | `go install github.com/projectdiscovery/subfinder` | CRITIQUE | ⬜ |
| 6 | **httpx** | Go | HTTP prober rapide | `go install github.com/projectdiscovery/httpx` | CRITIQUE | ⬜ |
| 7 | **Nuclei** | Go | Scanner vulnérabilités | `go install github.com/projectdiscovery/nuclei` | HIGH | ⬜ |
| 8 | **Katana** | Go | Web crawler | `go install github.com/projectdiscovery/katana` | HIGH | ⬜ |
| 9 | **Gau** | Go | GetAllUrls (wayback) | `go install github.com/lc/gau` | HIGH | ⬜ |
| 10 | **Waybackurls** | Go | Wayback Machine URLs | `go install github.com/tomnomnom/waybackurls` | HIGH | ⬜ |
| 11 | **Photōn** | Python | Crawler OSINT rapide | `pip install photon` | CRITIQUE | ⬜ |
| 12 | **Arjun** | Python | HTTP parameter discovery | `pip install arjun` | MEDIUM | ⬜ |
| 13 | **ParamSpider** | Python | Parameter mining | `pip install paramspider` | MEDIUM | ⬜ |
| 14 | **Gobuster** | Go | Directory busting | `go install github.com/OJ/gobuster` | HIGH | ⬜ |
| 15 | **FFuf** | Go | Web fuzzer | `go install github.com/ffuf/ffuf` | HIGH | ⬜ |
| 16 | **Feroxbuster** | Rust | Recursive content discovery | `cargo install feroxbuster` | MEDIUM | ⬜ |
| 17 | **WebSift** | Python | Web reconnaissance | `pip install websift` | MEDIUM | ⬜ |
| 18 | **web-check** | Node | All-in-one website OSINT | `npm install -g web-check` | HIGH | ⬜ |
| 19 | **Raccoon** | Python | Recon + vuln scanning | `pip install raccoon-scanner` | MEDIUM | ⬜ |
| 20 | **IVRE** | Python | Network recon framework | `pip install ivre` | MEDIUM | ⬜ |
| 21 | **Findomain** | Rust | Fast domain discovery | `cargo install findomain` | HIGH | ⬜ |
| 22 | **dnsx** | Go | DNS toolkit | `go install github.com/projectdiscovery/dnsx` | HIGH | ⬜ |
| 23 | **Naabu** | Go | Port scanner | `go install github.com/projectdiscovery/naabu` | MEDIUM | ⬜ |
| 24 | **Nmap** | C | Network scanner | `choco/apt install nmap` | CRITIQUE | ⬜ |
| 25 | **Masscan** | C | Fast port scanner | Binary | MEDIUM | ⬜ |

### 1.2 Username & Identity (CRITIQUE)

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 26 | **Sherlock** | Python | 400+ platforms username | `pip install sherlock-project` | CRITIQUE | ⬜ |
| 27 | **Maigret** | Python | Dossier par username/email | `pip install maigret` | CRITIQUE | ⬜ |
| 28 | **Holehe** | Python | Email → 120+ platforms | `pip install holehe` | CRITIQUE | ⬜ |
| 29 | **Ignorant** | Python | Phone → platforms | `pip install ignorant` | HIGH | ⬜ |
| 30 | **Social Analyzer** | Node | 1000+ sites analysis | `npm install -g social-analyzer` | HIGH | ⬜ |
| 31 | **Blackbird** | Python | Email → accounts | `pip install blackbird` | HIGH | ⬜ |
| 32 | **NexFil** | Python | Username check massif | `pip install nexfil` | HIGH | ⬜ |
| 33 | **Seekr** | Python | Multi-toolkit + notes | `pip install seekr` | MEDIUM | ⬜ |
| 34 | **Antisocial** | Python | 30+ platforms 3-tier | `pip install antisocial` | MEDIUM | ⬜ |
| 35 | **Snoop** | Python | Username search RU+EN | `pip install snoop` | MEDIUM | ⬜ |
| 36 | **Cupidcr4wl** | Python | Adult platforms check | `pip install cupidcr4wl` | LOW | ⬜ |
| 37 | **WhatsMyName** | Python | 500+ platforms | Git clone | HIGH | ⬜ |
| 38 | **NameChk** | Web | Multi-platform | API | MEDIUM | ⬜ |
| 39 | **CheckUser** | Python | Username checker | `pip install checkuser` | MEDIUM | ⬜ |
| 40 | **IDCrawl** | Web | Social search | API | LOW | ⬜ |
| 41 | **UserSearch** | Web | 3000+ sites | API | MEDIUM | ⬜ |
| 42 | **UserSearcher** | Web | 2000+ sites | API | MEDIUM | ⬜ |
| 43 | **Trace** | SaaS | 600+ platforms | API | MEDIUM | ⬜ |
| 44 | **SocialCatfish** | Web | Verification | API | LOW | ⬜ |
| 45 | **SherlockEye** | Web | Username search | API | MEDIUM | ⬜ |

### 1.3 Email OSINT (CRITIQUE)

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 46 | **h8mail** | Python | Breach hunting + email | `pip install h8mail` | CRITIQUE | ⬜ |
| 47 | **GHunt** | Python | Google emails investigate | `pip install ghunt` | CRITIQUE | ⬜ |
| 48 | **Buster** | Python | Email verification | `pip install buster` | MEDIUM | ⬜ |
| 49 | **EmailRep** | API | Email reputation | API Key | HIGH | ⬜ |
| 50 | **EmailHippo** | API | Email verification | API Key | MEDIUM | ⬜ |
| 51 | **Hunter.io** | API | Email finder | API Key | HIGH | ⬜ |
| 52 | **Snov.io** | API | Email finder | API Key | HIGH | ⬜ |
| 53 | **DeHashed** | API | Breach search | API Key | CRITIQUE | ⬜ |
| 54 | **Have I Been Pwned** | API | Breach check | API Key | CRITIQUE | ⬜ |
| 55 | **LeakCheck** | API | 7.5B+ breaches | API Key | HIGH | ⬜ |
| 56 | **Epieos** | Web | OSINT tools | Web | MEDIUM | ⬜ |
| 57 | **Email Permutator** | Web | Generate combos | Web | MEDIUM | ⬜ |
| 58 | **Peepmail** | Tool | Discovery | Git | MEDIUM | ⬜ |
| 59 | **OSINTEye** | C# | Multi-tool desktop | Git | MEDIUM | ⬜ |
| 60 | **Minerva OSINT** | Python | Email search | `pip install minerva` | MEDIUM | ⬜ |
| 61 | **IntelBase** | API | Forensics | API | MEDIUM | ⬜ |
| 62 | **Reacher** | API | Verification | API | MEDIUM | ⬜ |
| 63 | **Skymem** | API | Email finder | API | LOW | ⬜ |
| 64 | **VoilaNorbert** | API | Email finder | API | MEDIUM | ⬜ |
| 65 | **FindThatLead** | API | Email finder | API | MEDIUM | ⬜ |
| 66 | **Anymail Finder** | API | Email finder | API | MEDIUM | ⬜ |
| 67 | **Clearbit** | API | Enrichment | API Key | HIGH | ⬜ |
| 68 | **FullContact** | API | Enrichment | API Key | HIGH | ⬜ |
| 69 | **Pipl** | API | Identity | API Key | CRITIQUE | ⬜ |
| 70 | **Spokeo** | API | People search | API | MEDIUM | ⬜ |

### 1.4 Phone OSINT (CRITIQUE)

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 71 | **PhoneInfoga** | Go | Advanced phone OSINT | `go install` | CRITIQUE | ⬜ |
| 72 | **PhoneIntel** | Python | Phone investigation | `pip install phoneintel` | HIGH | ⬜ |
| 73 | **Truecaller** | API | Reverse lookup | API Key | HIGH | ⬜ |
| 74 | **Twilio Lookup** | API | Carrier info | API Key | MEDIUM | ⬜ |
| 75 | **Phone Validator** | API | US validation | API | MEDIUM | ⬜ |
| 76 | **CallerID Test** | API | Caller ID | API | MEDIUM | ⬜ |
| 77 | **FreeCarrierLookup** | Web | Carrier lookup | Web | MEDIUM | ⬜ |
| 78 | **Sync.ME** | API | Caller ID | API | MEDIUM | ⬜ |
| 79 | **Infobel** | API | Global directory | API | LOW | ⬜ |
| 80 | **NumLookup** | Web | Reverse lookup | Web | MEDIUM | ⬜ |
| 81 | **Spydialer** | Web | Voicemail check | Web | MEDIUM | ⬜ |
| 82 | **EmobileTracker** | Web | Location | Web | LOW | ⬜ |
| 83 | **InMobPrefix** | DB | India prefixes | Git | LOW | ⬜ |
| 84 | **OpenCNAM** | API | Caller ID | API | MEDIUM | ⬜ |
| 85 | **NumVerify** | API | Validation | API Key | HIGH | ⬜ |
| 86 | **Veriphone** | API | Validation | API | MEDIUM | ⬜ |
| 87 | **Abstract Phone API** | API | Validation | API | MEDIUM | ⬜ |
| 88 | **That's Them** | Web | Reverse lookup | Web | MEDIUM | ⬜ |
| 89 | **Nuwber** | Web | People search | Web | MEDIUM | ⬜ |
| 90 | **Next Caller** | API | Caller ID | API | LOW | ⬜ |

### 1.5 Instagram (CRITIQUE)

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 91 | **InstagramPrivSniffer** | Python | **PRIVATE account viewer** - View private posts via collaboration exploit | `git clone https://github.com/obitouka/InstagramPrivSniffer.git` | **CRITIQUE** | ⬜ |
| 92 | **Osintgram** | Python | Interactive shell | `pip install osintgram` | CRITIQUE | ⬜ |
| 93 | **Instaloader** | Python | Download + metadata | `pip install instaloader` | CRITIQUE | ⬜ |
| 94 | **Toutatis** | Python | Extract email/phone | `pip install toutatis` | HIGH | ⬜ |
| 95 | **instagram_monitor** | Python | Real-time tracking | Git | HIGH | ⬜ |
| 96 | **Osintgraph** | Python | Neo4j graph | `pip install osintgraph` | MEDIUM | ⬜ |
| 97 | **Dolphin Radar** | Web | Viewer web | Web | LOW | ⬜ |
| 98 | **Iconosquare** | Web | Analytics | Web | LOW | ⬜ |
| 99 | **InstaFollowers** | Python | Follower analysis | Git | MEDIUM | ⬜ |
| 100 | **IG-Profiler** | Python | Profile analysis | Git | MEDIUM | ⬜ |

**InstagramPrivSniffer** (https://github.com/obitouka/InstagramPrivSniffer):
- **Fonction**: Premier outil permettant de visualiser les posts de comptes Instagram privés anonymement
- **Méthode**: Exploite la fonctionnalité de collaboration Instagram pour accéder aux posts privés via des comptes publics
- **Installation**: `git clone` + `pip install -r requirements.txt`
- **Usage**: Digital investigations, cyber units
- **Note**: Comportement confirmé par Meta comme "intended behavior" (collaboration feature)
- **Priorité**: **ABSOLUE** - Capacité unique sur le marché

---

## 2. CLI BATCH 2: IDENTITY & INVESTIGATION

### 2.1 Person Search (High Priority)

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 101 | **Pipl** | API | Identity resolution | API | CRITIQUE | ⬜ |
| 102 | **Spokeo** | Web | People search | API | MEDIUM | ⬜ |
| 103 | **Intelius** | Web | Background check | API | MEDIUM | ⬜ |
| 104 | **Whitepages** | API | People/phone | API | MEDIUM | ⬜ |
| 105 | **BeenVerified** | Web | People search | API | MEDIUM | ⬜ |
| 106 | **ThatsThem** | Web | Reverse lookup | Web | MEDIUM | ⬜ |
| 107 | **TruePeopleSearch** | Web | People search | Web | MEDIUM | ⬜ |
| 108 | **FastPeopleSearch** | Web | People search | Web | MEDIUM | ⬜ |
| 109 | **SearchPeopleFREE** | Web | Reverse lookup | Web | MEDIUM | ⬜ |
| 110 | **FamilyTreeNow** | Web | Genealogy | Web | MEDIUM | ⬜ |
| 111 | **PeekYou** | Web | People search | Web | LOW | ⬜ |
| 112 | **ZabaSearch** | Web | People search | Web | LOW | ⬜ |
| 113 | **PeopleFinder** | Web | People search | Web | MEDIUM | ⬜ |
| 114 | **Addresses.com** | Web | Address lookup | Web | LOW | ⬜ |
| 115 | **AnyWho** | Web | People search | Web | LOW | ⬜ |
| 116 | **Classmates.com** | Web | School search | Web | LOW | ⬜ |
| 117 | **Radaris** | Web | People search | Web | MEDIUM | ⬜ |
| 118 | **US Search** | Web | Background | Web | MEDIUM | ⬜ |
| 119 | **PeopleLookUp** | Web | Search | Web | LOW | ⬜ |
| 120 | **Census Finder** | Web | Census records | Web | LOW | ⬜ |

### 2.2 Public Records

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 121 | **Arrests.org** | Web | Arrest records | Web | MEDIUM | ⬜ |
| 122 | **Mugshots.com** | Web | Mugshots | Web | MEDIUM | ⬜ |
| 123 | **Jailbase** | Web | Inmate search | Web | MEDIUM | ⬜ |
| 124 | **VINELink** | API | Victim notification | API | MEDIUM | ⬜ |
| 125 | **PACER** | API | Court cases | API | MEDIUM | ⬜ |
| 126 | **CourtListener** | API | Court opinions | API | MEDIUM | ⬜ |
| 127 | **JudyRecords** | Web | Court cases | Web | MEDIUM | ⬜ |
| 128 | **UniCourt** | API | Court data | API | MEDIUM | ⬜ |
| 129 | **CaseLaw Access** | API | Legal cases | API | MEDIUM | ⬜ |
| 130 | **Google Scholar** | API | Academic | API | MEDIUM | ⬜ |
| 131 | **qPublic** | Web | Property records | Web | MEDIUM | ⬜ |
| 132 | **Zillow** | API | Real estate | API | MEDIUM | ⬜ |
| 133 | **OpenCorporates** | API | Companies | API | HIGH | ⬜ |
| 134 | **EDGAR** | API | SEC filings | API | MEDIUM | ⬜ |
| 135 | **Crunchbase** | API | Startups | API | MEDIUM | ⬜ |
| 136 | **LinkedIn Sales Nav** | API | B2B data | API | MEDIUM | ⬜ |
| 137 | **Clearbit** | API | Company intel | API | HIGH | ⬜ |
| 138 | **BuiltWith** | API | Tech stack | API | HIGH | ⬜ |
| 139 | **SpyOnWeb** | Web | Analytics ID | Web | MEDIUM | ⬜ |
| 140 | **SimilarWeb** | API | Traffic | API | MEDIUM | ⬜ |

### 2.3 Breach & Leak Databases

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 141 | **DeHashed** | API | 15B+ records | API | CRITIQUE | ⬜ |
| 142 | **Have I Been Pwned** | API | 11B+ records | API | CRITIQUE | ⬜ |
| 143 | **LeakCheck** | API | 7.5B+ records | API | HIGH | ⬜ |
| 144 | **LeakRadar** | API | Stealer logs | API | HIGH | ⬜ |
| 145 | **StealSeek** | Web | Breach search | Web | MEDIUM | ⬜ |
| 146 | **Venacus** | API | Monitoring | API | MEDIUM | ⬜ |
| 147 | **Hudson Rock** | API | Stealer check | API | HIGH | ⬜ |
| 148 | **InfoStealers** | API | Darknet logs | API | HIGH | ⬜ |
| 149 | **CredenShow** | Web | Credentials | Web | MEDIUM | ⬜ |
| 150 | **HIB Ransomed** | Web | Ransomware | Web | MEDIUM | ⬜ |
| 151 | **IKnowYour.Dad** | Web | Breach search | Web | LOW | ⬜ |
| 152 | **Leaker** | Rust | CLI enumeration | `cargo install` | HIGH | ⬜ |
| 153 | **NOX** | Rust | Deep analysis | Git | MEDIUM | ⬜ |
| 154 | **SnusBase** | Web | Breaches | Web | MEDIUM | ⬜ |
| 155 | **Intelligence X** | API | Archive | API | HIGH | ⬜ |
| 156 | **Scylla.so** | Web | Breach DB | Web | MEDIUM | ⬜ |
| 157 | **WeLeakInfo** | Web | Leaks | Web | MEDIUM | ⬜ |
| 158 | **BreachDirectory** | Web | Breach check | Web | MEDIUM | ⬜ |
| 159 | **Leak-Lookup** | Web | 3B+ records | Web | MEDIUM | ⬜ |
| 160 | **WhiteIntel** | Web | Dark web | Web | MEDIUM | ⬜ |
| 161 | **PSBDMP** | Web | Pastebin dumps | Web | MEDIUM | ⬜ |
| 162 | **LibraryOfLeaks** | Web | Leak docs | Web | MEDIUM | ⬜ |
| 163 | **Findemail.io** | Web | Email finder | Web | LOW | ⬜ |
| 164 | **ScamSearch** | Web | Scam check | Web | LOW | ⬜ |
| 165 | **SpyCloud** | API | Endpoint check | API | MEDIUM | ⬜ |
| 166 | **GreyNoise** | API | IP intel | API | HIGH | ⬜ |
| 167 | **LeakRadar** | API | Monitoring | API | HIGH | ⬜ |
| 168 | **BreachDB** | Python | Local breach DB | `pip install` | MEDIUM | ⬜ |
| 169 | **PwnedDB** | Python | Breach search | Git | MEDIUM | ⬜ |
| 170 | **LeakSentry** | Python | Breach monitor | Git | MEDIUM | ⬜ |

---

## 3. CLI BATCH 3: WEB RECONNAISSANCE

### 3.1 Domain & DNS (Suite)

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 171 | **DNSrecon** | Python | DNS enumeration | `pip install dnsrecon` | HIGH | ⬜ |
| 172 | **Fierce** | Python | DNS + subdomain | `pip install fierce` | MEDIUM | ⬜ |
| 173 | **DNSDumpster** | Web | DNS recon | API | HIGH | ⬜ |
| 174 | **DNSlytics** | Web | DNS analytics | Web | MEDIUM | ⬜ |
| 175 | **SecurityTrails** | API | DNS history | API | HIGH | ⬜ |
| 176 | **WHOIS** | CLI | Registration | Built-in | HIGH | ⬜ |
| 177 | **WHOISology** | Web | WHOIS archive | Web | MEDIUM | ⬜ |
| 178 | **Domain Tools** | API | Domain intel | API | HIGH | ⬜ |
| 179 | **CentralOps** | Web | Domain dossier | Web | MEDIUM | ⬜ |
| 180 | **DNS History** | Web | DNS changes | Web | MEDIUM | ⬜ |
| 181 | **DomainRecon** | Tool | Multi-source | Web | MEDIUM | ⬜ |
| 182 | **IntoDNS.ai** | AI | DNS scanner | Web | MEDIUM | ⬜ |
| 183 | **SubDomainRadar** | Web | Subdomain scan | Web | MEDIUM | ⬜ |
| 184 | **DNSSpy** | API | Monitoring | API | MEDIUM | ⬜ |
| 185 | **ViewDNS** | Web | DNS tools | Web | MEDIUM | ⬜ |
| 186 | **Robtex** | Web | DNS/BGP | Web | MEDIUM | ⬜ |
| 187 | **Ripe Stat** | API | BGP/DNS | API | MEDIUM | ⬜ |
| 188 | **BGPView** | API | ASN/BGP | API | MEDIUM | ⬜ |
| 189 | **Hurricane Electric** | Web | BGP tools | Web | MEDIUM | ⬜ |
| 190 | **CTFR** | Python | Cert transparency | `pip install ctfr` | MEDIUM | ⬜ |

### 3.2 Web Technology Detection

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 191 | **Wappalyzer** | Node | Tech detection | `npm install -g wappalyzer` | HIGH | ⬜ |
| 192 | **WhatWeb** | Ruby | Tech scanner | `gem install whatweb` | HIGH | ⬜ |
| 193 | **BuiltWith** | API | Tech stack | API | HIGH | ⬜ |
| 194 | **Retire.js** | Node | Vuln detection | `npm install -g retire` | MEDIUM | ⬜ |
| 195 | **SSLyze** | Python | SSL scanner | `pip install sslyze` | MEDIUM | ⬜ |
| 196 | **TestSSL** | Shell | SSL testing | Binary | MEDIUM | ⬜ |
| 197 | **Nmap NSE** | Lua | Scripts vuln | Built-in | MEDIUM | ⬜ |
| 198 | **Nikto** | Perl | Web scanner | Binary | MEDIUM | ⬜ |
| 199 | **W3AF** | Python | Web audit | `pip install w3af` | LOW | ⬜ |
| 200 | **Arachni** | Ruby | Web scanner | `gem install arachni` | LOW | ⬜ |

### 3.3 URL & Content Analysis

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 201 | **URLScan.io** | API | URL sandbox | API | HIGH | ⬜ |
| 202 | **Hybrid Analysis** | API | File/URL analysis | API | HIGH | ⬜ |
| 203 | **VirusTotal** | API | Reputation | API | CRITIQUE | ⬜ |
| 204 | **Any.run** | API | Interactive sandbox | API | MEDIUM | ⬜ |
| 205 | **JoeSandbox** | API | Malware analysis | API | MEDIUM | ⬜ |
| 206 | **Cuckoo** | Python | Sandbox | `pip install cuckoo` | LOW | ⬜ |
| 207 | **Intezer** | API | File analysis | API | MEDIUM | ⬜ |
| 208 | **ReversingLabs** | API | Threat intel | API | MEDIUM | ⬜ |
| 209 | **URLhaus** | API | Malware URLs | API | HIGH | ⬜ |
| 210 | **PhishTank** | API | Phishing check | API | MEDIUM | ⬜ |

---

## 4. CLI BATCH 4: SOCIAL MEDIA DEEP

### 4.1 Twitter/X

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 211 | **Twint** | Python | No-API scraping | `pip install twint` | HIGH | ⬜ |
| 212 | **Tweepy** | Python | API wrapper | `pip install tweepy` | HIGH | ⬜ |
| 213 | **Twitter-API-v2** | Python | Official API | `pip install twitter-api-client` | HIGH | ⬜ |
| 214 | **ExportData** | Web | Historical tweets | Web | MEDIUM | ⬜ |
| 215 | **Foller.me** | Web | Account analysis | Web | LOW | ⬜ |
| 216 | **OneMillionTweetMap** | Web | Geo viz | Web | LOW | ⬜ |
| 217 | **Sentiment140** | API | Sentiment | API | LOW | ⬜ |
| 218 | **Twitter Audit** | Web | Follower audit | Web | LOW | ⬜ |
| 219 | **Xquik** | API | Real-time data | API | MEDIUM | ⬜ |
| 220 | **TweetMap** | Web | Tweet mapping | Web | LOW | ⬜ |
| 221 | **TweetDeck** | Web | Monitoring | Web | LOW | ⬜ |
| 222 | **FollowerWonk** | Web | Analytics | Web | LOW | ⬜ |
| 223 | **SocialBlade** | API | Stats | API | LOW | ⬜ |
| 224 | **TweetBeaver** | Web | Data export | Web | LOW | ⬜ |
| 225 | **AllMyTweets** | Web | Archive | Web | LOW | ⬜ |

### 4.2 Facebook

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 226 | **Facebook-Scraper** | Python | FB scraping | `pip install facebook-scraper` | HIGH | ⬜ |
| 227 | **Fb-sleep-stats** | Node | Sleep tracking | Git | LOW | ⬜ |
| 228 | **SearchIsBack** | Web | Graph search | Web | MEDIUM | ⬜ |
| 229 | **Lookup-ID.com** | Web | ID finder | Web | LOW | ⬜ |
| 230 | **haveibeenzuckered** | Web | Breach check | Web | MEDIUM | ⬜ |
| 231 | **Fanpage Karma** | Web | Analytics | Web | LOW | ⬜ |
| 232 | **Facebook Friend Scraper** | Python | Friends list | Git | MEDIUM | ⬜ |
| 233 | **Wolfram FB Report** | API | Analytics | API | LOW | ⬜ |
| 234 | **SOWSearch** | Web | Search tool | Web | LOW | ⬜ |
| 235 | **Facebook Matrix** | Web | Search | Web | LOW | ⬜ |

### 4.3 LinkedIn

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 236 | **Crosslinked** | Python | LinkedIn enum | `pip install crosslinked` | HIGH | ⬜ |
| 237 | **LinkedInDumper** | Python | Employees dump | Git | HIGH | ⬜ |
| 238 | **the-endorser** | Python | Endorsement graph | Git | MEDIUM | ⬜ |
| 239 | **Proxycurl** | API | LinkedIn data | API | MEDIUM | ⬜ |
| 240 | **PhantomBuster** | SaaS | Automation | API | MEDIUM | ⬜ |
| 241 | **Linked Helper** | Desktop | Automation | App | LOW | ⬜ |
| 242 | **Dux-Soup** | Extension | Automation | Ext | LOW | ⬜ |
| 243 | **Evaboot** | SaaS | Data export | API | LOW | ⬜ |
| 244 | **TexAu** | SaaS | Automation | API | LOW | ⬜ |
| 245 | **SNScrape** | Python | Scraping | `pip install snscrape` | HIGH | ⬜ |

### 4.4 Reddit

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 246 | **PRAW** | Python | API wrapper | `pip install praw` | HIGH | ⬜ |
| 247 | **Pushshift** | API | Historical data | API | HIGH | ⬜ |
| 248 | **Pullpush** | API | Deleted content | API | HIGH | ⬜ |
| 249 | **Arctic Shift** | Rust/TS | Reddit dumps | Git | MEDIUM | ⬜ |
| 250 | **Reddit User Analyser** | Web | Profile analysis | Web | LOW | ⬜ |
| 251 | **RedditMetis** | Web | Stats | Web | LOW | ⬜ |
| 252 | **Universal Scammer List** | Web | Scam check | Web | LOW | ⬜ |
| 253 | **Reveddit** | Web | Deleted content | Web | MEDIUM | ⬜ |
| 254 | **Redditsearch.io** | Web | Search | Web | LOW | ⬜ |
| 255 | **Camas.ryan** | Web | User search | Web | LOW | ⬜ |

### 4.5 TikTok

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 256 | **TikTok-Scraper** | Node | Video/user data | `npm install -g tiktok-scraper` | HIGH | ⬜ |
| 257 | **TikTok-Api** | Python | API wrapper | `pip install TikTokApi` | HIGH | ⬜ |
| 258 | **proxitok** | Web | TikTok viewer | Web | MEDIUM | ⬜ |
| 259 | **Urlebird** | Web | TikTok search | Web | MEDIUM | ⬜ |
| 260 | **TikTok Analytics** | Web | Stats | Web | LOW | ⬜ |
| 261 | **Exolyt** | SaaS | Analytics | API | LOW | ⬜ |
| 262 | **Pentos** | SaaS | Analytics | API | LOW | ⬜ |
| 263 | **Tokboard** | Web | Analytics | Web | LOW | ⬜ |
| 264 | **TikRank** | Web | Ranking | Web | LOW | ⬜ |
| 265 | **VidNice** | Web | Viewer | Web | LOW | ⬜ |

---

## 5. CLI BATCH 5: INFRASTRUCTURE & NETWORK

### 5.1 Network Intelligence

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 266 | **Shodan** | Python | Device search | `pip install shodan` | CRITIQUE | ⬜ |
| 267 | **Censys** | Python | Asset discovery | `pip install censys` | CRITIQUE | ⬜ |
| 268 | **BinaryEdge** | API | Threat intel | API | HIGH | ⬜ |
| 269 | **Fofa** | API | Chinese Shodan | API | MEDIUM | ⬜ |
| 270 | **Quake** | API | 360 scanner | API | MEDIUM | ⬜ |
| 271 | **Hunter** | API | Asset discovery | API | MEDIUM | ⬜ |
| 272 | **Netlas** | API | Asset discovery | API | MEDIUM | ⬜ |
| 273 | **Onyphe** | API | OSINT engine | API | MEDIUM | ⬜ |
| 274 | **FullHunt** | API | Attack surface | API | HIGH | ⬜ |
| 275 | **GreyNoise** | API | IP intel | API | HIGH | ⬜ |
| 276 | **AbuseIPDB** | API | Abuse reports | API | HIGH | ⬜ |
| 277 | **IPVoid** | Web | IP tools | Web | MEDIUM | ⬜ |
| 278 | **IPLocation.io** | API | Geolocation | API | MEDIUM | ⬜ |
| 279 | **IPinfo** | API | IP data | API | HIGH | ⬜ |
| 280 | **IP2Location** | API | Geolocation | API | MEDIUM | ⬜ |
| 281 | **MaxMind** | API | GeoIP | API | HIGH | ⬜ |
| 282 | **DB-IP** | API | IP intel | API | MEDIUM | ⬜ |
| 283 | **IP-API** | API | Free geolocation | API | MEDIUM | ⬜ |
| 284 | **IPRegistry** | API | IP data | API | MEDIUM | ⬜ |
| 285 | **BigDataCloud** | API | IP geolocation | API | LOW | ⬜ |

### 5.2 Wireless & IoT

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 286 | **WiGLE** | API | WiFi wardriving | API | MEDIUM | ⬜ |
| 287 | **Aircrack-ng** | C | WiFi security | Binary | MEDIUM | ⬜ |
| 288 | **Kismet** | C++ | Wireless detector | Binary | MEDIUM | ⬜ |
| 289 | **WigleWiFi** | Android | Wardriving | App | LOW | ⬜ |
| 290 | **Shodan Images** | Web | Webcam search | Web | MEDIUM | ⬜ |
| 291 | **Insecam** | Web | Camera search | Web | LOW | ⬜ |
| 292 | **EarthCam** | Web | Live cameras | Web | LOW | ⬜ |
| 293 | **Opentopia** | Web | Camera directory | Web | LOW | ⬜ |
| 294 | **Network Camera Critic** | Web | Camera analysis | Web | LOW | ⬜ |
| 295 | **Shodan IoT** | API | IoT search | API | HIGH | ⬜ |

### 5.3 DNS & Infrastructure

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 296 | **CloudFlare** | API | CDN/DNS | API | MEDIUM | ⬜ |
| 297 | **AWS IP Ranges** | JSON | IP lists | API | MEDIUM | ⬜ |
| 298 | **Google IP Ranges** | JSON | IP lists | API | MEDIUM | ⬜ |
| 299 | **Azure IP Ranges** | JSON | IP lists | API | MEDIUM | ⬜ |
| 300 | **CDN Checker** | Python | CDN detection | `pip install` | MEDIUM | ⬜ |
| 301 | **WafW00f** | Python | WAF detection | `pip install wafw00f` | MEDIUM | ⬜ |
| 302 | **CloudEnum** | Python | Cloud enum | `pip install cloudenum` | MEDIUM | ⬜ |
| 303 | **S3Scanner** | Python | S3 bucket scan | `pip install s3scanner` | MEDIUM | ⬜ |
| 304 | **GCPBucketBrute** | Python | GCP buckets | Git | MEDIUM | ⬜ |
| 305 | **AzureBlobScanner** | Python | Azure blobs | Git | MEDIUM | ⬜ |

---

## 6. CLI BATCH 6: DARK WEB & SECURITY

### 6.1 Dark Web Tools

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 306 | **Robin** | Python | AI Dark Web OSINT | `pip install robin-osint` | CRITIQUE | ⬜ |
| 307 | **Tor** | Binary | Proxy SOCKS5 | `winget install Tor` | CRITIQUE | ⬜ |
| 308 | **Tor Browser** | Binary | Anonymous browser | Binary | HIGH | ⬜ |
| 309 | **DarkSearch** | Web | Dark web search | Web | MEDIUM | ⬜ |
| 310 | **Ahmia** | Web | Tor search | Web | MEDIUM | ⬜ |
| 311 | **OnionScan** | Go | Hidden services | `go install` | MEDIUM | ⬜ |
| 312 | **Tor66** | Web | Tor search | Web | LOW | ⬜ |
| 313 | **Phobos** | Web | Dark web search | Web | LOW | ⬜ |
| 314 | **OnionLand** | Web | Tor search | Web | LOW | ⬜ |
| 315 | **Torch** | Web | Tor search | Web | LOW | ⬜ |
| 316 | **Not Evil** | Web | Tor search | Web | LOW | ⬜ |
| 317 | **Haystak** | Web | Tor search | Web | LOW | ⬜ |
| 318 | **Dark Web Monitor** | SaaS | Monitoring | API | MEDIUM | ⬜ |
| 319 | **Flare Systems** | SaaS | Threat intel | API | MEDIUM | ⬜ |
| 320 | **Silk Road Monitor** | Web | Market tracking | Web | LOW | ⬜ |

### 6.2 Threat Intelligence

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 321 | **MISP** | PHP | Threat sharing | Docker | HIGH | ⬜ |
| 322 | **OpenCTI** | Python | TI platform | Docker | HIGH | ⬜ |
| 323 | **YETI** | Python | TI platform | `pip install` | HIGH | ⬜ |
| 324 | **IntelOwl** | Python | TI aggregator | Docker | HIGH | ⬜ |
| 325 | **ThreatMiner** | Web | TI portal | Web | MEDIUM | ⬜ |
| 326 | **Pulsedive** | API | TI solutions | API | HIGH | ⬜ |
| 327 | **Threat Landscape** | Web | OSINT signals | Web | MEDIUM | ⬜ |
| 328 | **Talos** | Web | Cisco intel | Web | MEDIUM | ⬜ |
| 329 | **FortiGuard** | Web | Fortinet intel | Web | MEDIUM | ⬜ |
| 330 | **Hunt.io** | Web | Threat hunting | Web | MEDIUM | ⬜ |
| 331 | **MITRE ATT&CK** | Web | Knowledge base | Web | HIGH | ⬜ |
| 332 | **Abuse.ch** | API | Malware tracking | API | HIGH | ⬜ |
| 333 | **URLhaus** | API | Malware URLs | API | HIGH | ⬜ |
| 334 | **MalwareBazaar** | API | Malware samples | API | HIGH | ⬜ |
| 335 | **ThreatFox** | API | IOC sharing | API | HIGH | ⬜ |
| 336 | **FeodoTracker** | API | C2 tracking | API | MEDIUM | ⬜ |
| 337 | **C2IntelFeeds** | Git | C2 intel | Git | MEDIUM | ⬜ |
| 338 | **PhishTank** | API | Phishing | API | MEDIUM | ⬜ |
| 339 | **Shodan Monitor** | API | Network monitoring | API | MEDIUM | ⬜ |
| 340 | **IBM X-Force** | API | TI sharing | API | MEDIUM | ⬜ |

### 6.3 Malware Analysis

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 341 | **YARA** | Python | Pattern matching | `pip install yara-python` | HIGH | ⬜ |
| 342 | **Sigma** | YAML | SIEM signatures | Git | HIGH | ⬜ |
| 343 | **Volatility** | Python | Memory forensics | `pip install volatility3` | MEDIUM | ⬜ |
| 344 | **Rekall** | Python | Memory analysis | `pip install rekall` | MEDIUM | ⬜ |
| 345 | **MalwareJail** | JS | Dynamic analysis | Git | MEDIUM | ⬜ |
| 346 | **JsX-Ray** | JS | JS analysis | `npm install -g jsx-ray` | MEDIUM | ⬜ |
| 347 | **Box-JS** | JS | JS sandbox | `npm install -g box-js` | MEDIUM | ⬜ |
| 348 | **peframe** | Python | PE analysis | `pip install peframe` | MEDIUM | ⬜ |
| 349 | **Detect It Easy** | C++ | Packer detector | Binary | MEDIUM | ⬜ |
| 350 | **Exeinfo PE** | Windows | PE analysis | Binary | LOW | ⬜ |

---

## 7. CLI BATCH 7: IMAGE, VIDEO & GEO

### 7.1 Image Analysis

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 351 | **ExifTool** | Perl | EXIF extraction | Binary | CRITIQUE | ⬜ |
| 352 | **Exif Pilot** | Desktop | EXIF editor | App | MEDIUM | ⬜ |
| 353 | **Jeffrey's Exif Viewer** | Web | Online EXIF | Web | LOW | ⬜ |
| 354 | **Forensically** | Web | Image forensics | Web | MEDIUM | ⬜ |
| 355 | **Error Level Analysis** | Web | ELA detection | Web | MEDIUM | ⬜ |
| 356 | **FotoForensics** | Web | Image analysis | Web | MEDIUM | ⬜ |
| 357 | **InVID** | Web | Video verification | Web | HIGH | ⬜ |
| 358 | **TruePic Vision** | SaaS | Image verify | API | MEDIUM | ⬜ |
| 359 | **Clarify** | API | Image tagging | API | MEDIUM | ⬜ |
| 360 | **Google Lens** | API | Visual search | API | HIGH | ⬜ |

### 7.2 Reverse Image Search

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 361 | **TinEye** | API | Reverse image | API | HIGH | ⬜ |
| 362 | **PimEyes** | API | Face search | API | HIGH | ⬜ |
| 363 | **FaceCheck.ID** | API | Face recognition | API | HIGH | ⬜ |
| 364 | **Faceagle** | Web | Face search | Web | MEDIUM | ⬜ |
| 365 | **Lenso.ai** | AI | AI search | API | MEDIUM | ⬜ |
| 366 | **PicTriev** | Web | Face matching | Web | LOW | ⬜ |
| 367 | **Betaface** | API | Face detection | API | LOW | ⬜ |
| 368 | **Search4Faces** | API | VK/OK search | API | MEDIUM | ⬜ |
| 369 | **Pixsy** | SaaS | Copyright | API | LOW | ⬜ |
| 370 | **Image Raider** | Web | Bulk search | Web | LOW | ⬜ |
| 371 | **Dupli Checker** | Web | Plagiarism | Web | LOW | ⬜ |
| 372 | **Yandex Images** | Web | Reverse RU | Web | HIGH | ⬜ |
| 373 | **Bing Images** | API | Reverse | API | MEDIUM | ⬜ |
| 374 | **KarmaDecay** | Web | Reddit reverse | Web | LOW | ⬜ |
| 375 | **RevEye** | Ext | Multi-engine | Ext | MEDIUM | ⬜ |

### 7.3 Geolocation & Maps

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 376 | **GeoSpyer** | Python | AI geolocation | `pip install geospy` | HIGH | ⬜ |
| 377 | **Pic2Map** | Web | EXIF geolocation | Web | MEDIUM | ⬜ |
| 378 | **I Know Where Your Cat Lives** | Web | Flickr geo | Web | LOW | ⬜ |
| 379 | **Photo Map** | Web | Photo mapping | Web | LOW | ⬜ |
| 380 | **GeoGuessr AI** | Python | AI prediction | `pip install` | MEDIUM | ⬜ |
| 381 | **SunCalc** | Web | Sun position | Web | LOW | ⬜ |
| 382 | **MoonCalc** | Web | Moon position | Web | LOW | ⬜ |
| 383 | **TimeAndDate** | Web | Time zones | Web | LOW | ⬜ |
| 384 | **WorldTimeBuddy** | Web | Time conversion | Web | LOW | ⬜ |
| 385 | **SunriseSunset** | API | Sun times | API | LOW | ⬜ |

### 7.4 Mapping Tools

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 386 | **Google Maps** | API | Maps/geocoding | API | CRITIQUE | ⬜ |
| 387 | **Bing Maps** | API | Maps | API | HIGH | ⬜ |
| 388 | **OpenStreetMap** | Web | Open maps | Web | HIGH | ⬜ |
| 389 | **Nominatim** | API | Geocoding | API | HIGH | ⬜ |
| 390 | **Mapbox** | API | Custom maps | API | MEDIUM | ⬜ |
| 391 | **QGIS** | Desktop | GIS analysis | Binary | MEDIUM | ⬜ |
| 392 | **Google Earth Pro** | Desktop | Satellite | Binary | MEDIUM | ⬜ |
| 393 | **Sentinel Hub** | API | Satellite | API | MEDIUM | ⬜ |
| 394 | **Zoom Earth** | Web | Live satellite | Web | MEDIUM | ⬜ |
| 395 | **Windy** | Web | Weather maps | Web | MEDIUM | ⬜ |
| 396 | **SAS Planet** | Desktop | Map viewer | Binary | LOW | ⬜ |
| 397 | **Soar.earth** | Web | Satellite | Web | MEDIUM | ⬜ |
| 398 | **COPERNIX** | Web | Satellite | Web | LOW | ⬜ |
| 399 | **Marble** | Desktop | Globe | Binary | LOW | ⬜ |
| 400 | **NASA WorldWind** | JS | 3D globe | Lib | LOW | ⬜ |

---

## 8. CLI BATCH 8: DORKS & SEARCH

### 8.1 Google Dorks

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 401 | **DorkEye** | Python | Auto Google Dorking | `pip install dorkeye` | HIGH | ⬜ |
| 402 | **DorkGenius** | Web | AI dork gen | Web | MEDIUM | ⬜ |
| 403 | **DorkGPT** | Web | AI dorks | Web | MEDIUM | ⬜ |
| 404 | **SearchDorks** | Web | Multi-engine | Web | MEDIUM | ⬜ |
| 405 | **GHDB** | Web | Hacking DB | Web | MEDIUM | ⬜ |
| 406 | **GoogleDorkBuilder** | Python | Dork builder | `pip install` | LOW | ⬜ |
| 407 | **Pagodo** | Python | Google dorking | `pip install pagodo` | MEDIUM | ⬜ |
| 408 | **dorks_hunter** | Python | Dork finder | Git | LOW | ⬜ |
| 409 | **Fast Google Dorks Scan** | Python | Fast scan | Git | MEDIUM | ⬜ |
| 410 | **snitch** | Python | Dorker | `pip install snitch` | LOW | ⬜ |

### 8.2 Search Engines

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 411 | **SerpAPI** | API | Search scraper | API | HIGH | ⬜ |
| 412 | **SERP Wow** | API | Search API | API | MEDIUM | ⬜ |
| 413 | **DataForSEO** | API | SEO data | API | MEDIUM | ⬜ |
| 414 | **Apify** | API | Web scraping | API | MEDIUM | ⬜ |
| 415 | **ScrapingBee** | API | Proxy scraping | API | MEDIUM | ⬜ |
| 416 | **ScraperAPI** | API | Proxy API | API | MEDIUM | ⬜ |
| 417 | **BrightData** | API | Proxy network | API | MEDIUM | ⬜ |
| 418 | **Oxylabs** | API | Proxy API | API | MEDIUM | ⬜ |
| 419 | **Smartproxy** | API | Proxy network | API | MEDIUM | ⬜ |
| 420 | **Rayobyte** | API | Proxy service | API | MEDIUM | ⬜ |

---

## 9. CLI BATCH 9: UTILS & MISC

### 9.1 Encoding/Decoding

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 421 | **CyberChef** | Node | Decode/encode | `npm install -g cyberchef` | CRITIQUE | ⬜ |
| 422 | **Dencode** | Web | Encode/decode | Web | MEDIUM | ⬜ |
| 423 | **pywhat** | Python | Identify anything | `pip install pywhat` | HIGH | ⬜ |
| 424 | **Online Tools** | Web | Hash/encode | Web | MEDIUM | ⬜ |
| 425 | **Base64** | CLI | Base64 encode | Built-in | LOW | ⬜ |
| 426 | **URL Encode** | CLI | URL encoding | Built-in | LOW | ⬜ |
| 427 | **JWT.io** | Web | JWT decode | Web | MEDIUM | ⬜ |
| 428 | **Hash Crack** | Web | Hash cracking | Web | LOW | ⬜ |
| 429 | **CrackStation** | Web | Hash crack | Web | LOW | ⬜ |
| 430 | **HashIdentifier** | Python | Hash ID | `pip install` | LOW | ⬜ |

### 9.2 Automation & Productivity

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 431 | **Mitaka** | Browser | OSINT browser ext | Ext | HIGH | ⬜ |
| 432 | **Osmedeus** | Python | Workflow engine | `pip install osmedeus` | HIGH | ⬜ |
| 433 | **Reconftw** | Shell | Automated recon | Git | HIGH | ⬜ |
| 434 | **NullSec Linux** | OS | OSINT distro | ISO | MEDIUM | ⬜ |
| 435 | **Trace Labs VM** | OS | OSINT VM | ISO | MEDIUM | ⬜ |
| 436 | **CSI Linux** | OS | Investigation OS | ISO | MEDIUM | ⬜ |
| 437 | **Tsurugi Linux** | OS | DFIR OS | ISO | MEDIUM | ⬜ |
| 438 | **Paladin** | OS | Forensic OS | ISO | MEDIUM | ⬜ |
| 439 | **REMnux** | OS | Malware analysis | ISO | MEDIUM | ⬜ |
| 440 | **Kali Linux** | OS | Pentest OS | ISO | MEDIUM | ⬜ |

### 9.3 Documentation & Reporting

| # | Outil | Langage | Fonction | Install | Priority | Status |
|---|-------|---------|----------|---------|----------|--------|
| 441 | **Maltego CE** | Desktop | Graph analysis | Binary | HIGH | ⬜ |
| 442 | **Maltego XL** | Desktop | Enterprise | Paid | LOW | ⬜ |
| 443 | **CaseFile** | Desktop | Evidence | Binary | MEDIUM | ⬜ |
| 444 | **Draw.io** | Web | Diagrams | Web | MEDIUM | ⬜ |
| 445 | **yFiles** | JS | Graph lib | Lib | LOW | ⬜ |
| 446 | **Cytoscape** | Desktop | Bio/graph | Binary | LOW | ⬜ |
| 447 | **Tableau Public** | Desktop | Viz | Binary | MEDIUM | ⬜ |
| 448 | **Gephi** | Desktop | Graph viz | Binary | HIGH | ⬜ |
| 449 | **Graphviz** | CLI | Graph render | Binary | MEDIUM | ⬜ |
| 450 | **D3.js** | JS | Data viz | Lib | MEDIUM | ⬜ |

---

## 10. APIs BATCH 1: DATABASES & DATA

### 10.1 People Databases

| # | Service | Type | Region | Cost | Status |
|---|---------|------|--------|------|--------|
| 451 | **Pipl** | API | Global | Paid | ⬜ |
| 452 | **Spokeo** | Web | US | Paid | ⬜ |
| 453 | **Intelius** | Web | US | Paid | ⬜ |
| 454 | **Whitepages** | API | US | Paid | ⬜ |
| 455 | **BeenVerified** | Web | US | Paid | ⬜ |
| 456 | **ThatsThem** | Web | US | Free | ⬜ |
| 457 | **TruePeopleSearch** | Web | US | Free | ⬜ |
| 458 | **FastPeopleSearch** | Web | US | Free | ⬜ |
| 459 | **FamilyTreeNow** | Web | US | Free | ⬜ |
| 460 | **PeekYou** | Web | US | Free | ⬜ |

### 10.2 Professional Networks

| # | Service | Type | Fonction | Cost | Status |
|---|---------|------|----------|------|--------|
| 461 | **LinkedIn** | API | Professional | Paid | ⬜ |
| 462 | **ZoomInfo** | API | B2B contacts | Paid | ⬜ |
| 463 | **Apollo.io** | API | Sales intel | Paid | ⬜ |
| 464 | **Lusha** | API | Contact finder | Paid | ⬜ |
| 465 | **ContactOut** | API | Email finder | Paid | ⬜ |
| 466 | **RocketReach** | API | Contact info | Paid | ⬜ |
| 467 | **UpLead** | API | B2B leads | Paid | ⬜ |
| 468 | **DiscoverOrg** | API | Sales intel | Paid | ⬜ |
| 469 | **Crunchbase** | API | Companies | Paid | ⬜ |
| 470 | **PitchBook** | API | Private equity | Paid | ⬜ |

---

## 11. APIs BATCH 2: SEARCH & ENGINE

### 11.1 General Search

| # | Service | Type | Fonction | Cost | Status |
|---|---------|------|----------|------|--------|
| 471 | **Google Custom Search** | API | Web search | Paid | ⬜ |
| 472 | **Bing Search** | API | Web search | Paid | ⬜ |
| 473 | **Brave Search** | API | Privacy search | Free | ⬜ |
| 474 | **DuckDuckGo** | Scraping | Anonymous | Free | ⬜ |
| 475 | **SearXNG** | Self-hosted | Meta search | Free | ⬜ |
| 476 | **Whoogle** | Self-hosted | Google proxy | Free | ⬜ |
| 477 | **Kagi** | API | Premium search | Paid | ⬜ |
| 478 | **SerpAPI** | API | Google scraper | Paid | ⬜ |
| 479 | **SERP Wow** | API | Search API | Paid | ⬜ |
| 480 | **DataForSEO** | API | SEO data | Paid | ⬜ |

### 11.2 Academic Search

| # | Service | Type | Fonction | Cost | Status |
|---|---------|------|----------|------|--------|
| 481 | **Google Scholar** | API | Academic | Free | ⬜ |
| 482 | **Semantic Scholar** | API | Papers | Free | ⬜ |
| 483 | **PubMed** | API | Medical | Free | ⬜ |
| 484 | **ResearchGate** | Web | Research | Free | ⬜ |
| 485 | **Academia.edu** | Web | Research | Free | ⬜ |
| 486 | **arXiv** | API | Preprints | Free | ⬜ |
| 487 | **JSTOR** | API | Journals | Paid | ⬜ |
| 488 | **IEEE Xplore** | API | Technical | Paid | ⬜ |
| 489 | **ScienceDirect** | API | Papers | Paid | ⬜ |
| 490 | **Springer** | API | Journals | Paid | ⬜ |

---

## 12. APIs BATCH 3: SOCIAL MEDIA APIs

### 12.1 Meta APIs

| # | Service | Type | Fonction | Cost | Status |
|---|---------|------|----------|------|--------|
| 491 | **Instagram Graph API** | API | Official | Paid | ⬜ |
| 492 | **Facebook Graph API** | API | Official | Paid | ⬜ |
| 493 | **Threads API** | API | Official | Paid | ⬜ |
| 494 | **Meta Business Suite** | API | Business | Paid | ⬜ |
| 495 | **CrowdTangle** | API | Social monitoring | Free | ⬜ |
| 496 | **Brandwatch** | API | Social listening | Paid | ⬜ |
| 497 | **Mention** | API | Monitoring | Paid | ⬜ |
| 498 | **Sprout Social** | API | Management | Paid | ⬜ |
| 499 | **Hootsuite** | API | Management | Paid | ⬜ |
| 500 | **Buffer** | API | Scheduling | Paid | ⬜ |

### 12.2 Twitter/X APIs

| # | Service | Type | Fonction | Cost | Status |
|---|---------|------|----------|------|--------|
| 501 | **Twitter API v2** | API | Official | Paid | ⬜ |
| 502 | **X API Pro** | API | Premium | Paid | ⬜ |
| 503 | **TweetDeck** | Web | Monitoring | Free | ⬜ |
| 504 | **Followerwonk** | Web | Analytics | Paid | ⬜ |
| 505 | **SocialBlade** | API | Stats | Paid | ⬜ |
| 506 | **Twitonomy** | Web | Analytics | Paid | ⬜ |
| 507 | **Tweet Binder** | Web | Analytics | Paid | ⬜ |
| 508 | **Keyhole** | API | Tracking | Paid | ⬜ |
| 509 | **Brand24** | API | Monitoring | Paid | ⬜ |
| 510 | **Talkwalker** | API | Analytics | Paid | ⬜ |

---

## 13. APIs BATCH 4: BREACH MONITORING

### 13.1 Breach APIs

| # | Service | Type | Database | Cost | Status |
|---|---------|------|----------|------|--------|
| 511 | **DeHashed** | API | 15B+ | Paid | ⬜ |
| 512 | **Have I Been Pwned** | API | 11B+ | Free/Paid | ⬜ |
| 513 | **LeakCheck** | API | 7.5B+ | Freemium | ⬜ |
| 514 | **LeakRadar** | API | Stealers | Paid | ⬜ |
| 515 | **Hudson Rock** | API | Infostealers | Free | ⬜ |
| 516 | **InfoStealers** | API | Darknet | Paid | ⬜ |
| 517 | **StealSeek** | Web | General | Free | ⬜ |
| 518 | **Venacus** | API | Monitoring | Paid | ⬜ |
| 519 | **Intelligence X** | API | Archive | Paid | ⬜ |
| 520 | **SnusBase** | Web | Breaches | Paid | ⬜ |

### 13.2 Dark Web Monitoring

| # | Service | Type | Fonction | Cost | Status |
|---|---------|------|----------|------|--------|
| 521 | **Flare Systems** | API | Threat intel | Paid | ⬜ |
| 522 | **Dark Web Monitor** | API | Monitoring | Paid | ⬜ |
| 523 | **PhishLabs** | API | Phishing | Paid | ⬜ |
| 524 | **ZeroFox** | API | Dark web | Paid | ⬜ |
| 525 | **Mandiant** | API | Threat intel | Paid | ⬜ |
| 526 | **Recorded Future** | API | Intel | Paid | ⬜ |
| 527 | **Flashpoint** | API | Dark web | Paid | ⬜ |
| 528 | **Sixgill** | API | Threat intel | Paid | ⬜ |
| 529 | **Kela** | API | Dark web | Paid | ⬜ |
| 530 | **Webhose** | API | Dark web data | Paid | ⬜ |

---

## 14. APIs BATCH 5: GEOLOCATION

### 14.1 IP Geolocation

| # | Service | Type | Precision | Cost | Status |
|---|---------|------|-----------|------|--------|
| 531 | **MaxMind** | API | City | Paid | ⬜ |
| 532 | **IPinfo** | API | City | Free/Paid | ⬜ |
| 533 | **IP2Location** | API | City | Paid | ⬜ |
| 534 | **IPLocation.io** | API | City | Free | ⬜ |
| 535 | **IP-API** | API | City | Free | ⬜ |
| 536 | **DB-IP** | API | City | Free/Paid | ⬜ |
| 537 | **IPGeolocation** | API | City | Free/Paid | ⬜ |
| 538 | **IPRegistry** | API | Rich | Paid | ⬜ |
| 539 | **Abstract API** | API | City | Free/Paid | ⬜ |
| 540 | **GeoIPify** | API | City | Paid | ⬜ |

### 14.2 Satellite & Imagery

| # | Service | Type | Fonction | Cost | Status |
|---|---------|------|----------|------|--------|
| 541 | **Google Earth Engine** | API | Satellite | Paid | ⬜ |
| 542 | **Sentinel Hub** | API | Copernicus | Freemium | ⬜ |
| 543 | **Planet Labs** | API | Imagery | Paid | ⬜ |
| 544 | **Maxar** | API | Satellite | Paid | ⬜ |
| 545 | **Airbus DS** | API | Imagery | Paid | ⬜ |
| 546 | **Landsat** | API | USGS data | Free | ⬜ |
| 547 | **MODIS** | API | NASA data | Free | ⬜ |
| 548 | **VIIRS** | API | Night lights | Free | ⬜ |
| 549 | **Copernicus** | API | EU satellite | Free | ⬜ |
| 550 | **Soar.Earth** | Web | Satellite | Free/Paid | ⬜ |

---

## 15. FRAMEWORKS COMPLETS

### 15.1 OSINT Frameworks

| # | Framework | Langage | Modules | Status |
|---|-----------|---------|---------|--------|
| 551 | **OSINT Framework** | Web | 1000+ links | ⬜ |
| 552 | **SpiderFoot** | Python | 200+ modules | ⬜ |
| 553 | **Recon-ng** | Python | Framework OSINT avec 80+ modules reconnaissance | `git clone https://github.com/lanmaster53/recon-ng.git` | CRITIQUE | ⬜ |
| 554 | **theHarvester** | Python | 20+ sources | ⬜ |
| 555 | **Tookie** | Python | Username OSINT toolkit - 200+ platforms | `git clone https://github.com/Alfredredbird/tookie-osint.git` | HIGH | ⬜ |
| 556 | **Maltego** | Java | Transforms | ⬜ |
| 557 | **Metasploit** | Ruby | OSINT aux | ⬜ |
| 558 | **Osmedeus** | Python | Workflow | ⬜ |
| 559 | **Reconftw** | Shell | Multi-tool | ⬜ |
| 560 | **FinalRecon** | Python | Recon | ⬜ |
| 561 | **RedHawk** | PHP | Scanner | ⬜ |

### 15.2 Investigation Platforms

| # | Platform | Type | Fonction | Status |
|---|----------|------|----------|--------|
| 562 | **Palantir** | SaaS | Enterprise | ⬜ |
| 563 | **IBM i2** | Desktop | Intelligence | ⬜ |
| 564 | **SAS Visual** | SaaS | Analytics | ⬜ |
| 565 | **Analyst's Notebook** | Desktop | Analysis | ⬜ |
| 566 | **XAMANCE** | SaaS | OSINT | ⬜ |
| 567 | **Videris** | SaaS | Investigation | ⬜ |
| 568 | **Sentinel** | SaaS | Visualizer | ⬜ |
| 569 | **ShadowDragon** | SaaS | SocialNet | ⬜ |
| 570 | **PenLink** | SaaS | Analysis | ⬜ |
| 571 | **Cobwebs** | SaaS | Web intel | ⬜ |

---

## 16. STRATÉGIE D'IMPLÉMENTATION

### 16.1 Architecture d'Intégration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OSINT MASTER - TOOL INTEGRATION LAYER                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    MANIFEST REGISTRY (1000+)                     │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │    │
│  │  │Manifest 1│ │Manifest 2│ │Manifest 3│ │Manifest N│             │    │
│  │  │ (Python) │ │   (Go)   │ │  (Node)  │ │  (Rust)  │             │    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘             │    │
│  └───────┼────────────┼────────────┼────────────┼─────────────────┘    │
│          │            │            │            │                         │
│          ▼            ▼            ▼            ▼                         │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    TOOL RUNNER FACTORY                             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │  │
│  │  │ Python   │ │   Go     │ │   Node   │ │  Docker  │               │  │
│  │  │ Runner   │ │  Runner  │ │  Runner  │ │  Runner  │               │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘               │  │
│  └───────┼────────────┼────────────┼────────────┼─────────────────────┘  │
│          │            │            │            │                          │
│          └────────────┴────────────┴────────────┘                          │
│                           │                                               │
│                           ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    RESULT NORMALIZER                               │  │
│  │         (JSON → Entity → Correlation → Graph)                      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 16.2 Manifest Format (v2)

```json
{
  "id": "sherlock",
  "name": "Sherlock Username Search",
  "version": "1.0.0",
  "description": "Search username across 400+ social platforms",
  
  "source": {
    "type": "github",
    "repo": "sherlock-project/sherlock",
    "license": "MIT"
  },
  
  "categories": ["username", "social", "reconnaissance"],
  "target_types": ["username"],
  
  "install": {
    "method": "pip",
    "package": "sherlock-project",
    "verify": "sherlock --version",
    "dependencies": []
  },
  
  "execution": {
    "command": "sherlock {target} --timeout 10 --json output/{investigation_id}/{target}.json",
    "timeout": 120000,
    "parallel": true,
    "opsec_level": "standard",
    "retry": 3,
    "fallback": "whatsmyname_api"
  },
  
  "parser": {
    "type": "json",
    "schema": "sherlock-result.schema.json",
    "entities": {
      "username": { "path": "username", "type": "username" },
      "url": { "path": "url", "type": "url" },
      "platform": { "path": "platform", "type": "service" },
      "status": { "path": "status", "type": "status" }
    }
  },
  
  "correlation": {
    "links": [
      { "type": "same_username", "confidence": 0.9, "fields": ["username"] },
      { "type": "same_platform", "confidence": 0.5, "fields": ["platform"] }
    ]
  },
  
  "requirements": {
    "os": ["linux", "windows", "macos"],
    "ram": "512MB",
    "disk": "100MB",
    "network": true
  },
  
  "risk": "low",
  "rate_limit": "10/minute"
}
```

### 16.3 Plan d'Implémentation par Vague

| Vague | Outils | Timeline | Focus |
|-------|--------|----------|-------|
| **Vague 1** | 50 outils | Semaine 1-4 | CRITIQUE: Sherlock, Maigret, SpiderFoot, Recon-ng, etc. |
| **Vague 2** | 100 outils | Semaine 5-8 | HIGH: Social media, Email, Phone, Domain |
| **Vague 3** | 150 outils | Semaine 9-12 | MEDIUM: Infrastructure, Geo, Image |
| **Vague 4** | 200 outils | Semaine 13-16 | APIs: Breaches, Search engines, Databases |
| **Vague 5** | 250 outils | Semaine 17-20 | Dark Web, Security, Threat Intel |
| **Vague 6** | 250+ outils | Semaine 21+ | Spécialisés, Utils, Frameworks |

### 16.4 Automation Requirements

```typescript
interface AutomationPipeline {
  // Auto-install
  install: {
    detectOs: () => 'windows' | 'linux' | 'macos';
    checkInstalled: (toolId: string) => boolean;
    installTool: (manifest: Manifest) => Promise<boolean>;
    verifyInstall: (toolId: string) => boolean;
  };
  
  // Auto-run
  execution: {
    prepareEnvironment: (opsecLevel: OPSECLevel) => EnvConfig;
    spawnProcess: (command: string, env: EnvConfig) => ChildProcess;
    captureOutput: (process: ChildProcess) => Promise<string>;
    parseResults: (output: string, parser: Parser) => Entity[];
  };
  
  // Auto-correlate
  correlation: {
    extractEntities: (results: any[]) => Entity[];
    findLinks: (entities: Entity[]) => Correlation[];
    buildGraph: (entities: Entity[], links: Correlation[]) => Graph;
  };
  
  // Auto-report
  reporting: {
    generateSummary: (graph: Graph) => string;
    exportReport: (format: Format) => Buffer;
    notifyResults: (channels: Channel[]) => void;
  };
}
```

---

## 17. BONUS: OUTILS SPÉCIALISÉS AVANCÉS

### 17.1 Aviation & Maritime

| # | Outil | Type | Fonction | Status |
|---|-------|------|----------|--------|
| 571 | **FlightRadar24** | API | Live flights | ⬜ |
| 572 | **ADS-B Exchange** | Web | Aircraft tracking | ⬜ |
| 573 | **RadarBox** | API | Flight data | ⬜ |
| 574 | **PlaneFinder** | API | Live tracking | ⬜ |
| 575 | **FlightAware** | API | Flight history | ⬜ |
| 576 | **MarineTraffic** | API | Ship tracking | ⬜ |
| 577 | **VesselFinder** | API | Vessel tracking | ⬜ |
| 578 | **FleetMon** | API | Fleet tracking | ⬜ |
| 579 | **ShipSpotting** | Web | Photo DB | ⬜ |
| 580 | **SubmarineCableMap** | Web | Cable map | ⬜ |

### 17.2 Cryptocurrency

| # | Outil | Type | Fonction | Status |
|---|-------|------|----------|--------|
| 581 | **Chainalysis** | SaaS | Investigation | ⬜ |
| 582 | **Elliptic** | SaaS | Crypto intel | ⬜ |
| 583 | **CipherTrace** | SaaS | Compliance | ⬜ |
| 584 | **TRM Labs** | SaaS | Risk | ⬜ |
| 585 | **MistTrack** | Web | AML | ⬜ |
| 586 | **BTCTracker** | Web | Tracking | ⬜ |
| 587 | **Crystal Blockchain** | SaaS | Analytics | ⬜ |
| 588 | **Blockchain.com** | API | BTC explorer | ⬜ |
| 589 | **Etherscan** | API | ETH explorer | ⬜ |
| 590 | **OXT** | Web | BTC analysis | ⬜ |

### 17.3 Vehicle & Transport

| # | Outil | Type | Fonction | Status |
|---|-------|------|----------|--------|
| 591 | **FaxVIN** | API | Vehicle history | ⬜ |
| 592 | **EpicVIN** | API | VIN lookup | ⬜ |
| 593 | **AutoCheck** | API | Car reports | ⬜ |
| 594 | **Carfax** | API | Vehicle history | ⬜ |
| 595 | **NMVTIS** | API | US gov DB | ⬜ |
| 596 | **CarVertical** | API | EU cars | ⬜ |
| 597 | **PlatesMania** | Web | Plate photos | ⬜ |
| 598 | **AVinfoBot** | Telegram | RU vehicles | ⬜ |
| 599 | **EasyVIN** | Telegram | RU VIN | ⬜ |
| 600 | **avtocodbot** | Telegram | RU reports | ⬜ |

---

## STATISTIQUES FINALES

| Catégorie | Nombre | Implémentés | Restants |
|-----------|--------|--------------|----------|
| CLI Python | 200+ | ~20 | 180+ |
| CLI Go | 100+ | ~5 | 95+ |
| CLI Node/Rust | 50+ | ~2 | 48+ |
| APIs Web | 300+ | ~15 | 285+ |
| Browser Ext | 50+ | 0 | 50 |
| Frameworks | 30+ | ~3 | 27 |
| **TOTAL** | **1000+** | **~45** | **955+** |

---

## PROCHAINES ACTIONS

### Priorité Immédiate (Cette semaine)
1. ✅ Créer le manifest registry
2. 🔄 Implémenter 10 outils CRITIQUE (Sherlock, SpiderFoot, etc.)
3. 🔄 Créer les parsers de résultats
4. 🔄 Intégrer au deepEngine

### Priorité Haute (Ce mois)
1. Batch 1-2: 100 outils essentiels
2. Système d'auto-install
3. Corrélation automatique
4. UI de monitoring

### Priorité Moyenne (Prochains mois)
1. Batch 3-6: 400+ outils additionnels
2. Dark Web suite
3. AI integration (Ollama)
4. Rapports automatiques

---

*Mega Catalogue OSINT - Version 1.0*
*Généré le 17 Avril 2026*
*Sources: 15+ repos GitHub OSINT majeurs*

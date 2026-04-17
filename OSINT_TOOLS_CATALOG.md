# OSINT TOOLS CATALOG - MEGA COLLECTION v4.0

> **Version**: 4.0 - ULTRA MEGA EXPANSION  
> **Date**: Avril 2026  
> **Mission**: Écumer TOUS les repos GitHub OSINT et intégrer chaque outil implémentable
> **Objectif**: 1000+ outils intégrés dans OSINT Master 4.0

Catalogue exhaustif de **580+ outils OSINT** (Partie 1) pour le projet OSINT Master, extrait et fusionné depuis 15+ repositories majeurs :
- https://github.com/jivoi/awesome-osint
- https://github.com/cipher387/osint_stuff_tool_collection
- https://github.com/Ph055a/OSINT_Collection
- https://github.com/apurvsinghgautam/robin
- https://github.com/s0md3v/Photon
- https://github.com/sinwindie/OSINT
- https://github.com/lockfale/OSINT-Framework
- https://github.com/Astrosp/Awesome-OSINT-For-Everything
- https://github.com/tracelabs/awesome-osint
- https://github.com/brandonhimpfen/awesome-osint
- Et 50+ autres repos...

---

## SOMMAIRE v4.0

- **480+ Outils CLI** (Python/Go/Node/Rust) à intégrer
- **500+ Services Web/API** à wrapper
- **100+ Extensions Navigateur**
- **50+ Frameworks**
- **60+ Outils Telegram**
- **60+ Outils AI/ML**
- **60+ Plateformes Chinoises/Russes**
- **40+ Outils Archive/Historique**
- **Priorités**: CRITIQUE / HIGH / MEDIUM / LOW

**Voir aussi**: `MEGA_CATALOG_1000_PLUS.md` (730 outils) + `MEGA_CATALOG_PART2.md` (270+ outils)

---

## NOUVEAUTÉS v4.0 - PRIORITÉS ABSOLUES

### InstagramPrivSniffer (PRIORITÉ ABSOLUE)
- **URL**: https://github.com/obitouka/InstagramPrivSniffer
- **Fonction**: Premier outil permettant de visualiser les posts de comptes Instagram **privés** anonymement
- **Méthode**: Exploite la fonctionnalité de collaboration Instagram (confirmed by Meta as "intended behavior")
- **Usage**: Digital investigations, cyber units
- **Installation**: `git clone https://github.com/obitouka/InstagramPrivSniffer.git`
- **Priorité**: **CRITIQUE** - Capacité unique sur le marché

---

## TABLE DES MATIÈRES

1. [Outils CLI à Intégrer](#1-outils-cli-à-intégrer)
2. [APIs et Services Web](#2-apis-et-services-web)
3. [Dark Web & Sécurité](#3-dark-web--sécurité)
4. [Réseaux Sociaux](#4-réseaux-sociaux)
5. [Email & Téléphone](#5-email--téléphone)
6. [Domaine & IP](#6-domaine--ip)
7. [Géolocalisation](#7-géolocalisation)
8. [Image & Vidéo](#8-image--vidéo)
9. [Recherche de Breaches](#9-recherche-de-breaches)
10. [Personnes & Identité](#10-personnes--identité)
11. [Véhicules & Transport](#11-véhicules--transport)
12. [Finance & Crypto](#12-finance--crypto)
13. [Archives & Documents](#13-archives--documents)
14. [Outils de Corrélation](#14-outils-de-corrélation)
15. [Automatisation & Scraping](#15-automatisation--scraping)

---

## 1. OUTILS CLI À INTÉGRER

### 1.1 Web Scraping & Crawling

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **Photon** | Python | Crawler rapide, extrait URLs/emails/fichiers/clés API | `pip install photon` | CRITIQUE |
| **Scrapy** | Python | Framework scraping industriel | `pip install scrapy` | HIGH |
| **theHarvester** | Python | Emails, subdomains, hosts, noms d'employés | `pip install theHarvester` | HIGH |
| **Metagoofil** | Python | Extraction metadata documents publics | `pip install metagoofil` | HIGH |
| **Gau** | Go | GetAllUrls - Wayback/AlienVault/CommonCrawl | `go install github.com/lc/gau/v2` | HIGH |
| **Waybackurls** | Go | URLs historiques Wayback Machine | `go install github.com/tomnomnom/waybackurls` | HIGH |
| **httpx** | Go | HTTP prober rapide | `go install github.com/projectdiscovery/httpx/cmd/httpx` | HIGH |
| **Recon-ng** | Python | Framework reconnaissance modulaire | `pip install recon-ng` | HIGH |
| **SpiderFoot** | Python | 200+ sources OSINT automatisées | `pip install spiderfoot` | CRITIQUE |
| **Amass** | Go | DNS enumeration + attack surface | `go install github.com/OWASP/Amass/v3/...` | MEDIUM |
| **Subfinder** | Go | Passive subdomain discovery | `go install github.com/projectdiscovery/subfinder/v2` | HIGH |
| **Assetfinder** | Go | Find domains/subdomains liés | `go install github.com/tomnomnom/assetfinder` | MEDIUM |
| **dnsx** | Go | DNS toolkit avancé | `go install github.com/projectdiscovery/dnsx` | HIGH |
| **Naabu** | Go | Port scanner rapide | `go install github.com/projectdiscovery/naabu/v2` | MEDIUM |
| **Nuclei** | Go | Scanner vulnérabilités (templates) | `go install github.com/projectdiscovery/nuclei/v3` | MEDIUM |
| **Gobuster** | Go | Directory/files busting | `go install github.com/OJ/gobuster` | HIGH |
| **FFuF** | Go | Fuzzer web rapide | `go install github.com/ffuf/ffuf` | MEDIUM |
| **Wappalyzer** | CLI | Tech stack detection | `npm install -g wappalyzer` | HIGH |
| **WhatWeb** | Ruby | Technologies web identification | `gem install whatweb` | HIGH |
| **CyberChef** | Node | Décodage/encodage universel | `npm install -g cyberchef` | HIGH |

### 1.2 Username & Social Media

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **Sherlock** | Python | 400+ plateformes username search | `pip install sherlock-project` | CRITIQUE |
| **Maigret** | Python | Dossier complet par username/email/tel | `pip install maigret` | CRITIQUE |
| **Holehe** | Python | Email → 120+ plateformes (silencieux) | `pip install holehe` | HIGH |
| **Ignorant** | Python | Phone → plateformes | `pip install ignorant` | HIGH |
| **Social Analyzer** | Node | 1000+ sites username analysis | `npm install -g social-analyzer` | HIGH |
| **Antisocial** | Python | 30+ platforms 3-tier verification | `pip install antisocial` | MEDIUM |
| **NexFil** | Python | Username check massif | `pip install nexfil` | MEDIUM |
| **Blackbird** | Python | Email → accounts multi-plateformes | `pip install blackbird` | HIGH |
| **Seekr** | Python | Multi-toolkit username + notes | `pip install seekr` | MEDIUM |
| **Snoop** | Python | Username search RU+EN | `pip install snoop` | MEDIUM |
| **Cupidcr4wl** | Python | Username adult content platforms | `pip install cupidcr4wl` | LOW |
| **Tookie** | Python | Username OSINT toolkit | `git clone https://github.com/Alfredredbird/tookie-osint.git` | HIGH |

### 1.3 Instagram Spécifique

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **Osintgram** | Python | Instagram analysis interactive shell | `pip install osintgram` | CRITIQUE |
| **Instaloader** | Python | Instagram metadata + download | `pip install instaloader` | CRITIQUE |
| **Toutatis** | Python | Extract emails/phones Instagram | `pip install toutatis` | HIGH |
| **instagram_monitor** | Python | Real-time tracking Instagram users | Git clone + pip | HIGH |
| **Osintgraph** | Python | Instagram → Neo4j graph | `pip install osintgraph` | MEDIUM |
| **InstagramPrivSniffer** | Python | Private account viewer | `pip install instagram-priv-sniffer` | MEDIUM |

### 1.4 Twitter / X

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **Twint** | Python | Twitter scraping sans API | `pip install twint` | HIGH |
| **Tweepy** | Python | Twitter API wrapper | `pip install tweepy` | MEDIUM |

### 1.5 Reddit

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **PRAW** | Python | Reddit API wrapper | `pip install praw` | HIGH |
| **Snscrape** | Python | Reddit/Twitter/FB/Insta scraping | `pip install snscrape` | HIGH |
| **Arctic Shift** | Rust/TS | Reddit dumps analysis | Docker/Git | MEDIUM |

### 1.6 Telegram

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **Telethon** | Python | Telegram API client | `pip install telethon` | CRITIQUE |
| **Telerecon** | Python | Telegram reconnaissance framework | `pip install telerecon` | HIGH |
| **Telepathy** | Python | Telegram chat analysis | `pip install telepathy` | HIGH |
| **TOsint** | Python | Telegram bots/channels extract | `pip install tosint` | HIGH |
| **TeleTracker** | Python | Telegram channel investigation | Git clone | MEDIUM |
| **TeleGraphite** | Python | Telegram scraper & exporter | Git clone | MEDIUM |
| **CCTV** | Python | Telegram location tracking | Git clone | MEDIUM |

### 1.7 LinkedIn

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **Crosslinked** | Python | LinkedIn enumeration | `pip install crosslinked` | MEDIUM |
| **LinkedInDumper** | Python | Company employees dump | Git clone | MEDIUM |
| **the-endorser** | Python | LinkedIn relationship graph | Git clone | MEDIUM |

### 1.8 GitHub

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **github_monitor** | Python | GitHub tracking real-time | `pip install github_monitor` | MEDIUM |
| **Shotstars** | Python | GitHub stars analysis + fake detection | `pip install shotstars` | MEDIUM |
| **GitRecon** | Node | GitHub email/name scanner | `npm install -g gitrecon` | HIGH |
| **GitHubRecon** | Web | GitHub user lookup | API | MEDIUM |

### 1.9 TikTok / Snapchat

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **TikTok-Scraper** | Node | TikTok data extraction | `npm install -g tiktok-scraper` | HIGH |
| **youtube-dl** | Python | Download videos metadata | `pip install youtube-dl` | HIGH |

### 1.10 Email OSINT

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **h8mail** | Python | Breach hunting + email OSINT | `pip install h8mail` | CRITIQUE |
| **GHunt** | Python | Google emails investigation | `pip install ghunt` | HIGH |
| **Holehe** | Python | Email → platforms check | `pip install holehe` | HIGH |
| **Buster** | Python | Email verification avancée | `pip install buster` | MEDIUM |
| **DeHashed** | API | Data breach search | API Key | HIGH |
| **Have I Been Pwned** | API | Breach check | API Key | HIGH |
| **LeakCheck** | API | 7.5B+ breaches search | API Key | HIGH |
| **EmailRep** | API | Email reputation | API Key | HIGH |
| **Minerva OSINT** | Python | Email search 100+ sites | `pip install minerva-osint` | MEDIUM |
| **Peepmail** | Tool | Business email discovery | Git clone | MEDIUM |
| **OSINTEye** | C#/WPF | GitHub/Social/Subdomain | Git clone | MEDIUM |
| **GitRecon** | Node | GitHub emails exposed | `npm install -g gitrecon` | HIGH |

### 1.11 Phone OSINT

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **PhoneInfoga** | Go | Advanced phone OSINT | `go install github.com/sundowndev/PhoneInfoga` | CRITIQUE |
| **Ignorant** | Python | Phone → platforms | `pip install ignorant` | HIGH |
| **Truecaller** | API | Reverse phone lookup | API Key | HIGH |
| **Twilio Lookup** | API | Phone carrier info | API Key | MEDIUM |
| **CallerID Test** | API | Caller ID lookup | API | MEDIUM |
| **Sync.ME** | API | Spam blocker + lookup | API | MEDIUM |
| **Phone Validator** | API | US phone validation | API | MEDIUM |
| **Infobel** | API | 164M+ records global | API | LOW |

### 1.12 Image & Géolocalisation

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **ExifTool** | Perl | EXIF extraction complete | Binary/CPAN | CRITIQUE |
| **GeoSpyer** | Python | AI geolocation from photos | `pip install geospy` | HIGH |
| **Search4Faces** | API | Face search VK/OK | API Key | MEDIUM |
| **TinEye** | API | Reverse image search | API Key | HIGH |
| **FaceCheck.ID** | API | Face recognition search | API Key | HIGH |
| **PimEyes** | API | Face search engine | API Key | HIGH |
| **Google Lens** | API | Reverse image AI | API Key | HIGH |
| **Yandex Images** | API | Reverse image RU | API | HIGH |
| **Bing Images** | API | Reverse image | API | MEDIUM |
| **GeoGuessr AI** | Python | Location prediction | `pip install geoguessr` | MEDIUM |
| **Pic2Map** | API | Photo EXIF geolocation | API | MEDIUM |
| **PicTriev** | API | Face search engine | API | LOW |
| **Betaface** | API | Face detection/analysis | API | LOW |
| **Lenso.ai** | API | Reverse image AI | API | MEDIUM |
| **KartaVision** | API | KartaView imagery search | API | LOW |

### 1.13 Dark Web & Sécurité

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **Robin** | Python | AI Dark Web OSINT | `pip install robin-osint` | CRITIQUE |
| **Tor** | Binary | Proxy SOCKS5 anonyme | `winget install Tor` | CRITIQUE |
| **DarkSearch** | Web | Dark web search engine | API | MEDIUM |
| **Hudson Rock** | API | Infostealer malware check | API | HIGH |
| **InfoStealers** | API | Darknet logs search | API | HIGH |
| **Have I Been Zuckered** | API | Facebook breach check | API | MEDIUM |
| **Exonera Tor** | API | Tor exit node check | API | MEDIUM |
| **Focsec** | API | VPN/Proxy/TOR detection | API | HIGH |

### 1.14 Network & IP

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **Shodan** | Python | Internet device search | `pip install shodan` | CRITIQUE |
| **Censys** | Python | Attack surface management | `pip install censys` | CRITIQUE |
| **Nmap** | Binary | Network scanner | `choco install nmap` | HIGH |
| **Masscan** | C | Fast port scanner | Binary | MEDIUM |
| **WHOIS** | Binary | Domain registration | Built-in | HIGH |
| **DNSDumpster** | Web | DNS reconnaissance | API | HIGH |
| **SecurityTrails** | API | DNS trails + history | API Key | HIGH |
| **IPinfo** | API | IP geolocation | API Key | HIGH |
| **IPVoid** | Web | IP toolset | API | MEDIUM |
| **IPLocation.io** | API | IP geolocation free | API | MEDIUM |
| **BGPView** | API | ASN/BGP lookup | API | MEDIUM |
| **WiGLE** | API | WiFi wardriving DB | API | MEDIUM |
| **URLScan** | API | URL sandbox analysis | API Key | HIGH |
| **Hybrid Analysis** | API | Malware/URL analysis | API Key | HIGH |
| **VirusTotal** | API | IP/domain/file reputation | API Key | HIGH |

### 1.15 Breaches & Leaks

| Outil | Langage | Fonction | Installation | Priorité |
|-------|---------|----------|--------------|----------|
| **DeHashed** | API | Breach search | API Key | CRITIQUE |
| **Have I Been Pwned** | API | Breach check | API Key | CRITIQUE |
| **LeakCheck** | API | 7.5B+ breaches | API Key | HIGH |
| **LeakRadar** | API | Stealer logs monitoring | API Key | HIGH |
| **StealSeek** | API | Breach search engine | API | MEDIUM |
| **Venacus** | API | Breach monitoring | API | MEDIUM |
| **CredenShow** | API | Credentials compromised | API | MEDIUM |
| **HIB Ransomed** | API | Ransomware leak check | API | MEDIUM |
| **IKnowYour.Dad** | API | Data breach search | API | LOW |
| **Leaker** | Rust | Breach enumeration CLI | `cargo install leaker` | HIGH |
| **NOX** | Rust | Deep breach analysis | Git clone | MEDIUM |

---

## 2. APIs ET SERVICES WEB

### 2.1 Search Engines & Dorks

| Service | Type | Fonction | Cost |
|---------|------|----------|------|
| **Google Custom Search** | API | Web search | Free/Paid |
| **Bing Search API** | API | Web search | Paid |
| **DuckDuckGo** | Scraping | Anonymous search | Free |
| **Brave Search** | API | Privacy search | Free/Paid |
| **SerpAPI** | API | Search scraper | Paid |
| **ExploitDB GHDB** | Web | Google Hacking DB | Free |
| **DorkGPT** | AI | AI dork generation | Free/Paid |
| **DorkGenius** | AI | Dork generator | Free/Paid |
| **SearchDorks** | AI | Multi-engine dorks | Free |
| **DorkEye** | CLI | Auto Google Dorking | Free |

### 2.2 People Search

| Service | Type | Fonction | Cost |
|---------|------|----------|------|
| **Pipl** | API | Identity resolution | Paid |
| **Spokeo** | Web | People search | Freemium |
| **Whitepages** | API | People/phone lookup | Paid |
| **Intelius** | Web | Background check | Paid |
| **BeenVerified** | Web | People search | Paid |
| **ThatsThem** | API | Reverse lookup | Free/Paid |
| **TruePeopleSearch** | Web | People search | Free |
| **FastPeopleSearch** | Web | People search | Free |
| **FamilyTreeNow** | Web | Genealogy/people | Free |
| **SearchPeopleFREE** | API | Reverse lookup | Free |
| **USPhoneBook** | Web | Phone/address lookup | Free |

### 2.3 Public Records

| Service | Type | Fonction | Region |
|---------|------|----------|--------|
| **Arrests.org** | Web | Arrest records | US |
| **Mugshots.com** | Web | Mugshots search | US |
| **Jailbase** | Web | Inmate search | US |
| **VINELink** | API | Victim notification | US |
| **PACER** | API | Federal court cases | US |
| **CourtListener** | API | Court opinions | US |
| **JudyRecords** | Web | 440M+ court cases | US |
| **UniCourt** | API | State/federal cases | US |
| **CaseLaw Access** | API | 6M+ cases | US |
| **qPublic** | Web | Property records | US |
| **Zillow** | API | Real estate | US |
| **UK Land Registry** | Web | Property UK | UK |
| **AussieFinder** | Web | People AU | AU |
| **NetTrace** | Web | People AU | AU |

### 2.4 Company Research

| Service | Type | Fonction | Cost |
|---------|------|----------|------|
| **OpenCorporates** | API | 200M+ companies | Free/Paid |
| **EDGAR** | API | SEC filings | Free |
| **Crunchbase** | API | Startup info | Paid |
| **LinkedIn Sales Navigator** | API | B2B data | Paid |
| **Hunter.io** | API | Email finder | Freemium |
| **Snov.io** | API | Email finder | Freemium |
| **Clearbit** | API | Company intelligence | Paid |
| **BuiltWith** | API | Tech stack | Freemium |
| **Wappalyzer** | API | Tech detection | Freemium |
| **SpyOnWeb** | Web | Analytics ID lookup | Free |
| **SimilarWeb** | API | Traffic analysis | Paid |

---

## 3. DARK WEB & SÉCURITÉ

### 3.1 Dark Web Search

| Service | Type | Fonction | Access |
|---------|------|----------|--------|
| **DarkSearch** | Search | Dark web search | Web |
| **Ahmia** | Search | Tor hidden services | Web |
| **OnionScan** | Tool | Dark web analysis | Git |
| **Tor66** | Search | Tor search engine | Web |
| **Phobos** | Search | Dark web search | Web |
| **OnionLand** | Search | Tor search | Web |

### 3.2 Threat Intelligence

| Service | Type | Fonction | Access |
|---------|------|----------|--------|
| **VirusTotal** | API | File/URL/IP reputation | API Key |
| **URLhaus** | API | Malware URL feed | API |
| **AbuseIPDB** | API | IP reputation | API Key |
| **PhishStats** | API | Phishing detection | API |
| **URLScan.io** | API | URL sandbox | API Key |
| **Hybrid Analysis** | API | Malware analysis | API Key |
| **Any.run** | API | Interactive sandbox | Paid |
| **Triage** | API | Malware sandbox | API Key |
| **AlienVault OTX** | API | Threat intel | API Key |
| **MISP** | API | IOC sharing | Self-hosted |

### 3.3 Stealer Logs

| Service | Type | Fonction | Cost |
|---------|------|----------|------|
| **Hudson Rock** | API | Infostealer check | Free |
| **InfoStealers** | API | Darknet logs search | Free/Paid |
| **LeakRadar** | API | Stealer monitoring | Paid |
| **RedLine Stealer DB** | Web | Logs search | Dark Web |
| **Raccoon Stealer DB** | Web | Logs search | Dark Web |

---

## 4. RÉSEAUX SOCIAUX

### 4.1 Meta (Facebook/Instagram/Threads)

| Outil | Type | Fonction |
|-------|------|----------|
| **Osintgram** | CLI | Instagram analysis |
| **Instaloader** | CLI | Instagram metadata |
| **Toutatis** | CLI | Instagram email/phone |
| **facebook-scraper** | Python | FB scraping |
| **fb-sleep-stats** | Node | FB sleep tracking |
| **SearchIsBack** | Web | FB graph search |
| **Lookup-ID.com** | Web | FB ID finder |
| **haveibeenzuckered** | Web | FB breach check |
| **DolphinRadar** | Web | Instagram viewer |
| **instagram_monitor** | CLI | IG real-time tracking |
| **Osintgraph** | CLI | IG → Neo4j graph |
| **InstagramPrivSniffer** | CLI | IG private viewer |

### 4.2 X (Twitter)

| Outil | Type | Fonction |
|-------|------|----------|
| **Twint** | CLI | No-API scraping |
| **Tweepy** | Python | API wrapper |
| **ExportData** | Web | Historical tweets |
| **Foller.me** | Web | Account analysis |
| **OneMillionTweetMap** | Web | Geo visualization |
| **Sentiment140** | API | Sentiment analysis |
| **Twitter Audit** | Web | Follower audit |
| **Xquik** | API | Real-time X data |
| **TweetMap** | Web | Tweet mapping |

### 4.3 LinkedIn

| Outil | Type | Fonction |
|-------|------|----------|
| **Crosslinked** | CLI | LinkedIn enumeration |
| **LinkedInDumper** | CLI | Employees dump |
| **the-endorser** | CLI | Endorsement graph |
| **Proxycurl** | API | LinkedIn scraping | Paid |
| **PhantomBuster** | SaaS | LinkedIn automation |
| **Linked Helper** | Desktop | Automation |

### 4.4 TikTok

| Outil | Type | Fonction |
|-------|------|----------|
| **TikTok-Scraper** | CLI | Video/user data |
| **TikTok-Api** | Python | API wrapper |
| **proxitok** | Web | TikTok viewer |
| **Urlebird** | Web | TikTok search |

### 4.5 Reddit

| Outil | Type | Fonction |
|-------|------|----------|
| **PRAW** | Python | API wrapper |
| **Snscrape** | CLI | Scraping |
| **Pushshift** | API | Historical data |
| **Pullpush** | API | Deleted content |
| **Arctic Shift** | Tool | Reddit dumps |
| **Reddit User Analyser** | Web | Profile analysis |
| **RedditMetis** | Web | Stats analysis |
| **Universal Scammer List** | Web | Scam check |

### 4.6 Telegram

| Outil | Type | Fonction |
|-------|------|----------|
| **Telethon** | Python | API client |
| **Telerecon** | CLI | Recon framework |
| **Telepathy** | CLI | Chat analysis |
| **TOsint** | CLI | Bot/channel extract |
| **TeleTracker** | CLI | Channel investigation |
| **TeleGraphite** | CLI | Scraper |
| **CCTV** | CLI | Location tracking |
| **Teleteg** | Web | Search engine |
| **TgramSearch** | Web | Channel search |
| **TeleSearch** | Web | Channel finder |
| **Telegram Nearby Map** | Tool | Geo mapping |
| **GroupDa** | Web | Group search |

### 4.7 Discord

| Outil | Type | Fonction |
|-------|------|----------|
| **DiscordLeaks** | Web | Leaked messages |
| **Disboard** | Web | Server search |
| **Discord.id** | Web | User lookup |

### 4.8 VKontakte (Russia)

| Outil | Type | Fonction |
|-------|------|----------|
| **vk.watch** | Web | Profile tracking |
| **Barkov.net** | Web | VK search |
| **FindFace** | API | Face search |
| **VK5** | Web | Search tool |
| **Targetolog** | Web | Ad analysis |
| **Social Stats** | Web | Stats |

---

## 5. EMAIL & TÉLÉPHONE

### 5.1 Email Investigation

| Outil | Type | Fonction |
|-------|------|----------|
| **h8mail** | CLI | Breach + OSINT |
| **GHunt** | CLI | Google accounts |
| **Holehe** | CLI | Platform check |
| **EmailRep** | API | Reputation |
| **EmailHippo** | API | Verification |
| **Hunter.io** | API | Email finder |
| **Snov.io** | API | Email finder |
| **DeHashed** | API | Breach search |
| **Have I Been Pwned** | API | Breach check |
| **Epieos** | Web | OSINT tools |
| **Email Permutator** | Web | Generate combos |
| **Peepmail** | Tool | Discovery |
| **OSINTEye** | Desktop | Multi-tool |
| **Minerva** | Tool | Email search |
| **Blackbird** | CLI | Email → accounts |
| **SherlockEye** | Web | Email search |
| **IntelBase** | API | Forensics |
| **Reacher** | API | Verification |

### 5.2 Phone Investigation

| Outil | Type | Fonction |
|-------|------|----------|
| **PhoneInfoga** | CLI | Advanced OSINT |
| **Truecaller** | API | Reverse lookup |
| **Twilio Lookup** | API | Carrier info |
| **Phone Validator** | Web | US validation |
| **CallerID Test** | API | Caller ID |
| **FreeCarrierLookup** | Web | Carrier lookup |
| **Sync.ME** | App | Caller ID |
| **Infobel** | API | Global directory |
| **NumLookup** | Web | Reverse lookup |
| **Spydialer** | Web | Voicemail check |
| **EmobileTracker** | Web | Location |
| **InMobPrefix** | DB | India prefixes |

---

## 6. DOMAINE & IP

### 6.1 DNS & Domain

| Outil | Type | Fonction |
|-------|------|----------|
| **theHarvester** | CLI | Domain intel |
| **Subfinder** | CLI | Subdomain discovery |
| **Amass** | CLI | Attack surface |
| **DNSDumpster** | Web | DNS recon |
| **DNSrecon** | CLI | DNS enumeration |
| **dnsx** | CLI | DNS toolkit |
| **SecurityTrails** | API | DNS history |
| **WHOIS** | CLI/Net | Registration |
| **WHOISology** | Web | WHOIS archive |
| **Domain Tools** | API | Domain intel |
| **CentralOps** | Web | Domain dossier |
| **DNS History** | Web | DNS changes |
| **DomainRecon** | Tool | Multi-source |
| **IntoDNS.ai** | AI | DNS scanner |
| **SubDomainRadar** | Web | Subdomain scan |
| **DNSSpy** | API | Monitoring |

### 6.2 IP & Network

| Outil | Type | Fonction |
|-------|------|----------|
| **Shodan** | CLI/API | Device search |
| **Censys** | CLI/API | Asset discovery |
| **Nmap** | CLI | Port scan |
| **Masscan** | CLI | Fast scan |
| **Naabu** | CLI | Port scan |
| **IPinfo** | API | Geolocation |
| **IPVoid** | Web | IP tools |
| **IPLocation.io** | API | Free geo |
| **IP2Location** | API | Geolocation |
| **MaxMind** | API | GeoIP |
| **BGPView** | API | ASN/BGP |
| **Focsec** | API | VPN/Proxy/TOR |
| **Exonera Tor** | Web | Tor check |
| **WiGLE** | API/Net | WiFi DB |
| **URLScan** | API | URL analysis |
| **Hybrid Analysis** | API | File/URL |
| **VirusTotal** | API | Reputation |

---

## 7. GÉOLOCALISATION

### 7.1 IP Geolocation

| Service | Type | Precision | Cost |
|---------|------|-----------|------|
| **MaxMind GeoIP** | API | City-level | Free/Paid |
| **IPinfo** | API | City-level | Free/Paid |
| **IP2Location** | API | City-level | Paid |
| **IPLocation.io** | API | City-level | Free |
| **IP-API** | API | City-level | Free |
| **DB-IP** | API | City-level | Free/Paid |
| **IPGeolocation** | API | City-level | Free/Paid |
| **IPRegistry** | API | Rich data | Paid |

### 7.2 Photo Geolocation

| Service | Type | Fonction | Cost |
|---------|------|----------|------|
| **GeoSpyer** | AI | AI location from image | Free/Paid |
| **Pic2Map** | Web | EXIF geolocation | Free |
| **GeoGuessr** | AI | AI prediction | Free/Paid |
| **I Know Where Your Cat Lives** | Web | Flickr geo | Free |
| **Photo Map** | Web | Photo mapping | Free |

### 7.3 Maps & Visualisation

| Service | Type | Fonction |
|---------|------|----------|
| **Google Maps** | API | Maps/geocoding |
| **Bing Maps** | API | Maps |
| **OpenStreetMap** | Web | Open maps |
| **Leaflet** | JS | Map library |
| **Mapbox** | API | Custom maps |
| **QGIS** | Desktop | GIS analysis |
| **Google Earth Pro** | Desktop | Satellite |
| **Sentinel Hub** | API | Satellite imagery |
| **Zoom Earth** | Web | Live satellite |
| **Windy** | Web | Weather maps |
| **SAS Planet** | Desktop | Map viewer |
| **Soar.earth** | Web | Satellite |
| **COPERNIX** | Web | Satellite |

---

## 8. IMAGE & VIDÉO

### 8.1 Reverse Image Search

| Service | Type | Strength | Cost |
|---------|------|----------|------|
| **Google Images** | Web | Best coverage | Free |
| **Yandex Images** | Web | Best accuracy | Free |
| **Bing Images** | Web | Good | Free |
| **TinEye** | API | First reverse | Free/Paid |
| **PimEyes** | API | Face search | Paid |
| **FaceCheck.ID** | API | Face recognition | Paid |
| **Faceagle** | Web | Face search | Free |
| **Lenso.ai** | AI | AI search | Freemium |
| **PicTriev** | Web | Face matching | Free |
| **Betaface** | API | Face detection | Paid |
| **Search4Faces** | API | VK/OK search | Free/Paid |
| **Pixsy** | SaaS | Copyright | Paid |
| **Image Raider** | Web | Bulk search | Free |
| **Dupli Checker** | Web | Plagiarism | Free |

### 8.2 Image Analysis

| Outil | Type | Fonction |
|-------|------|----------|
| **ExifTool** | CLI | EXIF extraction |
| **Exif Pilot** | Desktop | EXIF editor |
| **Jeffrey's Exif Viewer** | Web | Online EXIF |
| **Forensically** | Web | Image forensics |
| **Error Level Analysis** | Web | ELA detection |
| **FotoForensics** | Web | Image analysis |
| **InVID** | Web | Video verification |
| **TruePic Vision** | SaaS | Image verify |
| **Clarify** | API | Image tagging |
| **Google Lens** | AI | Visual search |

### 8.3 Video Analysis

| Outil | Type | Fonction |
|-------|------|----------|
| **youtube-dl** | CLI | Download/metadata |
| **yt-dlp** | CLI | YouTube download |
| **Invidious** | Web | YouTube alt |
| **VideoReverser** | Web | Reverse search |
| **InVID** | Web | Verification |
| **TrueTube** | Web | YouTube analysis |

---

## 9. RECHERCHE DE BREACHES

| Service | Type | Database Size | Cost |
|---------|------|---------------|------|
| **DeHashed** | API/API | 15B+ | Paid |
| **Have I Been Pwned** | API | 11B+ | Free/Paid |
| **LeakCheck** | API | 7.5B+ | Freemium |
| **LeakRadar** | API | Stealers | Paid |
| **StealSeek** | Web | Large | Free |
| **Venacus** | API | Monitoring | Paid |
| **Hudson Rock** | API | Stealers | Free |
| **InfoStealers** | API | Darknet | Free/Paid |
| **CredenShow** | Web | Credentials | Free |
| **HIB Ransomed** | Web | Ransomware | Free |
| **IKnowYour.Dad** | Web | General | Free |
| **Leaker** | CLI | Multi-source | Free |
| **NOX** | CLI | Deep analysis | Free |
| **SnusBase** | Web | Breaches | Paid |
| **Intelligence X** | API | Archive | Paid |

---

## 10. PERSONNES & IDENTITÉ

### 10.1 Person Search

| Service | Type | Region | Cost |
|---------|------|--------|------|
| **Pipl** | API | Global | Paid |
| **Spokeo** | Web | US | Paid |
| **Intelius** | Web | US | Paid |
| **Whitepages** | API | US | Paid |
| **BeenVerified** | Web | US | Paid |
| **ThatsThem** | Web | US | Free/Paid |
| **TruePeopleSearch** | Web | US | Free |
| **FastPeopleSearch** | Web | US | Free |
| **SearchPeopleFREE** | Web | US | Free |
| **FamilyTreeNow** | Web | US | Free |
| **PeekYou** | Web | Global | Free |
| **ZabaSearch** | Web | US | Free |

### 10.2 Username Check

| Outil | Type | Platforms | Cost |
|-------|------|-----------|------|
| **Sherlock** | CLI | 400+ | Free |
| **Maigret** | CLI | 2000+ | Free |
| **WhatsMyName** | Web | 500+ | Free |
| **NameChk** | Web | 100+ | Free |
| **NameCheckr** | Web | 100+ | Free |
| **KnowEm** | Web | 500+ | Free |
| **Name Checkup** | Web | Multi | Free |
| **IDCrawl** | Web | Social | Free |
| **UserSearch** | Web | 3000+ | Free/Paid |
| **User Searcher** | Web | 2000+ | Free |
| **Blackbird** | CLI | 100+ | Free |
| **Social Analyzer** | CLI | 1000+ | Free |
| **NexFil** | CLI | 300+ | Free |
| **Seekr** | CLI | Multi | Free |
| **Antisocial** | CLI | 500+ | Free |
| **Trace** | SaaS | 600+ | Free/Paid |
| **User Sherlock** | Web | 30+ | Free |
| **CheckUserNames** | Web | 50+ | Free |

### 10.3 Dating/Personnel

| Outil | Type | Fonction |
|-------|------|----------|
| **Cupidcr4wl** | CLI | Adult platforms |
| **Swindler** | Tool | Dating scams |
| **SocialCatfish** | Web | Verification |
| **DatingScams** | Web | Scam DB |

---

## 11. VÉHICULES & TRANSPORT

### 11.1 Vehicle Lookup

| Service | Type | Region | Cost |
|---------|------|--------|------|
| **FaxVIN** | API | US | Paid |
| **EpicVIN** | API | US | Paid |
| **AutoCheck** | API | US | Paid |
| **Carfax** | API | US | Paid |
| **VINCheck** | Web | US | Free |
| **NMVTIS** | API | US | Paid |
| **AVinfoBot** | Telegram | RU | Free |
| **EasyVIN** | Telegram | RU | Free |
| **avtocodbot** | Telegram | RU | Paid |
| **avtogram_bot** | Telegram | RU | Paid |
| **CarVertical** | API | EU | Paid |
| **Autocheck** | API | EU | Paid |
| **PlatesMania** | Web | Global | Free |

### 11.2 Aviation

| Service | Type | Fonction |
|---------|------|----------|
| **FlightRadar24** | API | Live flights |
| **ADS-B Exchange** | Web | Aircraft tracking |
| **RadarBox** | API | Flight data |
| **PlaneFinder** | App | Live tracking |
| **FlightAware** | API | Flight history |
| **FlightConnections** | Web | Routes |
| **SkyVector** | Web | Aeronautical charts |
| **Globe.adsbexchange** | Web | ADS-B map |

### 11.3 Maritime

| Service | Type | Fonction |
|---------|------|----------|
| **MarineTraffic** | API | Ship tracking |
| **VesselFinder** | API | Vessel tracking |
| **FleetMon** | API | Fleet tracking |
| **ShipSpotting** | Web | Photo DB |
| **SubmarineCableMap** | Web | Cable map |
| **ShippingDatabase** | Web | Vessel info |
| **SeaRates** | Web | Container tracking |
| **PortSEnergy** | Web | Port info |
| **LiveCruiseShipTracker** | Web | Cruises |

---

## 12. FINANCE & CRYPTO

### 12.1 Cryptocurrency

| Service | Type | Fonction |
|---------|------|----------|
| **Blockchain.com** | API | BTC explorer |
| **Etherscan** | API | ETH explorer |
| **OXT** | Web | BTC analysis |
| **WalletExplorer** | Web | Wallet tracking |
| **Chainalysis** | SaaS | Investigation |
| **Elliptic** | SaaS | Crypto intel |
| **CipherTrace** | SaaS | Compliance |
| **TRM Labs** | SaaS | Risk |
| **MistTrack** | Web | AML |
| **BTCTracker** | Web | Tracking |
| **Crystal Blockchain** | SaaS | Analytics |

### 12.2 IBAN / Banking

| Service | Type | Fonction |
|---------|------|----------|
| **IBAN.com** | API | IBAN validation |
| **IBAN Calculator** | Web | IBAN tools |
| **TBG5** | Web | IBAN check |
| **SWIFT Codes** | Web | Bank lookup |

---

## 13. ARCHIVES & DOCUMENTS

### 13.1 Web Archives

| Service | Type | Fonction |
|---------|------|----------|
| **Wayback Machine** | API | Web history |
| **Archive.today** | Web | Snapshots |
| **UK Web Archive** | Web | UK sites |
| **EU Web Archive** | Web | EU sites |
| **CommonCrawl** | API | Web crawl data |
| **Arquivo.pt** | Web | Portugal |
| **Stanford Web Archive** | Web | Research |

### 13.2 Document Search

| Service | Type | Fonction |
|---------|------|----------|
| **Google Scholar** | Web | Academic |
| **Semantic Scholar** | API | Papers |
| **PubMed** | API | Medical |
| **ResearchGate** | Web | Papers |
| **Academia.edu** | Web | Research |
| **Sci-Hub** | Web | Papers |
| **Library Genesis** | Web | Books |
| **Z-Library** | Web | Books |
| **SlideShare** | API | Presentations |
| **Scribd** | Web | Documents |
| **Issuu** | Web | Publications |

---

## 14. OUTILS DE CORRÉLATION

| Outil | Type | Fonction |
|-------|------|----------|
| **Maltego** | Desktop | Graph linking |
| **Gephi** | Desktop | Graph viz |
| **CaseFile** | Desktop | Evidence |
| **MindMap** | Tool | Brainstorm |
| **Draw.io** | Web | Diagrams |
| **yFiles** | JS | Graph lib |
| **Cytoscape** | Desktop | Bio/graph |
| **Palantir** | SaaS | Enterprise |
| **IBM i2** | SaaS | Intelligence |
| **SAS Visual Analytics** | SaaS | Analysis |
| **Tableau** | Desktop | Viz |
| **PowerBI** | Desktop | Viz |
| **Kibana** | Web | Elastic viz |
| **Grafana** | Web | Metrics |

---

## 15. AUTOMATISATION & SCRAPING

### 15.1 Automation Frameworks

| Outil | Langage | Fonction |
|-------|---------|----------|
| **Selenium** | Python/JS | Browser automation |
| **Playwright** | Python/JS | Modern automation |
| **Puppeteer** | JS | Chrome automation |
| **Scrapy** | Python | Scraping framework |
| **BeautifulSoup** | Python | HTML parsing |
| **requests-html** | Python | Scraping |
| **Pyppeteer** | Python | Puppeteer port |

### 15.2 Data Processing

| Outil | Type | Fonction |
|-------|------|----------|
| **Pandas** | Python | Data analysis |
| **Dask** | Python | Big data |
| **Polars** | Python | Fast DataFrames |
| **Apache Spark** | JVM | Big data |
| **Apache Kafka** | JVM | Streaming |
| **Redis** | DB | Caching |
| **Elasticsearch** | DB | Search |
| **Neo4j** | DB | Graph DB |
| **PostgreSQL** | DB | Relational |
| **MongoDB** | DB | Document |

---

## STATISTIQUES DU CATALOGUE

| Catégorie | Nombre d'outils |
|-----------|-----------------|
| CLI Tools | 100+ |
| Web/API Services | 200+ |
| Social Media Tools | 80+ |
| Email/Phone Tools | 50+ |
| Domain/IP Tools | 60+ |
| Image/Video Tools | 40+ |
| Breach Databases | 20+ |
| Geolocation Tools | 30+ |
| **TOTAL** | **580+** |

---

## PRIORITÉS D'INTÉGRATION

### CRITIQUE (Intégrer immédiatement)
1. **Photon** - Crawler rapide
2. **SpiderFoot** - 200+ sources
3. **Sherlock** - Username search
4. **Maigret** - Dossier complet
5. **Osintgram** - Instagram
6. **Instaloader** - Instagram
7. **Telethon** - Telegram
8. **theHarvester** - Domain intel
9. **Shodan** - Device search
10. **Censys** - Asset discovery
11. **h8mail** - Email breach
12. **PhoneInfoga** - Phone OSINT
13. **ExifTool** - Metadata
14. **Robin** - Dark Web AI
15. **Tor** - Anonymisation

### HIGH (Intégrer dans la phase 2)
- Subfinder, Amass, dnsx, httpx, Gau, Waybackurls
- Holehe, Ignorant, GHunt
- Twint, Snscrape
- Telerecon, Telepathy
- Wappalyzer, WhatWeb
- Recon-ng, Gobuster
- LeakCheck, DeHashed, HIBP
- GeoSpyer, TinEye, FaceCheck

### MEDIUM (Phase 3)
- Nuclei, FFuF, Naabu, Masscan
- Blackbird, NexFil, Seekr, Antisocial
- Crosslinked, LinkedInDumper
- GitRecon, github_monitor
- TikTok-Scraper, youtube-dl
- BuiltWith, DNSDumpster
- URLScan, Hybrid Analysis

---

## LICENCE & UTILISATION

**AVERTISSEMENT LÉGAL**: Ces outils doivent être utilisés uniquement dans un cadre légal et éthique. L'utilisateur est responsable du respect des lois locales (RGPD, CCPA, etc.) et des conditions de service des plateformes cibles.

**Notes**:
- Vérifier la licence de chaque outil avant déploiement commercial
- Respecter les rate limits des APIs
- Utiliser Tor/Proxy pour la protection de la vie privée
- Ne pas cibler de personnes sans consentement légal

---

*Catalogue généré le 17 Avril 2026 - OSINT Master Project*

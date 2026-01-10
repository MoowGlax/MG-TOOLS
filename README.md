<div align="center">
  <img src="public/logo.svg" alt="MG Tools Logo" width="120" height="120">
  <h1>MG Tools</h1>
  <p>
    <b>La suite d'outils ultime pour vos médias : Téléchargement, Streaming et Gestion.</b>
  </p>
  <a href="https://discord.gg/XZE3jyS4ms">
    <img src="https://img.shields.io/badge/Discord-Rejoindre-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Join Discord">
  </a>
  <a href="https://github.com/MoowGlax/MG-TOOLS/releases">
    <img src="https://img.shields.io/github/downloads/MoowGlax/MG-TOOLS/total?style=for-the-badge&color=blue&label=T%C3%A9l%C3%A9chargements" alt="Total Downloads">
  </a>
  <a href="https://github.com/MoowGlax/MG-TOOLS/releases/latest">
    <img src="https://img.shields.io/github/v/release/MoowGlax/MG-TOOLS?style=for-the-badge&color=orange&label=Version" alt="Latest Version">
  </a>
</div>

---

**MG-TOOLS** est une application tout-en-un conçue pour les passionnés de médias. Elle centralise le téléchargement de vidéos (YouTube), la gestion de torrents (Deluge/Prowlarr) et le suivi de vos séries (TMDB) dans une interface moderne, fluide et sécurisée.

> 🔒 **Confidentialité avant tout** : Vos données restent chez vous. Clés API chiffrées localement, aucun cloud tiers.

## 📸 Aperçu

| Accueil | YouTube Downloader |
|:---:|:---:|
| ![Accueil](docs/assets/accueil.png) | *Interface de téléchargement avec gestion de playlists* |

| Recherche Prowlarr | Notifications |
|:---:|:---:|
| ![Prowlarr](docs/assets/prowlarr.png) | ![Notifications](docs/assets/notifi.png) |

## ✨ Fonctionnalités Principales

### 🎥 YouTube Downloader (v2.0)
L'outil ultime pour récupérer vos contenus favoris.
- **Formats Multiples** : Téléchargez en **MP3** (audio haute qualité) ou **MP4** (vidéo jusqu'à 4K).
- **Playlists Intelligentes** : Téléchargez des playlists entières avec une barre de progression détaillée (ex: "Item 1/50").
- **Métadonnées Complètes** : Intégration automatique des pochettes, titres et artistes.
- **Historique & Annulation** : Suivez vos téléchargements et annulez-les proprement à tout moment (processus nettoyés automatiquement).

### 🌊 Gestion Torrent (Deluge & Prowlarr)
Prenez le contrôle de vos téléchargements P2P.
- **Recherche Unifiée (Prowlarr)** : Cherchez sur tous vos trackers simultanément.
- **Téléchargement Local** :
  - Sauvegardez les fichiers `.torrent` directement sur votre PC.
  - Récupérez les fichiers téléchargés par Deluge directement sur votre machine locale.
- **Accès Rapide** : Liens directs vers les interfaces Web de vos outils.

### 📺 Suivi de Séries (TMDB)
Ne ratez plus jamais un épisode.
- **Suivi Automatique** : Statuts "En cours", "Terminée", "Annulée" mis à jour en temps réel.
- **Infos Détaillées** : Casting, synopsis, dates de diffusion et notes.
- **Alertes** : Notifications natives pour les nouveaux épisodes ou changements de statut.

### �️ Sécurité & Architecture
- **Stockage Local** : Toutes vos configurations (clés API, préférences) sont stockées en local.
- **Chiffrement** : Utilisation de l'API SafeStorage d'Electron pour protéger vos identifiants.
- **Moderne** : Construit avec Electron, React, Vite et TailwindCSS pour des performances maximales.

## 📥 Installation

### Windows
La méthode recommandée est d'utiliser l'installeur Web qui télécharge automatiquement les composants nécessaires.
1. Téléchargez `MG-Tools-Setup-x.x.x.exe` depuis les [Releases](https://github.com/MoowGlax/MG-TOOLS/releases).
2. Lancez l'installation.
3. Profitez !

### macOS
1. Téléchargez le fichier `.dmg` depuis les [Releases](https://github.com/MoowGlax/MG-TOOLS/releases).
2. Glissez l'application dans votre dossier `Applications`.
3. **Important** : Si vous avez une erreur "endommagé" ou "développeur non identifié", ouvrez le Terminal et lancez :
   ```bash
   sudo xattr -r -d com.apple.quarantine "/Applications/MG Tools.app"
   ```

## 🗺️ Roadmap

- [x] **YouTube Downloader** : Support complet MP3/MP4 et Playlists.
- [x] **Intégration Deluge/Prowlarr** : Recherche et téléchargement local.
- [x] **Support macOS** : Build universel et corrections d'interface (Tray).
- [ ] **STRM Maker** : Création facilitée de fichiers .strm.
- [ ] **Modules externes** : Système de plugins.
- [ ] **Dashboard Personnalisable** : Widgets et raccourcis sur l'accueil.
- [ ] **Backup Cloud (Optionnel)** : Sauvegarde chiffrée de la configuration.

## 🛠️ Développement

Envie de contribuer ? Voici comment lancer le projet localement.

### Prérequis
- Node.js (v18+)
- FFmpeg (pour le traitement YouTube)

### Démarrage Rapide

```bash
# 1. Cloner le projet
git clone https://github.com/MoowGlax/MG-TOOLS.git
cd MG-TOOLS

# 2. Installer les dépendances
npm install

# 3. Lancer en mode développement
npm run dev
```

### Build

```bash
# Windows
npm run build:win

# macOS
npm run build:mac
```

## 💬 Communauté

Besoin d'aide ou envie de proposer une fonctionnalité ?

[![Discord Banner](https://invidget.switchblade.xyz/XZE3jyS4ms)](https://discord.gg/XZE3jyS4ms)

---

<div align="center">
  Développé avec ❤️ par <a href="https://github.com/MoowGlax">MoowGlax</a>
  <br>
  Licence MIT
</div>

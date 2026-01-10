# Notes de version - MG Tools v0.1.3

## ✨ Nouveautés

### 🎵 YouTube Downloader 2.0
- **Support Playlist Intelligent** : La barre de progression affiche désormais l'avancement global (Item 1/50) pour un meilleur suivi.
- **Annulation Robuste (macOS/Linux)** : Réécriture complète du système d'arrêt des téléchargements.
  - L'annulation stoppe désormais immédiatement `yt-dlp` et tous ses sous-processus (comme `ffmpeg`).
  - Finis les téléchargements fantômes en arrière-plan !
- **Stabilité Accrue** :
  - Gestion améliorée des téléchargements simultanés.
  - Prévention des doublons de téléchargement.

### � Deluge & Prowlarr
- **Deluge - Récupération Locale** : Possibilité de télécharger les fichiers d'un torrent (terminé ou en cours) directement sur votre ordinateur depuis l'interface.
- **Prowlarr - Gestion Avancée** :
  - **Téléchargement Local** : Sauvegardez les fichiers `.torrent` directement sur votre machine au lieu de les envoyer à Deluge.
  - **Plus d'infos** : Affichage enrichi des résultats de recherche.
  - **Accès Rapide** : Bouton direct vers l'interface web complète de Prowlarr.

### �🎨 Interface & Expérience Utilisateur
- **Sidebar Compacte** : Affinement de la barre latérale pour laisser plus de place au contenu.
- **Menu Système (Tray) Enrichi** :
  - Accès direct au **Discord** et **GitHub**.
  - Raccourci pour ouvrir le dossier de **Téléchargements**.
  - Correction de la taille de l'icône dans la barre des tâches sur macOS.

## 🐛 Corrections Techniques
- Correction des erreurs de syntaxe dans l'historique de téléchargement.
- Optimisation de la transmission des ID de processus entre le frontend et le backend.
- Nettoyage du code et corrections de linter (YoutubeToMP3).

---

# Notes de version - MG Tools v0.1.2

## 🚀 Nouveautés

### 📦 Installation Optimisée (Windows)
- Introduction d'un **installeur Web (Online)** léger.
  - Taille de téléchargement initiale réduite.
  - Téléchargement automatique des fichiers nécessaires lors de l'installation.

### 🛠 Refactorisation Majeure
- **Architecture Modulaire** : Réorganisation complète du code pour une meilleure maintenabilité.
  - Séparation claire : `main`, `preload`, `services`.
  - Nettoyage du dossier `src` et organisation des fichiers de configuration.
- **Optimisation des Dépendances** :
  - Suppression des bibliothèques superflues (`execa`, `node-fetch`) au profit des modules natifs Node.js.
  - Réduction de la taille globale de l'application.
- **Standardisation** :
  - Mise en place de scripts de build multi-plateformes.
  - Amélioration de la configuration TypeScript et ESLint.
  - Nettoyage du `.gitignore`.

## 🐛 Corrections
- Correction des chemins d'accès pour l'écran de chargement (`splash.html`).
- Résolution des problèmes de permissions lors du build.
- Amélioration de la robustesse des scripts de déploiement.

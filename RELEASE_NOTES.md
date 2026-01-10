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

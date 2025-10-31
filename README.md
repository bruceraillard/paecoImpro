# Paeco Impro

Paeco Impro est une application Electron destinée à piloter un spectacle d'improvisation multijoueur. Elle fournit une
interface « contrôleur » pour le régisseur et une interface « projecteur » destinée au public. Le contrôleur orchestre
les manches, le chronomètre et les scores, tandis que l'affichage projecteur synchronisé retransmet en direct les
informations importantes.

## Fonctionnalités

- **Deux interfaces dédiées** : une fenêtre de contrôle et une fenêtre projecteur, chacune avec une expérience adaptée.
  La fenêtre projecteur peut être ouverte à tout moment depuis le contrôleur via un simple bouton.
- **Configuration de 2 à 4 équipes** : personnalisez le nom et la couleur de chaque équipe, et choisissez combien
  d'équipes participent à la manche.
- **Gestion des scores et des cartons** : incrémentez/décrémentez les scores, distribuez jusqu'à trois cartons par
  équipe (les équipes avec trois cartons sont automatiquement estompées sur le projecteur).
- **Chronomètre manuel précis** : lancez séparément le temps de caucus et le temps d'impro, avec un affichage visuel en
  anneau et une mise en garde quand il reste moins de cinq secondes.
- **Broadcast en temps réel** : le contrôleur et le projecteur communiquent via `BroadcastChannel`, ce qui permet une
  synchronisation immédiate du timer, des scores, des cartons ainsi que du thème et de la catégorie de la manche.
- **Sauvegarde locale** : les paramètres d'équipes sont mémorisés dans le `localStorage` et automatiquement rechargés au
  prochain démarrage.

## Structure du projet

```
.
├── app
│   ├── assets              # Fonts, logo et autres ressources statiques
│   ├── control             # Interface du régisseur (HTML, CSS, JS)
│   └── projector           # Interface du projecteur (HTML, CSS, JS)
├── build                   # Icônes et fichiers de packaging Electron Builder
├── main.js                 # Processus principal Electron et serveur statique Express
├── package.json            # Scripts npm, dépendances et configuration electron-builder
└── README.md
```

## Prérequis

- Node.js 18 ou version ultérieure (recommandé pour Electron 31).
- npm (installé avec Node.js).

Après avoir cloné le dépôt, installez les dépendances :

```bash
npm install
```

## Lancer l'application en développement

```bash
npm run dev
```

Ce script démarre le processus principal Electron (`main.js`). Celui-ci ouvre automatiquement la fenêtre de contrôle et
sert les fichiers statiques contenus dans `app/` via un mini-serveur Express local. Depuis la fenêtre de contrôle,
cliquez sur **Ouvrir le Projecteur** pour lancer l'affichage public dans une nouvelle fenêtre.

### Utilisation du contrôleur

1. Configurez la manche (thème, catégorie, durées de caucus et d'impro).
2. Ajustez le nombre d'équipes puis personnalisez leur nom/couleur dans l'onglet **Paramètres**.
3. Depuis l'onglet **Contrôle**, gérez les scores et les cartons pour chaque équipe.
4. Lancez le chronomètre de caucus ou d'impro. Les informations sont envoyées instantanément au projecteur.
5. Utilisez **Réinitialiser l’affichage** pour effacer le timer et les infos de manche côté projecteur.

### Interface projecteur

La fenêtre projecteur affiche :

- le timer circulaire synchronisé et le libellé de phase (Caucus / Impro) ;
- le thème et la catégorie en cours ;
- les scores et cartons des équipes, avec coloration personnalisée.

Lorsque trois cartons sont attribués à une équipe, celle-ci devient automatiquement semi-transparente pour signaler la
pénalité.

## Packaging

L'application utilise [electron-builder](https://www.electron.build/) pour générer des exécutables.

- Préparer un dossier prêt à empaqueter :
  ```bash
  npm run pack
  ```
- Générer les distributions (`.dmg` pour macOS, installeur NSIS pour Windows, etc.) :
  ```bash
  npm run dist
  ```

Les paramètres d'identité applicative, d'icônes et de cibles sont configurés dans `package.json`.

## Personnalisation

- Les styles peuvent être adaptés dans `app/control/control.css` et `app/projector/projector.css`.
- Les logos et médias sont stockés dans `app/assets/`.
- La logique temps réel (scores, timer, paramètres) est implémentée dans `app/control/control.js` et
  `app/projector/projector.js` à l'aide de l'API `BroadcastChannel`.

## Dépannage

- **La fenêtre projecteur ne s'ouvre pas** : vérifiez que vous utilisez le bouton **Ouvrir le Projecteur** dans la
  fenêtre de contrôle. L'ouverture dans un nouvel onglet du navigateur est bloquée par le processus principal d'
  Electron.
- **Les fichiers statiques ne se chargent pas** : assurez-vous de lancer l'application via `npm run dev`. L'accès direct
  aux fichiers `app/control/control.html` dans un navigateur ne fonctionnera pas, car certaines fonctionnalités (comme
  `BroadcastChannel`) attendent l'environnement Electron.
- **Résolution d'écran** : le projecteur s'adapte automatiquement, mais vous pouvez ajuster les styles CSS si vous
  utilisez un écran avec des dimensions inhabituelles.

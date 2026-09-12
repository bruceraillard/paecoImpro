# Architecture

Paeco Impro est une application Electron organisée autour de deux vues renderer et d'un état métier partagé.

## Vue d'ensemble

```text
main.js
  ├─ démarre le serveur HTTP local
  ├─ ouvre la fenêtre de contrôle
  └─ protège les fenêtres Electron

app/control/
  └─ interface de régie, source principale des actions utilisateur

app/projector/
  └─ affichage public synchronisé

app/shared/
  ├─ game-state.js      état métier pur et testable
  └─ browser-utils.js   utilitaires navigateur partagés
```

## Flux de synchronisation

Le contrôleur est la source principale de vérité pendant l'exploitation. À chaque action importante, il normalise l'état,
le sauvegarde dans le `localStorage`, puis diffuse un snapshot complet via `BroadcastChannel`.

Le projecteur écoute ces snapshots, normalise à nouveau la donnée reçue, sauvegarde la session et met à jour son rendu.
Au chargement, le projecteur demande explicitement un snapshot avec `stateRequest`, ce qui permet de rejoindre une session
déjà en cours.

```text
Contrôleur
  action régie
  normalizeState()
  localStorage
  BroadcastChannel: stateSnapshot

Projecteur
  BroadcastChannel: stateSnapshot
  normalizeState()
  localStorage
  render
```

## État métier

`app/shared/game-state.js` contient les règles indépendantes du DOM :

- nombre d'équipes entre 2 et 4 ;
- scores bornés entre 0 et 999 ;
- cartons bornés entre 0 et 3 ;
- thème et catégorie normalisés ;
- cycle du chrono ;
- reset de manche, reset cartons, reset scores et reset partie.

Ce fichier est utilisable côté navigateur et côté Node, ce qui permet de le tester avec `node --test`.

## Utilitaires navigateur

`app/shared/browser-utils.js` regroupe les helpers communs aux renderers :

- lecture JSON tolérante depuis le storage ;
- écriture JSON tolérante dans le storage ;
- création DOM sans `innerHTML` ;
- détection des champs de saisie pour les raccourcis clavier.

## Processus principal Electron

`main.js` garde le rôle d'infrastructure :

- création des fenêtres ;
- serveur statique local ;
- Content Security Policy ;
- refus des permissions navigateur par défaut ;
- blocage des navigations et ouvertures hors application.

Les vues renderer n'ont pas besoin de Node.js directement. Elles consomment uniquement les scripts servis par
l'application.

## Tests

Les tests Node couvrent principalement les modules partagés :

- `tests/game-state.test.js` pour l'état métier ;
- `tests/browser-utils.test.js` pour les utilitaires de renderer testables sans Electron.

La commande de référence est :

```bash
npm run check
```

Avant une livraison locale, utiliser :

```bash
npm run release:check
```

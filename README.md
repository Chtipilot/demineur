# Démineur

Un démineur classique jouable dans le navigateur, écrit en HTML, CSS et JavaScript, sans aucune dépendance.

## Fonctionnalités

- Trois niveaux : Débutant (9×9, 10 mines), Intermédiaire (16×16, 40 mines), Expert (16×30, 99 mines)
- Le premier clic n'est jamais une mine
- Découverte automatique des zones vides
- Clic sur un chiffre entouré du bon nombre de drapeaux : découvre les cases voisines
- Chronomètre, compteur de mines et record par niveau (enregistré dans le navigateur)
- Jouable sur mobile (appui long ou « Mode drapeau ») et au clavier

## Commandes

| Action | Souris | Mobile | Clavier |
|---|---|---|---|
| Découvrir une case | Clic gauche | Toucher | Entrée |
| Poser / retirer un drapeau | Clic droit | Appui long ou Mode drapeau | F |
| Se déplacer | | | Flèches |

## Lancer le jeu

Ouvrir simplement `index.html` dans un navigateur.

## Jouer en ligne avec GitHub Pages

1. Dans le dépôt GitHub, aller dans **Settings → Pages**.
2. Sous **Build and deployment**, choisir **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
3. Après une minute, le jeu est disponible à l'adresse `https://<ton-utilisateur>.github.io/demineur/`.

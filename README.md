# Wiki Train Simulator Roblox

Site statique (HTML, CSS, JS sans framework ni build) hébergé sur Vercel, traduit à la volée par DeepL via une fonction Python.

## Organisation

```
/
├── index.html, style.css, assets/     page d'accueil (son CSS et ses images)
├── nos-trains/                        liste des trains
│   └── agc-z27500/                    une page = un dossier
│       ├── index.html
│       └── assets/                    images propres à la page (bannière, photo, livrées)
├── aide-conduite/  (+ pc-realiste/, pc-simplifie/, console/, mobile/)
├── roles/
├── formations/     index.html + style.css (aperçus Google Drive)
├── en-travaux/     page affichée pour les rubriques pas encore rédigées (Galerie)
├── global/                            tout ce qui est partagé
│   ├── topbar.html, footer.html       haut et pied de page, définis une seule fois
│   ├── global.css                     variables, base, composants communs (tuiles, cartes, fiches, touches, encadrés…)
│   ├── layout.css                     topbar, footer, menu de langues
│   ├── layout.js                      insertion topbar/footer, menus, lien actif, agrandissement des images
│   ├── translate.js                   menu de langues
│   └── assets/                        logo, favicon, icônes des réseaux
├── api/translate.py                   fonction Vercel : sert chaque page déjà traduite
└── vercel.json
```

L'URL d'une page est le chemin de son dossier : `nos-trains/bb60000/index.html` → `/nos-trains/bb60000`.

Tous les chemins (CSS, images, liens) sont absolus depuis la racine (`/global/global.css`, `/nos-trains/bb60000/assets/photo.webp`) : ils marchent quelle que soit la profondeur de la page et avec ou sans `/` final dans l'URL.

Un fichier utilisé par une seule page reste dans le dossier de cette page ; ce qui sert à plusieurs pages va dans `global/`.

## Ajouter une page

1. Créer `mon-dossier/index.html` en copiant une page existante (garder `<html lang="fr">`, les deux conteneurs `<div id="site-topbar"></div>` et `<div id="site-footer"></div>` tels quels, et les liens vers `/global/…`).
2. Mettre ses images dans `mon-dossier/assets/` et, si besoin, son CSS dans `mon-dossier/style.css` (à ajouter dans le `<head>`).
3. Ajouter le lien dans `global/topbar.html` si la page doit apparaître dans le menu.

Le nom des dossiers ne doit contenir que des lettres, chiffres, `-` ou `_`.

Composants disponibles (voir `global/global.css`) : `.hero` / `.hero-img` (bannière via `style="--hero-img: url(...)"`), `.breadcrumb`, `.content` > `.block`, `.panel`, `.grid` + `.col` (`style="--span:3"` sur 12 colonnes), `.tiles` / `.tile`, `.cards` / `.card`, `.specs`, `.keys` + `<kbd>`, `.callout` (`.warn`), `.mention`. Une image dans un élément `.zoom` s'agrandit au clic.

## Topbar et footer

- **En ligne** : `api/translate.py` lit la page, remplace les deux conteneurs par `global/topbar.html` et `global/footer.html` (traduits), puis envoie la page complète.
- **Sans l'API** (serveur statique local) : `global/layout.js` télécharge ces deux fichiers avec `fetch()` et remplace les conteneurs, en français.

Dans les deux cas, `layout.js` active ensuite le menu mobile, les sous-menus, surligne la rubrique de la page en cours et charge `translate.js` (menu de langues).

## Traduction (DeepL)

Le français est la langue d'origine. Pour une autre langue, `api/translate.py` traduit la page, la topbar et le footer avec DeepL, puis met le résultat en cache (mémoire, Supabase si configuré, CDN Vercel).

- Langue choisie : `?lang=xx` dans l'URL (mémorisé dans le cookie `lang`, puis retiré de l'URL), sinon le cookie, sinon la langue du navigateur. Option `HIDE_LANG_PARAM` dans `api/translate.py` pour garder plutôt `?lang=` dans l'URL.
- La liste du menu de langues vient de DeepL (langues réellement prises en charge).
- Ne pas traduire un texte : `translate="no"` ou classe `notranslate` (noms de trains, marques, livrées régionales…). Les `<kbd>`, `<code>` et `<pre>` ne sont jamais traduits.
- Préciser le sens d'un texte : `data-context="..."` ; imposer une traduction : `data-tr-en="..."` (voir l'en-tête de `api/translate.py`). Ces attributs sont retirés avant l'envoi au navigateur.

## Déploiement Vercel

Aucun build : Vercel sert les fichiers et la fonction `api/translate.py`. `vercel.json` envoie toute URL sans extension (sauf `/api/` et `/global/`) à cette fonction ; les fichiers avec extension (CSS, images, JS) sont servis directement.

Variables d'environnement :

| Variable | Rôle |
|---|---|
| `DEEPL_API_KEY` | obligatoire pour traduire (clé gratuite reconnue par son suffixe `:fx`) ; sans elle, le site reste en français |
| `SUPABASE_URL_TSR`, `SUPABASE_KEY_TSR` | optionnelles : cache durable des traductions (table `bot_translations`) |

## En local

```
python3 -m http.server 8000      # puis http://localhost:8000 (français, topbar chargée par layout.js)
vercel dev                        # pour tester aussi la traduction
```

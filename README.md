# Disability in Western Art — Web Database (12 Sep 2026)

Static site for Angelo Lo Conte / HKBU — 20 artworks from `Database_20AUG`.

**GitHub repo:** [Lazaruschan/Seeing-the-Invisible-Visual-Representations-of-Disability-in-Early-Modern-Europe-1400-1700-](https://github.com/Lazaruschan/Seeing-the-Invisible-Visual-Representations-of-Disability-in-Early-Modern-Europe-1400-1700-)

**Live site (after publish):** https://lazaruschan.github.io/Seeing-the-Invisible-Visual-Representations-of-Disability-in-Early-Modern-Europe-1400-1700-/

## Open locally

```bash
cd "1. Design/WebDatabase_12SEP2026"
npx --yes serve .
```

## What’s included

- Vanilla hash SPA (`index.html`, `app.js`, `data.js`, `styles.css`)
- **20 artworks** with essays; images in `assets/01.jpg` … `assets/20.jpg` (ASCII-safe names for Pages)
- Nav: **Collection · VR Gallery · About · Contact**
- Homepage A/B: carousel vs all-20 grid
- GitHub Pages workflow: `.github/workflows/deploy-pages.yml`
- `.nojekyll` so asset paths work on Pages

## Publish to GitHub Pages

Do **not** commit your personal access token. Use one of:

```bat
REM Windows
set GH_TOKEN=ghp_your_token_here
publish.bat
```

```bash
# macOS / Linux / Git Bash
export GH_TOKEN=ghp_your_token_here
chmod +x publish.sh
./publish.sh
```

Or put the token alone in a gitignored file `.publish-token`, then run `publish.bat` / `./publish.sh`.

Token needs **`repo`** + **`workflow`** scopes: https://github.com/settings/tokens

The scripts clone the repo, replace the site root with this package, commit, push `main`, and request Pages (GitHub Actions).

First-time setup: repo **Settings → Pages → Source = GitHub Actions**.

## Placeholders pending Angelo

- Final homepage / About copy
- Contact email
- Browser VR launch URL / intro video

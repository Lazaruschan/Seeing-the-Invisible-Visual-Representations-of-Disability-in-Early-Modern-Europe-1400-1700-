# Disability in Western Art — Web Database (12 Sep 2026)

Static site for Angelo Lo Conte / HKBU — 20 artworks from `Database_20AUG`.

**GitHub repo:** [Lazaruschan/Seeing-the-Invisible-Visual-Representations-of-Disability-in-Early-Modern-Europe-1400-1700-](https://github.com/Lazaruschan/Seeing-the-Invisible-Visual-Representations-of-Disability-in-Early-Modern-Europe-1400-1700-)

**Live site (after publish):** https://lazaruschan.github.io/Seeing-the-Invisible-Visual-Representations-of-Disability-in-Early-Modern-Europe-1400-1700-/

## Open locally

```bash
cd "1. Design/WebDatabase_12SEP2026"
npx --yes serve .
```

Then open:

- Catalogue: `http://localhost:3000/` (port may vary)
- **Browser VR gallery:** `http://localhost:3000/vr/`

ES modules and Three.js CDN require a local static server (do not open `index.html` as a `file://` URL).

### WebXR (headset)

Immersive VR needs **HTTPS** (or `localhost`). GitHub Pages provides HTTPS after publish. On Meta Quest, open the live `/vr/` URL in the headset browser and tap **Enter VR**.

## What’s included

- Vanilla hash SPA (`index.html`, `app.js`, `data.js`, `styles.css`)
- **20 artworks** with essays; images in `assets/01.jpg` … `assets/20.jpg` / `.png` (ASCII-safe names for Pages)
- Nav: **Collection · VR Gallery · About · Contact**
- Homepage A/B: carousel vs all-20 grid
- **Three.js VR gallery** in `vr/`:
  - Architecture from `vr/assets/gallery_scene_vr_ver6_12SEP2026_web-optimized.glb` (~21 MB)
  - **Edge-line** shell via `EdgesGeometry` (soft opacity; hard creases only — not full-mesh wireframe)
  - Catalogue textures reconnected onto `Art_*` canvases (upright)
  - Desktop walk + WebXR; essays at `#artwork/{id}`
- GitHub Pages workflow: `.github/workflows/deploy-pages.yml`
- `.nojekyll` so asset paths work on Pages

### VR model

| File | Size | Published? |
|------|------|------------|
| `gallery_scene_vr_ver6_12SEP2026_web-optimized.glb` | ~21 MB | **Yes** (default in `/vr/`) |
| `gallery_scene_vr_ver6_12SEP2026_web.glb` | ~360 MB | No (gitignored; local only) |
| `gallery_scene_vr_ver6_12SEP2026.glb` | ~360 MB | No (gitignored; local only) |

## Publish to GitHub Pages

Do **not** commit your personal access token. Use one of:

```bat
REM Windows (non-interactive)
set GH_TOKEN=ghp_your_token_here
set PUBLISH_YES=1
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

The scripts:

1. Clone the Pages repo (`main`)
2. Replace the site root with this package
3. Skip secrets and the **360 MB** GLBs; **include** `*-web-optimized.glb`
4. Commit, push, and request Pages (GitHub Actions)

`publish.sh` uses `rsync` when available, otherwise `tar` (works in Git Bash without rsync).

First-time setup: repo **Settings → Pages → Source = GitHub Actions**.

## Placeholders pending Angelo

- Final homepage / About copy
- Contact email
- Intro video URL (`project.introVideoUrl` in `data.js` — shown in the VR lobby when set)

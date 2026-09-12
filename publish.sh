#!/usr/bin/env bash
# Publish WebDatabase_12SEP2026 to GitHub Pages (main).
#
# Usage:
#   ./publish.sh
#   ./publish.sh ghp_YOUR_TOKEN
#   GH_TOKEN=ghp_... ./publish.sh
#   GH_USER=OtherUser GH_TOKEN=ghp_... ./publish.sh
#
# Optional: .publish-token (gitignored)
#
# Publishes catalogue + wireframe VR + Draco-optimized GLB (~21 MB).
# Skips ~360 MB unoptimized GLBs (GitHub 100 MB limit).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

REPO_NAME="Seeing-the-Invisible-Visual-Representations-of-Disability-in-Early-Modern-Europe-1400-1700-"
BRANCH="main"
GH_USER="${GH_USER:-Lazaruschan}"
REPO_SLUG="${GH_USER}/${REPO_NAME}"
OPT_GLB="vr/assets/gallery_scene_vr_ver6_12SEP2026_web-optimized.glb"

if [[ "${1:-}" != "" && "${1:-}" != "-y" && "${1:-}" != "/Y" ]]; then
  GH_TOKEN="$1"
fi
if [[ -z "${GH_TOKEN:-}" && -f "$ROOT/.publish-token" ]]; then
  GH_TOKEN="$(tr -d '\r\n' < "$ROOT/.publish-token")"
fi

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo
  echo "Paste your GitHub personal access token, then press Enter."
  echo "Create one with \"repo\" + \"workflow\" scopes:"
  echo "  https://github.com/settings/tokens"
  echo
  # -s hides input; still typed in the terminal
  read -r -s -p "GitHub token (ghp_... or github_pat_...): " GH_TOKEN
  echo
  GH_TOKEN="$(printf '%s' "$GH_TOKEN" | tr -d '\r\n ')"
fi

if [[ -z "${GH_TOKEN:-}" ]]; then
  cat <<EOF

ERROR: GitHub token is required.
  1) type it at the prompt above
  2) export GH_TOKEN=ghp_...
  3) ./publish.sh ghp_...
  4) put token in .publish-token (gitignored)
EOF
  exit 1
fi

if [[ ! -f "$ROOT/$OPT_GLB" ]]; then
  echo "ERROR: Missing optimized VR model:"
  echo "  $ROOT/$OPT_GLB"
  echo "Copy gallery_scene_vr_ver6_12SEP2026_web-optimized.glb into vr/assets/ first."
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is not installed or not on PATH."
  exit 1
fi

export GIT_TERMINAL_PROMPT=0
export GCM_INTERACTIVE=never

WORK="$(mktemp -d "${TMPDIR:-/tmp}/webdb_publish.XXXXXX")"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

REMOTE="https://x-access-token:${GH_TOKEN}@github.com/${REPO_SLUG}.git"

echo
echo "=== Publishing WebDatabase (catalogue + wireframe VR + optimized GLB) ==="
echo "=== Cloning ${REPO_SLUG} ==="
if ! git clone --depth 1 --branch "$BRANCH" "$REMOTE" "$WORK"; then
  echo "Clone failed. Check username, token (repo scope), and repo access."
  exit 1
fi

echo
echo "=== Replacing site files ==="
find "$WORK" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

copy_tree() {
  if command -v rsync >/dev/null 2>&1; then
    rsync -a \
      --exclude '.git' \
      --exclude '.publish-work' \
      --exclude '.publish-token' \
      --exclude '.env' \
      --exclude '.env.*' \
      --exclude 'gallery_scene_vr_ver6_12SEP2026.glb' \
      --exclude 'gallery_scene_vr_ver6_12SEP2026_web.glb' \
      --exclude '**/gallery_scene_vr_ver6_12SEP2026.glb' \
      --exclude '**/gallery_scene_vr_ver6_12SEP2026_web.glb' \
      "$ROOT/" "$WORK/"
    return
  fi

  if command -v tar >/dev/null 2>&1; then
    # Portable fallback for Git Bash / environments without rsync
    tar -C "$ROOT" \
      --exclude='.git' \
      --exclude='.publish-work' \
      --exclude='.publish-token' \
      --exclude='.env' \
      --exclude='.env.*' \
      --exclude='gallery_scene_vr_ver6_12SEP2026.glb' \
      --exclude='gallery_scene_vr_ver6_12SEP2026_web.glb' \
      -cf - . | tar -C "$WORK" -xf -
    return
  fi

  echo "ERROR: need rsync or tar to copy files."
  exit 1
}

copy_tree

rm -f "$WORK/vr/assets/gallery_scene_vr_ver6_12SEP2026.glb" \
      "$WORK/vr/assets/gallery_scene_vr_ver6_12SEP2026_web.glb" 2>/dev/null || true
find "$WORK" -type f -size +95M -print -delete 2>/dev/null || true

if [[ ! -f "$WORK/$OPT_GLB" ]]; then
  echo "ERROR: Optimized GLB missing after copy: $OPT_GLB"
  exit 1
fi

cd "$WORK"
git config user.name "$GH_USER"
git config user.email "${GH_USER}@users.noreply.github.com"

git add -A
echo
echo "=== Staged changes ==="
git status --short

if git diff --cached --quiet; then
  echo "No file changes to commit - remote already matches this package."
else
  git commit -m "Publish WebDatabase: catalogue + wireframe VR (optimized Draco GLB)"
  echo
  echo "=== Pushing to origin/${BRANCH} ==="
  git -c http.postBuffer=524288000 push origin "$BRANCH"
fi

echo
echo "=== Ensuring GitHub Pages (Actions) ==="
if command -v curl >/dev/null 2>&1; then
  curl -sS -X PUT \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${GH_TOKEN}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${REPO_SLUG}/pages" \
    -d '{"build_type":"workflow","source":{"branch":"main","path":"/"}}' >/dev/null || true
fi

echo
echo "Done."
echo "Repo:    https://github.com/${REPO_SLUG}"
echo "Site:    https://${GH_USER}.github.io/${REPO_NAME}/"
echo "VR:      https://${GH_USER}.github.io/${REPO_NAME}/vr/"
echo "Actions: https://github.com/${REPO_SLUG}/actions"
echo
echo "VR model: ${OPT_GLB} (~21 MB, Draco)."
echo "First-time Pages: Settings -> Pages -> Source = GitHub Actions."

#!/usr/bin/env bash
# Publish WebDatabase_12SEP2026 to GitHub Pages repo (main branch).
# Usage:
#   ./publish.sh
#   ./publish.sh ghp_YOUR_TOKEN
#   GH_TOKEN=ghp_... ./publish.sh
#
# Optional local secret file (gitignored): .publish-token

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

REPO_SLUG="Lazaruschan/Seeing-the-Invisible-Visual-Representations-of-Disability-in-Early-Modern-Europe-1400-1700-"
BRANCH="main"
GH_USER="Lazaruschan"

if [[ "${1:-}" != "" ]]; then
  GH_TOKEN="$1"
fi
if [[ -z "${GH_TOKEN:-}" && -f "$ROOT/.publish-token" ]]; then
  GH_TOKEN="$(tr -d '\r\n' < "$ROOT/.publish-token")"
fi

if [[ -z "${GH_TOKEN:-}" ]]; then
  cat <<EOF

ERROR: GitHub token required.
  1) export GH_TOKEN=ghp_...
  2) ./publish.sh ghp_...
  3) put token in .publish-token (gitignored)

Create a PAT with "repo" + "workflow" scopes:
  https://github.com/settings/tokens
EOF
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is not installed or not on PATH."
  exit 1
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/webdb_publish.XXXXXX")"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

REMOTE="https://x-access-token:${GH_TOKEN}@github.com/${REPO_SLUG}.git"

echo
echo "=== Cloning ${REPO_SLUG} ==="
git clone --depth 1 --branch "$BRANCH" "$REMOTE" "$WORK"

echo
echo "=== Replacing site files with this package ==="
find "$WORK" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

# Copy package (exclude secrets / VCS)
rsync -a \
  --exclude '.git' \
  --exclude '.publish-work' \
  --exclude '.publish-token' \
  --exclude '.env' \
  --exclude '.env.*' \
  "$ROOT/" "$WORK/"

cd "$WORK"
git config user.name "$GH_USER"
git config user.email "${GH_USER}@users.noreply.github.com"

git add -A
git status --short

if git diff --cached --quiet; then
  echo "No file changes to commit — remote already matches this package."
else
  git commit -m "Publish WebDatabase_12SEP2026 site (20 artworks)"
  echo
  echo "=== Pushing to origin/${BRANCH} ==="
  git push origin "$BRANCH"
fi

echo
echo "=== Ensuring GitHub Pages (Actions / root) ==="
curl -sS -X PUT \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/${REPO_SLUG}/pages" \
  -d '{"build_type":"workflow","source":{"branch":"main","path":"/"}}' >/dev/null || true

echo
echo "Done."
echo "Repo:    https://github.com/${REPO_SLUG}"
echo "Site:    https://lazaruschan.github.io/Seeing-the-Invisible-Visual-Representations-of-Disability-in-Early-Modern-Europe-1400-1700-/"
echo "Actions: https://github.com/${REPO_SLUG}/actions"
echo
echo "If Pages is first-time: Settings -> Pages -> Source = GitHub Actions."

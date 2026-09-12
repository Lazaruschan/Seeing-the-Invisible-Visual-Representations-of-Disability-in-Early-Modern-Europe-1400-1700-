@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Publish WebDatabase_12SEP2026 to GitHub Pages (main).
REM
REM Usage:
REM   publish.bat
REM   publish.bat [username] [token] [/Y]
REM   set GH_USER=... & set GH_TOKEN=... & set PUBLISH_YES=1 & publish.bat
REM   Token file: .publish-token (gitignored)
REM
REM Publishes:
REM   - catalogue site + VR gallery (wireframe, center reticle, Draco GLB)
REM   - vr\assets\gallery_scene_vr_ver6_12SEP2026_web-optimized.glb (~21 MB)
REM Skips:
REM   - gallery_scene_vr_ver6_12SEP2026.glb / _web.glb (~360 MB each)
REM   - .publish-token, .env*

cd /d "%~dp0"
set "SRC=%~dp0"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"

set "REPO_NAME=Seeing-the-Invisible-Visual-Representations-of-Disability-in-Early-Modern-Europe-1400-1700-"
set "BRANCH=main"
set "DEFAULT_USER=Lazaruschan"
set "OPT_GLB=vr\assets\gallery_scene_vr_ver6_12SEP2026_web-optimized.glb"

echo.
echo ============================================================
echo   WebDatabase_12SEP2026 - Publish to GitHub Pages
echo ============================================================
echo   Includes: catalogue + wireframe VR + optimized GLB
echo   Skips:    360 MB unoptimized GLBs, secrets
echo   Token:    repo + workflow  https://github.com/settings/tokens
echo ============================================================
echo.

if not exist "%SRC%\%OPT_GLB%" (
  echo ERROR: Missing optimized VR model:
  echo   %SRC%\%OPT_GLB%
  echo Copy gallery_scene_vr_ver6_12SEP2026_web-optimized.glb into vr\assets\ first.
  echo.
  pause
  exit /b 1
)

REM --- Username ---
if not "%~1"=="" set "GH_USER=%~1"
if "%GH_USER%"=="" (
  if /I "%PUBLISH_YES%"=="1" (
    set "GH_USER=%DEFAULT_USER%"
  ) else (
    set /p "GH_USER=GitHub username [%DEFAULT_USER%]: "
  )
)
if "%GH_USER%"=="" set "GH_USER=%DEFAULT_USER%"
set "GH_USER=!GH_USER: =!"

REM --- Token ---
if not "%~2"=="" set "GH_TOKEN=%~2"
if "%GH_TOKEN%"=="" if exist "%SRC%\.publish-token" (
  for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "(Get-Content -LiteralPath '%SRC%\.publish-token' -Raw).Trim()"`) do set "GH_TOKEN=%%T"
)
if "%GH_TOKEN%"=="" (
  echo.
  echo Paste your GitHub personal access token below, then press Enter.
  echo Create one with "repo" + "workflow" scopes:
  echo   https://github.com/settings/tokens
  echo.
  set /p "GH_TOKEN=GitHub token (ghp_... or github_pat_...): "
)
if defined GH_TOKEN set "GH_TOKEN=!GH_TOKEN: =!"
if "!GH_TOKEN!"=="" (
  echo.
  echo ERROR: GitHub token is required.
  echo   Type the token at the prompt, or:
  echo   set GH_TOKEN=ghp_... ^& set PUBLISH_YES=1 ^& publish.bat
  echo   or put the token in .publish-token
  echo.
  pause
  exit /b 1
)

set "REPO_SLUG=%GH_USER%/%REPO_NAME%"
set "SITE_URL=https://%GH_USER%.github.io/%REPO_NAME%/"

echo.
echo Username : %GH_USER%
echo Repo     : https://github.com/%REPO_SLUG%
echo Branch   : %BRANCH%
echo Model    : %OPT_GLB%
echo.

if /I not "%PUBLISH_YES%"=="1" if /I not "%~3"=="/Y" if /I not "%~3"=="-y" if /I not "%~1"=="/Y" (
  set /p "CONFIRM=Publish now? [Y/n]: "
  if /I "!CONFIRM!"=="n" (
    echo Cancelled.
    echo.
    pause
    exit /b 0
  )
)

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: git is not installed or not on PATH.
  echo.
  pause
  exit /b 1
)
where robocopy >nul 2>&1
if errorlevel 1 (
  echo ERROR: robocopy not found.
  echo.
  pause
  exit /b 1
)

set "WORK=%TEMP%\webdb_publish_%RANDOM%%RANDOM%"
if exist "%WORK%" rd /s /q "%WORK%" 2>nul

set "GIT_TERMINAL_PROMPT=0"
set "GCM_INTERACTIVE=never"
REM Clone without credentials (public repo). Token only used for push.
set "REMOTE_PUBLIC=https://github.com/!REPO_SLUG!.git"
set "REMOTE_AUTH=https://x-access-token:!GH_TOKEN!@github.com/!REPO_SLUG!.git"
set "CLONE_ERR=%TEMP%\webdb_clone_err_%RANDOM%.txt"

echo.
echo === Cloning %REPO_SLUG% ===
git -c credential.helper= clone --depth 1 --branch %BRANCH% "!REMOTE_PUBLIC!" "%WORK%" 2>"%CLONE_ERR%"
set "CLONE_EC=!ERRORLEVEL!"
if !CLONE_EC! NEQ 0 (
  echo.
  echo Clone failed. Check network and that the repo exists.
  if exist "%CLONE_ERR%" type "%CLONE_ERR%"
  echo.
  pause
  exit /b 1
)
if exist "%CLONE_ERR%" del /f /q "%CLONE_ERR%" 2>nul

echo.
echo === Replacing site files ===
pushd "%WORK%"
for /f "delims=" %%F in ('dir /a /b 2^>nul') do (
  if /I not "%%F"==".git" (
    if exist "%%F\" (
      rd /s /q "%%F" 2>nul
    ) else (
      del /f /q "%%F" 2>nul
    )
  )
)
popd

robocopy "%SRC%" "%WORK%" /E ^
  /XD .git .publish-work ^
  /XF .publish-token .env .env.local .env.* ^
     gallery_scene_vr_ver6_12SEP2026.glb ^
     gallery_scene_vr_ver6_12SEP2026_web.glb ^
  /NFL /NDL /NJH /NJS /NC /NS /NP
set "RC=%ERRORLEVEL%"
if %RC% GEQ 8 (
  echo robocopy failed with code %RC%
  rd /s /q "%WORK%" 2>nul
  echo.
  pause
  exit /b 1
)

REM Drop oversized / unoptimized leftovers; keep optimized GLB
if exist "%WORK%\vr\assets\gallery_scene_vr_ver6_12SEP2026.glb" del /f /q "%WORK%\vr\assets\gallery_scene_vr_ver6_12SEP2026.glb" 2>nul
if exist "%WORK%\vr\assets\gallery_scene_vr_ver6_12SEP2026_web.glb" del /f /q "%WORK%\vr\assets\gallery_scene_vr_ver6_12SEP2026_web.glb" 2>nul
powershell -NoProfile -Command "$root = [Environment]::GetEnvironmentVariable('WORK','Process'); if (-not $root) { $root = '%WORK%' }; Get-ChildItem -LiteralPath $root -Recurse -File -EA SilentlyContinue | Where-Object { $_.Length -gt 95MB } | ForEach-Object { Write-Host ('Removing oversized: ' + $_.Name); Remove-Item -LiteralPath $_.FullName -Force }"

if not exist "%WORK%\%OPT_GLB%" (
  echo ERROR: Optimized GLB missing after copy: %OPT_GLB%
  rd /s /q "%WORK%" 2>nul
  echo.
  pause
  exit /b 1
)

pushd "%WORK%"
git config user.name "%GH_USER%"
git config user.email "%GH_USER%@users.noreply.github.com"

git add -A
echo.
echo === Staged changes ===
git status --short

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Publish WebDatabase: catalogue + wireframe VR (optimized Draco GLB)"
  if errorlevel 1 (
    echo Commit failed.
    popd
    rd /s /q "%WORK%" 2>nul
    echo.
    pause
    exit /b 1
  )
  echo.
  echo === Pushing to origin/%BRANCH% ===
  git -c credential.helper= -c http.postBuffer=524288000 push "!REMOTE_AUTH!" "HEAD:refs/heads/%BRANCH%"
  set "PUSH_EC=!ERRORLEVEL!"
  if !PUSH_EC! NEQ 0 (
    echo Push failed. Check token scopes and network.
    popd
    rd /s /q "%WORK%" 2>nul
    echo.
    pause
    exit /b 1
  )
) else (
  echo No file changes to commit - remote already matches this package.
)

echo.
echo === Ensuring GitHub Pages (Actions) ===
curl.exe -sS -X PUT ^
  -H "Accept: application/vnd.github+json" ^
  -H "Authorization: Bearer !GH_TOKEN!" ^
  -H "X-GitHub-Api-Version: 2022-11-28" ^
  "https://api.github.com/repos/%REPO_SLUG%/pages" ^
  -d "{\"build_type\":\"workflow\",\"source\":{\"branch\":\"main\",\"path\":\"/\"}}" >nul 2>&1

popd
rd /s /q "%WORK%" 2>nul

echo.
echo Done.
echo Repo:    https://github.com/%REPO_SLUG%
echo Site:    %SITE_URL%
echo VR:      %SITE_URL%vr/
echo Actions: https://github.com/%REPO_SLUG%/actions
echo.
echo First-time Pages: Settings -^> Pages -^> Source = GitHub Actions.
echo.
pause
exit /b 0

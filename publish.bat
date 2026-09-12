@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Publish WebDatabase_12SEP2026 to GitHub Pages repo (main branch).
REM Interactive prompts for GitHub username + personal access token.
REM Optional overrides:
REM   publish.bat [username] [token]
REM   set GH_USER=... & set GH_TOKEN=... & publish.bat
REM   .publish-token file (gitignored) for token only

cd /d "%~dp0"
set "SRC=%~dp0"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"

set "REPO_NAME=Seeing-the-Invisible-Visual-Representations-of-Disability-in-Early-Modern-Europe-1400-1700-"
set "BRANCH=main"
set "DEFAULT_USER=Lazaruschan"

echo.
echo ============================================================
echo   WebDatabase_12SEP2026 — Publish to GitHub Pages
echo ============================================================
echo   Target repo: %DEFAULT_USER%/%REPO_NAME%
echo   ^(or your fork under the username you enter^)
echo.
echo   Create a PAT with "repo" + "workflow" scopes:
echo   https://github.com/settings/tokens
echo ============================================================
echo.

REM --- Username ---
if not "%~1"=="" set "GH_USER=%~1"
if "%GH_USER%"=="" (
  set /p "GH_USER=GitHub username [%DEFAULT_USER%]: "
)
if "%GH_USER%"=="" set "GH_USER=%DEFAULT_USER%"
set "GH_USER=!GH_USER: =!"

REM --- Token ---
if not "%~2"=="" set "GH_TOKEN=%~2"
if "%GH_TOKEN%"=="" if exist "%SRC%\.publish-token" (
  set /p GH_TOKEN=<"%SRC%\.publish-token"
)

if "%GH_TOKEN%"=="" (
  echo.
  echo Enter your GitHub personal access token ^(input is hidden^).
  echo The token is used only for this publish run and is not saved.
  echo.
  call :ReadSecret GH_TOKEN "GitHub token (ghp_...): "
)

if "%GH_TOKEN%"=="" (
  echo.
  echo ERROR: GitHub token is required.
  exit /b 1
)

set "REPO_SLUG=%GH_USER%/%REPO_NAME%"
set "SITE_HOST=https://%GH_USER%.github.io"
REM GitHub Pages lowercases the user host; keep path as repo name
set "SITE_URL=%SITE_HOST%/%REPO_NAME%/"

echo.
echo Username : %GH_USER%
echo Repo     : https://github.com/%REPO_SLUG%
echo Branch   : %BRANCH%
echo.
set /p "CONFIRM=Publish now? [Y/n]: "
if /I "%CONFIRM%"=="n" (
  echo Cancelled.
  exit /b 0
)

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: git is not installed or not on PATH.
  exit /b 1
)

set "WORK=%TEMP%\webdb_publish_%RANDOM%"
set "REMOTE=https://x-access-token:%GH_TOKEN%@github.com/%REPO_SLUG%.git"

echo.
echo === Cloning %REPO_SLUG% ===
git clone --depth 1 --branch %BRANCH% "%REMOTE%" "%WORK%"
if errorlevel 1 (
  echo Clone failed. Check username, token permissions, and repo access.
  exit /b 1
)

echo.
echo === Replacing site files with this package ===
pushd "%WORK%"
for /f "delims=" %%F in ('dir /a /b') do (
  if /I not "%%F"==".git" (
    if exist "%%F\" (
      rd /s /q "%%F"
    ) else (
      del /f /q "%%F"
    )
  )
)
popd

REM Copy package contents (exclude local secrets / work dirs)
REM Note: trailing backslash on paths breaks quoting — SRC has it stripped above.
robocopy "%SRC%" "%WORK%" /E /XD .git .publish-work /XF .publish-token .env /NFL /NDL /NJH /NJS /NC /NS /NP
set "RC=%ERRORLEVEL%"
if %RC% GEQ 8 (
  echo robocopy failed with code %RC%
  rd /s /q "%WORK%" 2>nul
  exit /b 1
)

pushd "%WORK%"
git config user.name "%GH_USER%"
git config user.email "%GH_USER%@users.noreply.github.com"

git add -A
git status --short

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Publish WebDatabase_12SEP2026 site (20 artworks)"
  if errorlevel 1 (
    echo Commit failed.
    popd
    rd /s /q "%WORK%" 2>nul
    exit /b 1
  )
  echo.
  echo === Pushing to origin/%BRANCH% ===
  git push origin %BRANCH%
  if errorlevel 1 (
    echo Push failed.
    popd
    rd /s /q "%WORK%" 2>nul
    exit /b 1
  )
) else (
  echo No file changes to commit — remote already matches this package.
)

echo.
echo === Ensuring GitHub Pages ^(Actions / root^) ===
curl -sS -X PUT ^
  -H "Accept: application/vnd.github+json" ^
  -H "Authorization: Bearer %GH_TOKEN%" ^
  -H "X-GitHub-Api-Version: 2022-11-28" ^
  https://api.github.com/repos/%REPO_SLUG%/pages ^
  -d "{\"build_type\":\"workflow\",\"source\":{\"branch\":\"main\",\"path\":\"/\"}}" >nul 2>&1

popd
rd /s /q "%WORK%" 2>nul

echo.
echo Done.
echo Repo:    https://github.com/%REPO_SLUG%
echo Site:    %SITE_URL%
echo Actions: https://github.com/%REPO_SLUG%/actions
echo.
echo If Pages is first-time: Settings -^> Pages -^> Source = GitHub Actions.
exit /b 0

REM ---------------------------------------------------------------------------
REM ReadSecret VARNAME "Prompt text"
REM Uses PowerShell SecureString so the token is not echoed on screen.
REM ---------------------------------------------------------------------------
:ReadSecret
set "_rsVar=%~1"
set "_rsPrompt=%~2"
for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "$p=Read-Host -AsSecureString '%_rsPrompt%'; $b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($p); try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }"`) do set "%_rsVar%=%%T"
set "_rsVar="
set "_rsPrompt="
exit /b 0

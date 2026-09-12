@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Publish WebDatabase_12SEP2026 to GitHub Pages repo (main branch).
REM Usage:
REM   publish.bat
REM   publish.bat ghp_YOUR_TOKEN
REM   set GH_TOKEN=ghp_... && publish.bat
REM
REM Optional local secret file (gitignored): .publish-token

cd /d "%~dp0"
set "SRC=%~dp0"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"

set "REPO_SLUG=Lazaruschan/Seeing-the-Invisible-Visual-Representations-of-Disability-in-Early-Modern-Europe-1400-1700-"
set "BRANCH=main"
set "GH_USER=Lazaruschan"

if not "%~1"=="" set "GH_TOKEN=%~1"
if "%GH_TOKEN%"=="" if exist "%~dp0.publish-token" (
  set /p GH_TOKEN=<"%~dp0.publish-token"
)

if "%GH_TOKEN%"=="" (
  echo.
  echo ERROR: GitHub token required.
  echo   1^) set GH_TOKEN=ghp_...
  echo   2^) publish.bat ghp_...
  echo   3^) put token in .publish-token ^(gitignored^)
  echo.
  echo Create a fine-grained or classic PAT with "repo" + "workflow" scopes:
  echo   https://github.com/settings/tokens
  exit /b 1
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
  echo Clone failed. Check token permissions and repo access.
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
echo Repo:   https://github.com/%REPO_SLUG%
echo Site:   https://lazaruschan.github.io/Seeing-the-Invisible-Visual-Representations-of-Disability-in-Early-Modern-Europe-1400-1700-/
echo Actions: https://github.com/%REPO_SLUG%/actions
echo.
echo If Pages is first-time: Settings -^> Pages -^> Source = GitHub Actions.
exit /b 0

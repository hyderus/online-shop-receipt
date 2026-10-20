@echo off
setlocal enabledelayedexpansion
title Push ShopReceipt Pro to GitHub

echo ========================================================
echo   ShopReceipt Pro - GitHub Deployment Assistant
echo ========================================================
echo.

:: Refresh environment PATH to include newly installed Git & GitHub CLI
set "PATH=%LOCALAPPDATA%\Microsoft\WindowsApps;%PATH%"
for /f "tokens=2* delims= " %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "PATH=%%b;!PATH!"
for /f "tokens=2* delims= " %%a in ('reg query "HKLM\System\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%b;!PATH!"

:: Verify Git
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git could not be located in PATH.
    pause
    exit /b 1
)

:: Verify GitHub CLI
where gh >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] GitHub CLI (gh) could not be located in PATH.
    pause
    exit /b 1
)

echo [OK] Git and GitHub CLI detected.
echo.

:: Check GitHub Authentication
echo Checking GitHub authentication status...
gh auth status >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo --------------------------------------------------------
    echo You are not currently logged into GitHub.
    echo We will now launch the GitHub browser login.
    echo --------------------------------------------------------
    echo.
    pause
    gh auth login --web -p https -h github.com -w
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Authentication was not completed.
        pause
        exit /b 1
    )
)

echo.
echo [OK] Authenticated with GitHub!
echo.

:: Check if repository already exists
set /p REPO_NAME="Enter GitHub repository name [default: online-shop-receipt]: "
if "%REPO_NAME%"=="" set REPO_NAME=online-shop-receipt

echo.
echo Creating repository "%REPO_NAME%" and uploading code...
echo.

:: Try creating via gh repo create
gh repo create "%REPO_NAME%" --public --source=. --remote=origin --push
if %ERRORLEVEL% neq 0 (
    echo.
    echo Trying direct push to existing remote origin...
    git push -u origin main
)

echo.
echo ========================================================
echo   SUCCESS! Your project is now published on GitHub!
echo ========================================================
echo.
echo To enable free GitHub Pages hosting for your web app:
echo   1. Visit your repository on GitHub.
echo   2. Go to Settings -^> Pages.
echo   3. Under 'Build and deployment', choose 'Deploy from a branch'.
echo   4. Select 'main' branch and '/' (root) folder, then click Save.
echo.
pause

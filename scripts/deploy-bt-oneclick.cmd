@echo off
setlocal

REM ===== BaoTa deploy config =====
REM Server IP
set HOST_NAME=127.0.0.1

REM SSH username. Usually root.
set SSH_USER=root

REM Remote project root on BaoTa server.
set REMOTE_ROOT=/www/wwwroot/diaodian

REM Frontend API base URL.
REM Keep empty if you will proxy /api to port 3721 on the same domain.
REM Example: set API_BASE_URL=https://api.example.com
set API_BASE_URL=

if "%HOST_NAME%"=="" set /p HOST_NAME=Server IP:
if "%SSH_USER%"=="" set /p SSH_USER=SSH user:

echo.
echo ========================================
echo  Diaodian BaoTa deploy
echo ========================================
echo Server: %SSH_USER%@%HOST_NAME%
echo Remote root: %REMOTE_ROOT%
echo API base URL: %API_BASE_URL%
echo.
echo Password is not saved. SSH/SCP will ask for it.
echo.
pause

powershell -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0deploy-bt.ps1" -HostName "%HOST_NAME%" -User "%SSH_USER%" -RemoteRoot "%REMOTE_ROOT%" -ApiBaseUrl "%API_BASE_URL%"

endlocal

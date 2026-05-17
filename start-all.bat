@echo off
setlocal

set "ROOT=%~dp0"

echo Killing old KH Mart processes on ports 5000 and 3000...
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr /R /C:":5000 .*LISTENING"') do taskkill /F /PID %%p >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr /R /C:":3000 .*LISTENING"') do taskkill /F /PID %%p >nul 2>&1

echo Starting KH Mart backend and frontend...

start "KH Mart Backend" /D "%ROOT%" cmd /k "set ASPNETCORE_ENVIRONMENT=Development && set DOTNET_ENVIRONMENT=Development && dotnet run --no-launch-profile --urls http://localhost:5000"
start "KH Mart Frontend" /D "%ROOT%ClientApp" cmd /k "set BROWSER=none && set REACT_APP_API_BASE_URL=http://localhost:5000/api && npm start"

echo Both services started in separate terminals.
echo Open this URL in one tab: http://localhost:3000/login?type=admin
endlocal

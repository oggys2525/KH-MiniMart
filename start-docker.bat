@echo off
setlocal

echo Building and starting KH Mart (API + SQL Server + React) with Docker Compose...
docker compose up --build -d

if %errorlevel% neq 0 (
  echo Failed to start Docker stack.
  exit /b %errorlevel%
)

echo.
echo KH Mart stack is running:
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8080
echo Swagger: http://localhost:8080/swagger
echo SQL Server: localhost,1433

echo.
echo To stop stack: docker compose down
echo To stop and remove DB volume: docker compose down -v

endlocal

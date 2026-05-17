# KH Mart

Professional full-stack mini-mart system using ASP.NET Core, SQL Server, and React.

## Tech Stack

- Backend: ASP.NET Core 8, Entity Framework Core, SQL Server
- Frontend: React (Create React App), Tailwind CSS, Axios
- Auth: JWT Bearer

## Project Structure

- `Controllers/`: MVC and API endpoints
- `Models/`: Domain entities
- `Data/`: EF Core DbContext
- `Migrations/`: EF Core migrations
- `ViewModels/`: View contracts for UI/API
- `ClientApp/`: React frontend application
- `docs/`: Project and architecture documentation

## Local Development

### 1) Configure database

Update connection string in `appsettings.json`:

- `ConnectionStrings:DefaultConnection`

For production template values, copy from:

- `appsettings.Production.example.json`

### 1.1) Configure frontend API URL

The React app now reads API URL from environment variables:

- `ClientApp/.env.development`
- `ClientApp/.env.production.example`

### 2) Run backend (ASP.NET)

```bat
start-backend.bat
```

### 3) Run frontend (React)

```bat
ClientApp\start-frontend.bat
```

### 4) Run both together

```bat
start-all.bat
```

### 5) Run full stack with Docker (one command)

```bat
start-docker.bat
```

Docker stack services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Swagger: http://localhost:8080/swagger
- SQL Server: localhost,1433

Stop stack:

```bat
docker compose down
```

Stop and remove SQL volume:

```bat
docker compose down -v
```

## Build Commands

### Backend build

```bat
dotnet build MiniMartPOS.csproj
```

### Frontend build

```bat
cd ClientApp
npm run build
```

## Tests

### Backend tests

```bat
dotnet test MiniMartPOS.sln
```

### Frontend CI test mode

```bat
cd ClientApp
npm run test:ci
```

## CI Pipeline

GitHub Actions workflow is included:

- `.github/workflows/ci.yml`

It validates:

1. .NET restore/build/test
2. React install/build

## Container Files

- `Dockerfile` (ASP.NET backend)
- `ClientApp/Dockerfile` (React static frontend)
- `docker-compose.yml` (backend + frontend + SQL Server)
- `start-docker.bat` (one-command startup)

## API Development

Swagger is enabled in development mode:

- `https://localhost:<backend-port>/swagger`

CORS is configured for:

- `http://localhost:3000`
- `http://localhost:5173`

## Recommended Workflow

1. Pull latest source
2. Run DB migrations
3. Start backend and frontend
4. Verify API and UI
5. Run production builds before deployment

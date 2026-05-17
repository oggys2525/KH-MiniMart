# Professional Structure Plan

## Root
- `MiniMartPOS.sln`: Solution file
- `MiniMartPOS.csproj`: Main ASP.NET web project
- `Program.cs`: App bootstrap and middleware setup
- `appsettings.json`: Runtime configuration
- `start-backend.bat`: Backend run helper
- `start-all.bat`: Full stack startup helper

## Backend Layers

### API / HTTP Layer
- `Controllers/Api/`
  - REST endpoints for React client

### MVC Layer
- `Controllers/`
  - Server-rendered pages and legacy routes

### Domain Layer
- `Models/`
  - Core business entities (Product, Category, Sale, Supplier, User, etc.)

### Data Layer
- `Data/ApplicationDbContext.cs`
  - Entity mappings and DbSets
- `Migrations/`
  - Database versioning

### Transfer Layer
- `ViewModels/`
  - UI/API payload contracts

## Frontend (React)
- `ClientApp/src/pages/`: page-level views
- `ClientApp/src/components/`: reusable UI components
- `ClientApp/src/layouts/`: app layouts
- `ClientApp/src/services/`: API client and service modules
- `ClientApp/src/controllers/`: UI orchestration helpers

## Production Readiness Checklist
- Use environment-specific configs for DB/JWT
- Keep API controllers under `Controllers/Api`
- Keep reusable React components in `components`
- Keep page-level state in `pages`
- Run both backend and frontend builds before deploy
- Use migrations for every schema change

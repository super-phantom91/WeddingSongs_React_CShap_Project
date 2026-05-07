# WeddingSong

Entertainer workflow for wedding performances: lineage capture, song assignment rules, and conflict avoidance across events.

This repository currently implements the **New Wedding** screen (React), a **SQL Server** schema with seed data, and an **ASP.NET Core** API (Entity Framework Core).

## Layout

- `frontend/` — React + TypeScript with Webpack 5 (`npm install`, `npm run dev`; optional `PORT=5174` if **5173 is busy**)
- `backend/` — Web API on `http://localhost:5280` (`dotnet run`)
- `database/` — `001_schema.sql`, `002_seed.sql`

## Database

1. Run `database/001_schema.sql` then `database/002_seed.sql` on your SQL Server instance (scripts default to database name `WeddingSong`).
2. Point the API at your instance in `backend/appsettings.json` (`ConnectionStrings:WeddingSong`).

Connection string examples (set `ConnectionStrings:WeddingSong` in `backend/appsettings.json`):

- **Default instance (MSSQLSERVER), Windows auth:**  
  `Server=localhost;Database=WeddingSong;Trusted_Connection=True;TrustServerCertificate=True`
- **Named instance, e.g. SQLEXPRESS:**  
  `Server=localhost\\SQLEXPRESS;Database=WeddingSong;Trusted_Connection=True;TrustServerCertificate=True`
- **LocalDB:**  
  `Server=(localdb)\\MSSQLLocalDB;Database=WeddingSong;Trusted_Connection=True;TrustServerCertificate=True`

After starting the API, open `http://localhost:5280/api/health/db` — `connected` should be `true`. If it is `false`, fix the connection string or run `database/001_schema.sql` so the `WeddingSong` database exists.

Seed includes sample people (with parent links for autocomplete hints) and wedding `id = 1` demonstrating a duplicate-person conflict (same `PersonId` in two roles).

## Backend build note (MSB3491)

**What it means:** MSBuild cannot write `obj\Debug\net8.0\backend.GlobalUsings.g.cs` because **another process has that file (or the `obj` folder) open**. Common on Windows with Visual Studio, `dotnet watch`, antivirus, or Indexer.

**This repo** sets `<UseSharedCompilation>false</UseSharedCompilation>` in `backend.csproj` to reduce how often the compiler locks generated files.

### Fix it (try in order)

1. **Stop everything using the project**
   - In Visual Studio: **Stop Debugging** (Shift+F5) and close any **running** backend console window.
   - Task Manager: end stray **`backend`**, **`dotnet`**, or **`VBCSCompiler`** processes tied to this solution.

2. **Clean build folders**
   - Close Visual Studio (optional but most reliable).
   - Delete **`backend\bin`** and **`backend\obj`** (Explorer or PowerShell:  
     `Remove-Item -Recurse -Force E:\Project\WeddingSong\backend\bin, E:\Project\WeddingSong\backend\obj`).

3. **Reopen and rebuild**
   - Open the solution, **Build → Rebuild Solution**.

4. **Visual Studio settings (if it keeps happening)**
   - **Tools → Options → Projects and Solutions → Build and Run** → set **maximum parallel project builds** to **1** (reduces concurrent locks).
   - **Tools → Options → .NET / C# / Advanced** (or search “background analysis”) → try lowering **background analysis** scope if your VS version exposes it.

5. **Antivirus / Windows Defender**
   - Add an **exclusion** for your repo folder (e.g. `E:\Project\WeddingSong`) or at least `backend\obj` and `backend\bin`, then rebuild.

6. **Still stuck**
   - Reboot (clears orphaned locks), then delete `bin`/`obj` again and rebuild.
   - Build from a **Developer Command Prompt** with VS closed:  
     `dotnet build E:\Project\WeddingSong\backend\backend.csproj`

If the error persists only inside Visual Studio but **`dotnet build` from the command line works**, the lock is almost always **VS + analyzers** or **parallel builds**; use steps 4–5.

## Run locally

1. Apply SQL scripts, then `cd backend` → `dotnet run`
2. `cd frontend` → `npm install` → `npm run dev`
3. Open `http://localhost:5173/new-wedding` (optional: `?id=1` to load the seeded wedding)

The webpack dev server proxies `/api` to the backend.

If the UI shows a **502 / 504** or “Cannot reach the API”, the backend is not running on **port 5280** or is hanging on SQL—start the API, verify `http://localhost:5280/api/health/db`, and fix `ConnectionStrings:WeddingSong` if `connected` is false.

### Frontend: `EADDRINUSE` on port 5173

Another terminal (or an old dev server) is already using **5173**. Either **stop it**, or use another port (CORS allows any localhost port in Development):

```powershell
# PowerShell — free 5173 (find PID then stop)
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
Stop-Process -Id <PID> -Force

# Or run the dev server on a different port
$env:PORT = "5174"; npm run dev
```

Then open `http://localhost:5174/new-wedding` (match the port you chose).

## API (summary)

| Method | Route | Purpose |
|--------|--------|---------|
| `POST` | `/api/weddings` | Create draft wedding + empty 14 role slots |
| `GET` | `/api/weddings/{id}` | Lineage + conflict flags |
| `PUT` | `/api/weddings/{id}/meta` | Groom/bride family names + date |
| `PUT` | `/api/weddings/{id}/lineage` | Assign people / display names per role |
| `GET` | `/api/people/search?q=` | Autocomplete (min 2 chars) |
| `GET` | `/api/people/{id}/hints` | Father/mother for tree auto-fill |

Conflict detection: the same `PersonId` or the same normalized free-text name in two roles marks both slots with a warning state (aligned with the Figma “!” treatment).

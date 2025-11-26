# PROJECT_OVERVIEW.md - NFL Data Application

## What This App Does (Plain English)

This is a **Fantasy Football Analytics Dashboard** that helps DraftKings players make smarter lineup decisions. It combines:

1. **Real NFL Statistics** - Live player stats from the 2024-2025 NFL season
2. **DraftKings Pricing** - Salary data for lineup building
3. **Trend Analysis** - Week-by-week player performance comparisons
4. **Snap Count Data** - How much each player is actually on the field

The app has two main views:
- **Data Table** - A powerful spreadsheet-like grid showing all player stats with filtering
- **Trend Tool** - Side-by-side weekly comparisons to spot hot/cold players

---

## Current Status

**IMPORTANT**: The NFL_DATA_APPLICATION folder is currently empty (just configuration files). The actual application code lives in:

```
/Users/robert.barbieri/NFL-HUB-NEW
```

The PLAN.md below will include copying/setting up the code in the NFL_DATA_APPLICATION folder.

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.0.0 | UI Framework |
| Tailwind CSS | 3.4.17 | Styling |
| AG-Grid | 34.2.0 | Data table component |
| Axios | 1.8.4 | HTTP client |
| react-router-dom | 7.5.1 | Navigation |
| Radix UI | Various | UI component library |
| Lucide React | 0.507.0 | Icons |

**Build Tool**: CRACO (Create React App Configuration Override)
**Package Manager**: Yarn (specified in package.json)
**Node Requirement**: 22.x

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.110.1 | Web framework |
| DuckDB | 1.4.0 | Database (embedded) |
| Polars | 1.33.1 | Data processing |
| nflreadpy | 0.1.3 | NFL stats data source |
| Pandas | 2.3.2 | Data manipulation |
| Uvicorn | 0.25.0 | ASGI server |

**Python Requirement**: 3.10+ (your system has 3.13.3)

### Database
- **Engine**: DuckDB (embedded analytical database)
- **File**: `backend/fantasy_football.db` (pre-populated, ~26MB)
- **No installation required** - DuckDB is installed via pip and the database file is included

---

## Folder Structure

```
NFL-HUB-NEW/                           # Source code location
├── frontend/                          # React application
│   ├── src/
│   │   ├── App.js                    # Main component (~54KB, 1500+ lines)
│   │   ├── App.css                   # Styles
│   │   ├── components/               # UI components
│   │   │   ├── ui/                   # Radix-based UI primitives
│   │   │   ├── TrendToolGrid.js      # Trend analysis component
│   │   │   ├── WeeklyBoxScore.js     # Box score view
│   │   │   └── ...
│   │   └── hooks/                    # Custom React hooks
│   ├── public/                       # Static assets
│   ├── package.json                  # Dependencies
│   ├── tailwind.config.js            # Tailwind configuration
│   ├── craco.config.js               # CRACO configuration
│   └── .env.example                  # Environment template
│
├── backend/                          # FastAPI application
│   ├── server.py                     # Main API (~154KB, single file)
│   ├── requirements.txt              # Python dependencies
│   ├── fantasy_football.db           # Pre-populated DuckDB database
│   ├── dk_salaries.xlsx              # DraftKings salary data
│   └── load_dk_salaries.py           # Salary loader script
│
├── tests/                            # Test directory (empty)
├── backend_test.py                   # API test script
├── render.yaml                       # Render.com deployment config
├── DEVELOPER_HANDOFF_PACKET.md       # Comprehensive documentation
├── CLAUDE_CODE_ROLLOVER_GUIDE.md     # Claude Code integration guide
└── README_START_HERE.md              # Quick start guide
```

---

## Environment Variables

### Frontend (frontend/.env)

```bash
# Required - Backend API URL
REACT_APP_BACKEND_URL=http://localhost:10000
```

### Backend (backend/.env)

```bash
# Optional - MongoDB URL (reserved for future use, not currently needed)
MONGO_URL=mongodb://localhost:27017/nfl_fantasy
```

**Note**: The backend uses DuckDB (file-based), NOT MongoDB. The MONGO_URL is a legacy config that can be ignored for local development.

---

## Commands Reference

### Installing Dependencies

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
yarn install   # or: npm install
```

### Running in Development

**Backend (Terminal 1):**
```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 10000 --reload
```

**Frontend (Terminal 2):**
```bash
cd frontend
yarn start   # or: npm start
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:10000/api

### Running Tests

```bash
# Backend API tests (requires backend to be running)
python backend_test.py

# Frontend tests (none configured yet)
cd frontend && yarn test
```

---

## Database Details

### Schema Overview

The database has two main tables:

**1. player_stats** - NFL player statistics by week
- player_id, player_name, position, team
- season, week, opponent
- Passing: yards, TDs, interceptions
- Rushing: attempts, yards, TDs
- Receiving: targets, receptions, yards, TDs
- snap_count, snap_percentage
- fantasy_points (calculated)

**2. draftkings_pricing** - DraftKings salary data
- player_name, team, position
- week, season, salary

### Pre-populated Data
The repository includes a pre-populated database (`fantasy_football.db`) with:
- 2024-2025 season data
- Historical player statistics
- DraftKings pricing data

### Refreshing Data
Data can be refreshed via:
1. "Sync Data" button in the UI
2. API call: `POST /api/refresh-data`

---

## Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api` | GET | Health check |
| `/api/players` | GET | Get player stats with filters |
| `/api/trend-data` | GET | Get trend comparison data |
| `/api/refresh-data` | POST | Refresh NFL data |
| `/api/load-dk-pricing` | POST | Load DraftKings pricing |

---

## Production Deployment

Current production URLs:
- **Frontend**: https://ruberube.vercel.app
- **Backend**: https://nfl-hub-new-1.onrender.com

Deployment platforms:
- Frontend: Vercel
- Backend: Render.com

---

## Your System Compatibility

| Requirement | Required | Your System | Status |
|-------------|----------|-------------|--------|
| Python | 3.10+ | 3.13.3 | ✅ |
| Node.js | 22.x | 22.20.0 | ✅ |
| Yarn | 1.22+ | (needs check) | ? |
| macOS | Any | Darwin 24.4.0 | ✅ |

---

## Next Steps

See **PLAN.md** for the detailed setup checklist to get this running locally.

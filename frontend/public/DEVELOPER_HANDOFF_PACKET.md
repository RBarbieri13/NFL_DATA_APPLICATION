# NFL Fantasy Analytics Platform - Developer Handoff Packet
**Last Updated:** January 2025  
**Version:** 1.0  
**Current Status:** Production-Ready MVP with Advanced Analytics

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Application Overview](#application-overview)
3. [Technical Architecture](#technical-architecture)
4. [Database Schema](#database-schema)
5. [UI/UX Specifications](#uiux-specifications)
6. [Current Feature Set](#current-feature-set)
7. [Code Structure](#code-structure)
8. [Development Workflow](#development-workflow)
9. [Pending Tasks & Roadmap](#pending-tasks--roadmap)
10. [Working with Claude Code](#working-with-claude-code)
11. [Troubleshooting Guide](#troubleshooting-guide)

---

## Executive Summary

### What This Application Does
The NFL Fantasy Analytics Platform is a professional-grade statistics dashboard for analyzing NFL player performance data. It combines real-time NFL statistics with DraftKings pricing to provide actionable insights for fantasy football players.

### Core Value Proposition
- **Week-to-week player trend analysis** with granular stat breakdowns
- **DraftKings pricing integration** for salary cap optimization
- **Professional-grade data visualization** with AG-Grid tables
- **Customizable filtering** by team, position, and week range
- **PPR/Half-PPR scoring toggle** for different league formats

### Current State
✅ **Fully Functional MVP** with two main views:
- **Data Table**: Live player statistics with filtering and scoring
- **Trend Tool**: Week-by-week player performance comparison

---

## Application Overview

### Problem Statement
Fantasy football players need to:
1. Compare player performance week-over-week
2. Analyze trends to predict future performance
3. Optimize DraftKings lineup selection within salary cap
4. Make data-driven decisions quickly

### Solution
A dual-view analytics platform:
1. **Data Table View**: Real-time stats with advanced filtering
2. **Trend Tool View**: Multi-week comparison with position-specific analytics

---

## Technical Architecture

### Technology Stack

#### Frontend
```
Framework: React 18.x
Styling: Tailwind CSS 3.x
UI Components: Shadcn/ui
Data Grid: AG-Grid Community 32.x
Layout: react-resizable-panels
Build Tool: Vite/Create React App
```

#### Backend
```
Framework: FastAPI (Python 3.10+)
Data Processing: Polars, DuckDB
NFL Data: nflreadpy
API Server: Uvicorn
HTTP Client: httpx
```

#### Database
```
Primary: DuckDB (embedded analytical database)
Schema: player_stats, draftkings_pricing
Location: /app/backend/nfl_data.db
```

#### Infrastructure
```
Deployment: Kubernetes (K8s)
Process Manager: Supervisor
Frontend Port: 3000 (internal)
Backend Port: 8001 (internal)
URL Routing: Kubernetes Ingress (all /api/* routes to backend)
```

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Data Table │  │  Trend Tool  │  │  Filter Controls │   │
│  │  (AG-Grid)  │  │  (Custom)    │  │  (Sidebar)       │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                           ▼                                  │
│                    REACT_APP_BACKEND_URL                     │
│                      (Environment Variable)                  │
└───────────────────────────────┬─────────────────────────────┘
                                │
                         Kubernetes Ingress
                         /api/* → Backend
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                      Backend (FastAPI)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  API Routes  │  │  Data Layer  │  │  NFL Data Sync   │  │
│  │  (/api/*)    │  │  (Polars)    │  │  (nflreadpy)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                           ▼                                  │
│                       DuckDB                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Tables: player_stats, draftkings_pricing             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Environment Variables

#### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=<production-backend-url>
# DO NOT MODIFY - Configured by Kubernetes
# Used for all API calls: `${REACT_APP_BACKEND_URL}/api/endpoint`
```

#### Backend (.env)
```bash
MONGO_URL=<mongodb-connection-string>
# Note: Currently using DuckDB, MongoDB reserved for future use
# DO NOT MODIFY - Configured by deployment system
```

### Critical Routing Rules

**⚠️ ALL BACKEND API ROUTES MUST BE PREFIXED WITH `/api`**

```javascript
// ✅ CORRECT
fetch(`${process.env.REACT_APP_BACKEND_URL}/api/stats`)

// ❌ INCORRECT - Will route to frontend, not backend
fetch(`${process.env.REACT_APP_BACKEND_URL}/stats`)
```

Kubernetes Ingress automatically routes:
- `/api/*` → Backend (port 8001)
- `/*` → Frontend (port 3000)

---

## Database Schema

### DuckDB Tables

#### 1. `player_stats` Table
Primary table for all NFL player statistics.

```sql
CREATE TABLE player_stats (
    player_id VARCHAR,           -- Unique player identifier
    player_name VARCHAR,          -- Full player name
    position VARCHAR,             -- QB, RB, WR, TE
    team VARCHAR,                 -- 3-letter team code
    week INTEGER,                 -- Week number (1-18)
    season INTEGER,               -- Year (e.g., 2025)
    
    -- Passing Stats (QB primarily)
    passing_completions INTEGER,
    passing_attempts INTEGER,
    passing_yards INTEGER,
    passing_tds INTEGER,
    interceptions INTEGER,
    
    -- Rushing Stats
    rushing_attempts INTEGER,
    rushing_yards INTEGER,
    rushing_tds INTEGER,
    
    -- Receiving Stats
    targets INTEGER,
    receptions INTEGER,
    receiving_yards INTEGER,
    receiving_tds INTEGER,
    
    -- Snap Counts
    snap_count INTEGER,
    snap_percentage FLOAT,
    
    -- Miscellaneous
    fumbles_lost INTEGER,
    two_point_conversions INTEGER,
    
    -- Fantasy Points
    fantasy_points FLOAT,         -- PPR scoring
    fantasy_points_half_ppr FLOAT,
    
    -- Metadata
    opponent VARCHAR,
    game_result VARCHAR,          -- W/L
    game_score VARCHAR,           -- e.g., "21-18"
    
    PRIMARY KEY (player_id, week, season)
);
```

#### 2. `draftkings_pricing` Table
DraftKings salary data for each player per week.

```sql
CREATE TABLE draftkings_pricing (
    player_name VARCHAR,
    team VARCHAR,
    position VARCHAR,
    week INTEGER,
    season INTEGER,
    salary INTEGER,              -- DraftKings price (e.g., 5500)
    
    PRIMARY KEY (player_name, week, season)
);
```

### Data Loading Strategy

#### Initial Data Load
```python
# Backend starts with empty DB
# Data loaded on first request via /api/load-data
# Uses nflreadpy to fetch 2024-2025 season data
```

#### DraftKings Pricing
```python
# Loaded from Google Sheets via /api/load-sheets-pricing
# Currently supports weeks 1-6 for 2025 season
# Future: weeks 1-18 for 2024
```

#### Data Refresh
```python
# Manual refresh via "Sync Data" button
# Fetches latest weekly stats from NFL API
# Updates DuckDB tables
# No automatic refresh (reduces API calls)
```

---

## UI/UX Specifications

### Overall Design Philosophy
- **Professional, spreadsheet-like aesthetics**
- **High information density** with clean visual hierarchy
- **Minimal padding** for maximum data visibility
- **Strong visual separators** (borders, colors) for section clarity
- **Color-coded insights** for quick pattern recognition

### Color Palette

```css
/* Primary Colors */
--background: #F9FAFB;           /* Main background */
--surface: #FFFFFF;              /* Card/table background */
--primary: #1E40AF;              /* Blue - headers, actions */

/* Position Colors */
--qb-light: #A9D9F3;            /* QB header background */
--rb-light: #A8E6A3;            /* RB header background */
--wr-light: #FDE68A;            /* WR header background */
--te-light: #FFAA99;            /* TE header background */

/* Performance Colors (Fantasy Points) */
--excellent: #10B981;           /* 25+ points */
--good: #84CC16;                /* 20-25 points */
--average: #EAB308;             /* 15-20 points */
--poor: #F97316;                /* 10-15 points */
--bad: #EF4444;                 /* <10 points */

/* Data Grid */
--border-light: #D1D5DB;        /* Cell borders */
--border-medium: #9CA3AF;       /* Section dividers */
--border-heavy: #111827;        /* Week dividers */
--text-primary: #111827;        /* Main text */
--text-secondary: #6B7280;      /* Secondary text */
```

### Layout Structure

#### 1. Header Bar
```
┌────────────────────────────────────────────────────────────┐
│  🏈 NFL Fantasy Analytics    [DraftKings PPR] [Live Data] │
│  Professional Grade Statistics Platform     [Sync Data ⟳] │
└────────────────────────────────────────────────────────────┘
```

#### 2. Tab Navigation
```
┌─────────────┬──────────────┐
│ Data Table  │  Trend Tool  │  ← Active tab highlighted
└─────────────┴──────────────┘
```

#### 3. Main Content Area

**Data Table View:**
```
┌──────────────────────────────────────────────────────────────┐
│ [Filters: Team, Position, Week]  [PPR ↔ Half-PPR]           │
├──────────────────────────────────────────────────────────────┤
│                     AG-Grid Table                            │
│  ┌──────┬────────┬─────┬──────┬──────────┬────────┬─────┐   │
│  │ Pos  │ Player │ Team│ Week │ Snaps    │ Stats  │ Pts │   │
│  ├──────┼────────┼─────┼──────┼──────────┼────────┼─────┤   │
│  │ Data rows with player statistics...                  │   │
│  └──────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│                  [Resizable Player Detail Panel]             │
└──────────────────────────────────────────────────────────────┘
```

**Trend Tool View:**
```
┌────────────────────────────────────────────────────────────────┐
│ 🔍 Filters: NYG | Weeks 4-6 | 2025    [Summary ↔ Full Detail]│
├────────────────────────────────────────────────────────────────┤
│ ┌──┬─────────┬─────────────────────────────────────────────┐  │
│ │Ps│ Player  │  Week 4   │  Week 5   │  Week 6   │         │  │
│ ├──┼─────────┼───────────┼───────────┼───────────┼─────────┤  │
│ │  │         │  Misc│Pass│Rush│Pts  │ (repeat)  │         │  │
│ │  │         │  $  │ # │Stat│Stat│Pts│           │         │  │
│ ├──┴─────────┴───────────┴───────────┴───────────┴─────────┤  │
│ │ QUARTERBACKS                                              │  │
│ ├──┬─────────┬───────────┬───────────┬───────────┬─────────┤  │
│ │QB│Player 1 │ Data cells with stats for each week         │  │
│ │QB│Player 2 │ Data cells with stats for each week         │  │
│ ├──┴─────────┴───────────┴───────────┴───────────┴─────────┤  │
│ │                  (2nd header for RB/WR/TE)               │  │
│ ├──┬─────────┬───────────┬───────────┬───────────┬─────────┤  │
│ │  │         │  Misc│Recv│Rush│Pts  │ (repeat)  │         │  │
│ ├──┴─────────┴───────────┴───────────┴───────────┴─────────┤  │
│ │ RUNNING BACKS                                             │  │
│ ├──┬─────────┬───────────┬───────────┬───────────┬─────────┤  │
│ │RB│Player 3 │ Data cells with stats for each week         │  │
│ └──┴─────────┴───────────┴───────────┴───────────┴─────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Trend Tool - Detailed Specifications

#### Header Structure (3 Tiers)

**Tier 1: Week Headers**
- Background: Black (#000000)
- Text: White
- Font: 13px, bold
- Content: "Week X", opponent, result/score
- Border: 4px solid black on left and right (week dividers)

**Tier 2: Category Headers**

For QB Section:
```
┌──────────┬───────────────┬──────────────┬──────┐
│   Misc.  │   Passing     │   Rushing    │ FPTS │
│  (gray)  │   (blue)      │   (green)    │(pink)│
└──────────┴───────────────┴──────────────┴──────┘
```

For RB/WR/TE Section:
```
┌──────────┬───────────────┬──────────────┬──────┐
│   Misc.  │   Receiving   │   Rushing    │ FPTS │
│  (gray)  │   (orange)    │   (green)    │(pink)│
└──────────┴───────────────┴──────────────┴──────┘
```

**Tier 3: Individual Stat Headers**

QB Stats (Full Detail):
```
$ | # | Cmp | Att | Yds | TD | Int | Att | Yds | TD | Pts
└─Misc─┘ └───────Passing──────┘ └──Rushing─┘ └Pts┘
```

RB/WR/TE Stats (Full Detail):
```
$ | # | Tgt | Rec | Yds | TD | Att | Yds | TD | Fum | Pts
└─Misc─┘ └──Receiving──┘ └─Rushing──┘ └──┘ └Pts┘
```

Summary View (All Positions):
```
$ | # | Pts
```

#### Data Cells Styling

```css
/* Cell Dimensions */
padding: 0.5px vertical (py-0.5)
font-size: 10px (text-[10px])
text-align: center

/* Borders */
/* Between cells within week */
border-right: 1px solid #D1D5DB (light gray)

/* Between stat categories (Misc/Passing/etc.) */
border-right: 2px solid #9CA3AF (medium gray)

/* Between weeks (CRITICAL) */
border-left: 4px solid #111827 (black)
border-right: 4px solid #111827 (black)
```

#### Conditional Formatting (Fantasy Points)

```javascript
// Color scale based on fantasy points
const getFantasyPointsColor = (points) => {
  if (points >= 25) return 'bg-green-100 text-green-800';
  if (points >= 20) return 'bg-green-50 text-green-700';
  if (points >= 15) return 'bg-yellow-50 text-yellow-700';
  if (points >= 10) return 'bg-orange-50 text-orange-700';
  if (points > 0) return 'bg-red-50 text-red-700';
  return 'bg-white text-gray-900';
};
```

#### Position Section Headers

```css
/* QB Section */
background: #A9D9F3 (light blue)
border-top: 2px solid #94A3B8
border-bottom: 2px solid #94A3B8

/* RB Section */
background: #A8E6A3 (light green)

/* WR Section */
background: #FDE68A (light yellow)

/* TE Section */
background: #FFAA99 (light coral)

/* All sections */
font-weight: bold
text-transform: uppercase
padding: 8px 12px
font-size: 12px
```

### Responsive Behavior

**Desktop (1920px+)**
- Full data visibility
- All columns shown
- Resizable panels work optimally

**Laptop (1366px-1920px)**
- Horizontal scroll enabled for Trend Tool
- Data Table: Some columns may auto-hide (AG-Grid responsive)
- Filter sidebar remains visible

**Tablet (768px-1366px)**
- Vertical layout for filters
- Horizontal scroll for both views
- Touch-optimized interactions

**Mobile (<768px)**
- ⚠️ Not currently optimized
- Recommend desktop-only for now

---

## Current Feature Set

### 1. Data Table View

#### Features
✅ **Live Player Statistics**
- All 2024-2025 season data
- Real-time stat updates via Sync button
- Position filtering (QB, RB, WR, TE, All)
- Team filtering (32 NFL teams)
- Week filtering (1-18)

✅ **Scoring Modes**
- PPR (Point Per Reception)
- Half-PPR
- Toggle switch with instant recalculation

✅ **Advanced Filtering**
- Multi-criteria filtering
- Search by player name
- Filter by stat thresholds
- AG-Grid native column filters

✅ **Column Management**
- Auto-sized columns
- Sortable columns
- Hideable columns
- Resizable columns

✅ **Data Export**
- CSV export
- Excel export (via AG-Grid Enterprise if upgraded)

✅ **Player Detail Panel**
- Resizable bottom panel
- Shows detailed player stats
- Game-by-game breakdown
- Trend charts (basic)

#### AG-Grid Configuration

```javascript
const defaultColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  minWidth: 100,
  suppressMovable: false,
};

const gridOptions = {
  animateRows: true,
  pagination: false,
  enableCellTextSelection: true,
  suppressHorizontalScroll: false,
  enableRangeSelection: false,
};
```

### 2. Trend Tool View

#### Features
✅ **Week-by-Week Comparison**
- Multi-week player performance side-by-side
- Customizable week range (e.g., weeks 4-6)
- Team-specific filtering
- Season selection (2024, 2025)

✅ **Two View Modes**
- **Summary View**: $ | # | Pts (minimal columns)
- **Full Detail View**: All stats visible (11 columns per week)

✅ **Position-Specific Analytics**
- **QB**: Passing + Rushing stats
- **RB/WR/TE**: Receiving + Rushing stats
- Separate header rows for each position group

✅ **Visual Enhancements**
- Color-coded position sections
- Week dividers (thick black borders)
- Category groupings (Passing, Rushing, Receiving)
- Conditional formatting for fantasy points

✅ **Collapsible Filters**
- Expand/collapse filter section
- Saves screen space
- Maintains selections when collapsed

#### Current Limitations
⚠️ **No Column Reordering** (within Trend Tool)
⚠️ **No Sorting** (manual implementation needed)
⚠️ **DraftKings Pricing**: Only weeks 1-6 for 2025 loaded
⚠️ **Snap Count Formatting**: No conditional formatting yet

### 3. Data Synchronization

#### Manual Sync
- Button in top-right corner
- Fetches latest NFL data via nflreadpy
- Updates DuckDB tables
- Shows loading indicator
- Success/error notifications

#### Initial Data Load
- Automatic on first backend startup
- Loads 2024-2025 season data
- ~30-60 seconds initial load time

---

## Code Structure

### Frontend Structure

```
/app/frontend/
├── public/
│   ├── index.html
│   └── assets/
├── src/
│   ├── index.js                 # Entry point
│   ├── App.js                   # Main component (1900+ lines)
│   ├── App.css                  # Tailwind + custom styles
│   ├── index.css                # Global styles
│   └── components/
│       └── ui/                  # Shadcn components
│           ├── button.jsx
│           ├── card.jsx
│           ├── badge.jsx
│           └── ... (other UI components)
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── .env
```

### Backend Structure

```
/app/backend/
├── server.py                    # FastAPI app (2000+ lines)
├── requirements.txt
├── .env
└── nfl_data.db                  # DuckDB database (auto-generated)
```

### Key Files Deep Dive

#### `/app/frontend/src/App.js` (Main Component)

**State Management:**
```javascript
// Data state
const [rowData, setRowData] = useState([]);           // AG-Grid data
const [trendData, setTrendData] = useState([]);       // Trend Tool data

// Filter state
const [selectedPosition, setSelectedPosition] = useState('All');
const [selectedTeam, setSelectedTeam] = useState('All');
const [selectedWeek, setSelectedWeek] = useState('All');

// Trend Tool filter state
const [trendFilters, setTrendFilters] = useState({
  team: 'NYG',
  startWeek: 4,
  endWeek: 6,
  season: '2025'
});

// View state
const [activeTab, setActiveTab] = useState('table');  // 'table' or 'trend'
const [scoringType, setScoringType] = useState('ppr');
const [trendViewMode, setTrendViewMode] = useState('summary');
const [trendFiltersCollapsed, setTrendFiltersCollapsed] = useState(false);

// UI state
const [loading, setLoading] = useState(false);
const [detailsPanelSize, setDetailsPanelSize] = useState(30);
```

**Key Functions:**
```javascript
// Data fetching
const fetchData = async () => { /* Fetch stats from /api/stats */ }
const loadTrendData = async () => { /* Fetch trend data from /api/trend */ }
const handleSyncData = async () => { /* Trigger /api/load-data */ }

// Filtering
const filteredData = useMemo(() => { /* Apply filters to rowData */ })

// Scoring calculations
const calculateFantasyPoints = (row, isPPR) => { /* Fantasy point logic */ }

// Rendering
const renderDataTable = () => { /* AG-Grid component */ }
const renderTrendTool = () => { /* Trend Tool table */ }
```

**Component Structure:**
```javascript
return (
  <div className="app-container">
    <Header />
    <TabNavigation />
    {activeTab === 'table' ? (
      <ResizablePanel>
        <DataTableView />
        <PlayerDetailPanel />
      </ResizablePanel>
    ) : (
      <TrendToolView />
    )}
  </div>
);
```

#### `/app/backend/server.py` (FastAPI Backend)

**Key Endpoints:**

```python
@app.get("/api/stats")
async def get_stats(
    season: int = 2025,
    week: Optional[int] = None,
    position: Optional[str] = None,
    team: Optional[str] = None
):
    """
    Returns player statistics with optional filtering.
    Joins player_stats with draftkings_pricing.
    """
    # Implementation using DuckDB + Polars

@app.get("/api/trend")
async def get_trend_data(
    team: str,
    start_week: int,
    end_week: int,
    season: int = 2025
):
    """
    Returns week-by-week player stats for trend analysis.
    Groups by player, pivots by week.
    """
    # Implementation using Polars pivot operations

@app.post("/api/load-data")
async def load_nfl_data():
    """
    Fetches latest NFL stats from nflreadpy.
    Updates player_stats table in DuckDB.
    """
    # Use nflreadpy library

@app.post("/api/load-sheets-pricing")
async def load_draftkings_pricing_from_sheets():
    """
    Loads DraftKings pricing from Google Sheets.
    Updates draftkings_pricing table.
    """
    # Currently hardcoded data for weeks 1-6

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
```

**Database Initialization:**
```python
def init_db():
    """Initialize DuckDB connection and create tables"""
    conn = duckdb.connect('nfl_data.db')
    
    # Create player_stats table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS player_stats (
            -- schema definition
        )
    """)
    
    # Create draftkings_pricing table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS draftkings_pricing (
            -- schema definition
        )
    """)
    
    return conn

# Global connection
db = init_db()
```

**Data Processing Example:**
```python
def process_stats(season: int, week: Optional[int]):
    """Process stats using Polars for performance"""
    
    # Query DuckDB
    query = f"""
        SELECT ps.*, dp.salary as dk_salary
        FROM player_stats ps
        LEFT JOIN draftkings_pricing dp
          ON ps.player_name = dp.player_name
          AND ps.week = dp.week
          AND ps.season = dp.season
        WHERE ps.season = {season}
    """
    
    if week:
        query += f" AND ps.week = {week}"
    
    # Convert to Polars DataFrame
    df = pl.from_arrow(db.execute(query).fetch_arrow_table())
    
    # Process and return
    return df.to_dicts()
```

---

## Development Workflow

### Local Development Setup

#### Prerequisites
```bash
# Required software
Python 3.10+
Node.js 18+
yarn (preferred over npm)
```

#### Initial Setup

1. **Clone/Access Repository**
```bash
cd /app
```

2. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
# Backend will auto-start via supervisor
```

3. **Frontend Setup**
```bash
cd frontend
yarn install
# Frontend will auto-start via supervisor
```

4. **Environment Variables**
```bash
# Frontend: /app/frontend/.env
REACT_APP_BACKEND_URL=<configured-by-kubernetes>

# Backend: /app/backend/.env
MONGO_URL=<configured-by-kubernetes>
```

⚠️ **DO NOT MODIFY .env FILES** - They are configured by the deployment system.

### Running the Application

#### Using Supervisor (Recommended)
```bash
# Check status
sudo supervisorctl status

# Restart services
sudo supervisorctl restart frontend
sudo supervisorctl restart backend
sudo supervisorctl restart all

# View logs
tail -f /var/log/supervisor/frontend.out.log
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/backend.err.log
```

#### Manual Running (Development Only)
```bash
# Backend (terminal 1)
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (terminal 2)
cd /app/frontend
yarn start
# Or: npm start
```

### Hot Reload Behavior
- ✅ **Frontend**: Automatic hot reload on file changes
- ✅ **Backend**: Automatic reload with `--reload` flag
- ⚠️ **Only restart when**:
  - Installing new dependencies
  - Modifying .env files
  - Changing supervisor configuration

### Making Changes

#### Adding a New Feature

1. **Plan the Feature**
   - Define requirements
   - Identify affected components
   - Plan API changes (if needed)

2. **Backend Changes**
   ```bash
   # Edit server.py
   nano /app/backend/server.py
   
   # Add new endpoint or modify existing
   # Test with curl or Postman
   curl http://localhost:8001/api/your-endpoint
   ```

3. **Frontend Changes**
   ```bash
   # Edit App.js or create new component
   nano /app/frontend/src/App.js
   
   # Changes auto-reload in browser
   ```

4. **Testing**
   - Manual testing in browser
   - Check browser console for errors
   - Verify API responses in Network tab

#### Modifying the Trend Tool

**Key Section in App.js:**
```javascript
// Line ~1650-2200: Trend Tool implementation

// Header structure
const renderTrendTool = () => (
  <table>
    <thead>
      {/* Week headers, category headers, stat headers */}
    </thead>
    <tbody>
      {/* QB section with Passing stats */}
      {/* RB/WR/TE section with Receiving stats */}
    </tbody>
  </table>
);
```

**To modify columns:**
1. Update header structure (3 tiers)
2. Update data cell rendering
3. Ensure colspan values match
4. Test both Summary and Full Detail views

#### Adding a New API Endpoint

**In server.py:**
```python
@app.get("/api/your-endpoint")
async def your_endpoint(param: str):
    """Your endpoint description"""
    try:
        # Your logic here
        result = process_data(param)
        return {"data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**In App.js:**
```javascript
const fetchYourData = async () => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_BACKEND_URL}/api/your-endpoint?param=value`
    );
    const data = await response.json();
    // Handle data
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};
```

### Deployment

**Current Deployment:**
- Managed by Kubernetes
- Supervisor handles process management
- No manual deployment steps required

**If you need to deploy manually:**
```bash
# Build frontend
cd /app/frontend
yarn build
# Output: /app/frontend/build/

# Backend doesn't require building (Python)

# Restart services
sudo supervisorctl restart all
```

---

## Pending Tasks & Roadmap

### High Priority (P0)

#### 1. Complete DraftKings Pricing Data
**Status:** Partial (only weeks 1-6 for 2025)  
**Needed:** Weeks 1-18 for both 2024 and 2025  
**Implementation:**
```python
# In server.py, expand load_draftkings_pricing_from_sheets()
# Add more hardcoded data OR integrate Google Sheets API
```

#### 2. Add Snaps Conditional Formatting
**Status:** Not implemented  
**Location:** Trend Tool, Snaps column  
**Design:**
```javascript
// Similar to fantasy points formatting
const getSnapsColor = (snapCount, position) => {
  const threshold = position === 'QB' ? 
    { high: 60, medium: 45, low: 30 } :
    { high: 50, medium: 35, low: 20 };
    
  if (snapCount >= threshold.high) return 'bg-green-100';
  if (snapCount >= threshold.medium) return 'bg-yellow-100';
  if (snapCount >= threshold.low) return 'bg-orange-100';
  return 'bg-red-100';
};
```

#### 3. Implement Sorting/Reordering in Trend Tool
**Status:** Not implemented  
**Complexity:** Medium  
**Requirements:**
- Sortable columns within position groups
- Drag-and-drop column reordering
- Maintain sort state across view mode changes

**Suggested Approach:**
```javascript
// Add state for sorting
const [trendSortConfig, setTrendSortConfig] = useState({
  column: null,
  direction: 'asc'
});

// Add onClick handlers to headers
const handleHeaderClick = (columnKey) => {
  // Toggle sort direction
  // Re-sort trendData array
};

// Apply sorting before rendering
const sortedTrendData = useMemo(() => {
  if (!trendSortConfig.column) return trendData;
  
  return [...trendData].sort((a, b) => {
    // Sorting logic
  });
}, [trendData, trendSortConfig]);
```

### Medium Priority (P1)

#### 4. Full Detail View Headers Optimization
**Issue:** QB section shows 11 columns, but headers could be more compact  
**Suggestion:** Review abbreviations, ensure 3-character max where possible

#### 5. Mobile Responsiveness
**Status:** Not mobile-friendly  
**Effort:** High  
**Requirements:**
- Responsive Trend Tool (difficult due to table structure)
- Touch-optimized controls
- Vertical layout for filters
- Consider separate mobile view or "not supported" message

#### 6. Performance Optimization
**Current Performance:**
- Data Table: Good (AG-Grid handles large datasets well)
- Trend Tool: Adequate for current data volume
- Initial load: 30-60 seconds (acceptable)

**Potential Improvements:**
- Virtualization for Trend Tool
- Lazy loading for large week ranges
- Backend caching for frequently requested data

#### 7. Data Export from Trend Tool
**Status:** Not implemented  
**Requirements:**
- Export current view to CSV
- Export current view to Excel
- Maintain formatting (colors, borders)

### Low Priority (P2)

#### 8. Advanced Analytics
- **Historical trend lines** (e.g., "This player's fantasy points are trending up")
- **Predictive analytics** (e.g., "Projected points for next week")
- **Player comparisons** (side-by-side in detail panel)
- **Correlation analysis** (e.g., "High snap count correlates with high targets")

#### 9. User Customization
- **Saved filters/views**
- **Custom column sets**
- **Personalized dashboards**
- **Theme selection** (dark mode)

#### 10. Real-Time Updates
- **WebSocket integration** for live score updates during games
- **Auto-refresh** toggle with configurable interval
- **Push notifications** for significant stat changes

### Future Considerations

#### Backend Enhancements
- **PostgreSQL migration** (from DuckDB for production scalability)
- **Redis caching** for frequently accessed data
- **GraphQL API** for more flexible queries
- **Authentication/Authorization** (if multi-user support needed)

#### Frontend Enhancements
- **State management library** (Redux, Zustand) for complex state
- **Component library upgrade** (full Ant Design or Material-UI)
- **Testing** (Jest, React Testing Library, Playwright)
- **Error boundaries** for better error handling

#### Data Sources
- **Additional APIs**: Pro Football Reference, ESPN, Yahoo Fantasy
- **Injury data integration**
- **Weather data** (for outdoor games)
- **Vegas odds** (for game script prediction)

---

## Working with Claude Code

### What is Claude Code?

Claude Code refers to using Anthropic's Claude AI assistant (like the one you're talking to) for software development. This can be done through:

1. **Cursor IDE** (cursor.sh)
2. **Windsurf** (Codeium's AI IDE)
3. **Claude API** (direct integration)
4. **Continue.dev** (VSCode/JetBrains plugin)

### Recommended Setup: Cursor IDE

**Why Cursor?**
- Native Claude integration
- Best-in-class AI code generation
- Excellent for React + Python stacks
- Multi-file editing
- Terminal integration

**Installation:**
```bash
# Download from cursor.sh
# Install and open
# Set API key: Settings → Features → AI → Claude API Key

# Open this project
cd /app
cursor .
```

### Cursor-Specific Workflow

#### 1. Chat-Driven Development

**Use Cursor's Chat (Cmd+L or Ctrl+L):**
```
"Add a new column to the Trend Tool that shows target share percentage"
```

Claude will:
1. Understand the codebase structure
2. Identify affected files (App.js, server.py)
3. Generate code changes
4. Explain the implementation

#### 2. Inline Editing (Cmd+K or Ctrl+K)

Select code and press Cmd+K:
```javascript
// Select a function, then Cmd+K and type:
"Add error handling and loading state to this function"
```

#### 3. Multi-File Edits

Claude can edit multiple files simultaneously:
```
"Update the Trend Tool to show DraftKings pricing for 2024 season. 
This requires:
1. Backend: Modify the /api/trend endpoint to include 2024 pricing
2. Frontend: Update the display to handle missing pricing data gracefully"
```

### Best Practices for Claude Code Development

#### 1. Provide Context

**Good Prompt:**
```
I'm working on the Trend Tool in App.js (around line 1650). 
I want to add sorting functionality to the table. 
The table renders QB, RB, WR, TE sections separately.
I want to sort within each position group, not globally.
```

**Bad Prompt:**
```
Add sorting to the table
```

#### 2. Reference This Document

When starting a new session:
```
"I'm continuing development on the NFL Fantasy Analytics app. 
Please read /app/DEVELOPER_HANDOFF_PACKET.md for full context."
```

#### 3. Ask for Explanation

```
"Explain how the Trend Tool header structure works before making changes"
```

Claude will analyze the code and explain the 3-tier header system, making it safer to modify.

#### 4. Request Testing Guidance

```
"After implementing this feature, what should I test? 
Provide specific test cases and expected results."
```

#### 5. Incremental Changes

**Better:**
```
1. "First, show me how to add a backend endpoint for player comparison"
2. "Now, create the frontend component to display the comparison"
3. "Finally, integrate it into the detail panel"
```

**Worse:**
```
"Build a complete player comparison feature with backend and frontend"
```

### Code Review with Claude

**Use Claude as a reviewer:**
```
"Review this change I made to the Trend Tool. 
Check for:
1. Performance issues
2. Accessibility concerns
3. Edge cases I might have missed
4. Consistency with existing code style"
```

### Handling Large Files

**Challenge:** App.js is 2200+ lines (large for AI context)

**Solution:**
```
"I want to extract the Trend Tool into a separate component. 
Suggest a file structure and then help me refactor."
```

Claude can help break down monolithic files into maintainable components.

### Common Patterns to Share with Claude

#### Pattern 1: Adding a Trend Tool Column

```
"I want to add a new column to the Trend Tool:
1. Add the header in the appropriate tier (stat header row)
2. Add the data cell in the tbody section
3. Ensure it appears for both Summary and Full Detail views
4. Apply appropriate styling and borders
5. Update colspan values if needed"
```

#### Pattern 2: Adding a Filter

```
"Add a new filter dropdown for [X]:
1. Add state variable with useState
2. Add dropdown in filter section
3. Update filteredData useMemo to apply filter
4. Ensure it works with existing filters"
```

#### Pattern 3: New API Endpoint

```
"Create a new API endpoint /api/[name]:
1. Add route in server.py with proper error handling
2. Query DuckDB using Polars
3. Return JSON response
4. Add corresponding fetch function in App.js
5. Handle loading and error states"
```

### Converting Existing Code for Claude

No conversion needed! Claude understands:
- ✅ React (JSX)
- ✅ Python (FastAPI)
- ✅ Tailwind CSS
- ✅ DuckDB SQL
- ✅ AG-Grid configuration

### Advanced: Custom Instructions for Claude

If using Cursor, add these to Project Instructions:

```
This is an NFL Fantasy Analytics platform.

Code Style:
- React: Functional components with hooks
- No TypeScript (JavaScript only)
- Tailwind for styling (avoid inline styles when possible)
- Detailed comments for complex logic

Critical Rules:
1. All API routes MUST start with /api/
2. Never modify REACT_APP_BACKEND_URL or MONGO_URL
3. Use environment variables for all external URLs
4. Test changes with both PPR and Half-PPR scoring
5. Ensure Trend Tool changes work in Summary AND Full Detail views

Performance:
- Use useMemo and useCallback where appropriate
- Avoid unnecessary re-renders
- Keep AG-Grid column definitions stable

Testing:
- Always suggest manual test cases after code changes
- Consider edge cases (empty data, missing DK pricing, etc.)
```

### Debugging with Claude

**When encountering an error:**
```
"I'm getting this error:
[paste error message]

This occurred after I:
[describe what you did]

Context:
- File: App.js, line 1850
- I was trying to add a new filter
- The filter state is defined at line 95

Help me debug this."
```

Claude will:
1. Analyze the error
2. Identify the root cause
3. Suggest a fix
4. Explain why the error occurred

### Pair Programming with Claude

**Workflow:**
1. **You:** Describe what you want to build
2. **Claude:** Suggests approach, asks clarifying questions
3. **You:** Provide answers or select preferred approach
4. **Claude:** Generates code
5. **You:** Review, test, provide feedback
6. **Claude:** Refines based on feedback
7. **Repeat** until feature is complete

---

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. Backend Not Starting

**Symptoms:**
- Cannot access http://localhost:8001
- Frontend shows "Network Error"

**Debug Steps:**
```bash
# Check supervisor status
sudo supervisorctl status backend

# View error logs
tail -50 /var/log/supervisor/backend.err.log

# Check for port conflicts
netstat -tuln | grep 8001

# Try manual start for better error messages
cd /app/backend
python server.py
```

**Common Causes:**
- Missing dependencies: `pip install -r requirements.txt`
- Port already in use: Kill process on port 8001
- Database file locked: `rm nfl_data.db` (will recreate)

#### 2. Frontend Not Loading

**Symptoms:**
- Blank page
- "Loading..." that never finishes

**Debug Steps:**
```bash
# Check supervisor status
sudo supervisorctl status frontend

# View error logs
tail -50 /var/log/supervisor/frontend.err.log

# Check browser console (F12)
# Look for JavaScript errors

# Try manual start
cd /app/frontend
yarn start
```

**Common Causes:**
- Missing dependencies: `yarn install`
- Build errors: Check console output
- API URL misconfigured: Check .env file

#### 3. Data Not Loading

**Symptoms:**
- Empty tables
- "No data available" message

**Debug Steps:**
```bash
# Trigger data load manually
curl -X POST http://localhost:8001/api/load-data

# Check if database has data
cd /app/backend
python
>>> import duckdb
>>> conn = duckdb.connect('nfl_data.db')
>>> conn.execute("SELECT COUNT(*) FROM player_stats").fetchall()
>>> conn.execute("SELECT COUNT(*) FROM draftkings_pricing").fetchall()
```

**Common Causes:**
- First-time setup: Data not loaded yet
- API rate limiting: Wait and retry
- Network issues: Check internet connectivity

#### 4. Trend Tool Display Issues

**Symptoms:**
- Misaligned columns
- Missing data
- Week dividers not showing

**Debug Steps:**
1. **Check browser console** for React errors
2. **Verify API response**:
   ```bash
   curl "http://localhost:8001/api/trend?team=NYG&start_week=4&end_week=6&season=2025"
   ```
3. **Check colspan values** in code (must match actual column count)
4. **Verify border CSS** is applying (check Elements tab in DevTools)

**Common Causes:**
- Colspan mismatch between headers and data
- CSS not loading (check Network tab)
- Data structure changed but UI not updated

#### 5. Styling Not Applying

**Symptoms:**
- Plain, unstyled UI
- Tailwind classes not working

**Debug Steps:**
```bash
# Rebuild Tailwind
cd /app/frontend
npx tailwindcss -i ./src/index.css -o ./dist/output.css --watch

# Check if CSS file is loading
# In browser DevTools → Network → Filter by CSS

# Verify tailwind.config.js is correct
cat tailwind.config.js
```

**Common Causes:**
- Tailwind not built: Restart frontend
- Class names misspelled
- CSS specificity conflict

### Error Messages Decoder

#### "CORS Error"
- **Meaning:** Backend not allowing frontend requests
- **Fix:** Check CORS middleware in server.py
- **Usually means:** Backend not running or wrong URL

#### "500 Internal Server Error"
- **Meaning:** Backend crashed while processing request
- **Fix:** Check backend error logs
- **Common reason:** Bad SQL query or missing data

#### "DuckDB lock error"
- **Meaning:** Multiple processes accessing database
- **Fix:** Restart backend: `sudo supervisorctl restart backend`

#### "Module not found"
- **Meaning:** Missing dependency
- **Fix:** 
  - Backend: `pip install [module]`
  - Frontend: `yarn add [module]`

### Performance Issues

#### Slow Initial Load
- **Expected:** 30-60 seconds on first load (loading NFL data)
- **If slower:** Check backend logs for errors

#### Slow Trend Tool Rendering
- **If many weeks selected:** Try fewer weeks
- **If many players:** Add pagination (future feature)

#### Slow AG-Grid
- **Check row count:** AG-Grid handles 10,000+ rows well
- **Disable animations:** Set `animateRows: false`

### When to Ask for Help

**Use Claude/AI Help When:**
- Understanding complex code sections
- Planning new features
- Debugging logic errors
- Optimizing performance
- Refactoring code

**Use Human Help When:**
- Kubernetes/deployment issues
- Environment configuration problems
- Database backup/restore
- Security concerns
- Architecture decisions

---

## Appendix

### A. Environment Variables Reference

```bash
# Frontend (/app/frontend/.env)
REACT_APP_BACKEND_URL=<kubernetes-configured>
# Purpose: Backend API base URL
# Used in: All fetch() calls
# Format: https://your-domain.com or http://localhost:8001

# Backend (/app/backend/.env)
MONGO_URL=<kubernetes-configured>
# Purpose: MongoDB connection string (reserved for future use)
# Current: Not actively used (using DuckDB)
```

### B. API Endpoint Reference

```
GET  /api/stats
     ?season=2025&week=4&position=QB&team=DAL
     Returns: Player statistics with optional filters

GET  /api/trend
     ?team=NYG&start_week=4&end_week=6&season=2025
     Returns: Week-by-week player stats for trend analysis

POST /api/load-data
     Body: (empty)
     Returns: {"message": "Data loaded", "rows": 1234}
     Note: Takes 30-60 seconds

POST /api/load-sheets-pricing
     Body: (empty)
     Returns: {"message": "DK pricing loaded", "rows": 567}

GET  /api/health
     Returns: {"status": "healthy"}
```

### C. Keyboard Shortcuts (Browser)

```
Ctrl/Cmd + F       Find in page
Ctrl/Cmd + R       Refresh page
F12                Open DevTools
Ctrl/Cmd + Shift+C Inspect element
Ctrl/Cmd + Shift+I DevTools (alternative)
```

### D. Useful Commands

```bash
# File operations
nano /app/frontend/src/App.js     # Edit file
cat /app/backend/server.py         # View file
ls -la /app                        # List files

# Process management
sudo supervisorctl status          # Check all services
sudo supervisorctl restart all     # Restart everything
sudo supervisorctl tail -f backend # Follow backend logs

# Network debugging
curl http://localhost:8001/api/health
curl -X POST http://localhost:8001/api/load-data

# Database inspection
cd /app/backend && python
>>> import duckdb
>>> conn = duckdb.connect('nfl_data.db')
>>> conn.execute("SELECT * FROM player_stats LIMIT 5").fetchall()
```

### E. Git Workflow

```bash
# Check current changes
cd /app
git status
git diff

# Create a checkpoint
git add .
git commit -m "Descriptive message of changes"

# View history
git log --oneline

# Revert to previous version (if needed)
git checkout [commit-hash] -- [filename]

# Create a branch for new feature
git checkout -b feature/sorting-trend-tool
# Make changes, then
git add .
git commit -m "Add sorting to Trend Tool"
git checkout main
git merge feature/sorting-trend-tool
```

### F. Useful Resources

**React:**
- https://react.dev
- https://react.dev/learn

**Tailwind CSS:**
- https://tailwindcss.com/docs
- https://tailwindui.com (paid, but good examples)

**AG-Grid:**
- https://www.ag-grid.com/react-data-grid/
- https://www.ag-grid.com/react-data-grid/column-definitions/

**FastAPI:**
- https://fastapi.tiangolo.com
- https://fastapi.tiangolo.com/tutorial/

**DuckDB:**
- https://duckdb.org/docs/
- https://duckdb.org/docs/api/python/overview

**Polars:**
- https://pola-rs.github.io/polars/py-polars/html/reference/

**Claude/Cursor:**
- https://cursor.sh
- https://docs.cursor.sh

### G. Contact & Support

**For questions about:**
- **Code/Features:** Use Claude Code with this document
- **Infrastructure:** [Your DevOps team]
- **Data Sources:** [Data provider contact]
- **Deployment:** [Kubernetes admin]

---

## Document Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Jan 2025 | Initial developer handoff packet | AI Engineer |

---

## Final Notes

### What Makes This App Special

1. **Dual-View Architecture**: Data Table for current stats, Trend Tool for week-by-week analysis
2. **Position-Specific Design**: QB section shows Passing stats, RB/WR/TE show Receiving stats
3. **Visual Clarity**: Strong week dividers, category groupings, color-coded insights
4. **Performance**: DuckDB + Polars for fast analytical queries
5. **Flexibility**: Two view modes (Summary/Full Detail), collapsible filters

### Development Philosophy

- **Iterative improvement** over perfection
- **User feedback driven** (based on fantasy football player needs)
- **Performance matters** (high data volume)
- **Visual clarity** (reduce cognitive load)
- **Maintainability** (clear code, good comments)

### Next Developer's Mission

Your goal is to take this from MVP to Production:
1. ✅ **Stability**: Fix any bugs, add error handling
2. 📈 **Performance**: Optimize for larger datasets
3. 🎨 **Polish**: Refine UI/UX based on user feedback
4. ⚙️ **Features**: Add sorting, mobile support, advanced analytics
5. 🧪 **Testing**: Add automated tests for critical paths

**Good luck! You have a solid foundation to build on.** 🚀

---

*End of Developer Handoff Packet*

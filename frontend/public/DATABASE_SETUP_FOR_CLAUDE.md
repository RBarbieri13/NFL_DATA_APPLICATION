# Database Setup Guide for Claude Code

**Context for Claude:** The NFL DK DASHBOARD uses DuckDB (not MongoDB despite the env variable) for storing player statistics and DraftKings pricing data.

---

## Understanding the Database

### Database Type: DuckDB
- **File:** `backend/nfl_data.db` (auto-created)
- **Size:** ~5-10 MB when populated
- **Purpose:** Fast analytical queries for NFL player stats
- **Why DuckDB:** Better for read-heavy analytics than traditional SQL databases

### Two Main Tables:

1. **`player_stats`** - NFL player statistics (auto-populated from API)
2. **`draftkings_pricing`** - DraftKings salary data (hardcoded in server.py)

---

## Setup Option 1: Auto-Create Everything (Recommended)

**This is the easiest method. Claude should implement this first.**

### Step 1: Start the Backend
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Step 2: Trigger Initial Data Load
```bash
# In a new terminal
curl -X POST http://localhost:8001/api/load-data
```

**What happens:**
- Backend automatically creates `nfl_data.db` if it doesn't exist
- Creates `player_stats` table
- Creates `draftkings_pricing` table
- Fetches 2024-2025 NFL season data via nflreadpy
- Populates `player_stats` with ~2000+ player records
- Takes 30-60 seconds

### Step 3: Load DraftKings Pricing
```bash
curl -X POST http://localhost:8001/api/load-sheets-pricing
```

**What happens:**
- Loads hardcoded DraftKings pricing for weeks 1-6 (2025)
- Data is in `server.py` starting around line 500
- Inserts into `draftkings_pricing` table

### Verification:
```bash
# Check that database exists
ls -lh backend/nfl_data.db

# Should see file ~5-10 MB
```

---

## Setup Option 2: Download Existing Database

**If you want the EXACT database with all current data:**

### From Emergent (if available):

1. **Download the database file:**
   ```
   https://fantasy-trends.preview.emergentagent.com/nfl_data.db
   ```
   
2. **Place it in backend folder:**
   ```bash
   # After download
   mv ~/Downloads/nfl_data.db backend/nfl_data.db
   ```

3. **Start backend - it will use existing database**

**Pros:**
- Instant setup, no API calls needed
- Preserves exact data state from development
- Includes all DraftKings pricing

**Cons:**
- Data may be outdated (no recent games)
- Larger initial download

---

## Database Schema Reference

### For Claude to Understand the Data Structure:

```sql
-- Table 1: player_stats
CREATE TABLE player_stats (
    player_id VARCHAR,
    player_name VARCHAR,
    position VARCHAR,              -- QB, RB, WR, TE
    team VARCHAR,                  -- 3-letter team code (DAL, NYG, etc.)
    week INTEGER,                  -- 1-18
    season INTEGER,                -- 2024, 2025
    
    -- Passing Stats
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
    
    -- Other Stats
    snap_count INTEGER,
    snap_percentage FLOAT,
    fumbles_lost INTEGER,
    two_point_conversions INTEGER,
    
    -- Fantasy Points (calculated)
    fantasy_points FLOAT,          -- PPR scoring
    fantasy_points_half_ppr FLOAT,
    
    -- Game Info
    opponent VARCHAR,
    game_result VARCHAR,           -- W/L
    game_score VARCHAR,            -- "21-18"
    
    PRIMARY KEY (player_id, week, season)
);

-- Table 2: draftkings_pricing
CREATE TABLE draftkings_pricing (
    player_name VARCHAR,
    team VARCHAR,
    position VARCHAR,
    week INTEGER,
    season INTEGER,
    salary INTEGER,                -- e.g., 5500 means $5,500
    
    PRIMARY KEY (player_name, week, season)
);
```

---

## What Claude Code Needs to Know

### 1. Database Initialization (in server.py)

**Location:** Lines ~50-150 in `server.py`

```python
import duckdb

# Initialize database connection
def init_db():
    conn = duckdb.connect('nfl_data.db')
    
    # Create player_stats table if not exists
    conn.execute("""
        CREATE TABLE IF NOT EXISTS player_stats (...)
    """)
    
    # Create draftkings_pricing table if not exists
    conn.execute("""
        CREATE TABLE IF NOT EXISTS draftkings_pricing (...)
    """)
    
    return conn

# Global connection
db = init_db()
```

**Key Points:**
- Database file created automatically on first connection
- Tables created with `CREATE TABLE IF NOT EXISTS`
- Connection is global and reused

### 2. Data Loading Function (in server.py)

**Location:** Lines ~200-500

```python
@app.post("/api/load-data")
async def load_nfl_data():
    """Fetches NFL data and populates database"""
    
    # Uses nflreadpy to fetch player stats
    import nflreadr as nfl
    
    # Get 2024 and 2025 season data
    stats_2024 = nfl.load_player_stats(seasons=[2024])
    stats_2025 = nfl.load_player_stats(seasons=[2025])
    
    # Process and insert into DuckDB
    # ... (detailed processing logic)
    
    return {"message": "Data loaded", "rows": total_rows}
```

### 3. DraftKings Pricing (in server.py)

**Location:** Lines ~500-800

```python
@app.post("/api/load-sheets-pricing")
async def load_draftkings_pricing_from_sheets():
    """Loads hardcoded DK pricing data"""
    
    # Hardcoded pricing data for weeks 1-6 (2025)
    dk_pricing_data = [
        # Week 1
        {"name": "Patrick Mahomes", "team": "KC", "pos": "QB", "week": 1, "season": 2025, "salary": 8800},
        {"name": "Josh Allen", "team": "BUF", "pos": "QB", "week": 1, "season": 2025, "salary": 8600},
        # ... hundreds more entries ...
    ]
    
    # Insert into database
    # ... (insertion logic)
    
    return {"message": "DK pricing loaded"}
```

**Important:** This data is hardcoded because:
- No direct DraftKings API available
- Data was manually collected for weeks 1-6 (2025)
- Future enhancement: integrate with Google Sheets or scraping

---

## Common Database Operations

### For Claude to Reference When Working with Data:

### Query Player Stats:
```python
# Get all QB stats for week 4
result = db.execute("""
    SELECT * FROM player_stats 
    WHERE position = 'QB' AND week = 4 AND season = 2025
""").fetchall()
```

### Join with DK Pricing:
```python
# Get player stats with DK salary
result = db.execute("""
    SELECT ps.*, dp.salary as dk_salary
    FROM player_stats ps
    LEFT JOIN draftkings_pricing dp
        ON ps.player_name = dp.player_name
        AND ps.week = dp.week
        AND ps.season = dp.season
    WHERE ps.season = 2025
""").fetchall()
```

### Using Polars for Processing:
```python
import polars as pl

# Query to Polars DataFrame
df = pl.from_arrow(
    db.execute("SELECT * FROM player_stats WHERE season = 2025")
      .fetch_arrow_table()
)

# Process with Polars (much faster than Pandas)
filtered_df = df.filter(pl.col('position') == 'QB')
```

---

## Troubleshooting Database Issues

### Issue: "Database locked"
```bash
# Solution: Restart backend
# Kill the uvicorn process and restart
```

### Issue: "Table does not exist"
```bash
# Solution: Delete database and recreate
rm backend/nfl_data.db
curl -X POST http://localhost:8001/api/load-data
```

### Issue: "No DK pricing data"
```bash
# Solution: Load pricing explicitly
curl -X POST http://localhost:8001/api/load-sheets-pricing
```

### Issue: "Old data showing"
```bash
# Solution: Reload fresh data
curl -X POST http://localhost:8001/api/load-data
# This fetches latest from NFL API
```

---

## Quick Database Check

### Verify Setup with Python:

```python
# In backend folder
python

>>> import duckdb
>>> conn = duckdb.connect('nfl_data.db')

# Check player_stats
>>> conn.execute("SELECT COUNT(*) FROM player_stats").fetchall()
# Should show: [(2000+,)]

# Check draftkings_pricing
>>> conn.execute("SELECT COUNT(*) FROM draftkings_pricing").fetchall()
# Should show: [(500+,)]

# Check a sample player
>>> conn.execute("""
    SELECT player_name, position, team, week, fantasy_points, dk_salary 
    FROM player_stats ps
    LEFT JOIN draftkings_pricing dp ON ps.player_name = dp.player_name 
        AND ps.week = dp.week AND ps.season = dp.season
    WHERE ps.player_name LIKE '%Mahomes%' AND ps.season = 2025
    LIMIT 5
""").fetchall()

>>> conn.close()
```

---

## Database Backup (Optional)

### If You Want to Preserve Current State:

```bash
# Create backup
cp backend/nfl_data.db backend/nfl_data.db.backup

# Restore from backup later
cp backend/nfl_data.db.backup backend/nfl_data.db
```

---

## Summary for Claude

**Simplest Setup (Recommended):**
1. Start backend: `uvicorn server:app --reload`
2. Load data: `curl -X POST http://localhost:8001/api/load-data`
3. Load pricing: `curl -X POST http://localhost:8001/api/load-sheets-pricing`
4. Verify: Check frontend shows data

**The database will automatically:**
- Create itself on first connection
- Create tables with proper schema
- Handle all SQL operations
- Work seamlessly with the existing code

**No manual SQL setup needed!** Everything is automated in the existing code.

---

## Key Files for Reference

- **Database initialization:** `backend/server.py` lines ~50-150
- **Data loading:** `backend/server.py` lines ~200-500
- **DK pricing:** `backend/server.py` lines ~500-800
- **Database location:** `backend/nfl_data.db` (auto-created)

---

**Claude: You don't need to manually set up tables or write SQL. Just start the backend and trigger the data load endpoints. The existing code handles everything!** ✅

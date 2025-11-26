# Claude Code Rollover Guide - NFL DK DASHBOARD
**Transitioning from Emergent to Local Claude Code Development**

---

## 🎯 Purpose of This Guide

This guide will help you:
1. **Export** the complete application from Emergent
2. **Set up** the application locally on your machine
3. **Configure** Claude Code (Cursor IDE) for development
4. **Continue** development seamlessly with AI assistance

**Prerequisites:**
- You have the Developer Handoff Packet (DEVELOPER_HANDOFF_PACKET.md)
- You're viewing this on: https://fantasy-trends.preview.emergentagent.com/
- You have Claude Code / Cursor IDE installed (or will install it)

---

## 📦 Phase 1: Export the Application from Emergent

### Step 1.1: Export via GitHub (Recommended)

**If the Emergent app is connected to GitHub:**

1. **Find the GitHub Repository**
   - Look for "Save to GitHub" or "GitHub" button in Emergent interface
   - Or check the Emergent settings/integrations panel

2. **Clone the Repository Locally**
   ```bash
   # On your local machine
   git clone <your-repo-url>
   cd <repo-name>
   ```

3. **Verify Files**
   ```bash
   ls -la
   # Should see: frontend/, backend/, README.md, etc.
   ```

### Step 1.2: Export via Download (Alternative)

**If GitHub is not connected:**

1. **Use Emergent's Export Feature**
   - Look for "Download" or "Export" button in Emergent
   - Download the entire project as a ZIP file

2. **Extract Locally**
   ```bash
   # On your local machine
   unzip nfl-fantasy-app.zip
   cd nfl-fantasy-app
   ```

### Step 1.3: Manual File Export (Last Resort)

**If no export options available:**

You'll need to recreate the file structure. I'll provide a complete export below.

---

## 💾 Phase 2: Export the Database

### Step 2.1: Download DuckDB Database File

The application uses a DuckDB database file that contains all the player statistics and DraftKings pricing data.

**Option A: Via Emergent Terminal**

If you have terminal access in Emergent:

```bash
# Navigate to backend
cd /app/backend

# Check database size
ls -lh nfl_data.db

# The database file is at: /app/backend/nfl_data.db
```

**To download:**
1. Use Emergent's file download feature (if available)
2. Or copy to the public folder:
   ```bash
   cp /app/backend/nfl_data.db /app/frontend/public/nfl_data.db
   ```
3. Then download from browser:
   ```
   https://fantasy-trends.preview.emergentagent.com/nfl_data.db
   ```

**Option B: Recreate Database Locally**

If you can't download the database, you can recreate it locally (takes 30-60 seconds):

```bash
# After setting up locally (Phase 3), run:
curl -X POST http://localhost:8001/api/load-data
```

This will fetch all NFL data fresh from the API.

### Step 2.2: Export DraftKings Pricing Data

**Important:** The database includes DraftKings pricing for weeks 1-6 (2025). This is hardcoded data that needs to be preserved.

If you need to export just the pricing data:

```bash
# In Emergent terminal
cd /app/backend
python3 << 'EOF'
import duckdb
import json

conn = duckdb.connect('nfl_data.db')
result = conn.execute("SELECT * FROM draftkings_pricing").fetchall()
columns = [desc[0] for desc in conn.description]

data = [dict(zip(columns, row)) for row in result]

with open('/app/frontend/public/dk_pricing_backup.json', 'w') as f:
    json.dump(data, f, indent=2)

print(f"Exported {len(data)} pricing records")
EOF
```

Then download:
```
https://fantasy-trends.preview.emergentagent.com/dk_pricing_backup.json
```

---

## 🖥️ Phase 3: Local Environment Setup

### Step 3.1: Install Required Software

**Required:**
```bash
# Check versions
python --version  # Need 3.10+
node --version    # Need 18+
npm --version     # Or yarn

# If not installed:
# - Python: https://www.python.org/downloads/
# - Node.js: https://nodejs.org/
```

**Recommended:**
- **Cursor IDE**: https://cursor.sh (download and install)
- **Git**: https://git-scm.com/downloads

### Step 3.2: Set Up Project Directory

```bash
# Create project directory
mkdir nfl-fantasy-analytics
cd nfl-fantasy-analytics

# If you cloned from GitHub, skip to Step 3.3
# If you downloaded ZIP, extract it here
# If manual setup, create structure:
mkdir -p frontend/src/components/ui
mkdir -p frontend/public
mkdir -p backend
```

### Step 3.3: Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Create requirements.txt
cat > requirements.txt << 'EOF'
fastapi==0.109.0
uvicorn[standard]==0.27.0
duckdb==0.10.0
polars==0.20.3
pyarrow==15.0.0
nflreadr==0.1.0
python-multipart==0.0.6
httpx==0.26.0
pydantic==2.5.0
EOF

# Install dependencies
pip install -r requirements.txt

# Place the database file (if you downloaded it)
# Copy nfl_data.db to /backend/ directory

# Create .env file
cat > .env << 'EOF'
# Backend Environment Variables
# Note: MONGO_URL is reserved for future use
MONGO_URL=mongodb://localhost:27017/nfl_fantasy
EOF
```

### Step 3.4: Frontend Setup

```bash
cd ../frontend

# Create package.json
cat > package.json << 'EOF'
{
  "name": "nfl-fantasy-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "ag-grid-react": "^32.0.0",
    "ag-grid-community": "^32.0.0",
    "react-resizable-panels": "^2.0.0",
    "lucide-react": "^0.263.1",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": ["react-app"]
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}
EOF

# Install dependencies
npm install
# Or if you prefer yarn:
# yarn install

# Create .env file
cat > .env << 'EOF'
# Frontend Environment Variables
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

# Create Tailwind config
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# Create PostCSS config
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
```

---

## 📋 Phase 4: Get the Source Code

### Option A: Complete Source Code Export

If you need the actual source files and couldn't get them via GitHub/download:

**Backend: server.py**

Contact the previous developer or use Emergent's file export to get:
- `/app/backend/server.py` (2000+ lines)

This file contains all the FastAPI endpoints and data processing logic.

**Frontend: App.js**

Similarly, you need:
- `/app/frontend/src/App.js` (2200+ lines)
- `/app/frontend/src/App.css`
- `/app/frontend/src/index.js`
- `/app/frontend/src/index.css`
- `/app/frontend/public/index.html`
- All files in `/app/frontend/src/components/ui/`

### Option B: Request from Emergent

**Use Emergent's Export Feature:**

1. Navigate to the Emergent dashboard
2. Find your project: "NFL Fantasy Analytics"
3. Look for options like:
   - "Download Project"
   - "Export Code"
   - "Clone to GitHub"
   - "Save to GitHub" (then clone)

### Option C: Use Claude to Recreate

If you have the Developer Handoff Packet, Claude can help recreate files based on the specifications. See Phase 6 for details.

---

## 🚀 Phase 5: Run Locally

### Step 5.1: Start Backend

```bash
cd backend

# Activate virtual environment if not already active
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# Start the FastAPI server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:8001
# INFO:     Application startup complete
```

**Test it:**
```bash
# In a new terminal
curl http://localhost:8001/api/health
# Expected: {"status":"healthy"}
```

### Step 5.2: Load Initial Data (If Database Not Present)

```bash
# In a new terminal
curl -X POST http://localhost:8001/api/load-data

# This will take 30-60 seconds
# Expected response: {"message":"Data loaded successfully","rows":1234}
```

### Step 5.3: Start Frontend

```bash
# In a new terminal
cd frontend

# Start React dev server
npm start
# Or: yarn start

# You should see:
# Compiled successfully!
# Local: http://localhost:3000
```

**Test it:**
- Open browser to http://localhost:3000
- You should see the NFL Fantasy Analytics dashboard
- Check that data loads in both "Data Table" and "Trend Tool" tabs

---

## 🤖 Phase 6: Set Up Claude Code (Cursor IDE)

### Step 6.1: Install Cursor

1. **Download Cursor**: https://cursor.sh
2. **Install** the application
3. **Open Cursor**

### Step 6.2: Configure Cursor for Your Project

```bash
# Open the project in Cursor
cd /path/to/nfl-fantasy-analytics
cursor .

# Or from within Cursor:
# File → Open Folder → Select nfl-fantasy-analytics
```

### Step 6.3: Set Up Claude API

**In Cursor:**
1. Press `Cmd/Ctrl + ,` (Settings)
2. Go to **Features → AI**
3. Select **Claude** as your model
4. Enter your **Anthropic API Key**
   - Get one at: https://console.anthropic.com/
   - Free tier available, then pay-as-you-go
5. Select model: **Claude 3.5 Sonnet** (recommended for coding)

### Step 6.4: Configure Project Settings

**Create Cursor Rules File:**

```bash
# In project root
cat > .cursorrules << 'EOF'
# NFL DK DASHBOARD - Cursor Rules

## Project Context
This is the NFL DK DASHBOARD with React frontend and FastAPI backend.

## Code Style
- React: Functional components with hooks (no classes)
- No TypeScript - JavaScript only
- Tailwind CSS for styling (avoid inline styles)
- Use environment variables for all external URLs

## Critical Rules
1. All API routes MUST start with /api/
2. Never modify REACT_APP_BACKEND_URL in code (use env variable)
3. Test changes with both PPR and Half-PPR scoring modes
4. Ensure Trend Tool changes work in BOTH Summary and Full Detail views
5. Use border-l-4 and border-r-4 for week dividers (critical for visual clarity)

## File Structure
- Frontend: /frontend/src/App.js (main component, 2200+ lines)
- Backend: /backend/server.py (FastAPI app, 2000+ lines)
- Database: /backend/nfl_data.db (DuckDB)

## When Making Changes
- Always check both tabs: Data Table and Trend Tool
- Test with different teams, positions, and week ranges
- Verify API responses in Network tab
- Check browser console for React errors

## Performance Guidelines
- Use useMemo and useCallback for expensive operations
- Keep AG-Grid column definitions stable (avoid recreating)
- Use Polars for backend data processing (faster than Pandas)

## Common Patterns

### Adding a Filter
1. Add state variable with useState
2. Add dropdown/input in filter section
3. Update filteredData useMemo to apply filter
4. Test with existing filters

### Adding API Endpoint
1. Add route in server.py with @app decorator
2. Query DuckDB, process with Polars
3. Return JSON with proper error handling
4. Add fetch function in App.js
5. Handle loading and error states

### Modifying Trend Tool
1. Identify which tier of headers to modify (Week/Category/Stats)
2. Update header structure (ensure colspan matches)
3. Update data cell rendering
4. Test both Summary and Full Detail views
5. Verify week dividers (border-l-4/border-r-4) are preserved

## Testing Checklist
- [ ] Backend: curl test the API endpoint
- [ ] Frontend: Check browser console for errors
- [ ] Test PPR scoring mode
- [ ] Test Half-PPR scoring mode
- [ ] Test multiple teams/positions/weeks
- [ ] Check Trend Tool Summary view
- [ ] Check Trend Tool Full Detail view
- [ ] Verify data alignment in Trend Tool
- [ ] Check responsive behavior (if applicable)

## AI Assistant Guidelines
- When suggesting changes, explain WHY (don't just code)
- Highlight potential breaking changes
- Suggest test cases after implementation
- If touching Trend Tool, verify colspan calculations
- Consider edge cases (empty data, missing DK pricing, etc.)
EOF
```

### Step 6.5: Add the Developer Handoff Packet

**Import the documentation:**

1. **Download** the Developer Handoff Packet:
   - From: https://fantasy-trends.preview.emergentagent.com/DEVELOPER_HANDOFF_PACKET.md
   - Save to project root: `/nfl-fantasy-analytics/DEVELOPER_HANDOFF_PACKET.md`

2. **In Cursor**, you can now reference it:
   ```
   "Read DEVELOPER_HANDOFF_PACKET.md for full project context"
   ```

---

## 🎯 Phase 7: Your First Claude Code Session

### Step 7.1: Initial Context Setting

**Open Cursor Chat (Cmd/Ctrl + L) and paste:**

```
Hi! I'm taking over development of the NFL Fantasy Analytics Platform.

Context:
1. This is the NFL DK DASHBOARD - a React + FastAPI app for NFL player statistics and DraftKings pricing
2. I have the complete codebase running locally
3. I've read the Developer Handoff Packet (DEVELOPER_HANDOFF_PACKET.md)
4. The app has two main views: Data Table (AG-Grid) and Trend Tool (custom table)

Current setup:
- Backend running on http://localhost:8001
- Frontend running on http://localhost:3000
- DuckDB database with player stats and DK pricing

Please confirm you understand the project structure by:
1. Identifying the main files (App.js and server.py)
2. Explaining what the Trend Tool does
3. Listing the current priority tasks (refer to DEVELOPER_HANDOFF_PACKET.md)

Then I'll tell you what I want to work on first.
```

### Step 7.2: Verify Claude Understands the Codebase

Claude should respond with:
- Understanding of the dual-view architecture
- Recognition of the Trend Tool's week-by-week comparison feature
- Awareness of the pending tasks (sorting, mobile, etc.)

If Claude seems confused, provide more context:

```
The main components are:

Frontend (App.js - line 1650-2200):
- Trend Tool with QB section (Passing stats)
- Trend Tool with RB/WR/TE section (Receiving stats)
- Three-tier headers (Week/Category/Stats)
- Week dividers using border-l-4 and border-r-4

Backend (server.py):
- /api/stats - returns player statistics
- /api/trend - returns week-by-week data for Trend Tool
- /api/load-data - fetches NFL data via nflreadpy
- Uses DuckDB + Polars for fast queries

Key architecture:
- All API routes start with /api/ (Kubernetes routing requirement)
- Environment variables for backend URL (never hardcoded)
- DuckDB for analytical queries (not MongoDB)
```

### Step 7.3: Example First Task

**Let's start with something simple to test the workflow:**

```
I want to add a "Last Updated" timestamp to the header that shows when data was last synced.

Requirements:
1. Backend should track last sync time in memory or database
2. Frontend should display it in the header near the "Sync Data" button
3. Format: "Last updated: Jan 13, 2025 at 2:30 PM"

Can you:
1. Show me the backend changes needed
2. Show me the frontend changes needed
3. Suggest where to place this in the UI
4. Provide test cases to verify it works

Please start with the backend implementation.
```

### Step 7.4: Iterative Development Pattern

**Use this pattern for all features:**

```
Task: [Clear description]

Requirements:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

Constraints:
- [What NOT to break]
- [Performance considerations]
- [Compatibility requirements]

Steps:
1. Show me the plan first (don't code yet)
2. I'll approve or adjust
3. Then implement backend
4. Then implement frontend
5. Provide test cases
6. I'll test and give feedback
```

---

## 🔧 Phase 8: Common Development Workflows with Claude

### Workflow 1: Adding a New Feature

**Example: Add Sorting to Trend Tool**

**Step 1: Discovery**
```
I want to add sorting to the Trend Tool. 

Current behavior:
- Players are shown in the order returned from the API
- No way to sort by any column

Desired behavior:
- Click on column header to sort ascending
- Click again to sort descending
- Click third time to remove sort
- Sort should work within each position group (QB, RB, WR, TE separately)
- Sort state should persist when toggling Summary/Full Detail views

Questions before we start:
1. What's the best approach for this in React?
2. Should we sort the data or just the display order?
3. Any performance concerns with the current data volume?
4. Show me similar sorting implementations in the codebase (if any)
```

**Step 2: Planning**
```
Based on your analysis, show me:
1. Proposed state structure for tracking sort
2. Where to add onClick handlers in the Trend Tool headers
3. The sorting function logic
4. How to maintain sort when switching view modes

Don't write code yet, just outline the approach.
```

**Step 3: Implementation**
```
Looks good! Please implement:
1. First, add the state management for sorting
2. Then, add the onClick handlers to headers
3. Then, implement the sorting logic
4. Finally, apply sorted data in the render

Show me each step's code changes with explanations.
```

**Step 4: Testing**
```
Now suggest test cases:
1. Manual testing steps I should perform
2. Edge cases to check (empty data, tied values, etc.)
3. What to look for in browser console
4. Performance checks (if sorting large datasets)
```

### Workflow 2: Debugging an Issue

**Example: Trend Tool Columns Misaligned**

```
I'm seeing a bug in the Trend Tool:

Problem:
- In Full Detail view, the data in the Rushing stats columns don't align with their headers
- Specifically, RB section shows wrong data in the "Yds" column

What I've checked:
- Summary view works fine
- QB section looks correct
- Only RB/WR/TE sections are affected

Can you:
1. Review the RB section data rendering code (around line 1920-2020 in App.js)
2. Count the number of columns in the header vs data cells
3. Identify any colspan mismatches
4. Show me the fix with before/after comparison
```

### Workflow 3: Code Review

```
I just made changes to the Trend Tool to add conditional formatting to Snaps column.

Files changed:
- App.js (lines 1788-1795, 1950-1960, 2050-2060, 2150-2160)

Can you review my changes for:
1. Code correctness (any bugs?)
2. Performance issues (unnecessary re-renders?)
3. Consistency with existing patterns
4. Edge cases I might have missed
5. Accessibility concerns

Here are the changes:
[paste your git diff or code snippet]
```

### Workflow 4: Refactoring

```
The App.js file is 2200+ lines and getting hard to maintain.

Goal: Extract the Trend Tool into a separate component

Requirements:
1. Create TrendTool.jsx component
2. Move all Trend Tool-specific code there
3. Pass necessary props from App.js
4. Ensure it still works with existing filters and state
5. Don't break anything in the Data Table view

Can you:
1. Identify all Trend Tool code in App.js
2. Suggest a component structure (what props to pass)
3. Show me the new TrendTool.jsx file structure
4. Show me the updated App.js with the component import
5. List what I need to test after refactoring
```

---

## 🐛 Phase 9: Troubleshooting Common Issues

### Issue 1: "Module not found" errors

```bash
# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
# or: yarn install
```

### Issue 2: Database connection errors

```bash
# Check if database file exists
ls -lh backend/nfl_data.db

# If missing, recreate:
curl -X POST http://localhost:8001/api/load-data
```

### Issue 3: CORS errors in browser

Check backend server.py has CORS middleware:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue 4: Frontend not connecting to backend

Check frontend/.env:
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

Verify in browser console:
```javascript
console.log(process.env.REACT_APP_BACKEND_URL)
// Should show: http://localhost:8001
```

### Issue 5: Cursor not understanding context

**Reset conversation:**
```
Let's start fresh. 

Project: NFL Fantasy Analytics Platform
Stack: React + FastAPI + DuckDB
Main files: 
- frontend/src/App.js (2200 lines)
- backend/server.py (2000 lines)

I need help with [specific task].

Context:
[paste relevant code or description]

Question:
[your question]
```

---

## 📚 Phase 10: Learning Resources

### Understanding the Codebase

**Start here:**
1. Read DEVELOPER_HANDOFF_PACKET.md (full context)
2. Explore App.js:
   - Lines 1-500: Setup, state, imports
   - Lines 500-1500: Data Table view
   - Lines 1500-2200: Trend Tool view
3. Explore server.py:
   - Lines 1-200: Imports, setup, DB init
   - Lines 200-800: API endpoints
   - Lines 800-1500: Data processing functions
   - Lines 1500+: DraftKings pricing logic

**Ask Claude:**
```
Can you give me a guided tour of App.js?

Specifically:
1. What are the main sections?
2. What does the state management look like?
3. How does data flow from backend to UI?
4. What are the key functions I should understand first?
```

### Key Concepts to Master

**Frontend:**
- React hooks (useState, useEffect, useMemo, useCallback)
- AG-Grid configuration
- Tailwind CSS classes
- react-resizable-panels

**Backend:**
- FastAPI route decorators
- DuckDB queries
- Polars DataFrame operations
- Async/await patterns

**Ask Claude to explain:**
```
I'm new to [DuckDB/Polars/AG-Grid]. 

Can you:
1. Explain how it's used in this project
2. Show me the key examples from our codebase
3. Suggest best practices for working with it
4. Point me to good documentation
```

---

## 🎯 Phase 11: Your Development Roadmap

### Week 1: Get Comfortable

**Goals:**
- ✅ Local environment running smoothly
- ✅ Made one small change successfully
- ✅ Understand the codebase structure
- ✅ Comfortable with Claude Code workflow

**Suggested first task:**
- Add "Last Updated" timestamp (as described earlier)
- Or fix a small styling issue
- Or add a simple new filter

### Week 2: Add a Feature

**Priority tasks from Developer Handoff Packet:**
1. **Add Snaps Conditional Formatting** (Medium)
2. **Implement Sorting in Trend Tool** (Medium-High)
3. **Add Missing DraftKings Pricing Data** (High)

Pick one and complete it end-to-end with Claude's help.

### Week 3+: Bigger Projects

- Mobile responsiveness
- Advanced analytics
- Performance optimization
- Testing implementation

---

## 🚨 Critical Reminders

### DO's ✅

1. **Always keep Developer Handoff Packet open** as reference
2. **Test in both PPR and Half-PPR modes**
3. **Check both Data Table and Trend Tool after changes**
4. **Use Claude for code review before committing**
5. **Ask Claude "why" when you don't understand something**
6. **Commit frequently with descriptive messages**
7. **Test API endpoints with curl before frontend integration**
8. **Keep .cursorrules updated as you learn project patterns**

### DON'Ts ❌

1. **Never hardcode the backend URL** (always use env variable)
2. **Never modify .env without understanding implications**
3. **Don't skip testing in both view modes** (Summary/Full Detail)
4. **Don't make large changes without asking Claude for review**
5. **Don't assume MongoDB is used** (it's DuckDB!)
6. **Don't forget /api/ prefix** on all backend routes
7. **Don't remove week dividers** (border-l-4/border-r-4) in Trend Tool

---

## 🎓 Advanced: Becoming a Power User

### Custom Claude Prompts Library

Create a file `claude-prompts.md` with reusable prompts:

```markdown
# My Claude Prompts Library

## Code Review
```
Review this code for:
1. Bugs and edge cases
2. Performance issues
3. Accessibility
4. Consistency with project patterns
5. Security concerns

[paste code]
```

## Add Feature
```
I want to add [feature name].

Requirements: [list]
Constraints: [list]

Show me:
1. Implementation plan
2. Files to modify
3. Code changes with explanations
4. Test cases

Start with the plan, don't code yet.
```

## Debug Issue
```
I'm seeing [problem description].

What I've tried: [list]
Error messages: [paste]
Affected files: [list]

Can you:
1. Identify the root cause
2. Suggest fixes
3. Explain why it happened
4. Provide prevention tips
```

## Refactor
```
This code needs refactoring: [reason]

Current code:
[paste code]

Goals:
1. [goal 1]
2. [goal 2]

Show me:
1. Proposed new structure
2. Step-by-step refactoring plan
3. What to test after each step
```
```

### Learning from Claude

**Daily learning prompt:**
```
Based on my work today, teach me one concept I should understand better.

Today I:
- [task 1]
- [task 2]
- [task 3]

Pick the most important concept and:
1. Explain it clearly
2. Show examples from our codebase
3. Give me a small exercise to reinforce learning
4. Point me to good resources
```

---

## 🎉 You're Ready!

### Quick Start Checklist

- [ ] Application exported from Emergent
- [ ] Database file downloaded or recreated
- [ ] Local environment set up (Python, Node.js)
- [ ] Backend running on http://localhost:8001
- [ ] Frontend running on http://localhost:3000
- [ ] Cursor IDE installed and configured
- [ ] Developer Handoff Packet downloaded and read
- [ ] .cursorrules file created
- [ ] First conversation with Claude completed
- [ ] First small change tested successfully

### Your First Conversation with Claude

Open Cursor, press Cmd/Ctrl+L, and start with:

```
Hi! I've just set up the NFL DK DASHBOARD locally.

✅ Backend running: http://localhost:8001
✅ Frontend running: http://localhost:3000
✅ Read Developer Handoff Packet
✅ Reviewed codebase structure

I want to start by [your first task].

Before we begin, can you:
1. Confirm you have context about this project
2. Explain the main architecture (React + FastAPI + DuckDB)
3. Identify the key files I'll be working with
4. Suggest any setup improvements for development workflow

Then we can tackle [your first task] together.
```

---

## 📞 Getting Help

**When Claude Code gets stuck:**

1. **Reset the conversation** (start fresh)
2. **Provide more context** (paste relevant code)
3. **Break down the problem** (smaller steps)
4. **Try a different approach** (ask Claude for alternatives)

**When you get stuck:**

1. **Refer to Developer Handoff Packet**
2. **Check browser console** (F12)
3. **Check backend logs** (terminal where uvicorn is running)
4. **Test API directly** (curl commands)
5. **Ask Claude for debugging help**

**When something breaks:**

1. **Git checkout to last working state**
2. **Review what changed** (git diff)
3. **Test each change individually**
4. **Ask Claude to review** the breaking change

---

## 🚀 Next Steps

You now have everything you need to continue development with Claude Code!

**Recommended flow:**
1. Complete Phase 1-6 (export and setup)
2. Run Phase 7 (first Claude session)
3. Try Workflow 1 from Phase 8 (add a small feature)
4. Review Phase 10 (learning resources)
5. Build something!

**Good luck! You're going to build something awesome.** 🎉

---

*End of Claude Code Rollover Guide*

---

## Appendix A: Quick Reference Commands

### Backend
```bash
# Start backend
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Test health
curl http://localhost:8001/api/health

# Load data
curl -X POST http://localhost:8001/api/load-data

# Test stats endpoint
curl "http://localhost:8001/api/stats?season=2025&position=QB"

# Test trend endpoint
curl "http://localhost:8001/api/trend?team=NYG&start_week=4&end_week=6&season=2025"
```

### Frontend
```bash
# Start frontend
cd frontend
npm start

# Install new package
npm install <package-name>

# Build for production
npm run build
```

### Database
```bash
# Open DuckDB CLI
cd backend
python
>>> import duckdb
>>> conn = duckdb.connect('nfl_data.db')
>>> conn.execute("SELECT COUNT(*) FROM player_stats").fetchall()
>>> conn.execute("SELECT COUNT(*) FROM draftkings_pricing").fetchall()
>>> conn.close()
```

### Git
```bash
# Check status
git status

# View changes
git diff

# Commit changes
git add .
git commit -m "Add feature: sorting to Trend Tool"

# Push to remote
git push origin main

# Revert file
git checkout -- <filename>

# Create branch
git checkout -b feature/new-feature
```

---

## Appendix B: Environment Variables Quick Reference

### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Backend (.env)
```bash
MONGO_URL=mongodb://localhost:27017/nfl_fantasy
```

**Important:** 
- Frontend uses `REACT_APP_` prefix for Create React App
- Access in code: `process.env.REACT_APP_BACKEND_URL`
- Changes require restart: Ctrl+C and restart dev server

---

## Appendix C: Claude Code Keyboard Shortcuts

### Cursor IDE
```
Cmd/Ctrl + L        Open Chat
Cmd/Ctrl + K        Inline Edit
Cmd/Ctrl + I        Ask about selection
Cmd/Ctrl + Shift+L  Open Composer (multi-file edits)
Cmd/Ctrl + /        Comment/uncomment
Cmd/Ctrl + P        Quick file open
Cmd/Ctrl + Shift+P  Command palette
```

---

**You're all set! Happy coding with Claude! 🚀**

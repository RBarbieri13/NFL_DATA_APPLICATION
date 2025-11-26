# 🏈 NFL DK DASHBOARD

**Welcome! You've successfully downloaded the complete project.**

---

## 📦 What You Have

This is a **production-ready MVP** for NFL player statistics and fantasy football analysis.

**Features:**
- ✅ Live NFL player statistics (2024-2025 season)
- ✅ DraftKings pricing integration
- ✅ Week-by-week trend analysis
- ✅ PPR and Half-PPR scoring modes
- ✅ Advanced filtering and data visualization

**Technology Stack:**
- Frontend: React 18 + Tailwind CSS + AG-Grid
- Backend: FastAPI (Python) + DuckDB + Polars
- Data: nflreadpy for live NFL stats

---

## 🚀 Quick Start (5 Minutes)

### 1. Extract This Archive
```bash
# Mac/Linux
tar -xzf nfl-fantasy-analytics-complete.tar.gz
mkdir nfl-fantasy-analytics
mv frontend backend *.md nfl-fantasy-analytics/
cd nfl-fantasy-analytics

# Windows
# Right-click → Extract All → Create folder "nfl-fantasy-analytics"
```

### 2. Open in Cursor (Claude Code)
```bash
cursor .
```
Or: `File → Open Folder → Select nfl-fantasy-analytics`

### 3. Install Dependencies

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install  # or: yarn install
```

### 4. Create Environment Files

**backend/.env:**
```
MONGO_URL=mongodb://localhost:27017/nfl_fantasy
```

**frontend/.env:**
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 5. Start Everything

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

**Terminal 3 - Load Data:**
```bash
curl -X POST http://localhost:8001/api/load-data
```
(Wait 30-60 seconds)

### 6. Open Browser
```
http://localhost:3000
```

You should see the dashboard! 🎉

---

## 📚 Documentation

### For Setup & Configuration:
👉 **`SETUP_INSTRUCTIONS.txt`** - Quick reference guide

### For Claude Code Development:
👉 **`CLAUDE_CODE_ROLLOVER_GUIDE.md`** - Complete transition guide (11 phases)

### For Technical Details:
👉 **`DEVELOPER_HANDOFF_PACKET.md`** - Architecture, API, database schema

---

## 🤖 Start Developing with Claude

Once setup is complete, open Cursor Chat (`Cmd/Ctrl+L`) and paste:

```
Hi! I just set up the NFL DK DASHBOARD locally.

Please read CLAUDE_CODE_ROLLOVER_GUIDE.md for full project context.

The app is running:
- Backend: http://localhost:8001
- Frontend: http://localhost:3000

I'm ready to start developing. Can you:
1. Confirm you understand the project structure
2. Explain the main components (Data Table and Trend Tool)
3. Suggest what feature we should work on first

Then I'll tell you what I want to build.
```

---

## 📁 Project Structure

```
nfl-fantasy-analytics/
├── frontend/
│   ├── src/
│   │   ├── App.js              # Main component (2200 lines)
│   │   ├── App.css
│   │   └── components/ui/      # Shadcn components
│   ├── public/
│   ├── package.json
│   └── .env                    # Create this
│
├── backend/
│   ├── server.py               # FastAPI app (2000 lines)
│   ├── requirements.txt
│   ├── nfl_data.db            # Created on first run
│   └── .env                    # Create this
│
├── CLAUDE_CODE_ROLLOVER_GUIDE.md
├── DEVELOPER_HANDOFF_PACKET.md
├── SETUP_INSTRUCTIONS.txt
└── README_START_HERE.md        # You are here
```

---

## ✅ Verify Installation

After setup, test these:

**1. Backend Health:**
```bash
curl http://localhost:8001/api/health
# Expected: {"status":"healthy"}
```

**2. Frontend:**
- Visit: http://localhost:3000
- Should see dashboard with "Data Table" and "Trend Tool" tabs

**3. Data Loads:**
- Click "Sync Data" button in top-right
- Wait 30-60 seconds
- Player statistics should appear

**4. Both Views Work:**
- Data Table tab: AG-Grid with player stats
- Trend Tool tab: Week-by-week comparison

---

## 🎯 What to Build First

**Easy Tasks (Good for Getting Started):**
1. Add "Last Updated" timestamp to header
2. Add a new filter option
3. Change color scheme for a section

**Medium Tasks:**
1. Add conditional formatting to Snaps column
2. Implement sorting in Trend Tool
3. Add player comparison feature

**Advanced Tasks:**
1. Mobile responsive design
2. Add more analytics/charts
3. Performance optimization

---

## 🐛 Common Issues

### "Module not found"
```bash
# Backend
cd backend && pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### "Port already in use"
```bash
# Find and kill process
# Mac/Linux: lsof -ti:8001 | xargs kill -9
# Windows: netstat -ano | findstr :8001

# Or use different port
uvicorn server:app --host 0.0.0.0 --port 8002 --reload
```

### "No data showing"
```bash
# Manually trigger data load
curl -X POST http://localhost:8001/api/load-data

# Check backend logs for errors
# (Terminal where uvicorn is running)
```

### "CORS errors"
- Check `backend/.env` has `MONGO_URL=...`
- Check `frontend/.env` has `REACT_APP_BACKEND_URL=http://localhost:8001`
- Restart both servers

---

## 📖 Next Steps

1. ✅ Complete setup (follow Quick Start above)
2. 📚 Read `CLAUDE_CODE_ROLLOVER_GUIDE.md` 
3. 🤖 Start your first Claude Code session
4. 🛠️ Pick a task and build it!
5. 🚀 Keep iterating and improving

---

## 💡 Tips for Success

**With Claude Code:**
- Always provide context (mention which file, which section)
- Ask for explanations before implementing
- Request test cases after changes
- Use Claude for code reviews
- Break big tasks into smaller steps

**With This Codebase:**
- Test both PPR and Half-PPR modes
- Check both Data Table and Trend Tool after changes
- Use browser console (F12) to debug frontend
- Use terminal logs to debug backend
- Commit frequently with good messages

**With Development:**
- Read the docs first (saves time!)
- Use useMemo/useCallback for performance
- Keep environment variables in .env files
- Never hardcode URLs
- Test edge cases (empty data, missing fields)

---

## 🎉 You're All Set!

Everything you need is in this archive:
- ✅ Complete source code
- ✅ Full documentation
- ✅ Setup instructions
- ✅ Claude Code integration guide

**Ready to code? Open Cursor and let's build! 🚀**

---

## 📞 Need Help?

1. Check `SETUP_INSTRUCTIONS.txt` for quick fixes
2. Read `CLAUDE_CODE_ROLLOVER_GUIDE.md` for detailed guidance
3. Check `DEVELOPER_HANDOFF_PACKET.md` for technical details
4. Ask Claude in Cursor (Cmd/Ctrl+L)
5. Check browser console (F12) for errors
6. Check terminal logs for server errors

---

**Good luck with your development! 🏈⚡**

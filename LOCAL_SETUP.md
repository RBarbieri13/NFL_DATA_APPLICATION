# LOCAL_SETUP.md - Quick Start Guide

## Prerequisites (Already Verified)
- Python 3.13.3 ✅
- Node.js 22.20.0 ✅
- Yarn 4.10.3 ✅

---

## Quick Start (After Initial Setup)

### Start Both Servers

**Terminal 1 - Backend:**
```bash
cd "/Users/robert.barbieri/Claude Code/NFL_DATA_APPLICATION/backend"
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 10000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd "/Users/robert.barbieri/Claude Code/NFL_DATA_APPLICATION/frontend"
yarn start
```

### Access the App
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:10000/api

---

## One-Time Setup (Already Complete)

If you need to set this up again from scratch:

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
yarn install
```

### Environment Files

**backend/.env:**
```
MONGO_URL=mongodb://localhost:27017/nfl_fantasy
```

**frontend/.env:**
```
REACT_APP_BACKEND_URL=http://localhost:10000
```

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 10000
lsof -ti:10000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### No Data Showing
1. Make sure backend is running: `curl http://localhost:10000/api/`
2. Click "Sync Data" button in the UI
3. Check browser console (F12) for errors

### Module Not Found
```bash
# Backend
cd backend && source venv/bin/activate && pip install -r requirements.txt

# Frontend
cd frontend && yarn install
```

---

## Refresh NFL Data

Click "Sync Data" button in the UI, or:
```bash
curl -X POST http://localhost:10000/api/refresh-data
```

---

## Project Structure

```
NFL_DATA_APPLICATION/
├── backend/
│   ├── server.py           # FastAPI backend
│   ├── fantasy_football.db # Pre-populated DuckDB
│   ├── requirements.txt    # Python dependencies
│   └── venv/              # Python virtual environment
├── frontend/
│   ├── src/App.js         # Main React component
│   ├── package.json       # Node dependencies
│   └── node_modules/      # Installed packages
├── PLAN.md                # Setup checklist (completed)
├── PROJECT_OVERVIEW.md    # Detailed documentation
└── LOCAL_SETUP.md         # This file
```

# NFL_DATA_APPLICATION - Assumptions

This document tracks assumptions made during autonomous development to maintain context across sessions.

---

## Data Assumptions

### NFL Season Structure
- **Season**: 2025 NFL season
- **Weeks**: 1-18 regular season
- **Positions tracked**: QB, RB, WR, TE

### Fantasy Scoring (Default)
- **Passing**: 0.04 pts/yard, 4 pts/TD, -1 pts/INT
- **Rushing**: 0.1 pts/yard, 6 pts/TD
- **Receiving**: 0.1 pts/yard, 6 pts/TD
- **PPR**: 1 pt/reception (full PPR default, half PPR option available)
- **Fumbles**: -1 pt/fumble lost

### DraftKings Pricing
- Salary stored as formatted strings (e.g., "$5.3k", "$8.2k")
- Not all weeks have pricing data (currently weeks 4-6)
- Pricing is optional for player analysis

---

## Technical Assumptions

### Backend
- DuckDB is sufficient for current data volumes (~4K records/season)
- nflreadpy provides accurate, up-to-date statistics
- Single-user application (no concurrent write concerns)

### Frontend
- AG Grid Community edition meets all grid requirements
- Modern browser support only (Chrome, Firefox, Safari, Edge)
- Desktop-first design (responsive is secondary)

### Development Environment
- macOS development machine
- Node.js and Python available
- Ports 3000 (frontend) and 10000 (backend) available

---

## User Preferences (Captured)

### Workflow
- Autonomous operation preferred - minimal back-and-forth
- Always continue without asking "should I continue?"
- All bash commands auto-approved
- All file operations auto-approved
- Git operations auto-approved

### Code Style
- Explanatory output style
- Fix bugs encountered during implementation
- Make reasonable assumptions and document them here

---

## Assumption Log

| Date | Assumption | Rationale |
|------|------------|-----------|
| 2025-11-26 | Full PPR is default scoring | Most common fantasy format |
| 2025-11-26 | DK salary format is "$X.Xk" | Observed in database |
| 2025-11-26 | Week range 1-18 for selectors | Standard NFL season |

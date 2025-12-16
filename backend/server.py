"""
Optimized FastAPI server for NFL Data Application

This is a clean, optimized version of the backend server that:
- Uses proper database management
- Implements caching for better performance
- Has clean error handling
- Removes problematic imports that cause startup issues
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import asyncio
from functools import lru_cache
import traceback

# Import our database manager
from app.utils.database import get_db
from app.config.settings import DRAFTKINGS_SCORING, SKILL_POSITIONS, NFL_TEAMS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="NFL Fantasy Football API",
    description="Optimized API for NFL fantasy football data",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class PlayerStats(BaseModel):
    player_id: str
    player_name: str
    position: str
    team: str
    season: int
    week: Optional[int] = None
    passing_yards: float = 0
    passing_tds: int = 0
    interceptions: int = 0
    rushing_yards: float = 0
    rushing_tds: int = 0
    receptions: int = 0
    receiving_yards: float = 0
    receiving_tds: int = 0
    targets: int = 0
    fumbles_lost: int = 0
    fantasy_points: float = 0
    dk_salary: Optional[int] = None

class PlayerCard(BaseModel):
    player_id: str
    player_name: str
    position: str
    team: str
    current_season_stats: Optional[PlayerStats] = None
    recent_games: List[PlayerStats] = []
    season_averages: Dict[str, float] = {}

# Cache for frequently accessed data
@lru_cache(maxsize=100)
def get_cached_player_stats(player_id: str, season: int) -> Optional[Dict]:
    """Get cached player stats for a season"""
    try:
        db = get_db()
        query = """
            SELECT * FROM season_stats 
            WHERE player_id = ? AND season = ?
        """
        results = db.execute_query(query, [player_id, season])
        return results[0] if results else None
    except Exception as e:
        logger.error(f"Error getting cached player stats: {e}")
        return None

@lru_cache(maxsize=200)
def get_cached_weekly_stats(season: int, week: Optional[int] = None, position: Optional[str] = None) -> List[Dict]:
    """Get cached weekly stats with filters"""
    try:
        db = get_db()
        
        # Build query dynamically
        query = "SELECT * FROM weekly_stats WHERE season = ?"
        params = [season]
        
        if week is not None:
            query += " AND week = ?"
            params.append(week)
            
        if position and position != "All":
            query += " AND position = ?"
            params.append(position)
            
        query += " ORDER BY fantasy_points DESC"
        
        return db.execute_query(query, params)
    except Exception as e:
        logger.error(f"Error getting cached weekly stats: {e}")
        return []

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        db = get_db()
        # Simple query to test database connection
        db.execute_query("SELECT 1")
        return {"status": "healthy", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

# Player endpoints - specific routes first to avoid conflicts
@app.get("/api/players/weekly-stats")
async def get_players_weekly_stats(
    season: int = Query(2024, description="Season year"),
    week: Optional[int] = Query(None, description="Week number"),
    position: Optional[str] = Query(None, description="Position filter"),
    team: Optional[str] = Query(None, description="Team filter"),
    player_name: Optional[str] = Query(None, description="Player name filter"),
    page: int = Query(1, description="Page number"),
    page_size: int = Query(100, description="Page size"),
    limit: int = Query(100, description="Maximum number of records")
):
    """Get weekly stats with filters and pagination (frontend compatible)"""
    try:
        # Use cached function for common queries when no specific filters
        if not team or team == "All":
            if not player_name and page == 1:
                stats = get_cached_weekly_stats(season, week, position)
                if len(stats) > limit:
                    stats = stats[:limit]
                return stats
        
        # For specific queries, query directly
        db = get_db()
        query = "SELECT * FROM weekly_stats WHERE season = ?"
        params = [season]
        
        if week is not None:
            query += " AND week = ?"
            params.append(week)
            
        if position and position != "All":
            query += " AND position = ?"
            params.append(position)
            
        if team and team != "All":
            query += " AND team = ?"
            params.append(team)
            
        if player_name:
            query += " AND LOWER(player_name) LIKE LOWER(?)"
            params.append(f"%{player_name}%")
            
        query += " ORDER BY fantasy_points DESC"
        
        # Add pagination
        if page > 1:
            offset = (page - 1) * page_size
            query += " LIMIT ? OFFSET ?"
            params.extend([page_size, offset])
        else:
            query += " LIMIT ?"
            params.append(limit)
        
        stats = db.execute_query(query, params)
        return stats
        
    except Exception as e:
        logger.error(f"Error getting weekly stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/players/season-stats")
async def get_players_season_stats(
    season: int = Query(2024, description="Season year"),
    position: Optional[str] = Query(None, description="Position filter"),
    team: Optional[str] = Query(None, description="Team filter"),
    player_name: Optional[str] = Query(None, description="Player name filter"),
    page: int = Query(1, description="Page number"),
    page_size: int = Query(100, description="Page size")
):
    """Get season stats with filters and pagination"""
    try:
        db = get_db()
        
        # Build query
        query = """
            SELECT * FROM season_stats 
            WHERE season = ?
        """
        params = [season]
        
        if position and position != "All":
            query += " AND position = ?"
            params.append(position)
            
        if team and team != "All":
            query += " AND team = ?"
            params.append(team)
            
        if player_name:
            query += " AND LOWER(player_name) LIKE LOWER(?)"
            params.append(f"%{player_name}%")
            
        query += " ORDER BY fantasy_points DESC"
        
        # Add pagination
        offset = (page - 1) * page_size
        query += " LIMIT ? OFFSET ?"
        params.extend([page_size, offset])
        
        stats = db.execute_query(query, params)
        return stats
        
    except Exception as e:
        logger.error(f"Error getting season stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/players", response_model=List[Dict[str, Any]])
async def get_players(
    season: int = Query(2024, description="Season year"),
    position: Optional[str] = Query(None, description="Player position filter"),
    team: Optional[str] = Query(None, description="Team filter"),
    limit: int = Query(100, description="Maximum number of players to return")
):
    """Get players with optional filters"""
    try:
        db = get_db()
        
        # Build query
        query = """
            SELECT DISTINCT 
                player_id,
                player_name,
                position,
                team,
                SUM(fantasy_points) as total_fantasy_points,
                COUNT(*) as games_played,
                AVG(fantasy_points) as avg_fantasy_points
            FROM weekly_stats 
            WHERE season = ?
        """
        params = [season]
        
        if position and position != "All":
            query += " AND position = ?"
            params.append(position)
            
        if team and team != "All":
            query += " AND team = ?"
            params.append(team)
            
        query += """
            GROUP BY player_id, player_name, position, team
            ORDER BY total_fantasy_points DESC
            LIMIT ?
        """
        params.append(limit)
        
        players = db.execute_query(query, params)
        return players
        
    except Exception as e:
        logger.error(f"Error getting players: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/players/{player_id}", response_model=PlayerCard)
async def get_player_details(player_id: str, season: int = Query(2024)):
    """Get detailed player information for player card"""
    try:
        db = get_db()
        
        # Get player basic info
        player_query = """
            SELECT DISTINCT player_id, player_name, position, team
            FROM weekly_stats 
            WHERE player_id = ? AND season = ?
            LIMIT 1
        """
        player_info = db.execute_query(player_query, [player_id, season])
        
        if not player_info:
            raise HTTPException(status_code=404, detail="Player not found")
        
        player = player_info[0]
        
        # Get season stats
        season_stats = get_cached_player_stats(player_id, season)
        
        # Get recent games (last 4 weeks)
        recent_query = """
            SELECT * FROM weekly_stats 
            WHERE player_id = ? AND season = ?
            ORDER BY week DESC
            LIMIT 4
        """
        recent_games = db.execute_query(recent_query, [player_id, season])
        
        # Calculate season averages
        avg_query = """
            SELECT 
                AVG(fantasy_points) as avg_fantasy_points,
                AVG(passing_yards) as avg_passing_yards,
                AVG(rushing_yards) as avg_rushing_yards,
                AVG(receiving_yards) as avg_receiving_yards,
                AVG(receptions) as avg_receptions,
                AVG(targets) as avg_targets
            FROM weekly_stats 
            WHERE player_id = ? AND season = ?
        """
        averages_result = db.execute_query(avg_query, [player_id, season])
        averages = averages_result[0] if averages_result else {}
        
        # Clean up None values in averages
        season_averages = {k: round(v or 0, 2) for k, v in averages.items()}
        
        return PlayerCard(
            player_id=player["player_id"],
            player_name=player["player_name"],
            position=player["position"],
            team=player["team"],
            current_season_stats=PlayerStats(**season_stats) if season_stats else None,
            recent_games=[PlayerStats(**game) for game in recent_games],
            season_averages=season_averages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting player details: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/weekly-stats")
async def get_weekly_stats(
    season: int = Query(2024, description="Season year"),
    week: Optional[int] = Query(None, description="Week number"),
    position: Optional[str] = Query(None, description="Position filter"),
    team: Optional[str] = Query(None, description="Team filter"),
    player_name: Optional[str] = Query(None, description="Player name filter"),
    page: int = Query(1, description="Page number"),
    page_size: int = Query(100, description="Page size"),
    limit: int = Query(100, description="Maximum number of records")
):
    """Get weekly stats with filters and pagination"""
    try:
        # Use cached function for common queries when no specific filters
        if not team or team == "All":
            if not player_name and page == 1:
                stats = get_cached_weekly_stats(season, week, position)
                if len(stats) > limit:
                    stats = stats[:limit]
                return stats
        
        # For specific queries, query directly
        db = get_db()
        query = "SELECT * FROM weekly_stats WHERE season = ?"
        params = [season]
        
        if week is not None:
            query += " AND week = ?"
            params.append(week)
            
        if position and position != "All":
            query += " AND position = ?"
            params.append(position)
            
        if team and team != "All":
            query += " AND team = ?"
            params.append(team)
            
        if player_name:
            query += " AND LOWER(player_name) LIKE LOWER(?)"
            params.append(f"%{player_name}%")
            
        query += " ORDER BY fantasy_points DESC"
        
        # Add pagination
        if page > 1:
            offset = (page - 1) * page_size
            query += " LIMIT ? OFFSET ?"
            params.extend([page_size, offset])
        else:
            query += " LIMIT ?"
            params.append(limit)
        
        stats = db.execute_query(query, params)
        return stats
        
    except Exception as e:
        logger.error(f"Error getting weekly stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/fantasy-analyzer")
async def get_fantasy_analyzer_data(
    season: int = Query(2024),
    week_start: int = Query(1),
    week_end: int = Query(4),
    position: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    min_salary: int = Query(0),
    max_salary: int = Query(15000)
):
    """Get data for fantasy analyzer with weekly breakdown"""
    try:
        db = get_db()
        
        # Build base query for weekly data
        query = """
            SELECT 
                w.player_id,
                w.player_name,
                w.position,
                w.team,
                w.week,
                w.fantasy_points,
                w.dk_salary,
                w.opponent,
                w.passing_yards,
                w.rushing_yards,
                w.receiving_yards,
                w.receptions,
                w.targets
            FROM weekly_stats w
            WHERE w.season = ? 
            AND w.week BETWEEN ? AND ?
        """
        params = [season, week_start, week_end]
        
        if position and position != "All":
            query += " AND w.position = ?"
            params.append(position)
            
        if team and team != "All":
            query += " AND w.team = ?"
            params.append(team)
            
        if min_salary > 0 or max_salary < 15000:
            query += " AND w.dk_salary BETWEEN ? AND ?"
            params.extend([min_salary, max_salary])
        
        query += " ORDER BY w.player_name, w.week"
        
        weekly_data = db.execute_query(query, params)
        
        # Group by player and create weekly breakdown
        players_data = {}
        for row in weekly_data:
            player_key = f"{row['player_name']}_{row['team']}"
            if player_key not in players_data:
                players_data[player_key] = {
                    'player_name': row['player_name'],
                    'position': row['position'],
                    'team': row['team'],
                    'weeks': {},
                    'avg_fantasy_points': 0,
                    'total_fantasy_points': 0,
                    'games_played': 0
                }
            
            week_key = f"week_{row['week']}"
            players_data[player_key]['weeks'][week_key] = {
                'fantasy_points': row['fantasy_points'],
                'dk_salary': row['dk_salary'],
                'opponent': row['opponent']
            }
            
            players_data[player_key]['total_fantasy_points'] += row['fantasy_points'] or 0
            players_data[player_key]['games_played'] += 1
        
        # Calculate averages
        for player_data in players_data.values():
            if player_data['games_played'] > 0:
                player_data['avg_fantasy_points'] = round(
                    player_data['total_fantasy_points'] / player_data['games_played'], 2
                )
        
        # Convert to list and sort by average fantasy points
        result = list(players_data.values())
        result.sort(key=lambda x: x['avg_fantasy_points'], reverse=True)
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting fantasy analyzer data: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal server error")

# Data management endpoints
@app.get("/api/teams")
async def get_teams():
    """Get list of NFL teams"""
    return [{"code": code, "name": name} for code, name in NFL_TEAMS.items()]

@app.get("/api/positions")
async def get_positions():
    """Get list of fantasy positions"""
    return SKILL_POSITIONS

@app.get("/api/seasons")
async def get_available_seasons():
    """Get list of available seasons"""
    try:
        db = get_db()
        query = "SELECT DISTINCT season FROM weekly_stats ORDER BY season DESC"
        seasons = db.execute_query(query)
        return [row["season"] for row in seasons]
    except Exception as e:
        logger.error(f"Error getting seasons: {e}")
        return [2024, 2023]  # Default fallback

@app.get("/api/weeks/{season}")
async def get_available_weeks(season: int):
    """Get available weeks for a season"""
    try:
        db = get_db()
        query = "SELECT DISTINCT week FROM weekly_stats WHERE season = ? ORDER BY week"
        weeks = db.execute_query(query, [season])
        return [row["week"] for row in weeks]
    except Exception as e:
        logger.error(f"Error getting weeks: {e}")
        return list(range(1, 18))  # Default fallback

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=12000)
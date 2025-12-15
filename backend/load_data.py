#!/usr/bin/env python3
"""
Simplified data loader for NFL statistics
"""
import sys
import asyncio
import logging
from datetime import datetime, timezone

# Add the app directory to the path
sys.path.append('.')

from app.utils.database import get_db
from app.utils.fantasy_points import calculate_fantasy_points

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_sample_data():
    """Create sample NFL data for testing"""
    
    # Sample players and their stats
    sample_players = [
        # QBs
        {"name": "Josh Allen", "position": "QB", "team": "BUF"},
        {"name": "Patrick Mahomes", "position": "QB", "team": "KC"},
        {"name": "Lamar Jackson", "position": "QB", "team": "BAL"},
        {"name": "Dak Prescott", "position": "QB", "team": "DAL"},
        {"name": "Tua Tagovailoa", "position": "QB", "team": "MIA"},
        
        # RBs
        {"name": "Christian McCaffrey", "position": "RB", "team": "SF"},
        {"name": "Derrick Henry", "position": "RB", "team": "BAL"},
        {"name": "Josh Jacobs", "position": "RB", "team": "GB"},
        {"name": "Saquon Barkley", "position": "RB", "team": "PHI"},
        {"name": "Alvin Kamara", "position": "RB", "team": "NO"},
        
        # WRs
        {"name": "Tyreek Hill", "position": "WR", "team": "MIA"},
        {"name": "Davante Adams", "position": "WR", "team": "LV"},
        {"name": "Stefon Diggs", "position": "WR", "team": "HOU"},
        {"name": "DeAndre Hopkins", "position": "WR", "team": "TEN"},
        {"name": "A.J. Brown", "position": "WR", "team": "PHI"},
        
        # TEs
        {"name": "Travis Kelce", "position": "TE", "team": "KC"},
        {"name": "Mark Andrews", "position": "TE", "team": "BAL"},
        {"name": "George Kittle", "position": "TE", "team": "SF"},
        {"name": "T.J. Hockenson", "position": "TE", "team": "MIN"},
        {"name": "Evan Engram", "position": "TE", "team": "JAX"},
    ]
    
    weekly_data = []
    season_data = []
    
    for season in [2023, 2024]:
        for player in sample_players:
            # Generate season totals
            if player["position"] == "QB":
                season_stats = {
                    "passing_yards": 4000 + (season - 2023) * 200,
                    "passing_tds": 30 + (season - 2023) * 2,
                    "interceptions": 12,
                    "rushing_yards": 400,
                    "rushing_tds": 4,
                    "receptions": 0,
                    "receiving_yards": 0,
                    "receiving_tds": 0,
                    "targets": 0,
                    "fumbles_lost": 2,
                    "games_played": 17
                }
            elif player["position"] == "RB":
                season_stats = {
                    "passing_yards": 0,
                    "passing_tds": 0,
                    "interceptions": 0,
                    "rushing_yards": 1200 + (season - 2023) * 100,
                    "rushing_tds": 12 + (season - 2023),
                    "receptions": 50,
                    "receiving_yards": 400,
                    "receiving_tds": 3,
                    "targets": 65,
                    "fumbles_lost": 2,
                    "games_played": 16
                }
            elif player["position"] == "WR":
                season_stats = {
                    "passing_yards": 0,
                    "passing_tds": 0,
                    "interceptions": 0,
                    "rushing_yards": 50,
                    "rushing_tds": 1,
                    "receptions": 80 + (season - 2023) * 5,
                    "receiving_yards": 1200 + (season - 2023) * 100,
                    "receiving_tds": 10 + (season - 2023),
                    "targets": 120,
                    "fumbles_lost": 1,
                    "games_played": 17
                }
            else:  # TE
                season_stats = {
                    "passing_yards": 0,
                    "passing_tds": 0,
                    "interceptions": 0,
                    "rushing_yards": 20,
                    "rushing_tds": 0,
                    "receptions": 60 + (season - 2023) * 3,
                    "receiving_yards": 800 + (season - 2023) * 50,
                    "receiving_tds": 8 + (season - 2023),
                    "targets": 85,
                    "fumbles_lost": 1,
                    "games_played": 16
                }
            
            # Calculate fantasy points
            season_stats["fantasy_points"] = calculate_fantasy_points(season_stats)
            
            # Create season record
            player_id = f"{season}_{player['name'].replace(' ', '_')}"
            season_record = {
                "id": f"season_{player_id}_{player['team']}",
                "player_id": player_id,
                "player_name": player["name"],
                "position": player["position"],
                "team": player["team"],
                "season": season,
                **season_stats,
                "created_at": datetime.now(timezone.utc)
            }
            season_data.append(season_record)
            
            # Generate weekly data (sample 4 weeks)
            for week in range(1, 5):
                # Scale down season stats to weekly
                weekly_stats = {
                    "passing_yards": season_stats["passing_yards"] / 17 if season_stats["games_played"] > 0 else 0,
                    "passing_tds": max(0, int(season_stats["passing_tds"] / 17)),
                    "interceptions": max(0, int(season_stats["interceptions"] / 17)) if week % 3 == 0 else 0,
                    "rushing_yards": season_stats["rushing_yards"] / 17 if season_stats["games_played"] > 0 else 0,
                    "rushing_tds": max(0, int(season_stats["rushing_tds"] / 17)) if week % 2 == 0 else 0,
                    "receptions": max(0, int(season_stats["receptions"] / 17)),
                    "receiving_yards": season_stats["receiving_yards"] / 17 if season_stats["games_played"] > 0 else 0,
                    "receiving_tds": max(0, int(season_stats["receiving_tds"] / 17)) if week % 2 == 0 else 0,
                    "targets": max(0, int(season_stats["targets"] / 17)),
                    "fumbles_lost": max(0, int(season_stats["fumbles_lost"] / 17)) if week % 5 == 0 else 0,
                }
                
                weekly_stats["fantasy_points"] = calculate_fantasy_points(weekly_stats)
                
                weekly_player_id = f"{season}_{week}_{player['name'].replace(' ', '_')}"
                weekly_record = {
                    "id": f"{weekly_player_id}_{player['team']}",
                    "player_id": weekly_player_id,
                    "player_name": player["name"],
                    "position": player["position"],
                    "team": player["team"],
                    "season": season,
                    "week": week,
                    "opponent": "OPP",
                    **weekly_stats,
                    "snap_percentage": None,
                    "snap_count": None,
                    "dk_salary": None,
                    "created_at": datetime.now(timezone.utc)
                }
                weekly_data.append(weekly_record)
    
    return weekly_data, season_data

async def load_sample_data():
    """Load sample data into the database"""
    try:
        logger.info("Generating sample NFL data...")
        weekly_data, season_data = create_sample_data()
        
        db = get_db()
        
        # Clear existing data
        logger.info("Clearing existing data...")
        db.connection.execute("DELETE FROM weekly_stats")
        db.connection.execute("DELETE FROM season_stats")
        
        # Load weekly data
        logger.info(f"Loading {len(weekly_data)} weekly records...")
        weekly_loaded = db.execute_batch_insert("weekly_stats", weekly_data, batch_size=100)
        
        # Load season data
        logger.info(f"Loading {len(season_data)} season records...")
        season_loaded = db.execute_batch_insert("season_stats", season_data, batch_size=100)
        
        logger.info(f"Data loading completed!")
        logger.info(f"  Weekly records: {weekly_loaded}")
        logger.info(f"  Season records: {season_loaded}")
        
        # Verify data
        weekly_count = db.execute_query("SELECT COUNT(*) as count FROM weekly_stats")[0]["count"]
        season_count = db.execute_query("SELECT COUNT(*) as count FROM season_stats")[0]["count"]
        
        logger.info(f"Verification:")
        logger.info(f"  Weekly stats in DB: {weekly_count}")
        logger.info(f"  Season stats in DB: {season_count}")
        
        # Show sample data
        sample_weekly = db.execute_query("SELECT player_name, position, season, week, fantasy_points FROM weekly_stats LIMIT 5")
        sample_season = db.execute_query("SELECT player_name, position, season, fantasy_points FROM season_stats LIMIT 5")
        
        logger.info("Sample weekly data:")
        for row in sample_weekly:
            logger.info(f"  {row}")
        
        logger.info("Sample season data:")
        for row in sample_season:
            logger.info(f"  {row}")
        
        return {
            "success": True,
            "weekly_loaded": weekly_loaded,
            "season_loaded": season_loaded,
            "total_records": weekly_loaded + season_loaded
        }
        
    except Exception as e:
        logger.error(f"Data loading failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(load_sample_data())
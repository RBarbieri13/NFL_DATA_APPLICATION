"""
Create sample data for testing the NFL Data Application

This script creates sample player data to test the API functionality
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from app.utils.database import get_db
from app.config.settings import SKILL_POSITIONS, NFL_TEAMS
import random
from datetime import datetime

def create_sample_data():
    """Create sample player and stats data"""
    db = get_db()
    
    # Sample players data
    sample_players = [
        # QBs
        {"player_id": "josh_allen", "player_name": "Josh Allen", "position": "QB", "team": "BUF"},
        {"player_id": "patrick_mahomes", "player_name": "Patrick Mahomes", "position": "QB", "team": "KC"},
        {"player_id": "lamar_jackson", "player_name": "Lamar Jackson", "position": "QB", "team": "BAL"},
        {"player_id": "joe_burrow", "player_name": "Joe Burrow", "position": "QB", "team": "CIN"},
        
        # RBs
        {"player_id": "christian_mccaffrey", "player_name": "Christian McCaffrey", "position": "RB", "team": "SF"},
        {"player_id": "derrick_henry", "player_name": "Derrick Henry", "position": "RB", "team": "BAL"},
        {"player_id": "saquon_barkley", "player_name": "Saquon Barkley", "position": "RB", "team": "PHI"},
        {"player_id": "josh_jacobs", "player_name": "Josh Jacobs", "position": "RB", "team": "GB"},
        
        # WRs
        {"player_id": "tyreek_hill", "player_name": "Tyreek Hill", "position": "WR", "team": "MIA"},
        {"player_id": "davante_adams", "player_name": "Davante Adams", "position": "WR", "team": "LV"},
        {"player_id": "stefon_diggs", "player_name": "Stefon Diggs", "position": "WR", "team": "HOU"},
        {"player_id": "cooper_kupp", "player_name": "Cooper Kupp", "position": "WR", "team": "LAR"},
        {"player_id": "ceedee_lamb", "player_name": "CeeDee Lamb", "position": "WR", "team": "DAL"},
        
        # TEs
        {"player_id": "travis_kelce", "player_name": "Travis Kelce", "position": "TE", "team": "KC"},
        {"player_id": "mark_andrews", "player_name": "Mark Andrews", "position": "TE", "team": "BAL"},
        {"player_id": "george_kittle", "player_name": "George Kittle", "position": "TE", "team": "SF"},
    ]
    
    print("Creating sample players...")
    
    # Insert players
    for player in sample_players:
        try:
            db.connection.execute("""
                INSERT OR REPLACE INTO players (player_id, player_name, position, team)
                VALUES (?, ?, ?, ?)
            """, [player["player_id"], player["player_name"], player["position"], player["team"]])
        except Exception as e:
            print(f"Error inserting player {player['player_name']}: {e}")
    
    print("Creating sample weekly stats...")
    
    # Create weekly stats for each player
    season = 2024
    for week in range(1, 5):  # Weeks 1-4
        for player in sample_players:
            # Generate realistic stats based on position
            stats = generate_player_stats(player, week)
            
            try:
                db.connection.execute("""
                    INSERT INTO weekly_stats (
                        id, player_id, player_name, position, team, season, week,
                        passing_yards, passing_tds, interceptions,
                        rushing_yards, rushing_tds,
                        receptions, receiving_yards, receiving_tds, targets,
                        fumbles_lost, fantasy_points, dk_salary
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, [
                    f"{player['player_id']}_{season}_{week}",
                    player["player_id"], player["player_name"], player["position"], player["team"],
                    season, week,
                    stats["passing_yards"], stats["passing_tds"], stats["interceptions"],
                    stats["rushing_yards"], stats["rushing_tds"],
                    stats["receptions"], stats["receiving_yards"], stats["receiving_tds"], stats["targets"],
                    stats["fumbles_lost"], stats["fantasy_points"], stats["dk_salary"]
                ])
            except Exception as e:
                print(f"Error inserting stats for {player['player_name']} week {week}: {e}")
    
    print("Creating season stats...")
    
    # Create aggregated season stats
    for player in sample_players:
        try:
            # Calculate season totals
            result = db.connection.execute("""
                SELECT 
                    COUNT(*) as games_played,
                    SUM(passing_yards) as passing_yards,
                    SUM(passing_tds) as passing_tds,
                    SUM(interceptions) as interceptions,
                    SUM(rushing_yards) as rushing_yards,
                    SUM(rushing_tds) as rushing_tds,
                    SUM(receptions) as receptions,
                    SUM(receiving_yards) as receiving_yards,
                    SUM(receiving_tds) as receiving_tds,
                    SUM(targets) as targets,
                    SUM(fumbles_lost) as fumbles_lost,
                    SUM(fantasy_points) as fantasy_points
                FROM weekly_stats 
                WHERE player_id = ? AND season = ?
            """, [player["player_id"], season]).fetchone()
            
            if result:
                db.connection.execute("""
                    INSERT INTO season_stats (
                        id, player_id, player_name, position, team, season,
                        games_played, passing_yards, passing_tds, interceptions,
                        rushing_yards, rushing_tds, receptions, receiving_yards, receiving_tds,
                        targets, fumbles_lost, fantasy_points
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, [
                    f"{player['player_id']}_{season}",
                    player["player_id"], player["player_name"], player["position"], player["team"],
                    season, *result
                ])
        except Exception as e:
            print(f"Error creating season stats for {player['player_name']}: {e}")
    
    print("Sample data created successfully!")

def generate_player_stats(player, week):
    """Generate realistic stats for a player based on position"""
    position = player["position"]
    
    # Base stats
    stats = {
        "passing_yards": 0, "passing_tds": 0, "interceptions": 0,
        "rushing_yards": 0, "rushing_tds": 0,
        "receptions": 0, "receiving_yards": 0, "receiving_tds": 0, "targets": 0,
        "fumbles_lost": 0, "fantasy_points": 0, "dk_salary": 5000
    }
    
    if position == "QB":
        stats["passing_yards"] = random.randint(200, 400)
        stats["passing_tds"] = random.randint(1, 4)
        stats["interceptions"] = random.randint(0, 2)
        stats["rushing_yards"] = random.randint(0, 80)
        stats["rushing_tds"] = random.randint(0, 1)
        stats["dk_salary"] = random.randint(7000, 9000)
        
    elif position == "RB":
        stats["rushing_yards"] = random.randint(40, 150)
        stats["rushing_tds"] = random.randint(0, 2)
        stats["receptions"] = random.randint(2, 8)
        stats["receiving_yards"] = random.randint(10, 80)
        stats["receiving_tds"] = random.randint(0, 1)
        stats["targets"] = stats["receptions"] + random.randint(0, 3)
        stats["dk_salary"] = random.randint(5500, 8500)
        
    elif position == "WR":
        stats["receptions"] = random.randint(3, 12)
        stats["receiving_yards"] = random.randint(30, 150)
        stats["receiving_tds"] = random.randint(0, 2)
        stats["targets"] = stats["receptions"] + random.randint(1, 5)
        stats["rushing_yards"] = random.randint(0, 20)
        stats["dk_salary"] = random.randint(5000, 8000)
        
    elif position == "TE":
        stats["receptions"] = random.randint(2, 8)
        stats["receiving_yards"] = random.randint(20, 100)
        stats["receiving_tds"] = random.randint(0, 1)
        stats["targets"] = stats["receptions"] + random.randint(1, 3)
        stats["dk_salary"] = random.randint(4000, 7000)
    
    # Add some randomness for bad games
    if random.random() < 0.2:  # 20% chance of a bad game
        for key in stats:
            if key not in ["dk_salary", "fumbles_lost"]:
                stats[key] = int(stats[key] * 0.3)
    
    # Calculate fantasy points (DraftKings PPR scoring)
    stats["fantasy_points"] = (
        stats["passing_yards"] * 0.04 +
        stats["passing_tds"] * 4 +
        stats["interceptions"] * -1 +
        stats["rushing_yards"] * 0.1 +
        stats["rushing_tds"] * 6 +
        stats["receptions"] * 1 +
        stats["receiving_yards"] * 0.1 +
        stats["receiving_tds"] * 6 +
        stats["fumbles_lost"] * -1
    )
    
    # Round fantasy points
    stats["fantasy_points"] = round(stats["fantasy_points"], 2)
    
    return stats

if __name__ == "__main__":
    create_sample_data()
"""
Application configuration and settings
"""
import os
from pathlib import Path
from typing import Dict, Any

# Base directory
BASE_DIR = Path(__file__).parent.parent.parent

# Database configuration
DATABASE_CONFIG = {
    "path": BASE_DIR / "fantasy_football.db",
    "pool_size": 10,
    "timeout": 30
}

# API Configuration
API_CONFIG = {
    "rapidapi_key": "31cd7fd5cfmsh0039d0aaa4b3cf4p187526jsn4273673a1752",
    "rapidapi_host": "tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com",
    "request_timeout": 15,
    "max_retries": 3
}

# DraftKings PPR Scoring System
DRAFTKINGS_SCORING = {
    'passing_yards': 0.04,  # 1 point per 25 yards (0.04 per yard)
    'passing_tds': 4,
    'interceptions': -1,
    'rushing_yards': 0.1,  # 1 point per 10 yards
    'rushing_tds': 6,
    'receptions': 1,  # PPR - 1 point per reception
    'receiving_yards': 0.1,  # 1 point per 10 yards
    'receiving_tds': 6,
    'fumbles_lost': -1,
    '2pt_conversions': 2
}

# Skill positions to track for fantasy football
SKILL_POSITIONS = ['QB', 'RB', 'WR', 'TE']

# NFL Teams mapping
NFL_TEAMS = {
    'ARI': 'Arizona Cardinals',
    'ATL': 'Atlanta Falcons',
    'BAL': 'Baltimore Ravens', 
    'BUF': 'Buffalo Bills',
    'CAR': 'Carolina Panthers',
    'CHI': 'Chicago Bears',
    'CIN': 'Cincinnati Bengals',
    'CLE': 'Cleveland Browns',
    'DAL': 'Dallas Cowboys',
    'DEN': 'Denver Broncos',
    'DET': 'Detroit Lions',
    'GB': 'Green Bay Packers',
    'HOU': 'Houston Texans',
    'IND': 'Indianapolis Colts',
    'JAX': 'Jacksonville Jaguars',
    'KC': 'Kansas City Chiefs',
    'LV': 'Las Vegas Raiders',
    'LAC': 'Los Angeles Chargers',
    'LAR': 'Los Angeles Rams',
    'MIA': 'Miami Dolphins',
    'MIN': 'Minnesota Vikings',
    'NE': 'New England Patriots',
    'NO': 'New Orleans Saints',
    'NYG': 'New York Giants',
    'NYJ': 'New York Jets',
    'PHI': 'Philadelphia Eagles',
    'PIT': 'Pittsburgh Steelers',
    'SF': 'San Francisco 49ers',
    'SEA': 'Seattle Seahawks',
    'TB': 'Tampa Bay Buccaneers',
    'TEN': 'Tennessee Titans',
    'WAS': 'Washington Commanders'
}

# Cache configuration
CACHE_CONFIG = {
    "default_ttl": 300,  # 5 minutes
    "player_stats_ttl": 600,  # 10 minutes
    "season_stats_ttl": 3600,  # 1 hour
    "max_size": 1000
}

# ETL configuration
ETL_CONFIG = {
    "batch_size": 1000,
    "max_workers": 3,
    "retry_delay": 5,
    "seasons_to_load": [2023, 2024, 2025]
}

def get_env_var(key: str, default: Any = None) -> Any:
    """Get environment variable with optional default"""
    return os.getenv(key, default)
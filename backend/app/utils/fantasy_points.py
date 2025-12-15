"""
Fantasy points calculation utilities
"""
from typing import Dict, Any
from app.config.settings import DRAFTKINGS_SCORING

def calculate_fantasy_points(stats: Dict[str, Any]) -> float:
    """
    Calculate DraftKings PPR fantasy points from player stats
    
    Args:
        stats: Dictionary containing player statistics
        
    Returns:
        float: Total fantasy points
    """
    points = 0.0
    
    # Passing stats
    points += (stats.get('passing_yards') or 0) * DRAFTKINGS_SCORING['passing_yards']
    points += (stats.get('passing_tds') or 0) * DRAFTKINGS_SCORING['passing_tds']
    points += (stats.get('interceptions') or 0) * DRAFTKINGS_SCORING['interceptions']
    
    # Rushing stats
    points += (stats.get('rushing_yards') or 0) * DRAFTKINGS_SCORING['rushing_yards']
    points += (stats.get('rushing_tds') or 0) * DRAFTKINGS_SCORING['rushing_tds']
    
    # Receiving stats
    points += (stats.get('receptions') or 0) * DRAFTKINGS_SCORING['receptions']
    points += (stats.get('receiving_yards') or 0) * DRAFTKINGS_SCORING['receiving_yards']
    points += (stats.get('receiving_tds') or 0) * DRAFTKINGS_SCORING['receiving_tds']
    
    # Other stats
    points += (stats.get('fumbles_lost') or 0) * DRAFTKINGS_SCORING['fumbles_lost']
    points += (stats.get('2pt_conversions') or 0) * DRAFTKINGS_SCORING.get('2pt_conversions', 0)
    
    return round(points, 2)

def add_fantasy_points_to_stats(stats_list: list) -> list:
    """
    Add fantasy points calculation to a list of player stats
    
    Args:
        stats_list: List of player stat dictionaries
        
    Returns:
        list: Updated stats list with fantasy_points field
    """
    for stats in stats_list:
        if 'fantasy_points' not in stats or stats['fantasy_points'] is None:
            stats['fantasy_points'] = calculate_fantasy_points(stats)
    
    return stats_list

def validate_stats_data(stats: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and clean stats data
    
    Args:
        stats: Raw stats dictionary
        
    Returns:
        Dict: Cleaned and validated stats
    """
    # Define expected numeric fields with defaults
    numeric_fields = {
        'passing_yards': 0.0,
        'passing_tds': 0,
        'interceptions': 0,
        'rushing_yards': 0.0,
        'rushing_tds': 0,
        'receptions': 0,
        'receiving_yards': 0.0,
        'receiving_tds': 0,
        'targets': 0,
        'fumbles_lost': 0,
        'snap_count': None,
        'snap_percentage': None
    }
    
    # Clean and validate numeric fields
    for field, default in numeric_fields.items():
        value = stats.get(field)
        
        if value is None:
            stats[field] = default
        elif isinstance(value, str):
            try:
                # Try to convert string to appropriate type
                if field in ['passing_tds', 'interceptions', 'rushing_tds', 'receptions', 
                           'receiving_tds', 'targets', 'fumbles_lost', 'snap_count']:
                    stats[field] = int(float(value)) if value else 0
                else:
                    stats[field] = float(value) if value else 0.0
            except (ValueError, TypeError):
                stats[field] = default
        elif not isinstance(value, (int, float)):
            stats[field] = default
    
    # Ensure required string fields exist
    string_fields = ['player_name', 'position', 'team']
    for field in string_fields:
        if field not in stats or not stats[field]:
            stats[field] = ''
    
    return stats
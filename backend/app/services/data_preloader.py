"""
Advanced data preloader for instant data access
Preloads all frequently accessed data into memory on startup
"""
import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import json
from app.utils.database import DatabaseManager
from app.utils.cache import get_cache

logger = logging.getLogger(__name__)

class DataPreloader:
    def __init__(self):
        self.db = DatabaseManager()
        self.cache = get_cache()
        self.preloaded_data = {}
        self.is_loaded = False
        
    async def preload_all_data(self):
        """Preload all frequently accessed data into memory"""
        logger.info("Starting comprehensive data preloading...")
        start_time = datetime.now()
        
        try:
            # Preload in parallel for maximum speed
            await asyncio.gather(
                self._preload_season_stats(),
                self._preload_weekly_stats(),
                self._preload_player_lookups(),
                self._preload_aggregated_views(),
                self._preload_top_performers(),
                return_exceptions=True
            )
            
            self.is_loaded = True
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"Data preloading completed in {duration:.2f} seconds")
            
            # Log preload statistics
            total_records = sum(len(data) if isinstance(data, list) else 1 
                              for data in self.preloaded_data.values())
            logger.info(f"Preloaded {total_records} records across {len(self.preloaded_data)} datasets")
            
        except Exception as e:
            logger.error(f"Error during data preloading: {e}")
            self.is_loaded = False
            
    async def _preload_season_stats(self):
        """Preload all season statistics"""
        logger.info("Preloading season statistics...")
        
        # Load all season stats
        query = """
        SELECT * FROM season_stats 
        ORDER BY season DESC, fantasy_points DESC
        """
        
        season_data = self.db.execute_query(query)
        
        # Organize by season and position for fast access
        self.preloaded_data['season_stats_all'] = season_data
        
        # Create indexed views for instant filtering
        by_season = {}
        by_position = {}
        by_season_position = {}
        
        for record in season_data:
            season = record['season']
            position = record['position']
            
            # By season
            if season not in by_season:
                by_season[season] = []
            by_season[season].append(record)
            
            # By position
            if position not in by_position:
                by_position[position] = []
            by_position[position].append(record)
            
            # By season + position
            key = f"{season}_{position}"
            if key not in by_season_position:
                by_season_position[key] = []
            by_season_position[key].append(record)
        
        self.preloaded_data['season_by_season'] = by_season
        self.preloaded_data['season_by_position'] = by_position
        self.preloaded_data['season_by_season_position'] = by_season_position
        
        logger.info(f"Preloaded {len(season_data)} season records")
        
    async def _preload_weekly_stats(self):
        """Preload weekly statistics with smart indexing"""
        logger.info("Preloading weekly statistics...")
        
        query = """
        SELECT * FROM weekly_stats 
        ORDER BY season DESC, week DESC, fantasy_points DESC
        """
        
        weekly_data = self.db.execute_query(query)
        
        # Create multiple indexed views
        self.preloaded_data['weekly_stats_all'] = weekly_data
        
        by_season = {}
        by_position = {}
        by_player = {}
        by_season_week = {}
        
        for record in weekly_data:
            season = record['season']
            week = record['week']
            position = record['position']
            player_name = record['player_name']
            
            # By season
            if season not in by_season:
                by_season[season] = []
            by_season[season].append(record)
            
            # By position
            if position not in by_position:
                by_position[position] = []
            by_position[position].append(record)
            
            # By player
            if player_name not in by_player:
                by_player[player_name] = []
            by_player[player_name].append(record)
            
            # By season + week
            key = f"{season}_{week}"
            if key not in by_season_week:
                by_season_week[key] = []
            by_season_week[key].append(record)
        
        self.preloaded_data['weekly_by_season'] = by_season
        self.preloaded_data['weekly_by_position'] = by_position
        self.preloaded_data['weekly_by_player'] = by_player
        self.preloaded_data['weekly_by_season_week'] = by_season_week
        
        logger.info(f"Preloaded {len(weekly_data)} weekly records")
        
    async def _preload_player_lookups(self):
        """Preload player lookup tables for instant search"""
        logger.info("Preloading player lookups...")
        
        # Get unique players
        query = """
        SELECT DISTINCT player_name, position, team, season
        FROM season_stats
        ORDER BY player_name
        """
        
        players = self.db.execute_query(query)
        
        # Create search indexes
        player_lookup = {}
        position_players = {}
        team_players = {}
        
        for player in players:
            name = player['player_name']
            position = player['position']
            team = player['team']
            
            if name not in player_lookup:
                player_lookup[name] = []
            player_lookup[name].append(player)
            
            if position not in position_players:
                position_players[position] = []
            position_players[position].append(player)
            
            if team not in team_players:
                team_players[team] = []
            team_players[team].append(player)
        
        self.preloaded_data['player_lookup'] = player_lookup
        self.preloaded_data['position_players'] = position_players
        self.preloaded_data['team_players'] = team_players
        
        logger.info(f"Preloaded {len(players)} player records")
        
    async def _preload_aggregated_views(self):
        """Preload common aggregated views"""
        logger.info("Preloading aggregated views...")
        
        # Season averages by position
        query = """
        SELECT 
            season,
            position,
            COUNT(*) as player_count,
            AVG(fantasy_points) as avg_fantasy_points,
            AVG(passing_yards) as avg_passing_yards,
            AVG(rushing_yards) as avg_rushing_yards,
            AVG(receiving_yards) as avg_receiving_yards,
            AVG(receptions) as avg_receptions
        FROM season_stats
        GROUP BY season, position
        ORDER BY season DESC, position
        """
        
        position_averages = self.db.execute_query(query)
        self.preloaded_data['position_averages'] = position_averages
        
        # Team statistics
        query = """
        SELECT 
            season,
            team,
            COUNT(*) as player_count,
            SUM(fantasy_points) as total_fantasy_points,
            AVG(fantasy_points) as avg_fantasy_points
        FROM season_stats
        GROUP BY season, team
        ORDER BY season DESC, total_fantasy_points DESC
        """
        
        team_stats = self.db.execute_query(query)
        self.preloaded_data['team_stats'] = team_stats
        
        logger.info("Preloaded aggregated views")
        
    async def _preload_top_performers(self):
        """Preload top performer lists for instant access"""
        logger.info("Preloading top performers...")
        
        # Top performers by season and position
        for season in [2023, 2024]:
            for position in ['QB', 'RB', 'WR', 'TE']:
                query = """
                SELECT * FROM season_stats
                WHERE season = ? AND position = ?
                ORDER BY fantasy_points DESC
                LIMIT 50
                """
                
                top_players = self.db.execute_query(query, (season, position))
                key = f"top_{season}_{position}"
                self.preloaded_data[key] = top_players
        
        # Overall top performers
        for season in [2023, 2024]:
            query = """
            SELECT * FROM season_stats
            WHERE season = ?
            ORDER BY fantasy_points DESC
            LIMIT 100
            """
            
            top_overall = self.db.execute_query(query, (season,))
            self.preloaded_data[f"top_{season}_all"] = top_overall
        
        logger.info("Preloaded top performer lists")
        
    def get_season_stats(self, season: Optional[int] = None, 
                        position: Optional[str] = None,
                        limit: Optional[int] = None) -> List[Dict]:
        """Get season stats with instant access from preloaded data"""
        if not self.is_loaded:
            logger.warning("Data not preloaded, falling back to database")
            return []
        
        # Use preloaded indexed data for instant access
        if season and position:
            key = f"{season}_{position}"
            data = self.preloaded_data.get('season_by_season_position', {}).get(key, [])
        elif season:
            data = self.preloaded_data.get('season_by_season', {}).get(season, [])
        elif position:
            data = self.preloaded_data.get('season_by_position', {}).get(position, [])
        else:
            data = self.preloaded_data.get('season_stats_all', [])
        
        # Apply limit if specified
        if limit:
            data = data[:limit]
            
        return data
    
    def get_weekly_stats(self, season: Optional[int] = None,
                        week: Optional[int] = None,
                        position: Optional[str] = None,
                        player_name: Optional[str] = None,
                        limit: Optional[int] = None) -> List[Dict]:
        """Get weekly stats with instant access from preloaded data"""
        if not self.is_loaded:
            logger.warning("Data not preloaded, falling back to database")
            return []
        
        # Use most specific index available
        if player_name:
            data = self.preloaded_data.get('weekly_by_player', {}).get(player_name, [])
            if season:
                data = [r for r in data if r['season'] == season]
            if week:
                data = [r for r in data if r['week'] == week]
        elif season and week:
            key = f"{season}_{week}"
            data = self.preloaded_data.get('weekly_by_season_week', {}).get(key, [])
            if position:
                data = [r for r in data if r['position'] == position]
        elif season:
            data = self.preloaded_data.get('weekly_by_season', {}).get(season, [])
            if position:
                data = [r for r in data if r['position'] == position]
            if week:
                data = [r for r in data if r['week'] == week]
        elif position:
            data = self.preloaded_data.get('weekly_by_position', {}).get(position, [])
            if season:
                data = [r for r in data if r['season'] == season]
            if week:
                data = [r for r in data if r['week'] == week]
        else:
            data = self.preloaded_data.get('weekly_stats_all', [])
            if season:
                data = [r for r in data if r['season'] == season]
            if week:
                data = [r for r in data if r['week'] == week]
            if position:
                data = [r for r in data if r['position'] == position]
        
        # Apply limit if specified
        if limit:
            data = data[:limit]
            
        return data
    
    def get_top_performers(self, season: int, position: Optional[str] = None, 
                          limit: int = 20) -> List[Dict]:
        """Get top performers with instant access"""
        if not self.is_loaded:
            return []
        
        if position:
            key = f"top_{season}_{position}"
            data = self.preloaded_data.get(key, [])
        else:
            key = f"top_{season}_all"
            data = self.preloaded_data.get(key, [])
        
        return data[:limit]
    
    def search_players(self, query: str, limit: int = 20) -> List[Dict]:
        """Search players with instant access"""
        if not self.is_loaded:
            return []
        
        query_lower = query.lower()
        results = []
        
        player_lookup = self.preloaded_data.get('player_lookup', {})
        
        for player_name, player_data in player_lookup.items():
            if query_lower in player_name.lower():
                results.extend(player_data)
                if len(results) >= limit:
                    break
        
        return results[:limit]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get preloader statistics"""
        if not self.is_loaded:
            return {"status": "not_loaded"}
        
        stats = {
            "status": "loaded",
            "datasets": len(self.preloaded_data),
            "total_records": sum(len(data) if isinstance(data, list) else 1 
                               for data in self.preloaded_data.values())
        }
        
        # Add dataset-specific stats
        for key, data in self.preloaded_data.items():
            if isinstance(data, list):
                stats[f"{key}_count"] = len(data)
        
        return stats

# Global preloader instance
_preloader = None

def get_preloader() -> DataPreloader:
    """Get the global preloader instance"""
    global _preloader
    if _preloader is None:
        _preloader = DataPreloader()
    return _preloader

async def initialize_preloader():
    """Initialize and preload all data"""
    preloader = get_preloader()
    await preloader.preload_all_data()
    return preloader
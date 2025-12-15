"""
Player data service with caching and optimized queries
"""
import logging
from typing import List, Dict, Any, Optional
from app.utils.database import get_db
from app.utils.cache import cached, cache_key_for_player_stats, cache_key_for_season_stats, CACHE_CONFIG
from app.models.player import PlayerStats, SeasonStats, PlayerStatsResponse

logger = logging.getLogger(__name__)

class PlayerService:
    """Service for player data operations"""
    
    def __init__(self):
        self.db = get_db()
    
    @cached(ttl=CACHE_CONFIG["player_stats_ttl"], key_prefix="player_stats:")
    def get_weekly_stats(self, season: int, week: Optional[int] = None, 
                        position: Optional[str] = None, team: Optional[str] = None,
                        player_name: Optional[str] = None, page: int = 1, 
                        page_size: int = 100) -> PlayerStatsResponse:
        """
        Get weekly player stats with filtering and pagination
        
        Args:
            season: NFL season
            week: Specific week (optional)
            position: Player position filter (optional)
            team: Team filter (optional)
            player_name: Player name filter (optional)
            page: Page number for pagination
            page_size: Number of records per page
            
        Returns:
            PlayerStatsResponse with data and pagination info
        """
        try:
            # Build WHERE clause
            where_conditions = ["season = ?"]
            params = [season]
            
            if week is not None:
                where_conditions.append("week = ?")
                params.append(week)
            
            if position:
                where_conditions.append("position = ?")
                params.append(position.upper())
            
            if team:
                where_conditions.append("team = ?")
                params.append(team.upper())
            
            if player_name:
                where_conditions.append("player_name ILIKE ?")
                params.append(f"%{player_name}%")
            
            where_clause = " AND ".join(where_conditions)
            
            # Get total count
            count_query = f"SELECT COUNT(*) as total FROM weekly_stats WHERE {where_clause}"
            count_result = self.db.execute_query(count_query, params)
            total_count = count_result[0]['total'] if count_result else 0
            
            # Get paginated data
            offset = (page - 1) * page_size
            data_query = f"""
                SELECT * FROM weekly_stats 
                WHERE {where_clause}
                ORDER BY fantasy_points DESC, player_name
                LIMIT ? OFFSET ?
            """
            params.extend([page_size, offset])
            
            results = self.db.execute_query(data_query, params)
            
            # Convert to PlayerStats objects
            player_stats = [PlayerStats(**row) for row in results]
            
            return PlayerStatsResponse(
                success=True,
                data=player_stats,
                total_count=total_count,
                page=page,
                page_size=page_size
            )
            
        except Exception as e:
            logger.error(f"Failed to get weekly stats: {e}")
            return PlayerStatsResponse(
                success=False,
                data=[],
                total_count=0,
                page=page,
                page_size=page_size
            )
    
    @cached(ttl=CACHE_CONFIG["season_stats_ttl"], key_prefix="season_stats:")
    def get_season_stats(self, season: int, position: Optional[str] = None,
                        team: Optional[str] = None, player_name: Optional[str] = None,
                        page: int = 1, page_size: int = 100) -> Dict[str, Any]:
        """
        Get season-long aggregated stats
        
        Args:
            season: NFL season
            position: Player position filter (optional)
            team: Team filter (optional)
            player_name: Player name filter (optional)
            page: Page number for pagination
            page_size: Number of records per page
            
        Returns:
            Dict with season stats data and pagination info
        """
        try:
            # Build WHERE clause
            where_conditions = ["season = ?"]
            params = [season]
            
            if position:
                where_conditions.append("position = ?")
                params.append(position.upper())
            
            if team:
                where_conditions.append("team = ?")
                params.append(team.upper())
            
            if player_name:
                where_conditions.append("player_name ILIKE ?")
                params.append(f"%{player_name}%")
            
            where_clause = " AND ".join(where_conditions)
            
            # Get total count
            count_query = f"SELECT COUNT(*) as total FROM season_stats WHERE {where_clause}"
            count_result = self.db.execute_query(count_query, params)
            total_count = count_result[0]['total'] if count_result else 0
            
            # Get paginated data
            offset = (page - 1) * page_size
            data_query = f"""
                SELECT * FROM season_stats 
                WHERE {where_clause}
                ORDER BY fantasy_points DESC, player_name
                LIMIT ? OFFSET ?
            """
            params.extend([page_size, offset])
            
            results = self.db.execute_query(data_query, params)
            
            # Convert to SeasonStats objects
            season_stats = [SeasonStats(**row) for row in results]
            
            return {
                "success": True,
                "data": season_stats,
                "total_count": total_count,
                "page": page,
                "page_size": page_size
            }
            
        except Exception as e:
            logger.error(f"Failed to get season stats: {e}")
            return {
                "success": False,
                "data": [],
                "total_count": 0,
                "page": page,
                "page_size": page_size
            }
    
    def get_player_trend_data(self, player_names: List[str], season: int, 
                             weeks: Optional[List[int]] = None) -> Dict[str, Any]:
        """
        Get trend data for specific players across weeks
        
        Args:
            player_names: List of player names
            season: NFL season
            weeks: Specific weeks to include (optional)
            
        Returns:
            Dict with trend data for each player
        """
        try:
            if not player_names:
                return {"success": False, "data": {}, "message": "No players specified"}
            
            # Build query
            placeholders = ', '.join(['?' for _ in player_names])
            where_conditions = [f"player_name IN ({placeholders})", "season = ?"]
            params = player_names + [season]
            
            if weeks:
                week_placeholders = ', '.join(['?' for _ in weeks])
                where_conditions.append(f"week IN ({week_placeholders})")
                params.extend(weeks)
            
            where_clause = " AND ".join(where_conditions)
            
            query = f"""
                SELECT player_name, week, fantasy_points, passing_yards, rushing_yards, 
                       receiving_yards, receptions, passing_tds, rushing_tds, receiving_tds
                FROM weekly_stats 
                WHERE {where_clause}
                ORDER BY player_name, week
            """
            
            results = self.db.execute_query(query, params)
            
            # Group by player
            trend_data = {}
            for row in results:
                player_name = row['player_name']
                if player_name not in trend_data:
                    trend_data[player_name] = []
                trend_data[player_name].append(row)
            
            return {
                "success": True,
                "data": trend_data,
                "total_players": len(trend_data)
            }
            
        except Exception as e:
            logger.error(f"Failed to get trend data: {e}")
            return {"success": False, "data": {}, "message": str(e)}
    
    def get_top_performers(self, season: int, position: Optional[str] = None,
                          stat_type: str = "fantasy_points", limit: int = 20,
                          week: Optional[int] = None) -> Dict[str, Any]:
        """
        Get top performers by specific stat
        
        Args:
            season: NFL season
            position: Player position filter (optional)
            stat_type: Stat to rank by (default: fantasy_points)
            limit: Number of top performers to return
            week: Specific week (optional, otherwise season stats)
            
        Returns:
            Dict with top performers data
        """
        try:
            # Validate stat_type
            valid_stats = [
                'fantasy_points', 'passing_yards', 'rushing_yards', 'receiving_yards',
                'receptions', 'passing_tds', 'rushing_tds', 'receiving_tds'
            ]
            
            if stat_type not in valid_stats:
                stat_type = 'fantasy_points'
            
            # Choose table based on whether week is specified
            if week is not None:
                table = "weekly_stats"
                where_conditions = ["season = ?", "week = ?"]
                params = [season, week]
            else:
                table = "season_stats"
                where_conditions = ["season = ?"]
                params = [season]
            
            if position:
                where_conditions.append("position = ?")
                params.append(position.upper())
            
            where_clause = " AND ".join(where_conditions)
            
            query = f"""
                SELECT player_name, position, team, {stat_type}, fantasy_points
                FROM {table}
                WHERE {where_clause}
                ORDER BY {stat_type} DESC
                LIMIT ?
            """
            params.append(limit)
            
            results = self.db.execute_query(query, params)
            
            return {
                "success": True,
                "data": results,
                "stat_type": stat_type,
                "total_count": len(results)
            }
            
        except Exception as e:
            logger.error(f"Failed to get top performers: {e}")
            return {"success": False, "data": [], "message": str(e)}
    
    def search_players(self, query: str, season: int, limit: int = 20) -> Dict[str, Any]:
        """
        Search for players by name
        
        Args:
            query: Search query
            season: NFL season
            limit: Maximum number of results
            
        Returns:
            Dict with search results
        """
        try:
            search_query = f"""
                SELECT DISTINCT player_name, position, team, 
                       SUM(fantasy_points) as total_fantasy_points
                FROM weekly_stats 
                WHERE season = ? AND player_name ILIKE ?
                GROUP BY player_name, position, team
                ORDER BY total_fantasy_points DESC
                LIMIT ?
            """
            
            params = [season, f"%{query}%", limit]
            results = self.db.execute_query(search_query, params)
            
            return {
                "success": True,
                "data": results,
                "query": query,
                "total_count": len(results)
            }
            
        except Exception as e:
            logger.error(f"Failed to search players: {e}")
            return {"success": False, "data": [], "message": str(e)}

# Global player service instance
player_service = PlayerService()

def get_player_service() -> PlayerService:
    """Get player service instance"""
    return player_service
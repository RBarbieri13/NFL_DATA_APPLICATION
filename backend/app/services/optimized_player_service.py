"""
Ultra-optimized player service with preloaded data for instant access
"""
import logging
from typing import List, Dict, Optional, Any
from app.utils.database import DatabaseManager
from app.services.data_preloader import get_preloader

logger = logging.getLogger(__name__)

class OptimizedPlayerService:
    def __init__(self):
        self.db = DatabaseManager()
        self.preloader = get_preloader()
    
    def get_weekly_stats(self, 
                        season: Optional[int] = None,
                        week: Optional[int] = None, 
                        position: Optional[str] = None,
                        team: Optional[str] = None,
                        player_name: Optional[str] = None,
                        page: int = 1,
                        page_size: int = 100) -> Dict[str, Any]:
        """Get weekly player statistics with instant access from preloaded data"""
        
        # Use preloader for instant access
        if self.preloader.is_loaded:
            data = self.preloader.get_weekly_stats(
                season=season,
                week=week,
                position=position,
                player_name=player_name
            )
            
            # Apply team filter if specified
            if team:
                data = [record for record in data if record.get('team') == team]
            
            # Apply pagination
            total_count = len(data)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            paginated_data = data[start_idx:end_idx]
            
            return {
                "success": True,
                "data": paginated_data,
                "total_count": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": (total_count + page_size - 1) // page_size
            }
        
        # Fallback to database if preloader not available
        return self._get_weekly_stats_from_db(season, week, position, team, player_name, page, page_size)
    
    def get_season_stats(self,
                        season: Optional[int] = None,
                        position: Optional[str] = None,
                        team: Optional[str] = None,
                        player_name: Optional[str] = None,
                        page: int = 1,
                        page_size: int = 100) -> Dict[str, Any]:
        """Get season player statistics with instant access from preloaded data"""
        
        # Use preloader for instant access
        if self.preloader.is_loaded:
            data = self.preloader.get_season_stats(
                season=season,
                position=position
            )
            
            # Apply additional filters
            if team:
                data = [record for record in data if record.get('team') == team]
            
            if player_name:
                data = [record for record in data if player_name.lower() in record.get('player_name', '').lower()]
            
            # Apply pagination
            total_count = len(data)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            paginated_data = data[start_idx:end_idx]
            
            return {
                "success": True,
                "data": paginated_data,
                "total_count": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": (total_count + page_size - 1) // page_size
            }
        
        # Fallback to database if preloader not available
        return self._get_season_stats_from_db(season, position, team, player_name, page, page_size)
    
    def get_top_performers(self,
                          season: int,
                          position: Optional[str] = None,
                          stat_type: str = "fantasy_points",
                          limit: int = 20) -> Dict[str, Any]:
        """Get top performers with instant access from preloaded data"""
        
        # Use preloader for instant access
        if self.preloader.is_loaded:
            data = self.preloader.get_top_performers(season, position, limit)
            
            # If requesting different stat type, sort by that stat
            if stat_type != "fantasy_points" and stat_type in ['passing_yards', 'rushing_yards', 'receiving_yards', 'receptions']:
                data = sorted(data, key=lambda x: x.get(stat_type, 0), reverse=True)[:limit]
            
            # Return only requested fields for performance
            result_data = [
                {
                    "player_name": record["player_name"],
                    "position": record["position"],
                    "team": record["team"],
                    stat_type: record.get(stat_type, 0)
                }
                for record in data
            ]
            
            return {
                "success": True,
                "data": result_data,
                "stat_type": stat_type,
                "total_count": len(result_data)
            }
        
        # Fallback to database
        return self._get_top_performers_from_db(season, position, stat_type, limit)
    
    def search_players(self, query: str, season: Optional[int] = None, limit: int = 20) -> Dict[str, Any]:
        """Search players with instant access from preloaded data"""
        
        # Use preloader for instant access
        if self.preloader.is_loaded:
            results = self.preloader.search_players(query, limit)
            
            # Filter by season if specified
            if season:
                results = [record for record in results if record.get('season') == season]
            
            return {
                "success": True,
                "data": results[:limit],
                "query": query,
                "total_count": len(results[:limit])
            }
        
        # Fallback to database
        return self._search_players_from_db(query, season, limit)
    
    def get_player_trend_data(self, player_names: List[str], season: int, weeks: Optional[List[int]] = None) -> Dict[str, Any]:
        """Get trend data for specific players across weeks"""
        
        if self.preloader.is_loaded:
            all_data = []
            
            for player_name in player_names:
                player_data = self.preloader.get_weekly_stats(
                    season=season,
                    player_name=player_name
                )
                
                # Filter by weeks if specified
                if weeks:
                    player_data = [record for record in player_data if record.get('week') in weeks]
                
                all_data.extend(player_data)
            
            # Group by player
            trend_data = {}
            for record in all_data:
                player_name = record['player_name']
                if player_name not in trend_data:
                    trend_data[player_name] = []
                trend_data[player_name].append(record)
            
            return {
                "success": True,
                "data": trend_data,
                "total_players": len(trend_data)
            }
        
        # Fallback to database
        return self._get_trend_data_from_db(player_names, season, weeks)
    
    # Database fallback methods (for when preloader is not available)
    def _get_weekly_stats_from_db(self, season, week, position, team, player_name, page, page_size):
        """Database fallback for weekly stats"""
        try:
            where_conditions = []
            params = []
            
            if season:
                where_conditions.append("season = ?")
                params.append(season)
            if week:
                where_conditions.append("week = ?")
                params.append(week)
            if position:
                where_conditions.append("position = ?")
                params.append(position)
            if team:
                where_conditions.append("team = ?")
                params.append(team)
            if player_name:
                where_conditions.append("player_name LIKE ?")
                params.append(f"%{player_name}%")
            
            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
            
            count_query = f"SELECT COUNT(*) as total FROM weekly_stats WHERE {where_clause}"
            total_count = self.db.execute_query(count_query, params)[0]['total']
            
            offset = (page - 1) * page_size
            data_query = f"""
            SELECT * FROM weekly_stats 
            WHERE {where_clause}
            ORDER BY fantasy_points DESC
            LIMIT ? OFFSET ?
            """
            
            data = self.db.execute_query(data_query, params + [page_size, offset])
            
            return {
                "success": True,
                "data": data,
                "total_count": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": (total_count + page_size - 1) // page_size
            }
        except Exception as e:
            logger.error(f"Database fallback error: {e}")
            return {"success": False, "data": [], "total_count": 0, "page": page, "page_size": page_size}
    
    def _get_season_stats_from_db(self, season, position, team, player_name, page, page_size):
        """Database fallback for season stats"""
        try:
            where_conditions = []
            params = []
            
            if season:
                where_conditions.append("season = ?")
                params.append(season)
            if position:
                where_conditions.append("position = ?")
                params.append(position)
            if team:
                where_conditions.append("team = ?")
                params.append(team)
            if player_name:
                where_conditions.append("player_name LIKE ?")
                params.append(f"%{player_name}%")
            
            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
            
            count_query = f"SELECT COUNT(*) as total FROM season_stats WHERE {where_clause}"
            total_count = self.db.execute_query(count_query, params)[0]['total']
            
            offset = (page - 1) * page_size
            data_query = f"""
            SELECT * FROM season_stats 
            WHERE {where_clause}
            ORDER BY fantasy_points DESC
            LIMIT ? OFFSET ?
            """
            
            data = self.db.execute_query(data_query, params + [page_size, offset])
            
            return {
                "success": True,
                "data": data,
                "total_count": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": (total_count + page_size - 1) // page_size
            }
        except Exception as e:
            logger.error(f"Database fallback error: {e}")
            return {"success": False, "data": [], "total_count": 0, "page": page, "page_size": page_size}
    
    def _get_top_performers_from_db(self, season, position, stat_type, limit):
        """Database fallback for top performers"""
        try:
            where_conditions = ["season = ?"]
            params = [season]
            
            if position:
                where_conditions.append("position = ?")
                params.append(position)
            
            where_clause = " AND ".join(where_conditions)
            
            valid_stats = ['fantasy_points', 'passing_yards', 'rushing_yards', 'receiving_yards', 'receptions']
            if stat_type not in valid_stats:
                stat_type = 'fantasy_points'
            
            query = f"""
            SELECT player_name, position, team, {stat_type}
            FROM season_stats 
            WHERE {where_clause}
            ORDER BY {stat_type} DESC
            LIMIT ?
            """
            
            data = self.db.execute_query(query, params + [limit])
            
            return {
                "success": True,
                "data": data,
                "stat_type": stat_type,
                "total_count": len(data)
            }
        except Exception as e:
            logger.error(f"Database fallback error: {e}")
            return {"success": False, "data": [], "stat_type": stat_type, "total_count": 0}
    
    def _search_players_from_db(self, query, season, limit):
        """Database fallback for player search"""
        try:
            where_conditions = ["player_name LIKE ?"]
            params = [f"%{query}%"]
            
            if season:
                where_conditions.append("season = ?")
                params.append(season)
            
            where_clause = " AND ".join(where_conditions)
            
            search_query = f"""
            SELECT DISTINCT player_name, position, team, season
            FROM season_stats 
            WHERE {where_clause}
            ORDER BY player_name
            LIMIT ?
            """
            
            data = self.db.execute_query(search_query, params + [limit])
            
            return {
                "success": True,
                "data": data,
                "query": query,
                "total_count": len(data)
            }
        except Exception as e:
            logger.error(f"Database fallback error: {e}")
            return {"success": False, "data": [], "query": query, "total_count": 0}
    
    def _get_trend_data_from_db(self, player_names, season, weeks):
        """Database fallback for trend data"""
        try:
            if not player_names:
                return {"success": False, "data": {}, "total_players": 0}
            
            placeholders = ",".join(["?" for _ in player_names])
            params = player_names + [season]
            
            where_clause = f"player_name IN ({placeholders}) AND season = ?"
            
            if weeks:
                week_placeholders = ",".join(["?" for _ in weeks])
                where_clause += f" AND week IN ({week_placeholders})"
                params.extend(weeks)
            
            query = f"""
            SELECT * FROM weekly_stats
            WHERE {where_clause}
            ORDER BY player_name, week
            """
            
            results = self.db.execute_query(query, params)
            
            # Group by player
            trend_data = {}
            for record in results:
                player_name = record['player_name']
                if player_name not in trend_data:
                    trend_data[player_name] = []
                trend_data[player_name].append(record)
            
            return {
                "success": True,
                "data": trend_data,
                "total_players": len(trend_data)
            }
        except Exception as e:
            logger.error(f"Database fallback error: {e}")
            return {"success": False, "data": {}, "total_players": 0}

# Global optimized service instance
_optimized_player_service = None

def get_optimized_player_service() -> OptimizedPlayerService:
    """Get the global optimized player service instance"""
    global _optimized_player_service
    if _optimized_player_service is None:
        _optimized_player_service = OptimizedPlayerService()
    return _optimized_player_service
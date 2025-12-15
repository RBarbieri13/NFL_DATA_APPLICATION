"""
Optimized ETL service for loading NFL data efficiently
"""
import logging
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import nflreadpy as nfl
import pandas as pd
from concurrent.futures import ThreadPoolExecutor

from app.utils.database import get_db
from app.utils.fantasy_points import calculate_fantasy_points, validate_stats_data
from app.utils.cache import invalidate_player_cache
from app.config.settings import ETL_CONFIG, SKILL_POSITIONS

logger = logging.getLogger(__name__)

class ETLService:
    """Optimized ETL service for NFL data"""
    
    def __init__(self):
        self.db = get_db()
        self.executor = ThreadPoolExecutor(max_workers=ETL_CONFIG["max_workers"])
    
    async def load_season_data(self, seasons: List[int], include_current_season_extras: bool = True) -> Dict[str, Any]:
        """
        Load complete season data efficiently
        
        Args:
            seasons: List of seasons to load
            include_current_season_extras: Whether to include snap counts and DK pricing for current season
            
        Returns:
            Dict with loading results
        """
        results = {
            "seasons_loaded": [],
            "total_weekly_records": 0,
            "total_season_records": 0,
            "errors": []
        }
        
        try:
            for season in seasons:
                logger.info(f"Loading data for season {season}")
                
                # Load weekly stats
                weekly_result = await self._load_weekly_stats(season)
                results["total_weekly_records"] += weekly_result.get("records_loaded", 0)
                
                # Generate season aggregates
                season_result = await self._generate_season_stats(season)
                results["total_season_records"] += season_result.get("records_loaded", 0)
                
                # Load current season extras (snap counts, DK pricing) only for current season
                if include_current_season_extras and season >= 2024:
                    try:
                        await self._load_snap_counts(season)
                        # Note: DK pricing would be loaded separately via API calls
                    except Exception as e:
                        logger.warning(f"Failed to load extras for season {season}: {e}")
                        results["errors"].append(f"Season {season} extras: {str(e)}")
                
                results["seasons_loaded"].append(season)
                logger.info(f"Completed loading season {season}")
            
            # Clear cache after loading new data
            invalidate_player_cache("all", 0)
            
        except Exception as e:
            logger.error(f"ETL process failed: {e}")
            results["errors"].append(str(e))
            raise
        
        return results
    
    async def _load_weekly_stats(self, season: int) -> Dict[str, Any]:
        """Load weekly player stats for a season"""
        try:
            logger.info(f"Loading weekly stats for season {season}")
            
            # Load data using nflreadpy in a thread
            loop = asyncio.get_event_loop()
            weekly_data = await loop.run_in_executor(
                self.executor, 
                self._fetch_weekly_data, 
                season
            )
            
            if weekly_data is None or len(weekly_data) == 0:
                logger.warning(f"No weekly data found for season {season}")
                return {"records_loaded": 0}
            
            # Convert to pandas and process
            df = weekly_data.to_pandas()
            
            # Filter for skill positions only
            df = df[df['position'].isin(SKILL_POSITIONS)]
            
            # Clean and validate data
            processed_records = []
            for _, row in df.iterrows():
                try:
                    record = self._process_weekly_record(row, season)
                    if record:
                        processed_records.append(record)
                except Exception as e:
                    logger.warning(f"Failed to process record: {e}")
                    continue
            
            # Batch insert
            if processed_records:
                # Clear existing data for this season
                self.db.connection.execute("DELETE FROM weekly_stats WHERE season = ?", [season])
                
                records_loaded = self.db.execute_batch_insert(
                    "weekly_stats", 
                    processed_records, 
                    batch_size=ETL_CONFIG["batch_size"]
                )
                
                logger.info(f"Loaded {records_loaded} weekly records for season {season}")
                return {"records_loaded": records_loaded}
            else:
                logger.warning(f"No valid records to load for season {season}")
                return {"records_loaded": 0}
                
        except Exception as e:
            logger.error(f"Failed to load weekly stats for season {season}: {e}")
            raise
    
    def _fetch_weekly_data(self, season: int):
        """Fetch weekly data using nflreadpy (runs in thread)"""
        try:
            return nfl.load_player_stats(seasons=[season])
        except Exception as e:
            logger.error(f"nflreadpy failed for season {season}: {e}")
            return None
    
    def _process_weekly_record(self, row: pd.Series, season: int) -> Optional[Dict[str, Any]]:
        """Process a single weekly record"""
        try:
            # Extract basic info
            player_name = str(row.get('player_display_name', ''))
            if not player_name:
                return None
            
            # Create unique ID
            week = int(row.get('week', 0))
            player_id = f"{season}_{week}_{player_name.replace(' ', '_')}"
            record_id = f"{player_id}_{row.get('team', '')}"
            
            # Build record
            record = {
                'id': record_id,
                'player_id': player_id,
                'player_name': player_name,
                'position': str(row.get('position', '')),
                'team': str(row.get('recent_team', row.get('team', ''))),
                'season': season,
                'week': week,
                'opponent': str(row.get('opponent_team', '')),
                'passing_yards': float(row.get('passing_yards', 0) or 0),
                'passing_tds': int(row.get('passing_tds', 0) or 0),
                'interceptions': int(row.get('interceptions', 0) or 0),
                'rushing_yards': float(row.get('rushing_yards', 0) or 0),
                'rushing_tds': int(row.get('rushing_tds', 0) or 0),
                'receptions': int(row.get('receptions', 0) or 0),
                'receiving_yards': float(row.get('receiving_yards', 0) or 0),
                'receiving_tds': int(row.get('receiving_tds', 0) or 0),
                'targets': int(row.get('targets', 0) or 0),
                'fumbles_lost': int(row.get('fumbles_lost', 0) or 0),
                'snap_percentage': None,  # Will be populated separately if available
                'snap_count': None,
                'dk_salary': None,  # Will be populated separately if available
                'created_at': datetime.now(timezone.utc)
            }
            
            # Validate and clean data
            record = validate_stats_data(record)
            
            # Calculate fantasy points
            record['fantasy_points'] = calculate_fantasy_points(record)
            
            return record
            
        except Exception as e:
            logger.warning(f"Failed to process weekly record: {e}")
            return None
    
    async def _generate_season_stats(self, season: int) -> Dict[str, Any]:
        """Generate aggregated season stats from weekly data"""
        try:
            logger.info(f"Generating season stats for {season}")
            
            # Query weekly stats for aggregation
            query = """
                SELECT 
                    player_name,
                    position,
                    team,
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
                WHERE season = ? 
                GROUP BY player_name, position, team
                HAVING games_played > 0
            """
            
            results = self.db.execute_query(query, [season])
            
            if not results:
                logger.warning(f"No weekly data found to aggregate for season {season}")
                return {"records_loaded": 0}
            
            # Process aggregated data
            season_records = []
            for row in results:
                try:
                    player_id = f"{season}_{row['player_name'].replace(' ', '_')}"
                    record_id = f"season_{player_id}_{row['team']}"
                    
                    record = {
                        'id': record_id,
                        'player_id': player_id,
                        'player_name': row['player_name'],
                        'position': row['position'],
                        'team': row['team'],
                        'season': season,
                        'games_played': row['games_played'],
                        'passing_yards': float(row['passing_yards'] or 0),
                        'passing_tds': int(row['passing_tds'] or 0),
                        'interceptions': int(row['interceptions'] or 0),
                        'rushing_yards': float(row['rushing_yards'] or 0),
                        'rushing_tds': int(row['rushing_tds'] or 0),
                        'receptions': int(row['receptions'] or 0),
                        'receiving_yards': float(row['receiving_yards'] or 0),
                        'receiving_tds': int(row['receiving_tds'] or 0),
                        'targets': int(row['targets'] or 0),
                        'fumbles_lost': int(row['fumbles_lost'] or 0),
                        'fantasy_points': float(row['fantasy_points'] or 0),
                        'created_at': datetime.now(timezone.utc),
                        'updated_at': datetime.now(timezone.utc)
                    }
                    
                    season_records.append(record)
                    
                except Exception as e:
                    logger.warning(f"Failed to process season record: {e}")
                    continue
            
            if season_records:
                # Clear existing season data
                self.db.connection.execute("DELETE FROM season_stats WHERE season = ?", [season])
                
                records_loaded = self.db.execute_batch_insert(
                    "season_stats", 
                    season_records, 
                    batch_size=ETL_CONFIG["batch_size"]
                )
                
                logger.info(f"Generated {records_loaded} season records for {season}")
                return {"records_loaded": records_loaded}
            else:
                return {"records_loaded": 0}
                
        except Exception as e:
            logger.error(f"Failed to generate season stats for {season}: {e}")
            raise
    
    async def _load_snap_counts(self, season: int) -> Dict[str, Any]:
        """Load snap counts for current season (optional)"""
        try:
            logger.info(f"Loading snap counts for season {season}")
            
            # Load snap counts in thread
            loop = asyncio.get_event_loop()
            snap_data = await loop.run_in_executor(
                self.executor,
                self._fetch_snap_data,
                season
            )
            
            if snap_data is None or len(snap_data) == 0:
                logger.warning(f"No snap count data found for season {season}")
                return {"records_loaded": 0}
            
            # Process snap count data
            df = snap_data.to_pandas()
            df = df[df['position'].isin(SKILL_POSITIONS)]
            
            snap_records = []
            for _, row in df.iterrows():
                try:
                    record = self._process_snap_record(row, season)
                    if record:
                        snap_records.append(record)
                except Exception as e:
                    logger.warning(f"Failed to process snap record: {e}")
                    continue
            
            if snap_records:
                # Clear existing snap data for this season
                self.db.connection.execute("DELETE FROM snap_counts WHERE season = ?", [season])
                
                records_loaded = self.db.execute_batch_insert(
                    "snap_counts",
                    snap_records,
                    batch_size=ETL_CONFIG["batch_size"]
                )
                
                logger.info(f"Loaded {records_loaded} snap count records for season {season}")
                return {"records_loaded": records_loaded}
            else:
                return {"records_loaded": 0}
                
        except Exception as e:
            logger.error(f"Failed to load snap counts for season {season}: {e}")
            return {"records_loaded": 0}
    
    def _fetch_snap_data(self, season: int):
        """Fetch snap count data using nflreadpy (runs in thread)"""
        try:
            return nfl.load_snap_counts(seasons=[season])
        except Exception as e:
            logger.error(f"nflreadpy snap counts failed for season {season}: {e}")
            return None
    
    def _process_snap_record(self, row: pd.Series, season: int) -> Optional[Dict[str, Any]]:
        """Process a single snap count record"""
        try:
            player_name = str(row.get('player', ''))
            if not player_name:
                return None
            
            week = int(row.get('week', 0))
            player_id = f"{season}_{week}_{player_name.replace(' ', '_')}"
            record_id = f"snap_{player_id}_{row.get('team', '')}"
            
            record = {
                'id': record_id,
                'player_id': player_id,
                'player_name': player_name,
                'team': str(row.get('team', '')),
                'season': season,
                'week': week,
                'offense_snaps': int(row.get('offense_snaps', 0) or 0),
                'offense_pct': float(row.get('offense_pct', 0) or 0),
                'defense_snaps': int(row.get('defense_snaps', 0) or 0),
                'defense_pct': float(row.get('defense_pct', 0) or 0),
                'st_snaps': int(row.get('st_snaps', 0) or 0),
                'st_pct': float(row.get('st_pct', 0) or 0),
                'position': str(row.get('position', '')),
                'game_id': str(row.get('game_id', '')),
                'opponent_team': str(row.get('opponent', '')),
                'created_at': datetime.now(timezone.utc)
            }
            
            return record
            
        except Exception as e:
            logger.warning(f"Failed to process snap record: {e}")
            return None

# Global ETL service instance
etl_service = ETLService()

def get_etl_service() -> ETLService:
    """Get ETL service instance"""
    return etl_service
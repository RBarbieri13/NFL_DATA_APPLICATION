#!/usr/bin/env python3
"""
Optimized Data Loader for NFL Fantasy Football Application

This module provides high-performance data loading capabilities with:
- Batch processing and vectorized operations
- Comprehensive database indexing
- Intelligent caching strategies
- Optimized API client with rate limiting
- Memory-efficient data structures
"""

import duckdb
import pandas as pd
import numpy as np
import nflreadpy as nfl
import requests
import time
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path

class OptimizedDataLoader:
    """High-performance data loader with batch processing and caching"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = duckdb.connect(db_path)
        self._setup_database_indexes()
        self._cache = {}
        
    def _setup_database_indexes(self):
        """Create comprehensive database indexes for optimal query performance"""
        indexes = [
            # Weekly stats indexes
            "CREATE INDEX IF NOT EXISTS idx_weekly_stats_player_season_week ON weekly_stats(player_name, season, week)",
            "CREATE INDEX IF NOT EXISTS idx_weekly_stats_team_season ON weekly_stats(team, season)",
            "CREATE INDEX IF NOT EXISTS idx_weekly_stats_position_season ON weekly_stats(position, season)",
            "CREATE INDEX IF NOT EXISTS idx_weekly_stats_season_week ON weekly_stats(season, week)",
            "CREATE INDEX IF NOT EXISTS idx_weekly_stats_fantasy_points ON weekly_stats(fantasy_points DESC)",
            
            # Snap counts indexes
            "CREATE INDEX IF NOT EXISTS idx_snap_counts_player_season_week ON snap_counts(player_name, season, week)",
            "CREATE INDEX IF NOT EXISTS idx_snap_counts_team_season ON snap_counts(team, season)",
            "CREATE INDEX IF NOT EXISTS idx_snap_counts_position ON snap_counts(position)",
            "CREATE INDEX IF NOT EXISTS idx_snap_counts_offense_pct ON snap_counts(offense_pct DESC)",
            
            # DraftKings pricing indexes
            "CREATE INDEX IF NOT EXISTS idx_dk_pricing_player_season_week ON draftkings_pricing(player_name, season, week)",
            "CREATE INDEX IF NOT EXISTS idx_dk_pricing_team_position ON draftkings_pricing(team, position)",
            "CREATE INDEX IF NOT EXISTS idx_dk_pricing_salary ON draftkings_pricing(salary DESC)",
            "CREATE INDEX IF NOT EXISTS idx_dk_pricing_season_week ON draftkings_pricing(season, week)",
        ]
        
        for index_sql in indexes:
            try:
                self.conn.execute(index_sql)
                logging.info(f"Created index: {index_sql.split('idx_')[1].split(' ON')[0]}")
            except Exception as e:
                logging.warning(f"Index creation failed: {e}")
    
    def load_weekly_stats_optimized(self, seasons: List[int]) -> Dict[str, int]:
        """Load weekly stats with optimized batch processing"""
        total_loaded = 0
        
        for season in seasons:
            logging.info(f"Loading weekly stats for season {season}")
            
            try:
                # Load data using nflreadpy
                weekly_data = nfl.load_weekly_data(seasons=[season])
                
                if weekly_data is not None and len(weekly_data) > 0:
                    # Convert to pandas for processing
                    df = weekly_data.to_pandas()
                    
                    # Filter for regular season and skill positions
                    df = df[
                        (df['game_type'] == 'REG') & 
                        (df['position'].isin(['QB', 'RB', 'WR', 'TE']))
                    ].copy()
                    
                    if len(df) > 0:
                        # Vectorized fantasy points calculation
                        df['fantasy_points'] = self._calculate_fantasy_points_vectorized(df)
                        
                        # Create optimized ID
                        df['id'] = (df['season'].astype(str) + '_' + 
                                   df['week'].astype(str) + '_' + 
                                   df['team'] + '_' + 
                                   df['player_name'].str.replace(' ', '_'))
                        
                        # Batch delete and insert
                        self.conn.execute("DELETE FROM weekly_stats WHERE season = ?", [season])
                        
                        # Register DataFrame and batch insert
                        self.conn.register('weekly_df', df)
                        
                        insert_sql = """
                        INSERT INTO weekly_stats 
                        SELECT 
                            id,
                            COALESCE(pfr_player_id, '') as player_id,
                            player_name,
                            position,
                            team,
                            season,
                            week,
                            COALESCE(opponent, '') as opponent,
                            COALESCE(passing_yards, 0) as passing_yards,
                            COALESCE(passing_tds, 0) as passing_tds,
                            COALESCE(interceptions, 0) as interceptions,
                            COALESCE(rushing_yards, 0) as rushing_yards,
                            COALESCE(rushing_tds, 0) as rushing_tds,
                            COALESCE(receptions, 0) as receptions,
                            COALESCE(receiving_yards, 0) as receiving_yards,
                            COALESCE(receiving_tds, 0) as receiving_tds,
                            COALESCE(fumbles_lost, 0) as fumbles_lost,
                            fantasy_points,
                            COALESCE(targets, 0) as targets,
                            CURRENT_TIMESTAMP as created_at
                        FROM weekly_df
                        """
                        
                        self.conn.execute(insert_sql)
                        
                        season_count = len(df)
                        total_loaded += season_count
                        logging.info(f"Loaded {season_count} weekly stats for season {season}")
                        
            except Exception as e:
                logging.error(f"Error loading weekly stats for season {season}: {e}")
                continue
        
        return {"total_loaded": total_loaded}
    
    def _calculate_fantasy_points_vectorized(self, df: pd.DataFrame) -> pd.Series:
        """Vectorized fantasy points calculation for better performance"""
        scoring = {
            'passing_yards': 0.04,
            'passing_tds': 4,
            'interceptions': -1,
            'rushing_yards': 0.1,
            'rushing_tds': 6,
            'receptions': 1,
            'receiving_yards': 0.1,
            'receiving_tds': 6,
            'fumbles_lost': -1
        }
        
        points = pd.Series(0.0, index=df.index)
        
        for stat, multiplier in scoring.items():
            if stat in df.columns:
                points += df[stat].fillna(0) * multiplier
        
        return points.round(2)
    
    def load_snap_counts_optimized(self, seasons: List[int]) -> Dict[str, int]:
        """Load snap counts with optimized batch processing"""
        total_loaded = 0
        
        for season in seasons:
            logging.info(f"Loading snap counts for season {season}")
            
            try:
                snap_data = nfl.load_snap_counts(seasons=[season])
                
                if snap_data is not None and len(snap_data) > 0:
                    df = snap_data.to_pandas()
                    
                    # Filter for skill positions and regular season
                    df = df[
                        (df['game_type'] == 'REG') & 
                        (df['position'].isin(['QB', 'RB', 'WR', 'TE'])) &
                        (df['offense_snaps'] > 0)
                    ].copy()
                    
                    if len(df) > 0:
                        # Create optimized ID
                        df['id'] = (df['season'].astype(str) + '_' + 
                                   df['week'].astype(str) + '_' + 
                                   df['team'] + '_' + 
                                   df['player'].str.replace(' ', '_'))
                        
                        # Batch delete and insert
                        self.conn.execute("DELETE FROM snap_counts WHERE season = ?", [season])
                        
                        self.conn.register('snap_df', df)
                        
                        insert_sql = """
                        INSERT INTO snap_counts 
                        SELECT 
                            id,
                            COALESCE(pfr_player_id, '') as player_id,
                            player as player_name,
                            team,
                            season,
                            week,
                            COALESCE(offense_snaps, 0) as offense_snaps,
                            COALESCE(offense_pct, 0.0) as offense_pct,
                            COALESCE(defense_snaps, 0) as defense_snaps,
                            COALESCE(defense_pct, 0.0) as defense_pct,
                            COALESCE(st_snaps, 0) as st_snaps,
                            COALESCE(st_pct, 0.0) as st_pct,
                            position,
                            COALESCE(pfr_game_id, game_id, '') as game_id,
                            COALESCE(opponent, '') as opponent_team,
                            CURRENT_TIMESTAMP as created_at
                        FROM snap_df
                        """
                        
                        self.conn.execute(insert_sql)
                        
                        season_count = len(df)
                        total_loaded += season_count
                        logging.info(f"Loaded {season_count} snap counts for season {season}")
                        
            except Exception as e:
                logging.error(f"Error loading snap counts for season {season}: {e}")
                continue
        
        return {"total_loaded": total_loaded}
    
    def update_snap_percentages_optimized(self):
        """Update snap percentages in weekly_stats using optimized JOIN"""
        update_sql = """
        UPDATE weekly_stats 
        SET snap_percentage = snap_counts.offense_pct,
            snap_count = snap_counts.offense_snaps
        FROM snap_counts 
        WHERE weekly_stats.player_name = snap_counts.player_name 
        AND weekly_stats.team = snap_counts.team 
        AND weekly_stats.season = snap_counts.season 
        AND weekly_stats.week = snap_counts.week
        """
        
        result = self.conn.execute(update_sql)
        updated_count = result.fetchone()[0] if result else 0
        logging.info(f"Updated snap percentages for {updated_count} records")
        return updated_count
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()


class OptimizedAPIClient:
    """Optimized API client with rate limiting and caching"""
    
    def __init__(self, api_key: str, api_host: str):
        self.api_key = api_key
        self.api_host = api_host
        self.last_request_time = 0
        self.min_request_interval = 0.1  # 100ms between requests
        self._response_cache = {}
        
    def _rate_limit(self):
        """Implement rate limiting"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def fetch_draftkings_salaries_batch(self, season_week_pairs: List[Tuple[int, int]]) -> Dict:
        """Fetch DraftKings salaries for multiple season/week combinations"""
        all_data = []
        successful_fetches = 0
        
        for season, week in season_week_pairs:
            cache_key = f"dk_{season}_{week}"
            
            # Check cache first
            if cache_key in self._response_cache:
                cached_data = self._response_cache[cache_key]
                all_data.extend(cached_data)
                successful_fetches += 1
                continue
            
            # Rate limit API calls
            self._rate_limit()
            
            try:
                url = f"https://{self.api_host}/getDFSsalaries"
                params = {
                    "week": str(week),
                    "season": str(season),
                    "site": "draftkings"
                }
                headers = {
                    "x-rapidapi-key": self.api_key,
                    "x-rapidapi-host": self.api_host,
                    "Content-Type": "application/json"
                }
                
                response = requests.get(url, headers=headers, params=params, timeout=15)
                response.raise_for_status()
                
                data = response.json()
                processed_data = []
                
                if 'body' in data and 'draftkings' in data['body']:
                    for player in data['body']['draftkings']:
                        position = player.get('pos', '').upper()
                        if position in ['QB', 'RB', 'WR', 'TE']:
                            salary_raw = player.get('salary', 0)
                            if isinstance(salary_raw, str):
                                salary = int(salary_raw.replace('$', '').replace(',', '')) if salary_raw else 0
                            else:
                                salary = int(salary_raw) if salary_raw else 0
                            
                            processed_data.append({
                                'player_name': player.get('longName', ''),
                                'team': player.get('team', '').upper(),
                                'position': position,
                                'salary': salary,
                                'dk_player_id': player.get('playerID', ''),
                                'season': season,
                                'week': week
                            })
                
                # Cache the response
                self._response_cache[cache_key] = processed_data
                all_data.extend(processed_data)
                successful_fetches += 1
                
                logging.info(f"Fetched {len(processed_data)} DK salaries for {season} week {week}")
                
            except Exception as e:
                logging.error(f"Error fetching DK salaries for {season} week {week}: {e}")
                continue
        
        return {
            'success': successful_fetches > 0,
            'data': all_data,
            'total_records': len(all_data),
            'successful_fetches': successful_fetches
        }


@lru_cache(maxsize=10000)
def normalize_player_name_cached(name: str) -> str:
    """Cached version of player name normalization for better performance"""
    if not name:
        return ""
    
    normalized = name.lower().strip()
    
    # Remove common suffixes
    suffixes = [' jr.', ' jr', ' sr.', ' sr', ' iii', ' ii', ' iv']
    for suffix in suffixes:
        if normalized.endswith(suffix):
            normalized = normalized[:-len(suffix)].strip()
            break
    
    # Remove periods and extra spaces
    normalized = normalized.replace('.', '').replace('  ', ' ')
    
    return normalized


def create_optimized_loader(db_path: str) -> OptimizedDataLoader:
    """Factory function to create optimized data loader"""
    return OptimizedDataLoader(db_path)


def create_optimized_api_client(api_key: str, api_host: str) -> OptimizedAPIClient:
    """Factory function to create optimized API client"""
    return OptimizedAPIClient(api_key, api_host)
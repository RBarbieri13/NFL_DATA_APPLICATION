#!/usr/bin/env python3
"""
NFL Data Warehouse Optimizer

This module provides comprehensive data warehouse optimization including:
- Efficient table structures with proper partitioning
- Season-long aggregated data for 2023 and 2024
- Incremental refresh strategies
- Optimized queries for frontend responsiveness
- Data deduplication and cleanup
"""

import duckdb
import pandas as pd
import nflreadpy as nfl
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time

class DataWarehouseOptimizer:
    """Optimized data warehouse for NFL fantasy football data"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = duckdb.connect(db_path)
        self._setup_optimized_schema()
        
    def _setup_optimized_schema(self):
        """Create optimized database schema with proper indexing"""
        
        # Drop existing tables if they exist (for clean setup)
        tables_to_drop = ['weekly_stats', 'snap_counts', 'draftkings_pricing']
        for table in tables_to_drop:
            try:
                self.conn.execute(f"DROP TABLE IF EXISTS {table}")
            except:
                pass
        
        # Create optimized weekly stats table
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS weekly_stats (
                id VARCHAR PRIMARY KEY,
                player_id VARCHAR,
                player_name VARCHAR NOT NULL,
                position VARCHAR NOT NULL,
                team VARCHAR NOT NULL,
                season INTEGER NOT NULL,
                week INTEGER NOT NULL,
                opponent VARCHAR,
                passing_yards DOUBLE DEFAULT 0,
                passing_tds INTEGER DEFAULT 0,
                interceptions INTEGER DEFAULT 0,
                rushing_yards DOUBLE DEFAULT 0,
                rushing_tds INTEGER DEFAULT 0,
                receptions INTEGER DEFAULT 0,
                receiving_yards DOUBLE DEFAULT 0,
                receiving_tds INTEGER DEFAULT 0,
                fumbles_lost INTEGER DEFAULT 0,
                fantasy_points DOUBLE DEFAULT 0,
                targets INTEGER DEFAULT 0,
                snap_percentage DOUBLE,
                snap_count INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create season totals table for historical data (2023, 2024)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS season_totals (
                id VARCHAR PRIMARY KEY,
                player_id VARCHAR,
                player_name VARCHAR NOT NULL,
                position VARCHAR NOT NULL,
                team VARCHAR NOT NULL,
                season INTEGER NOT NULL,
                games_played INTEGER DEFAULT 0,
                passing_yards DOUBLE DEFAULT 0,
                passing_tds INTEGER DEFAULT 0,
                interceptions INTEGER DEFAULT 0,
                rushing_yards DOUBLE DEFAULT 0,
                rushing_tds INTEGER DEFAULT 0,
                receptions INTEGER DEFAULT 0,
                receiving_yards DOUBLE DEFAULT 0,
                receiving_tds INTEGER DEFAULT 0,
                fumbles_lost INTEGER DEFAULT 0,
                fantasy_points DOUBLE DEFAULT 0,
                targets INTEGER DEFAULT 0,
                avg_fantasy_points DOUBLE DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create current season snap counts (2025 only)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS snap_counts (
                id VARCHAR PRIMARY KEY,
                player_id VARCHAR,
                player_name VARCHAR NOT NULL,
                team VARCHAR NOT NULL,
                season INTEGER NOT NULL,
                week INTEGER NOT NULL,
                offense_snaps INTEGER DEFAULT 0,
                offense_pct DOUBLE DEFAULT 0.0,
                position VARCHAR,
                game_id VARCHAR,
                opponent_team VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create current season DraftKings pricing (2025 only)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS draftkings_pricing (
                id VARCHAR PRIMARY KEY,
                player_name VARCHAR NOT NULL,
                team VARCHAR NOT NULL,
                position VARCHAR NOT NULL,
                salary INTEGER,
                dk_player_id VARCHAR,
                season INTEGER NOT NULL,
                week INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create materialized view for quick player lookups
        self.conn.execute("""
            CREATE OR REPLACE VIEW player_summary AS
            SELECT 
                player_name,
                position,
                team,
                season,
                CASE 
                    WHEN season IN (2023, 2024) THEN 'season_total'
                    ELSE 'weekly'
                END as data_type,
                CASE 
                    WHEN season IN (2023, 2024) THEN fantasy_points
                    ELSE SUM(fantasy_points) OVER (PARTITION BY player_name, season)
                END as total_fantasy_points,
                CASE 
                    WHEN season IN (2023, 2024) THEN games_played
                    ELSE COUNT(*) OVER (PARTITION BY player_name, season)
                END as games_played
            FROM (
                SELECT player_name, position, team, season, fantasy_points, 
                       NULL as games_played, week
                FROM weekly_stats
                UNION ALL
                SELECT player_name, position, team, season, fantasy_points, 
                       games_played, NULL as week
                FROM season_totals
            ) combined
        """)
        
        self._create_optimized_indexes()
        logging.info("Optimized database schema created successfully")
    
    def _create_optimized_indexes(self):
        """Create comprehensive indexes for optimal query performance"""
        indexes = [
            # Weekly stats indexes
            "CREATE INDEX IF NOT EXISTS idx_weekly_player_season_week ON weekly_stats(player_name, season, week)",
            "CREATE INDEX IF NOT EXISTS idx_weekly_team_season ON weekly_stats(team, season)",
            "CREATE INDEX IF NOT EXISTS idx_weekly_position_season ON weekly_stats(position, season)",
            "CREATE INDEX IF NOT EXISTS idx_weekly_fantasy_points ON weekly_stats(fantasy_points DESC)",
            "CREATE INDEX IF NOT EXISTS idx_weekly_season_week ON weekly_stats(season, week)",
            
            # Season totals indexes
            "CREATE INDEX IF NOT EXISTS idx_season_player_season ON season_totals(player_name, season)",
            "CREATE INDEX IF NOT EXISTS idx_season_team_season ON season_totals(team, season)",
            "CREATE INDEX IF NOT EXISTS idx_season_position ON season_totals(position)",
            "CREATE INDEX IF NOT EXISTS idx_season_fantasy_points ON season_totals(fantasy_points DESC)",
            "CREATE INDEX IF NOT EXISTS idx_season_avg_points ON season_totals(avg_fantasy_points DESC)",
            
            # Snap counts indexes (current season only)
            "CREATE INDEX IF NOT EXISTS idx_snap_player_week ON snap_counts(player_name, season, week)",
            "CREATE INDEX IF NOT EXISTS idx_snap_team_week ON snap_counts(team, season, week)",
            "CREATE INDEX IF NOT EXISTS idx_snap_offense_pct ON snap_counts(offense_pct DESC)",
            
            # DraftKings pricing indexes (current season only)
            "CREATE INDEX IF NOT EXISTS idx_dk_player_week ON draftkings_pricing(player_name, season, week)",
            "CREATE INDEX IF NOT EXISTS idx_dk_salary ON draftkings_pricing(salary DESC)",
            "CREATE INDEX IF NOT EXISTS idx_dk_position_week ON draftkings_pricing(position, season, week)",
        ]
        
        for index_sql in indexes:
            try:
                self.conn.execute(index_sql)
            except Exception as e:
                logging.warning(f"Index creation failed: {e}")
    
    def load_season_totals(self, seasons: List[int]) -> Dict[str, int]:
        """Load season-long totals for historical seasons (2023, 2024)"""
        total_loaded = 0
        
        for season in seasons:
            if season >= 2025:
                logging.info(f"Skipping season {season} - using weekly data for current seasons")
                continue
                
            logging.info(f"Loading season totals for {season}")
            
            try:
                # Load player stats data
                weekly_data = nfl.load_player_stats(seasons=[season])
                
                if weekly_data is not None and len(weekly_data) > 0:
                    df = weekly_data.to_pandas()
                    
                    # Filter for regular season and skill positions
                    df = df[
                        (df['season_type'] == 'REG') & 
                        (df['position'].isin(['QB', 'RB', 'WR', 'TE']))
                    ].copy()
                    
                    if len(df) > 0:
                        # Aggregate to season totals
                        season_totals = df.groupby(['player_name', 'position', 'team']).agg({
                            'player_id': 'first',
                            'passing_yards': 'sum',
                            'passing_tds': 'sum',
                            'passing_interceptions': 'sum',
                            'rushing_yards': 'sum',
                            'rushing_tds': 'sum',
                            'receptions': 'sum',
                            'receiving_yards': 'sum',
                            'receiving_tds': 'sum',
                            'rushing_fumbles_lost': 'sum',
                            'receiving_fumbles_lost': 'sum',
                            'targets': 'sum',
                            'week': 'count'  # games played
                        }).reset_index()
                        
                        # Rename columns and calculate fumbles
                        season_totals.rename(columns={
                            'week': 'games_played',
                            'passing_interceptions': 'interceptions'
                        }, inplace=True)
                        season_totals['season'] = season
                        
                        # Calculate total fumbles lost
                        season_totals['fumbles_lost'] = (
                            season_totals['rushing_fumbles_lost'].fillna(0) + 
                            season_totals['receiving_fumbles_lost'].fillna(0)
                        )
                        
                        # Use existing fantasy points from nflreadpy
                        season_totals['fantasy_points'] = df.groupby(['player_name', 'position', 'team'])['fantasy_points'].sum().values
                        season_totals['avg_fantasy_points'] = (
                            season_totals['fantasy_points'] / season_totals['games_played']
                        ).round(2)
                        
                        # Create IDs
                        season_totals['id'] = (
                            season_totals['season'].astype(str) + '_' + 
                            season_totals['team'] + '_' + 
                            season_totals['player_name'].str.replace(' ', '_').str.replace('[^a-zA-Z0-9_]', '', regex=True)
                        )
                        
                        # Delete existing data for this season
                        self.conn.execute("DELETE FROM season_totals WHERE season = ?", [season])
                        
                        # Register and insert
                        self.conn.register('season_df', season_totals)
                        
                        insert_sql = """
                        INSERT INTO season_totals 
                        SELECT 
                            id,
                            COALESCE(player_id, '') as player_id,
                            player_name,
                            position,
                            team,
                            season,
                            games_played,
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
                            avg_fantasy_points,
                            CURRENT_TIMESTAMP as created_at,
                            CURRENT_TIMESTAMP as updated_at
                        FROM season_df
                        """
                        
                        self.conn.execute(insert_sql)
                        
                        season_count = len(season_totals)
                        total_loaded += season_count
                        logging.info(f"Loaded {season_count} season total records for {season}")
                        
            except Exception as e:
                logging.error(f"Error loading season totals for {season}: {e}")
                continue
        
        return {"total_loaded": total_loaded}
    
    def load_current_season_weekly(self, season: int = 2025) -> Dict[str, int]:
        """Load weekly data for current season (2025)"""
        logging.info(f"Loading weekly data for current season {season}")
        
        try:
            weekly_data = nfl.load_player_stats(seasons=[season])
            
            if weekly_data is not None and len(weekly_data) > 0:
                df = weekly_data.to_pandas()
                
                # Filter for regular season and skill positions
                df = df[
                    (df['season_type'] == 'REG') & 
                    (df['position'].isin(['QB', 'RB', 'WR', 'TE']))
                ].copy()
                
                if len(df) > 0:
                    # Use existing fantasy points from nflreadpy
                    # df['fantasy_points'] is already available
                    
                    # Calculate total fumbles lost
                    df['fumbles_lost'] = (
                        df['rushing_fumbles_lost'].fillna(0) + 
                        df['receiving_fumbles_lost'].fillna(0)
                    )
                    
                    # Rename columns to match our schema
                    df['interceptions'] = df['passing_interceptions'].fillna(0)
                    
                    # Create IDs
                    df['id'] = (
                        df['season'].astype(str) + '_' + 
                        df['week'].astype(str) + '_' + 
                        df['team'] + '_' + 
                        df['player_name'].str.replace(' ', '_').str.replace('[^a-zA-Z0-9_]', '', regex=True)
                    )
                    
                    # Delete existing data for this season
                    self.conn.execute("DELETE FROM weekly_stats WHERE season = ?", [season])
                    
                    # Register and insert
                    self.conn.register('weekly_df', df)
                    
                    insert_sql = """
                    INSERT INTO weekly_stats 
                    SELECT 
                        id,
                        COALESCE(player_id, '') as player_id,
                        player_name,
                        position,
                        team,
                        season,
                        week,
                        COALESCE(opponent_team, '') as opponent,
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
                        NULL as snap_percentage,
                        NULL as snap_count,
                        CURRENT_TIMESTAMP as created_at,
                        CURRENT_TIMESTAMP as updated_at
                    FROM weekly_df
                    """
                    
                    self.conn.execute(insert_sql)
                    
                    count = len(df)
                    logging.info(f"Loaded {count} weekly records for season {season}")
                    return {"total_loaded": count}
                    
        except Exception as e:
            logging.error(f"Error loading weekly data for season {season}: {e}")
            return {"total_loaded": 0}
    
    def _calculate_fantasy_points_vectorized(self, df: pd.DataFrame) -> pd.Series:
        """Vectorized fantasy points calculation"""
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
    
    def refresh_data_incremental(self, current_season: int = 2025) -> Dict[str, any]:
        """Perform incremental data refresh for optimal performance"""
        start_time = time.time()
        results = {
            'season_totals_loaded': 0,
            'weekly_stats_loaded': 0,
            'refresh_time': 0,
            'success': True,
            'errors': []
        }
        
        try:
            # Load historical season totals (2023, 2024) - only if not already loaded
            historical_seasons = [2023, 2024]
            for season in historical_seasons:
                existing_count = self.conn.execute(
                    "SELECT COUNT(*) FROM season_totals WHERE season = ?", [season]
                ).fetchone()[0]
                
                if existing_count == 0:
                    logging.info(f"Loading season totals for {season} (not previously loaded)")
                    result = self.load_season_totals([season])
                    results['season_totals_loaded'] += result['total_loaded']
                else:
                    logging.info(f"Season {season} totals already loaded ({existing_count} records)")
            
            # Always refresh current season weekly data
            logging.info(f"Refreshing current season {current_season} weekly data")
            result = self.load_current_season_weekly(current_season)
            results['weekly_stats_loaded'] = result['total_loaded']
            
            results['refresh_time'] = time.time() - start_time
            logging.info(f"Data refresh completed in {results['refresh_time']:.2f} seconds")
            
        except Exception as e:
            results['success'] = False
            results['errors'].append(str(e))
            logging.error(f"Error during data refresh: {e}")
        
        return results
    
    def get_warehouse_stats(self) -> Dict[str, any]:
        """Get comprehensive warehouse statistics"""
        stats = {}
        
        try:
            # Table sizes
            tables = ['weekly_stats', 'season_totals', 'snap_counts', 'draftkings_pricing']
            for table in tables:
                count = self.conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                stats[f"{table}_count"] = count
            
            # Season distribution
            weekly_seasons = self.conn.execute(
                "SELECT season, COUNT(*) FROM weekly_stats GROUP BY season ORDER BY season"
            ).fetchall()
            stats['weekly_seasons'] = {season: count for season, count in weekly_seasons}
            
            total_seasons = self.conn.execute(
                "SELECT season, COUNT(*) FROM season_totals GROUP BY season ORDER BY season"
            ).fetchall()
            stats['season_totals_seasons'] = {season: count for season, count in total_seasons}
            
            # Position distribution
            positions = self.conn.execute("""
                SELECT position, COUNT(*) FROM (
                    SELECT position FROM weekly_stats
                    UNION ALL
                    SELECT position FROM season_totals
                ) combined
                GROUP BY position
                ORDER BY COUNT(*) DESC
            """).fetchall()
            stats['position_distribution'] = {pos: count for pos, count in positions}
            
            # Data freshness
            latest_update = self.conn.execute(
                "SELECT MAX(updated_at) FROM weekly_stats"
            ).fetchone()[0]
            stats['latest_update'] = latest_update
            
        except Exception as e:
            stats['error'] = str(e)
        
        return stats
    
    def optimize_queries_for_frontend(self):
        """Create optimized views and functions for frontend responsiveness"""
        
        # Create view for top performers across all seasons
        self.conn.execute("""
            CREATE OR REPLACE VIEW top_performers AS
            SELECT 
                player_name,
                position,
                team,
                season,
                fantasy_points,
                CASE 
                    WHEN season IN (2023, 2024) THEN games_played
                    ELSE 1
                END as games,
                CASE 
                    WHEN season IN (2023, 2024) THEN avg_fantasy_points
                    ELSE fantasy_points
                END as points_per_game,
                'season_total' as data_type
            FROM season_totals
            UNION ALL
            SELECT 
                player_name,
                position,
                team,
                season,
                fantasy_points,
                1 as games,
                fantasy_points as points_per_game,
                'weekly' as data_type
            FROM weekly_stats
        """)
        
        # Create view for position rankings
        self.conn.execute("""
            CREATE OR REPLACE VIEW position_rankings AS
            SELECT 
                player_name,
                position,
                team,
                season,
                fantasy_points,
                points_per_game,
                ROW_NUMBER() OVER (PARTITION BY position, season ORDER BY fantasy_points DESC) as rank_total,
                ROW_NUMBER() OVER (PARTITION BY position, season ORDER BY points_per_game DESC) as rank_avg
            FROM top_performers
        """)
        
        logging.info("Frontend optimization views created successfully")
    
    def cleanup_redundant_data(self):
        """Remove redundant and outdated data"""
        cleanup_stats = {
            'duplicates_removed': 0,
            'old_data_removed': 0
        }
        
        try:
            # Remove duplicates from weekly_stats
            duplicates = self.conn.execute("""
                DELETE FROM weekly_stats 
                WHERE id NOT IN (
                    SELECT MIN(id) 
                    FROM weekly_stats 
                    GROUP BY player_name, season, week, team
                )
            """).fetchone()
            
            if duplicates:
                cleanup_stats['duplicates_removed'] = duplicates[0]
            
            # Remove any test or invalid data
            invalid_data = self.conn.execute("""
                DELETE FROM weekly_stats 
                WHERE player_name IS NULL 
                OR player_name = '' 
                OR fantasy_points < 0
            """).fetchone()
            
            if invalid_data:
                cleanup_stats['old_data_removed'] = invalid_data[0]
            
            logging.info(f"Cleanup completed: {cleanup_stats}")
            
        except Exception as e:
            logging.error(f"Error during cleanup: {e}")
        
        return cleanup_stats
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()


def create_warehouse_optimizer(db_path: str) -> DataWarehouseOptimizer:
    """Factory function to create warehouse optimizer"""
    return DataWarehouseOptimizer(db_path)
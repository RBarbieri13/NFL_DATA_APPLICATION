"""
Database utilities and connection management
"""
import duckdb
import logging
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
from pathlib import Path
from app.config.settings import DATABASE_CONFIG

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Manages DuckDB connections and operations"""
    
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DATABASE_CONFIG["path"]
        self._connection = None
    
    @property
    def connection(self) -> duckdb.DuckDBPyConnection:
        """Get or create database connection"""
        if self._connection is None:
            self._connection = duckdb.connect(str(self.db_path))
            self._initialize_database()
        return self._connection
    
    def _initialize_database(self):
        """Initialize database schema and indexes"""
        try:
            # Create tables
            self._create_tables()
            self._create_indexes()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise
    
    def _create_tables(self):
        """Create all required tables"""
        
        # Players table
        self.connection.execute("""
            CREATE TABLE IF NOT EXISTS players (
                player_id VARCHAR PRIMARY KEY,
                player_name VARCHAR NOT NULL,
                position VARCHAR NOT NULL,
                team VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Weekly stats table
        self.connection.execute("""
            CREATE TABLE IF NOT EXISTS weekly_stats (
                id VARCHAR PRIMARY KEY,
                player_id VARCHAR NOT NULL,
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
                targets INTEGER DEFAULT 0,
                fumbles_lost INTEGER DEFAULT 0,
                fantasy_points DOUBLE DEFAULT 0,
                snap_percentage DOUBLE,
                snap_count INTEGER,
                dk_salary INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(player_id, season, week)
            )
        """)
        
        # Season stats table (aggregated data)
        self.connection.execute("""
            CREATE TABLE IF NOT EXISTS season_stats (
                id VARCHAR PRIMARY KEY,
                player_id VARCHAR NOT NULL,
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
                targets INTEGER DEFAULT 0,
                fumbles_lost INTEGER DEFAULT 0,
                fantasy_points DOUBLE DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(player_id, season)
            )
        """)
        
        # Snap counts table (optional for current season only)
        self.connection.execute("""
            CREATE TABLE IF NOT EXISTS snap_counts (
                id VARCHAR PRIMARY KEY,
                player_id VARCHAR,
                player_name VARCHAR NOT NULL,
                team VARCHAR NOT NULL,
                season INTEGER NOT NULL,
                week INTEGER NOT NULL,
                offense_snaps INTEGER DEFAULT 0,
                offense_pct DOUBLE DEFAULT 0,
                defense_snaps INTEGER DEFAULT 0,
                defense_pct DOUBLE DEFAULT 0,
                st_snaps INTEGER DEFAULT 0,
                st_pct DOUBLE DEFAULT 0,
                position VARCHAR,
                game_id VARCHAR,
                opponent_team VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(player_id, season, week)
            )
        """)
        
        # DraftKings pricing table (current season only)
        self.connection.execute("""
            CREATE TABLE IF NOT EXISTS draftkings_pricing (
                id INTEGER PRIMARY KEY,
                player_name VARCHAR NOT NULL,
                team VARCHAR NOT NULL,
                position VARCHAR NOT NULL,
                season INTEGER NOT NULL,
                week INTEGER NOT NULL,
                salary INTEGER NOT NULL,
                opponent VARCHAR,
                opp_rank INTEGER,
                opp_pos_rank INTEGER,
                projected_fpts DOUBLE,
                dk_player_id VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(player_name, team, season, week)
            )
        """)
    
    def _create_indexes(self):
        """Create database indexes for performance"""
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_weekly_stats_season_week ON weekly_stats(season, week)",
            "CREATE INDEX IF NOT EXISTS idx_weekly_stats_player ON weekly_stats(player_id)",
            "CREATE INDEX IF NOT EXISTS idx_weekly_stats_position ON weekly_stats(position)",
            "CREATE INDEX IF NOT EXISTS idx_weekly_stats_team ON weekly_stats(team)",
            "CREATE INDEX IF NOT EXISTS idx_season_stats_season ON season_stats(season)",
            "CREATE INDEX IF NOT EXISTS idx_season_stats_player ON season_stats(player_id)",
            "CREATE INDEX IF NOT EXISTS idx_season_stats_position ON season_stats(position)",
            "CREATE INDEX IF NOT EXISTS idx_snap_counts_season_week ON snap_counts(season, week)",
            "CREATE INDEX IF NOT EXISTS idx_draftkings_season_week ON draftkings_pricing(season, week)",
        ]
        
        for index_sql in indexes:
            try:
                self.connection.execute(index_sql)
            except Exception as e:
                logger.warning(f"Index creation failed: {e}")
    
    @contextmanager
    def transaction(self):
        """Context manager for database transactions"""
        try:
            self.connection.execute("BEGIN TRANSACTION")
            yield self.connection
            self.connection.execute("COMMIT")
        except Exception as e:
            self.connection.execute("ROLLBACK")
            logger.error(f"Transaction rolled back: {e}")
            raise
    
    def execute_query(self, query: str, params: Optional[List] = None) -> List[Dict[str, Any]]:
        """Execute a query and return results as list of dictionaries"""
        try:
            if params:
                result = self.connection.execute(query, params).fetchall()
            else:
                result = self.connection.execute(query).fetchall()
            
            # Get column names
            columns = [desc[0] for desc in self.connection.description]
            
            # Convert to list of dictionaries
            return [dict(zip(columns, row)) for row in result]
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
    
    def execute_batch_insert(self, table: str, data: List[Dict[str, Any]], 
                           batch_size: int = 1000) -> int:
        """Execute batch insert for better performance"""
        if not data:
            return 0
        
        total_inserted = 0
        
        try:
            # Get column names from first record
            columns = list(data[0].keys())
            placeholders = ', '.join(['?' for _ in columns])
            column_names = ', '.join(columns)
            
            # Use simple INSERT for DuckDB
            insert_sql = f"INSERT INTO {table} ({column_names}) VALUES ({placeholders})"
            
            # Process in batches
            for i in range(0, len(data), batch_size):
                batch = data[i:i + batch_size]
                batch_values = [[record[col] for col in columns] for record in batch]
                
                self.connection.executemany(insert_sql, batch_values)
                total_inserted += len(batch)
                
                if i % (batch_size * 10) == 0:  # Log progress every 10 batches
                    logger.info(f"Inserted {total_inserted}/{len(data)} records into {table}")
        
            logger.info(f"Successfully inserted {total_inserted} records into {table}")
            return total_inserted
            
        except Exception as e:
            logger.error(f"Batch insert failed for {table}: {e}")
            raise
    
    def close(self):
        """Close database connection"""
        if self._connection:
            self._connection.close()
            self._connection = None

# Global database manager instance
db_manager = DatabaseManager()

def get_db() -> DatabaseManager:
    """Get database manager instance"""
    return db_manager
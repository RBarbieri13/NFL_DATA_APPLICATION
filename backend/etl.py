"""
ETL (Extract, Transform, Load) Module for NFL Data Application

This module contains all ETL jobs for loading data from various sources:
- Ball Don't Lie API (stats, injuries, rosters, games)
- nflreadpy (snap counts, depth charts)
- RapidAPI/FantasyPros (DraftKings salaries)

Jobs are designed to be run independently, not during FastAPI startup.
"""

import logging
import traceback
from typing import List, Dict
from datetime import datetime, timezone
import duckdb
import nflreadpy as nfl
from pathlib import Path

from balldontlie import BallDontLieClient, get_client

logger = logging.getLogger(__name__)

# Database path
ROOT_DIR = Path(__file__).parent
DB_PATH = ROOT_DIR / "fantasy_football.db"

# Skill positions for fantasy football
SKILL_POSITIONS = ['QB', 'RB', 'WR', 'TE']

# DraftKings PPR Scoring System
DRAFTKINGS_SCORING = {
    'passing_yards': 0.04,  # 1 point per 25 yards
    'passing_tds': 4,
    'interceptions': -1,
    'rushing_yards': 0.1,  # 1 point per 10 yards
    'rushing_tds': 6,
    'receptions': 1,  # PPR
    'receiving_yards': 0.1,
    'receiving_tds': 6,
    'fumbles_lost': -1,
}


def get_db_connection() -> duckdb.DuckDBPyConnection:
    """Get a DuckDB connection."""
    return duckdb.connect(str(DB_PATH))


def calculate_fantasy_points(stats: Dict) -> float:
    """Calculate DraftKings PPR fantasy points from stats."""
    points = 0.0

    points += (stats.get('passing_yards') or 0) * DRAFTKINGS_SCORING['passing_yards']
    points += (stats.get('passing_tds') or 0) * DRAFTKINGS_SCORING['passing_tds']
    points += (stats.get('interceptions') or 0) * DRAFTKINGS_SCORING['interceptions']
    points += (stats.get('rushing_yards') or 0) * DRAFTKINGS_SCORING['rushing_yards']
    points += (stats.get('rushing_tds') or 0) * DRAFTKINGS_SCORING['rushing_tds']
    points += (stats.get('receptions') or 0) * DRAFTKINGS_SCORING['receptions']
    points += (stats.get('receiving_yards') or 0) * DRAFTKINGS_SCORING['receiving_yards']
    points += (stats.get('receiving_tds') or 0) * DRAFTKINGS_SCORING['receiving_tds']
    points += (stats.get('fumbles_lost') or 0) * DRAFTKINGS_SCORING['fumbles_lost']

    return round(points, 2)


# ==================== Database Schema ====================

def init_new_schema(conn: duckdb.DuckDBPyConnection):
    """Initialize the new database schema with Ball Don't Lie tables."""

    # Ball Don't Lie Teams
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bdl_teams (
            bdl_team_id   INTEGER PRIMARY KEY,
            abbreviation  VARCHAR NOT NULL,
            full_name     VARCHAR,
            location      VARCHAR,
            conference    VARCHAR,
            division      VARCHAR,
            updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Ball Don't Lie Players
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bdl_players (
            bdl_player_id   INTEGER PRIMARY KEY,
            first_name      VARCHAR,
            last_name       VARCHAR,
            full_name       VARCHAR,
            position        VARCHAR,
            position_abbr   VARCHAR,
            height          VARCHAR,
            weight          VARCHAR,
            jersey_number   VARCHAR,
            college         VARCHAR,
            experience      VARCHAR,
            age             INTEGER,
            team_id         INTEGER,
            team_abbr       VARCHAR,
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Ball Don't Lie Games
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bdl_games (
            bdl_game_id       INTEGER PRIMARY KEY,
            season            INTEGER NOT NULL,
            week              INTEGER NOT NULL,
            date              TIMESTAMP,
            status            VARCHAR,
            home_team_id      INTEGER,
            home_team_abbr    VARCHAR,
            visitor_team_id   INTEGER,
            visitor_team_abbr VARCHAR,
            home_score        INTEGER,
            visitor_score     INTEGER,
            venue             VARCHAR,
            postseason        BOOLEAN DEFAULT FALSE,
            updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Ball Don't Lie Player Game Stats
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bdl_player_game_stats (
            bdl_player_id         INTEGER NOT NULL,
            bdl_game_id           INTEGER NOT NULL,
            season                INTEGER,
            week                  INTEGER,
            team_abbr             VARCHAR,
            -- Passing stats
            passing_completions   INTEGER,
            passing_attempts      INTEGER,
            passing_yards         DOUBLE,
            passing_touchdowns    INTEGER,
            passing_interceptions INTEGER,
            qbr                   DOUBLE,
            -- Rushing stats
            rushing_attempts      INTEGER,
            rushing_yards         DOUBLE,
            rushing_touchdowns    INTEGER,
            -- Receiving stats
            receptions            INTEGER,
            receiving_yards       DOUBLE,
            receiving_touchdowns  INTEGER,
            receiving_targets     INTEGER,
            -- Other
            fumbles               INTEGER,
            fumbles_lost          INTEGER,
            updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (bdl_player_id, bdl_game_id)
        )
    """)

    # Current Injuries (from Ball Don't Lie)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS current_injuries (
            bdl_player_id   INTEGER PRIMARY KEY,
            player_name     VARCHAR,
            team            VARCHAR,
            position        VARCHAR,
            status          VARCHAR,
            comment         VARCHAR,
            report_date     TIMESTAMP,
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Team Rosters (from Ball Don't Lie)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS team_rosters (
            bdl_player_id   INTEGER PRIMARY KEY,
            player_name     VARCHAR,
            first_name      VARCHAR,
            last_name       VARCHAR,
            team            VARCHAR,
            position        VARCHAR,
            jersey_number   VARCHAR,
            height          VARCHAR,
            weight          VARCHAR,
            college         VARCHAR,
            experience      VARCHAR,
            age             INTEGER,
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Depth Charts (from nflreadpy)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS depth_charts (
            id              VARCHAR PRIMARY KEY,
            season          INTEGER NOT NULL,
            week            INTEGER NOT NULL,
            team            VARCHAR NOT NULL,
            position        VARCHAR,
            depth_position  VARCHAR,
            depth_order     INTEGER,
            player_name     VARCHAR,
            first_name      VARCHAR,
            last_name       VARCHAR,
            gsis_id         VARCHAR,
            jersey_number   VARCHAR,
            formation       VARCHAR,
            game_type       VARCHAR,
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(season, week, team, depth_position, depth_order)
        )
    """)

    # Create indexes for better performance
    conn.execute("CREATE INDEX IF NOT EXISTS idx_bdl_games_season_week ON bdl_games(season, week)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_bdl_stats_season ON bdl_player_game_stats(season, week)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_bdl_stats_player ON bdl_player_game_stats(bdl_player_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_depth_charts_team_week ON depth_charts(team, season, week)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_team_rosters_team ON team_rosters(team)")

    logger.info("New database schema initialized successfully")


# ==================== Ball Don't Lie ETL Jobs ====================

def load_bdl_teams(conn: duckdb.DuckDBPyConnection, client: BallDontLieClient = None) -> int:
    """Load teams from Ball Don't Lie API."""
    client = client or get_client()

    teams = client.get_teams()
    loaded = 0

    for team in teams:
        try:
            conn.execute("""
                INSERT OR REPLACE INTO bdl_teams
                (bdl_team_id, abbreviation, full_name, location, conference, division, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, [
                team.get('id'),
                team.get('abbreviation'),
                team.get('full_name'),
                team.get('location'),
                team.get('conference'),
                team.get('division'),
                datetime.now(timezone.utc)
            ])
            loaded += 1
        except Exception as e:
            logger.error(f"Error loading team {team.get('abbreviation')}: {e}")

    logger.info(f"Loaded {loaded} teams from Ball Don't Lie")
    return loaded


def load_bdl_games(conn: duckdb.DuckDBPyConnection, seasons: List[int],
                   client: BallDontLieClient = None) -> int:
    """Load games from Ball Don't Lie API for specified seasons."""
    client = client or get_client()

    loaded = 0
    for season in seasons:
        logger.info(f"Loading games for season {season}...")

        for game in client.get_games(seasons=[season]):
            try:
                home_team = game.get('home_team', {})
                visitor_team = game.get('visitor_team', {})

                conn.execute("""
                    INSERT OR REPLACE INTO bdl_games
                    (bdl_game_id, season, week, date, status, home_team_id, home_team_abbr,
                     visitor_team_id, visitor_team_abbr, home_score, visitor_score, venue, postseason, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, [
                    game.get('id'),
                    game.get('season'),
                    game.get('week'),
                    game.get('date'),
                    game.get('status'),
                    home_team.get('id'),
                    home_team.get('abbreviation'),
                    visitor_team.get('id'),
                    visitor_team.get('abbreviation'),
                    game.get('home_team_score'),
                    game.get('visitor_team_score'),
                    game.get('venue'),
                    game.get('postseason', False),
                    datetime.now(timezone.utc)
                ])
                loaded += 1
            except Exception as e:
                logger.error(f"Error loading game {game.get('id')}: {e}")

    logger.info(f"Loaded {loaded} games from Ball Don't Lie")
    return loaded


def load_bdl_stats(conn: duckdb.DuckDBPyConnection, seasons: List[int],
                   client: BallDontLieClient = None) -> int:
    """Load player game stats from Ball Don't Lie API for specified seasons."""
    client = client or get_client()

    loaded = 0
    for season in seasons:
        logger.info(f"Loading stats for season {season}...")

        for stat in client.get_stats(seasons=[season]):
            try:
                player = stat.get('player', {})
                game = stat.get('game', {})
                team = stat.get('team', {})

                # Also upsert player data
                conn.execute("""
                    INSERT OR REPLACE INTO bdl_players
                    (bdl_player_id, first_name, last_name, full_name, position, position_abbr,
                     height, weight, jersey_number, college, experience, age, team_id, team_abbr, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, [
                    player.get('id'),
                    player.get('first_name'),
                    player.get('last_name'),
                    f"{player.get('first_name', '')} {player.get('last_name', '')}".strip(),
                    player.get('position'),
                    player.get('position_abbreviation'),
                    player.get('height'),
                    player.get('weight'),
                    player.get('jersey_number'),
                    player.get('college'),
                    player.get('experience'),
                    player.get('age'),
                    team.get('id'),
                    team.get('abbreviation'),
                    datetime.now(timezone.utc)
                ])

                # Insert stats
                conn.execute("""
                    INSERT OR REPLACE INTO bdl_player_game_stats
                    (bdl_player_id, bdl_game_id, season, week, team_abbr,
                     passing_completions, passing_attempts, passing_yards, passing_touchdowns, passing_interceptions, qbr,
                     rushing_attempts, rushing_yards, rushing_touchdowns,
                     receptions, receiving_yards, receiving_touchdowns, receiving_targets,
                     fumbles, fumbles_lost, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, [
                    player.get('id'),
                    game.get('id'),
                    game.get('season'),
                    game.get('week'),
                    team.get('abbreviation'),
                    stat.get('passing_completions'),
                    stat.get('passing_attempts'),
                    stat.get('passing_yards'),
                    stat.get('passing_touchdowns'),
                    stat.get('passing_interceptions'),
                    stat.get('qbr'),
                    stat.get('rushing_attempts'),
                    stat.get('rushing_yards'),
                    stat.get('rushing_touchdowns'),
                    stat.get('receptions'),
                    stat.get('receiving_yards'),
                    stat.get('receiving_touchdowns'),
                    stat.get('receiving_targets'),
                    stat.get('fumbles'),
                    stat.get('fumbles_lost'),
                    datetime.now(timezone.utc)
                ])
                loaded += 1

            except Exception as e:
                logger.error(f"Error loading stat: {e}")

    logger.info(f"Loaded {loaded} player game stats from Ball Don't Lie")
    return loaded


def load_bdl_injuries(conn: duckdb.DuckDBPyConnection, client: BallDontLieClient = None) -> int:
    """Load current injuries from Ball Don't Lie API."""
    client = client or get_client()

    # Clear existing injuries and reload
    conn.execute("DELETE FROM current_injuries")

    loaded = 0
    for injury in client.get_player_injuries():
        try:
            player = injury.get('player', {})
            team = player.get('team', {})

            conn.execute("""
                INSERT OR REPLACE INTO current_injuries
                (bdl_player_id, player_name, team, position, status, comment, report_date, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                player.get('id'),
                f"{player.get('first_name', '')} {player.get('last_name', '')}".strip(),
                team.get('abbreviation'),
                player.get('position_abbreviation'),
                injury.get('status'),
                injury.get('comment'),
                injury.get('date'),
                datetime.now(timezone.utc)
            ])
            loaded += 1
        except Exception as e:
            logger.error(f"Error loading injury: {e}")

    logger.info(f"Loaded {loaded} injuries from Ball Don't Lie")
    return loaded


def load_bdl_rosters(conn: duckdb.DuckDBPyConnection, client: BallDontLieClient = None) -> int:
    """Load team rosters from Ball Don't Lie API (active players)."""
    client = client or get_client()

    # Clear existing rosters and reload
    conn.execute("DELETE FROM team_rosters")

    loaded = 0
    for player in client.get_active_players():
        try:
            team = player.get('team', {})

            conn.execute("""
                INSERT OR REPLACE INTO team_rosters
                (bdl_player_id, player_name, first_name, last_name, team, position,
                 jersey_number, height, weight, college, experience, age, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                player.get('id'),
                f"{player.get('first_name', '')} {player.get('last_name', '')}".strip(),
                player.get('first_name'),
                player.get('last_name'),
                team.get('abbreviation') if team else None,
                player.get('position_abbreviation'),
                player.get('jersey_number'),
                player.get('height'),
                player.get('weight'),
                player.get('college'),
                player.get('experience'),
                player.get('age'),
                datetime.now(timezone.utc)
            ])
            loaded += 1
        except Exception as e:
            logger.error(f"Error loading roster player: {e}")

    logger.info(f"Loaded {loaded} roster players from Ball Don't Lie")
    return loaded


# ==================== nflreadpy ETL Jobs ====================

def load_depth_charts(conn: duckdb.DuckDBPyConnection, seasons: List[int]) -> int:
    """Load depth charts from nflreadpy for specified seasons."""
    loaded = 0

    for season in seasons:
        logger.info(f"Loading depth charts for season {season}...")

        try:
            dc_data = nfl.load_depth_charts(seasons=[season])

            if dc_data is None or len(dc_data) == 0:
                logger.warning(f"No depth chart data for season {season}")
                continue

            dc_pd = dc_data.to_pandas()

            # Filter for regular season and skill positions
            if 'game_type' in dc_pd.columns:
                dc_pd = dc_pd[dc_pd['game_type'] == 'REG']

            # Delete existing data for this season
            conn.execute("DELETE FROM depth_charts WHERE season = ?", [season])

            for _, row in dc_pd.iterrows():
                try:
                    dc_id = f"{row.get('season', '')}_{row.get('week', '')}_{row.get('club_code', '')}_{row.get('depth_position', '')}_{row.get('depth_team', '')}"

                    conn.execute("""
                        INSERT OR REPLACE INTO depth_charts
                        (id, season, week, team, position, depth_position, depth_order,
                         player_name, first_name, last_name, gsis_id, jersey_number, formation, game_type, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, [
                        dc_id,
                        row.get('season'),
                        row.get('week'),
                        row.get('club_code'),
                        row.get('position'),
                        row.get('depth_position'),
                        row.get('depth_team'),  # 1=starter, 2=backup, etc.
                        row.get('full_name'),
                        row.get('first_name'),
                        row.get('last_name'),
                        row.get('gsis_id'),
                        row.get('jersey_number'),
                        row.get('formation'),
                        row.get('game_type'),
                        datetime.now(timezone.utc)
                    ])
                    loaded += 1
                except Exception as e:
                    logger.debug(f"Error inserting depth chart row: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error loading depth charts for season {season}: {e}")
            continue

    logger.info(f"Loaded {loaded} depth chart records from nflreadpy")
    return loaded


def load_snap_counts(conn: duckdb.DuckDBPyConnection, seasons: List[int]) -> int:
    """Load snap counts from nflreadpy for specified seasons."""
    loaded = 0

    for season in seasons:
        logger.info(f"Loading snap counts for season {season}...")

        try:
            snap_data = nfl.load_snap_counts(seasons=[season])

            if snap_data is None or len(snap_data) == 0:
                logger.warning(f"No snap count data for season {season}")
                continue

            snap_pd = snap_data.to_pandas()

            # Filter for regular season and skill positions
            if 'game_type' in snap_pd.columns:
                snap_pd = snap_pd[snap_pd['game_type'] == 'REG']

            snap_pd = snap_pd[snap_pd['position'].isin(SKILL_POSITIONS)]

            if 'offense_snaps' in snap_pd.columns:
                snap_pd = snap_pd[snap_pd['offense_snaps'] > 0]

            # Delete existing data for this season
            conn.execute("DELETE FROM snap_counts WHERE season = ?", [season])

            for _, row in snap_pd.iterrows():
                try:
                    snap_id = f"{row.get('season', '')}_{row.get('week', '')}_{row.get('team', '')}_{str(row.get('player', '')).replace(' ', '_')}"

                    conn.execute("""
                        INSERT OR REPLACE INTO snap_counts
                        (id, player_id, player_name, team, season, week,
                         offense_snaps, offense_pct, defense_snaps, defense_pct,
                         st_snaps, st_pct, position, game_id, opponent_team, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, [
                        snap_id,
                        row.get('pfr_player_id', ''),
                        row.get('player'),
                        row.get('team'),
                        row.get('season'),
                        row.get('week'),
                        row.get('offense_snaps', 0),
                        row.get('offense_pct', 0.0),
                        row.get('defense_snaps', 0),
                        row.get('defense_pct', 0.0),
                        row.get('st_snaps', 0),
                        row.get('st_pct', 0.0),
                        row.get('position'),
                        row.get('pfr_game_id', row.get('game_id', '')),
                        row.get('opponent', ''),
                        datetime.now(timezone.utc)
                    ])
                    loaded += 1
                except Exception as e:
                    logger.debug(f"Error inserting snap count row: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error loading snap counts for season {season}: {e}")
            continue

    logger.info(f"Loaded {loaded} snap count records from nflreadpy")
    return loaded


# ==================== Transform: Build weekly_stats ====================

def build_weekly_stats_from_bdl(conn: duckdb.DuckDBPyConnection, seasons: List[int] = None) -> int:
    """
    Build/update weekly_stats table from Ball Don't Lie data.
    This transforms the normalized bdl_player_game_stats into the denormalized weekly_stats format.
    """

    where_clause = ""
    params = []
    if seasons:
        placeholders = ",".join(["?" for _ in seasons])
        where_clause = f"WHERE s.season IN ({placeholders})"
        params = seasons

    # Delete existing data for these seasons if specified
    if seasons:
        for season in seasons:
            conn.execute("DELETE FROM weekly_stats WHERE season = ?", [season])

    # Build weekly_stats from Ball Don't Lie data
    query = f"""
        INSERT INTO weekly_stats
        (id, player_id, player_name, position, team, season, week, opponent,
         passing_yards, passing_tds, interceptions, rushing_yards, rushing_tds,
         receptions, receiving_yards, receiving_tds, targets, fumbles_lost,
         fantasy_points, snap_percentage, dk_salary, created_at)
        SELECT
            CONCAT(CAST(s.bdl_player_id AS VARCHAR), '_', CAST(s.season AS VARCHAR), '_', CAST(s.week AS VARCHAR)) as id,
            CAST(s.bdl_player_id AS VARCHAR) as player_id,
            p.full_name as player_name,
            p.position_abbr as position,
            s.team_abbr as team,
            s.season,
            s.week,
            CASE
                WHEN g.home_team_abbr = s.team_abbr THEN g.visitor_team_abbr
                ELSE g.home_team_abbr
            END as opponent,
            COALESCE(s.passing_yards, 0) as passing_yards,
            COALESCE(s.passing_touchdowns, 0) as passing_tds,
            COALESCE(s.passing_interceptions, 0) as interceptions,
            COALESCE(s.rushing_yards, 0) as rushing_yards,
            COALESCE(s.rushing_touchdowns, 0) as rushing_tds,
            COALESCE(s.receptions, 0) as receptions,
            COALESCE(s.receiving_yards, 0) as receiving_yards,
            COALESCE(s.receiving_touchdowns, 0) as receiving_tds,
            COALESCE(s.receiving_targets, 0) as targets,
            COALESCE(s.fumbles_lost, 0) as fumbles_lost,
            -- Calculate fantasy points
            ROUND(
                COALESCE(s.passing_yards, 0) * 0.04 +
                COALESCE(s.passing_touchdowns, 0) * 4 +
                COALESCE(s.passing_interceptions, 0) * -1 +
                COALESCE(s.rushing_yards, 0) * 0.1 +
                COALESCE(s.rushing_touchdowns, 0) * 6 +
                COALESCE(s.receptions, 0) * 1 +
                COALESCE(s.receiving_yards, 0) * 0.1 +
                COALESCE(s.receiving_touchdowns, 0) * 6 +
                COALESCE(s.fumbles_lost, 0) * -1
            , 2) as fantasy_points,
            NULL as snap_percentage,
            NULL as dk_salary,
            CURRENT_TIMESTAMP as created_at
        FROM bdl_player_game_stats s
        JOIN bdl_players p ON p.bdl_player_id = s.bdl_player_id
        LEFT JOIN bdl_games g ON g.bdl_game_id = s.bdl_game_id
        {where_clause}
        AND p.position_abbr IN ('QB', 'RB', 'WR', 'TE')
    """

    conn.execute(query, params)

    # Get count of inserted rows
    count = conn.execute(f"""
        SELECT COUNT(*) FROM weekly_stats
        {"WHERE season IN (" + ",".join(["?" for _ in seasons]) + ")" if seasons else ""}
    """, seasons or []).fetchone()[0]

    logger.info(f"Built {count} weekly_stats records from Ball Don't Lie data")
    return count


def update_weekly_stats_with_snaps(conn: duckdb.DuckDBPyConnection, seasons: List[int] = None) -> int:
    """Update weekly_stats with snap count data (nominal numbers, not percentages)."""

    where_clause = ""
    if seasons:
        placeholders = ",".join(["?" for _ in seasons])
        where_clause = f"AND ws.season IN ({placeholders})"

    # Update with offense_snaps (nominal number)
    query = f"""
        UPDATE weekly_stats ws
        SET snap_percentage = (
            SELECT sc.offense_snaps
            FROM snap_counts sc
            WHERE UPPER(TRIM(sc.player_name)) = UPPER(TRIM(ws.player_name))
              AND sc.team = ws.team
              AND sc.season = ws.season
              AND sc.week = ws.week
            LIMIT 1
        )
        WHERE EXISTS (
            SELECT 1 FROM snap_counts sc
            WHERE UPPER(TRIM(sc.player_name)) = UPPER(TRIM(ws.player_name))
              AND sc.team = ws.team
              AND sc.season = ws.season
              AND sc.week = ws.week
        )
        {where_clause}
    """

    conn.execute(query, seasons or [])

    # Get count of updated rows
    count = conn.execute(f"""
        SELECT COUNT(*) FROM weekly_stats
        WHERE snap_percentage IS NOT NULL AND snap_percentage > 0
        {"AND season IN (" + ",".join(["?" for _ in seasons]) + ")" if seasons else ""}
    """, seasons or []).fetchone()[0]

    logger.info(f"Updated {count} weekly_stats records with snap counts")
    return count


# ==================== High-Level ETL Jobs ====================

def run_backfill_history(start_season: int = 2020, end_season: int = 2024) -> Dict:
    """
    One-time historical backfill job.
    Loads all historical data from Ball Don't Lie and nflreadpy.
    """
    logger.info(f"Starting historical backfill for seasons {start_season}-{end_season}...")

    conn = get_db_connection()
    results = {
        'teams': 0,
        'games': 0,
        'stats': 0,
        'depth_charts': 0,
        'snap_counts': 0,
        'weekly_stats': 0
    }

    try:
        # Initialize new schema
        init_new_schema(conn)

        seasons = list(range(start_season, end_season + 1))
        client = get_client()

        # Load from Ball Don't Lie
        results['teams'] = load_bdl_teams(conn, client)
        results['games'] = load_bdl_games(conn, seasons, client)
        results['stats'] = load_bdl_stats(conn, seasons, client)

        # Load from nflreadpy
        results['depth_charts'] = load_depth_charts(conn, seasons)
        results['snap_counts'] = load_snap_counts(conn, seasons)

        # Build weekly_stats
        results['weekly_stats'] = build_weekly_stats_from_bdl(conn, seasons)
        results['weekly_stats_snaps'] = update_weekly_stats_with_snaps(conn, seasons)

        logger.info(f"Historical backfill complete: {results}")
        return {'success': True, 'results': results}

    except Exception as e:
        logger.error(f"Historical backfill failed: {e}")
        logger.error(traceback.format_exc())
        return {'success': False, 'error': str(e), 'results': results}
    finally:
        conn.close()


def run_update_current_week(season: int, week: int) -> Dict:
    """
    Weekly update job.
    Only fetches and updates data for the specified week.
    """
    logger.info(f"Updating data for season {season}, week {week}...")

    conn = get_db_connection()
    results = {}

    try:
        init_new_schema(conn)
        client = get_client()

        # Load current week from Ball Don't Lie
        # Note: We load the full season stats and filter, as the API may not support week filtering
        results['stats'] = load_bdl_stats(conn, [season], client)

        # Load current week from nflreadpy
        results['depth_charts'] = load_depth_charts(conn, [season])
        results['snap_counts'] = load_snap_counts(conn, [season])

        # Rebuild weekly_stats for this season
        results['weekly_stats'] = build_weekly_stats_from_bdl(conn, [season])
        results['weekly_stats_snaps'] = update_weekly_stats_with_snaps(conn, [season])

        logger.info(f"Weekly update complete: {results}")
        return {'success': True, 'results': results}

    except Exception as e:
        logger.error(f"Weekly update failed: {e}")
        logger.error(traceback.format_exc())
        return {'success': False, 'error': str(e)}
    finally:
        conn.close()


def run_refresh_injuries() -> Dict:
    """
    Refresh injuries job (runs every 15 minutes).
    """
    logger.info("Refreshing injuries...")

    conn = get_db_connection()

    try:
        init_new_schema(conn)
        count = load_bdl_injuries(conn)
        return {'success': True, 'injuries_loaded': count}

    except Exception as e:
        logger.error(f"Injury refresh failed: {e}")
        return {'success': False, 'error': str(e)}
    finally:
        conn.close()


def run_refresh_rosters() -> Dict:
    """
    Refresh team rosters job (runs weekly).
    """
    logger.info("Refreshing rosters...")

    conn = get_db_connection()

    try:
        init_new_schema(conn)
        count = load_bdl_rosters(conn)
        return {'success': True, 'roster_players_loaded': count}

    except Exception as e:
        logger.error(f"Roster refresh failed: {e}")
        return {'success': False, 'error': str(e)}
    finally:
        conn.close()


def run_refresh_depth_charts(season: int) -> Dict:
    """
    Refresh depth charts job (runs weekly).
    """
    logger.info(f"Refreshing depth charts for season {season}...")

    conn = get_db_connection()

    try:
        init_new_schema(conn)
        count = load_depth_charts(conn, [season])
        return {'success': True, 'depth_charts_loaded': count}

    except Exception as e:
        logger.error(f"Depth chart refresh failed: {e}")
        return {'success': False, 'error': str(e)}
    finally:
        conn.close()


if __name__ == "__main__":
    # CLI for running ETL jobs
    import sys

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    if len(sys.argv) < 2:
        print("Usage: python etl.py <command> [args]")
        print("Commands:")
        print("  backfill <start_season> <end_season>  - Run historical backfill")
        print("  update <season> <week>                - Update current week")
        print("  injuries                              - Refresh injuries")
        print("  rosters                               - Refresh rosters")
        print("  depth_charts <season>                 - Refresh depth charts")
        print("  init                                  - Initialize database schema")
        sys.exit(1)

    command = sys.argv[1]

    if command == "backfill":
        start = int(sys.argv[2]) if len(sys.argv) > 2 else 2020
        end = int(sys.argv[3]) if len(sys.argv) > 3 else 2024
        result = run_backfill_history(start, end)
        print(f"Backfill result: {result}")

    elif command == "update":
        season = int(sys.argv[2]) if len(sys.argv) > 2 else 2025
        week = int(sys.argv[3]) if len(sys.argv) > 3 else 1
        result = run_update_current_week(season, week)
        print(f"Update result: {result}")

    elif command == "injuries":
        result = run_refresh_injuries()
        print(f"Injuries result: {result}")

    elif command == "rosters":
        result = run_refresh_rosters()
        print(f"Rosters result: {result}")

    elif command == "depth_charts":
        season = int(sys.argv[2]) if len(sys.argv) > 2 else 2025
        result = run_refresh_depth_charts(season)
        print(f"Depth charts result: {result}")

    elif command == "init":
        conn = get_db_connection()
        init_new_schema(conn)
        conn.close()
        print("Database schema initialized")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

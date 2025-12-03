"""
Ball Don't Lie NFL API Client

This module provides a centralized client for interacting with the Ball Don't Lie NFL API.
It handles authentication, rate limiting, pagination, and error handling.

API Documentation: https://nfl.balldontlie.io/#nfl-api
Rate Limits (ALL-STAR tier): 60 requests/minute
"""

import os
import time
import logging
import requests
from typing import List, Dict, Generator
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# API Configuration
BDL_API_BASE_URL = "https://api.balldontlie.io/nfl/v1"
BDL_API_KEY = os.getenv("BALLDONTLIE_API_KEY", "")

# Rate limiting configuration (ALL-STAR tier: 60 req/min)
RATE_LIMIT_REQUESTS = 60
RATE_LIMIT_WINDOW = 60  # seconds
REQUEST_DELAY = 1.1  # seconds between requests to stay under limit


class RateLimiter:
    """Simple rate limiter to stay within API limits."""

    def __init__(self, max_requests: int = RATE_LIMIT_REQUESTS, window: int = RATE_LIMIT_WINDOW):
        self.max_requests = max_requests
        self.window = window
        self.requests = []

    def wait_if_needed(self):
        """Wait if we're approaching the rate limit."""
        now = time.time()
        # Remove requests outside the window
        self.requests = [r for r in self.requests if now - r < self.window]

        if len(self.requests) >= self.max_requests:
            # Wait until the oldest request falls outside the window
            sleep_time = self.window - (now - self.requests[0]) + 0.1
            if sleep_time > 0:
                logger.info(f"Rate limit approaching, sleeping for {sleep_time:.1f}s")
                time.sleep(sleep_time)

        self.requests.append(time.time())


class BallDontLieClient:
    """Client for Ball Don't Lie NFL API."""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or BDL_API_KEY
        if not self.api_key:
            raise ValueError("Ball Don't Lie API key not configured. Set BALLDONTLIE_API_KEY environment variable.")

        self.base_url = BDL_API_BASE_URL
        self.rate_limiter = RateLimiter()
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": self.api_key,
            "Content-Type": "application/json"
        })

    def _make_request(self, endpoint: str, params: Dict = None, retries: int = 3) -> Dict:
        """Make a request to the API with rate limiting and retry logic."""
        url = f"{self.base_url}/{endpoint}"

        for attempt in range(retries):
            try:
                self.rate_limiter.wait_if_needed()

                response = self.session.get(url, params=params, timeout=30)

                if response.status_code == 429:
                    # Rate limited - wait and retry
                    retry_after = int(response.headers.get("Retry-After", 60))
                    logger.warning(f"Rate limited. Waiting {retry_after}s before retry.")
                    time.sleep(retry_after)
                    continue

                response.raise_for_status()
                return response.json()

            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed (attempt {attempt + 1}/{retries}): {e}")
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise

        return {}

    def _paginate(self, endpoint: str, params: Dict = None, per_page: int = 100) -> Generator[Dict, None, None]:
        """Paginate through all results using cursor-based pagination."""
        params = params or {}
        params["per_page"] = per_page
        cursor = None

        while True:
            if cursor:
                params["cursor"] = cursor

            response = self._make_request(endpoint, params)

            data = response.get("data", [])
            for item in data:
                yield item

            # Check for next page
            meta = response.get("meta", {})
            cursor = meta.get("next_cursor")

            if not cursor or not data:
                break

            # Small delay between pages
            time.sleep(REQUEST_DELAY)

    # ==================== Teams ====================

    def get_teams(self) -> List[Dict]:
        """Get all NFL teams."""
        response = self._make_request("teams")
        return response.get("data", [])

    def get_team(self, team_id: int) -> Dict:
        """Get a specific team by ID."""
        response = self._make_request(f"teams/{team_id}")
        return response.get("data", {})

    # ==================== Players ====================

    def get_players(self, team_ids: List[int] = None, search: str = None,
                    per_page: int = 100) -> Generator[Dict, None, None]:
        """Get players with optional filters. Returns a generator for pagination."""
        params = {}
        if team_ids:
            params["team_ids[]"] = team_ids
        if search:
            params["search"] = search

        yield from self._paginate("players", params, per_page)

    def get_player(self, player_id: int) -> Dict:
        """Get a specific player by ID."""
        response = self._make_request(f"players/{player_id}")
        return response.get("data", {})

    def get_active_players(self, team_ids: List[int] = None,
                           per_page: int = 100) -> Generator[Dict, None, None]:
        """Get active players with optional team filter."""
        params = {}
        if team_ids:
            params["team_ids[]"] = team_ids

        yield from self._paginate("players/active", params, per_page)

    # ==================== Injuries ====================

    def get_player_injuries(self, team_ids: List[int] = None, player_ids: List[int] = None,
                            per_page: int = 100) -> Generator[Dict, None, None]:
        """Get current player injuries."""
        params = {}
        if team_ids:
            params["team_ids[]"] = team_ids
        if player_ids:
            params["player_ids[]"] = player_ids

        yield from self._paginate("player_injuries", params, per_page)

    def get_all_injuries(self) -> List[Dict]:
        """Get all current injuries as a list."""
        return list(self.get_player_injuries())

    # ==================== Games ====================

    def get_games(self, seasons: List[int] = None, weeks: List[int] = None,
                  team_ids: List[int] = None, dates: List[str] = None,
                  postseason: bool = None, per_page: int = 100) -> Generator[Dict, None, None]:
        """Get games with optional filters."""
        params = {}
        if seasons:
            for season in seasons:
                params.setdefault("seasons[]", []).append(season)
        if weeks:
            for week in weeks:
                params.setdefault("weeks[]", []).append(week)
        if team_ids:
            for team_id in team_ids:
                params.setdefault("team_ids[]", []).append(team_id)
        if dates:
            for date in dates:
                params.setdefault("dates[]", []).append(date)
        if postseason is not None:
            params["postseason"] = str(postseason).lower()

        yield from self._paginate("games", params, per_page)

    def get_game(self, game_id: int) -> Dict:
        """Get a specific game by ID."""
        response = self._make_request(f"games/{game_id}")
        return response.get("data", {})

    # ==================== Stats ====================

    def get_stats(self, seasons: List[int] = None, player_ids: List[int] = None,
                  game_ids: List[int] = None, per_page: int = 100) -> Generator[Dict, None, None]:
        """Get player game stats with optional filters."""
        params = {}
        if seasons:
            for season in seasons:
                params.setdefault("seasons[]", []).append(season)
        if player_ids:
            for player_id in player_ids:
                params.setdefault("player_ids[]", []).append(player_id)
        if game_ids:
            for game_id in game_ids:
                params.setdefault("game_ids[]", []).append(game_id)

        yield from self._paginate("stats", params, per_page)

    def get_stats_for_season(self, season: int) -> List[Dict]:
        """Get all stats for a specific season."""
        return list(self.get_stats(seasons=[season]))

    # ==================== Season Stats ====================

    def get_season_stats(self, season: int, player_ids: List[int] = None,
                         per_page: int = 100) -> Generator[Dict, None, None]:
        """Get aggregated season stats."""
        params = {"season": season}
        if player_ids:
            for player_id in player_ids:
                params.setdefault("player_ids[]", []).append(player_id)

        yield from self._paginate("season_stats", params, per_page)

    # ==================== Standings ====================

    def get_standings(self, season: int) -> List[Dict]:
        """Get team standings for a season."""
        response = self._make_request("standings", {"season": season})
        return response.get("data", [])

    # ==================== Utility Methods ====================

    def test_connection(self) -> bool:
        """Test API connection and authentication."""
        try:
            teams = self.get_teams()
            return len(teams) > 0
        except Exception as e:
            logger.error(f"API connection test failed: {e}")
            return False


# Singleton instance for easy import
_client_instance = None


def get_client() -> BallDontLieClient:
    """Get or create the Ball Don't Lie API client singleton."""
    global _client_instance
    if _client_instance is None:
        _client_instance = BallDontLieClient()
    return _client_instance


# Convenience functions for direct use
def get_teams() -> List[Dict]:
    """Get all NFL teams."""
    return get_client().get_teams()


def get_injuries() -> List[Dict]:
    """Get all current injuries."""
    return get_client().get_all_injuries()


def get_stats_for_season(season: int) -> List[Dict]:
    """Get all stats for a season."""
    return get_client().get_stats_for_season(season)


def get_standings(season: int) -> List[Dict]:
    """Get standings for a season."""
    return get_client().get_standings(season)


if __name__ == "__main__":
    # Test the client
    logging.basicConfig(level=logging.INFO)

    print("Testing Ball Don't Lie API Client...")

    try:
        client = BallDontLieClient()

        if client.test_connection():
            print("Connection successful!")

            # Test teams
            teams = client.get_teams()
            print(f"Found {len(teams)} teams")

            # Test injuries
            injuries = list(client.get_player_injuries())
            print(f"Found {len(injuries)} injuries")

        else:
            print("Connection failed!")

    except Exception as e:
        print(f"Error: {e}")

"""
NFL Injury Scraper - Scrapes injury data from Pro-Football-Reference
"""
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

# Team abbreviation mapping (PFR uses some different abbrevs)
TEAM_ABBREV_MAP = {
    'GNB': 'GB',
    'KAN': 'KC',
    'LAR': 'LAR',
    'LVR': 'LV',
    'NOR': 'NO',
    'NWE': 'NE',
    'SFO': 'SF',
    'TAM': 'TB',
    'WAS': 'WAS',
}

# Fantasy-relevant skill positions
SKILL_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K']

def normalize_team_abbrev(abbrev: str) -> str:
    """Normalize team abbreviation to standard format"""
    if not abbrev:
        return ''
    abbrev = abbrev.upper().strip()
    return TEAM_ABBREV_MAP.get(abbrev, abbrev)

def scrape_pfr_injuries() -> List[Dict]:
    """
    Scrape current NFL injury data from Pro-Football-Reference
    Returns list of player injury records
    """
    url = "https://www.pro-football-reference.com/players/injuries.htm"

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # Find the injuries table
        table = soup.find('table', {'id': 'injuries'})
        if not table:
            logger.warning("Could not find injuries table on PFR")
            return []

        injuries = []
        tbody = table.find('tbody')
        if not tbody:
            return []

        rows = tbody.find_all('tr')

        for row in rows:
            # Skip header rows
            if row.get('class') and 'thead' in row.get('class'):
                continue

            cells = row.find_all(['td', 'th'])
            if len(cells) < 5:
                continue

            try:
                # Extract player link for ID
                player_cell = cells[0]
                player_link = player_cell.find('a')
                player_id = ''
                if player_link and player_link.get('href'):
                    # Extract ID from href like /players/A/AdamDa00.htm
                    href = player_link.get('href', '')
                    if '/players/' in href:
                        player_id = href.split('/')[-1].replace('.htm', '')

                player_name = player_cell.get_text(strip=True)
                team = normalize_team_abbrev(cells[1].get_text(strip=True))
                position = cells[2].get_text(strip=True).upper()

                # Status column (Out, Questionable, Doubtful, etc.)
                status = cells[3].get_text(strip=True) if len(cells) > 3 else ''

                # Injury description
                injury = cells[4].get_text(strip=True) if len(cells) > 4 else ''

                # Practice status if available
                practice_status = cells[5].get_text(strip=True) if len(cells) > 5 else ''

                injuries.append({
                    'player_id': player_id,
                    'player_name': player_name,
                    'team': team,
                    'position': position,
                    'status': status,
                    'injury': injury,
                    'practice_status': practice_status
                })

            except Exception as e:
                logger.debug(f"Error parsing injury row: {e}")
                continue

        logger.info(f"Scraped {len(injuries)} injury records from PFR")
        return injuries

    except requests.RequestException as e:
        logger.error(f"Error fetching PFR injuries: {e}")
        return []
    except Exception as e:
        logger.error(f"Error parsing PFR injuries: {e}")
        return []

def get_fantasy_relevant_injuries(injuries: List[Dict] = None) -> List[Dict]:
    """
    Get injuries filtered to fantasy-relevant skill positions (QB, RB, WR, TE, K)
    """
    if injuries is None:
        injuries = scrape_pfr_injuries()

    return [inj for inj in injuries if inj.get('position') in SKILL_POSITIONS]

def filter_by_team(injuries: List[Dict], team: str) -> List[Dict]:
    """Filter injuries by team abbreviation"""
    if not team:
        return injuries
    team = team.upper()
    return [inj for inj in injuries if inj.get('team') == team]

def filter_skill_positions(injuries: List[Dict]) -> List[Dict]:
    """Filter to only skill positions"""
    return [inj for inj in injuries if inj.get('position') in SKILL_POSITIONS]

def get_injury_summary(injuries: List[Dict] = None) -> Dict:
    """
    Get summary statistics about current injuries
    """
    if injuries is None:
        injuries = scrape_pfr_injuries()

    skill_injuries = filter_skill_positions(injuries)

    # Count by status
    status_counts = {}
    for inj in skill_injuries:
        status = inj.get('status', 'Unknown')
        status_counts[status] = status_counts.get(status, 0) + 1

    # Count by position
    position_counts = {}
    for inj in skill_injuries:
        pos = inj.get('position', 'Unknown')
        position_counts[pos] = position_counts.get(pos, 0) + 1

    # Count by team
    team_counts = {}
    for inj in skill_injuries:
        team = inj.get('team', 'Unknown')
        team_counts[team] = team_counts.get(team, 0) + 1

    return {
        'total_injuries': len(injuries),
        'skill_position_injuries': len(skill_injuries),
        'by_status': status_counts,
        'by_position': position_counts,
        'by_team': team_counts
    }


if __name__ == '__main__':
    # Test the scraper
    logging.basicConfig(level=logging.INFO)

    print("Scraping NFL injuries from Pro-Football-Reference...")
    injuries = scrape_pfr_injuries()
    print(f"Found {len(injuries)} total injuries")

    fantasy_injuries = get_fantasy_relevant_injuries(injuries)
    print(f"Found {len(fantasy_injuries)} fantasy-relevant injuries")

    summary = get_injury_summary(injuries)
    print(f"\nSummary:")
    print(f"  By Status: {summary['by_status']}")
    print(f"  By Position: {summary['by_position']}")

    print("\nSample injuries:")
    for inj in fantasy_injuries[:5]:
        print(f"  {inj['player_name']} ({inj['team']}) - {inj['position']} - {inj['status']}: {inj['injury']}")

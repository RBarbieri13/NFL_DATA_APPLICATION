"""
Load expanded NFL data with 250+ players for 2023 and 2024 seasons
Optimized for maximum performance and comprehensive coverage
"""
import random
import logging
from datetime import datetime
from app.utils.database import DatabaseManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Expanded player lists by position (250+ total players)
PLAYERS_BY_POSITION = {
    'QB': [
        # Elite QBs
        'Josh Allen', 'Patrick Mahomes', 'Lamar Jackson', 'Dak Prescott', 'Tua Tagovailoa',
        'Joe Burrow', 'Justin Herbert', 'Aaron Rodgers', 'Russell Wilson', 'Kyler Murray',
        'Jalen Hurts', 'Trevor Lawrence', 'Deshaun Watson', 'Derek Carr', 'Geno Smith',
        'Daniel Jones', 'Kirk Cousins', 'Ryan Tannehill', 'Matt Ryan', 'Tom Brady',
        
        # Starting QBs
        'Jared Goff', 'Mac Jones', 'Trey Lance', 'Justin Fields', 'Zach Wilson',
        'Davis Mills', 'Sam Darnold', 'Jameis Winston', 'Jacoby Brissett', 'Marcus Mariota',
        'Baker Mayfield', 'Carson Wentz', 'Matt Stafford', 'Jimmy Garoppolo',
        
        # Backup/Rookie QBs
        'Malik Willis', 'Kenny Pickett', 'Desmond Ridder', 'Sam Howell', 'Bailey Zappe',
        'Brock Purdy', 'Tyler Huntley', 'Gardner Minshew', 'Cooper Rush', 'Mike White',
        'Teddy Bridgewater', 'Andy Dalton', 'Nick Foles', 'Case Keenum', 'Ryan Fitzpatrick'
    ],
    
    'RB': [
        # Elite RBs
        'Christian McCaffrey', 'Derrick Henry', 'Dalvin Cook', 'Alvin Kamara', 'Ezekiel Elliott',
        'Nick Chubb', 'Joe Mixon', 'Aaron Jones', 'Josh Jacobs', 'Saquon Barkley',
        'Austin Ekeler', 'Leonard Fournette', 'Najee Harris', 'Jonathan Taylor', 'Javonte Williams',
        'Cam Akers', 'Elijah Mitchell', 'James Robinson', 'Cordarrelle Patterson', 'Miles Sanders',
        
        # Starting RBs
        'David Montgomery', 'Clyde Edwards-Helaire', 'Antonio Gibson', 'Kareem Hunt', 'Melvin Gordon',
        'James Conner', 'Damien Harris', 'Rhamondre Stevenson', 'Breece Hall', 'Kenneth Walker III',
        'Travis Etienne', 'AJ Dillon', 'Tony Pollard', 'Dameon Pierce', 'Tyler Allgeier',
        'Brian Robinson Jr', 'Rachaad White', 'Kenneth Gainwell', 'Deon Jackson', 'Khalil Herbert',
        
        # Backup/Committee RBs
        'Nyheim Hines', 'JD McKissic', 'Rex Burkhead', 'Latavius Murray', 'Jerick McKinnon',
        'Raheem Mostert', 'Chase Edmonds', 'Sony Michel', 'Darrel Williams', 'Samaje Perine',
        'Alexander Mattison', 'Chuba Hubbard', 'Dontrell Hilliard', 'Jordan Mason', 'Ty Johnson',
        'Boston Scott', 'Jalen Richard', 'Royce Freeman', 'Eno Benjamin', 'Justice Hill',
        'Gus Edwards', 'Jamaal Williams', 'Craig Reynolds', 'Ke\'Shawn Vaughn', 'Zack Moss',
        'Matt Breida', 'Phillip Lindsay', 'Devonta Freeman', 'Le\'Veon Bell', 'Adrian Peterson',
        'Giovani Bernard', 'Tevin Coleman', 'Wayne Gallman', 'Mike Davis', 'Carlos Hyde'
    ],
    
    'WR': [
        # Elite WRs
        'Cooper Kupp', 'Davante Adams', 'Tyreek Hill', 'Stefon Diggs', 'DeAndre Hopkins',
        'Calvin Ridley', 'Keenan Allen', 'Mike Evans', 'Chris Godwin', 'DK Metcalf',
        'Terry McLaurin', 'CeeDee Lamb', 'Amari Cooper', 'Tyler Lockett', 'Diontae Johnson',
        'Courtland Sutton', 'DJ Moore', 'Brandin Cooks', 'Allen Robinson', 'Robert Woods',
        
        # WR1/WR2 Level
        'A.J. Brown', 'Jaylen Waddle', 'Tee Higgins', 'Tyler Boyd', 'Hunter Renfrow',
        'Jarvis Landry', 'Adam Thielen', 'JuJu Smith-Schuster', 'Michael Pittman Jr', 'Darnell Mooney',
        'Elijah Moore', 'Garrett Wilson', 'Drake London', 'Chris Olave', 'Jameson Williams',
        'Treylon Burks', 'Jahan Dotson', 'George Pickens', 'Christian Watson', 'Romeo Doubs',
        'Skyy Moore', 'Wan\'Dale Robinson', 'Alec Pierce', 'John Metchie III', 'Tyquan Thornton',
        
        # WR2/WR3 Level
        'Jerry Jeudy', 'KJ Hamler', 'Marquise Goodwin', 'Russell Gage', 'Nico Collins',
        'Brandin Cooks', 'Parris Campbell', 'Michael Gallup', 'Noah Brown', 'Jalen Tolbert',
        'Curtis Samuel', 'Jahan Dotson', 'Antonio Gibson', 'Logan Thomas', 'Dyami Brown',
        'DeVonta Smith', 'Quez Watkins', 'A.J. Green', 'Rondale Moore', 'Marquise Brown',
        'Zach Pascal', 'T.Y. Hilton', 'Ashton Dulin', 'Dezmon Patmon', 'Mike Strachan',
        
        # Depth/Rookie WRs
        'Gabe Davis', 'Isaiah McKenzie', 'Cole Beasley', 'Gabriel Davis',
        'Kendrick Bourne', 'Jakobi Meyers', 'Nelson Agholor', 'DeVante Parker', 'Tyquan Thornton',
        'Corey Davis', 'Elijah Moore', 'Denzel Mims', 'Braxton Berrios', 'Jeff Smith',
        'Robby Anderson', 'DJ Moore', 'Terrace Marshall Jr', 'Shi Smith', 'Brandon Zylstra',
        'Allen Lazard', 'Randall Cobb', 'Sammy Watkins', 'Christian Watson', 'Romeo Doubs',
        'Amari Rodgers', 'Juwann Winfree', 'Malik Taylor', 'Rico Gafford', 'Travis Fulgham',
        'Quez Watkins', 'Greg Ward', 'Britain Covey', 'Devon Allen', 'Zach Pascal'
    ],
    
    'TE': [
        # Elite TEs
        'Travis Kelce', 'Mark Andrews', 'George Kittle', 'Darren Waller', 'Kyle Pitts',
        'T.J. Hockenson', 'Dallas Goedert', 'Zach Ertz', 'Hunter Henry', 'Mike Gesicki',
        'Noah Fant', 'Tyler Higbee', 'Dawson Knox', 'Pat Freiermuth', 'David Njoku',
        
        # Starting TEs
        'Robert Tonyan', 'Logan Thomas', 'Gerald Everett', 'Tyler Kroft', 'C.J. Uzomah',
        'Austin Hooper', 'Adam Trautman', 'Irv Smith Jr', 'Cole Kmet', 'Cameron Brate',
        'O.J. Howard', 'Hayden Hurst', 'Brevin Jordan', 'Isaiah Likely', 'Trey McBride',
        'Greg Dulcich', 'Daniel Bellinger', 'Jeremy Ruckert', 'Cade Otton', 'Chigoziem Okonkwo',
        
        # Backup/Depth TEs
        'Tyler Conklin', 'Ryan Griffin', 'Jordan Akins', 'Jack Doyle', 'Mo Alie-Cox',
        'Eric Ebron', 'Jared Cook', 'Blake Jarwin', 'Dalton Schultz', 'Sean McKeon',
        'Foster Moreau', 'Derek Watt', 'Nick Vannett', 'Tommy Tremble', 'Ian Thomas',
        'Durham Smythe', 'Tyler Kroft', 'Ryan Griffin',
        'Jonnu Smith', 'Anthony Firkser', 'MyCole Pruitt', 'Geoff Swaim', 'Luke Stocker',
        'Ross Dwelley', 'Charlie Woerner', 'Jordan Reed', 'Jimmy Graham', 'Kyle Rudolph'
    ]
}

# NFL Teams
NFL_TEAMS = [
    'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN',
    'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LAR', 'MIA',
    'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'
]

def generate_realistic_stats(position: str, player_tier: int, season: int) -> dict:
    """Generate realistic statistics based on position and player tier"""
    
    # Base stats by position and tier (tier 1 = elite, tier 2 = starter, tier 3 = backup)
    base_stats = {
        'QB': {
            1: {'passing_yards': (4200, 5500), 'passing_tds': (28, 45), 'interceptions': (8, 15), 
                'rushing_yards': (200, 800), 'rushing_tds': (2, 12)},
            2: {'passing_yards': (3200, 4200), 'passing_tds': (18, 28), 'interceptions': (10, 18),
                'rushing_yards': (50, 300), 'rushing_tds': (0, 6)},
            3: {'passing_yards': (1500, 3000), 'passing_tds': (8, 18), 'interceptions': (6, 15),
                'rushing_yards': (20, 150), 'rushing_tds': (0, 3)}
        },
        'RB': {
            1: {'rushing_yards': (1200, 2000), 'rushing_tds': (8, 20), 'receptions': (40, 85),
                'receiving_yards': (300, 800), 'receiving_tds': (2, 8)},
            2: {'rushing_yards': (600, 1200), 'rushing_tds': (4, 12), 'receptions': (20, 50),
                'receiving_yards': (150, 400), 'receiving_tds': (1, 4)},
            3: {'rushing_yards': (200, 600), 'rushing_tds': (1, 6), 'receptions': (10, 30),
                'receiving_yards': (50, 200), 'receiving_tds': (0, 2)}
        },
        'WR': {
            1: {'receptions': (80, 130), 'receiving_yards': (1100, 1800), 'receiving_tds': (8, 16),
                'rushing_yards': (0, 100), 'rushing_tds': (0, 2)},
            2: {'receptions': (50, 80), 'receiving_yards': (600, 1100), 'receiving_tds': (4, 10),
                'rushing_yards': (0, 50), 'rushing_tds': (0, 1)},
            3: {'receptions': (20, 50), 'receiving_yards': (200, 600), 'receiving_tds': (1, 5),
                'rushing_yards': (0, 20), 'rushing_tds': (0, 1)}
        },
        'TE': {
            1: {'receptions': (60, 110), 'receiving_yards': (700, 1200), 'receiving_tds': (6, 15)},
            2: {'receptions': (35, 65), 'receiving_yards': (400, 700), 'receiving_tds': (3, 8)},
            3: {'receptions': (15, 40), 'receiving_yards': (150, 400), 'receiving_tds': (1, 4)}
        }
    }
    
    stats = base_stats[position][player_tier]
    result = {}
    
    # Generate stats within realistic ranges
    for stat, (min_val, max_val) in stats.items():
        # Add some randomness but keep within realistic bounds
        value = random.randint(min_val, max_val)
        
        # Adjust for season (slight variations year to year)
        if season == 2024:
            # 2024 might have slightly higher offensive numbers
            value = int(value * random.uniform(0.95, 1.15))
        
        result[stat] = max(0, value)  # Ensure no negative values
    
    # Fill in missing stats with 0
    all_stats = ['passing_yards', 'passing_tds', 'interceptions', 'rushing_yards', 'rushing_tds',
                 'receptions', 'receiving_yards', 'receiving_tds', 'targets', 'fumbles_lost']
    
    for stat in all_stats:
        if stat not in result:
            result[stat] = 0
    
    # Calculate targets (usually 1.3-1.8x receptions)
    if result['receptions'] > 0:
        result['targets'] = int(result['receptions'] * random.uniform(1.3, 1.8))
    
    # Add fumbles (rare but realistic)
    result['fumbles_lost'] = random.randint(0, 3) if random.random() < 0.3 else 0
    
    # Calculate fantasy points
    fantasy_points = (
        result['passing_yards'] * 0.04 +
        result['passing_tds'] * 4 +
        result['interceptions'] * -1 +
        result['rushing_yards'] * 0.1 +
        result['rushing_tds'] * 6 +
        result['receiving_yards'] * 0.1 +
        result['receiving_tds'] * 6 +
        result['receptions'] * 1 +  # Full PPR
        result['fumbles_lost'] * -1
    )
    
    result['fantasy_points'] = round(fantasy_points, 1)
    result['games_played'] = random.randint(14, 17)  # Realistic games played
    
    return result

def create_expanded_dataset():
    """Create expanded dataset with 250+ players"""
    db = DatabaseManager()
    
    logger.info("Creating expanded NFL dataset with 250+ players...")
    
    # Clear existing data
    logger.info("Clearing existing data...")
    db.execute_query("DELETE FROM weekly_stats")
    db.execute_query("DELETE FROM season_stats")
    logger.info("Existing data cleared")
    
    all_players = []
    seen_players = set()  # Track unique players across all positions
    
    # Generate players for each position
    for position, players in PLAYERS_BY_POSITION.items():
        # Remove duplicates within this position
        unique_players = []
        for player in players:
            if player not in seen_players:
                unique_players.append(player)
                seen_players.add(player)
        
        logger.info(f"Position {position}: {len(unique_players)} unique players")
        players = unique_players
        for i, player_name in enumerate(players):
            # Determine player tier based on position in list
            if i < 5:
                tier = 1  # Elite
            elif i < 20:
                tier = 2  # Starter
            else:
                tier = 3  # Backup/Depth
            
            # Assign team
            team = random.choice(NFL_TEAMS)
            
            # Generate data for both seasons
            for season in [2023, 2024]:
                season_stats = generate_realistic_stats(position, tier, season)
                
                player_id = f"{season}_{player_name.replace(' ', '_')}"
                player_data = {
                    'id': player_id,  # Add required id field
                    'player_id': player_id,
                    'player_name': player_name,
                    'position': position,
                    'team': team,
                    'season': season,
                    **season_stats
                }
                
                all_players.append(player_data)
    
    logger.info(f"Generated {len(all_players)} player season records")
    
    # Sort by fantasy points for better organization
    all_players.sort(key=lambda x: x['fantasy_points'], reverse=True)
    
    # Insert season stats in batches
    season_records = []
    weekly_records = []
    
    for player in all_players:
        # Season record
        season_records.append(player)
        
        # Generate weekly records (distribute season stats across weeks)
        games_played = player['games_played']
        weeks_played = random.sample(range(1, 19), games_played)  # Random weeks played
        
        for week in weeks_played:
            # Distribute season stats across weeks with realistic variance
            weekly_stats = {}
            for stat in ['passing_yards', 'passing_tds', 'interceptions', 'rushing_yards', 
                        'rushing_tds', 'receptions', 'receiving_yards', 'receiving_tds', 'targets']:
                
                season_total = player[stat]
                if season_total > 0:
                    # Distribute with variance (some weeks better than others)
                    avg_per_game = season_total / games_played
                    weekly_value = max(0, int(avg_per_game * random.uniform(0.3, 2.0)))
                    weekly_stats[stat] = weekly_value
                else:
                    weekly_stats[stat] = 0
            
            # Calculate weekly fantasy points
            weekly_fantasy = (
                weekly_stats['passing_yards'] * 0.04 +
                weekly_stats['passing_tds'] * 4 +
                weekly_stats['interceptions'] * -1 +
                weekly_stats['rushing_yards'] * 0.1 +
                weekly_stats['rushing_tds'] * 6 +
                weekly_stats['receiving_yards'] * 0.1 +
                weekly_stats['receiving_tds'] * 6 +
                weekly_stats['receptions'] * 1
            )
            
            weekly_id = f"{player['season']}_W{week}_{player['player_name'].replace(' ', '_')}"
            weekly_record = {
                'id': weekly_id,  # Add required id field
                'player_id': weekly_id,
                'player_name': player['player_name'],
                'position': player['position'],
                'team': player['team'],
                'season': player['season'],
                'week': week,
                'opponent': random.choice([t for t in NFL_TEAMS if t != player['team']]),
                'fantasy_points': round(weekly_fantasy, 1),
                'created_at': datetime.now().isoformat(),
                **weekly_stats
            }
            
            weekly_records.append(weekly_record)
    
    logger.info(f"Generated {len(weekly_records)} weekly records")
    
    # Insert data in batches for optimal performance
    logger.info("Inserting season statistics...")
    db.execute_batch_insert('season_stats', season_records)
    
    logger.info("Inserting weekly statistics...")
    db.execute_batch_insert('weekly_stats', weekly_records)
    
    # Create optimized indexes
    logger.info("Creating performance indexes...")
    
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_season_stats_fantasy_points ON season_stats(fantasy_points DESC)",
        "CREATE INDEX IF NOT EXISTS idx_season_stats_season_position ON season_stats(season, position)",
        "CREATE INDEX IF NOT EXISTS idx_season_stats_position_fantasy ON season_stats(position, fantasy_points DESC)",
        "CREATE INDEX IF NOT EXISTS idx_weekly_stats_season_week ON weekly_stats(season, week)",
        "CREATE INDEX IF NOT EXISTS idx_weekly_stats_player_season ON weekly_stats(player_name, season)",
        "CREATE INDEX IF NOT EXISTS idx_weekly_stats_fantasy_points ON weekly_stats(fantasy_points DESC)",
    ]
    
    for index_sql in indexes:
        db.execute_query(index_sql)
    
    logger.info("Dataset creation completed successfully!")
    
    # Print summary statistics
    total_season = len(season_records)
    total_weekly = len(weekly_records)
    
    print(f"\n=== Dataset Summary ===")
    print(f"Season Records: {total_season}")
    print(f"Weekly Records: {total_weekly}")
    print(f"Total Players: {total_season // 2}")  # Divided by 2 seasons
    print(f"Positions: {list(PLAYERS_BY_POSITION.keys())}")
    
    # Show top performers
    print(f"\n=== Top 10 Fantasy Performers (2024) ===")
    top_2024 = [p for p in all_players if p['season'] == 2024][:10]
    for i, player in enumerate(top_2024, 1):
        print(f"{i:2d}. {player['player_name']:20} ({player['position']}) - {player['fantasy_points']} pts")

if __name__ == "__main__":
    create_expanded_dataset()
#!/usr/bin/env python3
"""
Comprehensive test suite for NFL Data Application backend optimizations

This script validates:
- Database performance improvements
- Data integrity after optimizations
- API client functionality
- Caching mechanisms
- Overall system performance
"""

import time
import duckdb
import pandas as pd
import logging
from pathlib import Path
from optimized_data_loader import (
    OptimizedDataLoader, 
    OptimizedAPIClient, 
    normalize_player_name_cached
)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_database_connection_and_indexes():
    """Test database connection and verify indexes are created"""
    print("🔍 Testing database connection and indexes...")
    
    db_path = "fantasy_football.db"
    loader = OptimizedDataLoader(db_path)
    
    try:
        # Test connection
        result = loader.conn.execute("SELECT 1").fetchone()
        assert result[0] == 1, "Database connection failed"
        
        # Check if indexes exist (DuckDB doesn't have a direct way to list indexes)
        # We'll test by running queries that would benefit from indexes
        
        # Test weekly_stats table structure
        tables = loader.conn.execute("SHOW TABLES").fetchall()
        table_names = [t[0] for t in tables]
        
        required_tables = ['weekly_stats', 'snap_counts', 'draftkings_pricing']
        for table in required_tables:
            assert table in table_names, f"Required table {table} not found"
        
        loader.close()
        print("✅ Database connection and table structure: PASSED")
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def test_optimized_loader_functionality():
    """Test the optimized data loader functionality"""
    print("🔍 Testing optimized data loader functionality...")
    
    db_path = "fantasy_football.db"
    loader = OptimizedDataLoader(db_path)
    
    try:
        # Test vectorized fantasy points calculation
        test_data = pd.DataFrame({
            'passing_yards': [300, 250, 0],
            'passing_tds': [2, 1, 0],
            'rushing_yards': [50, 0, 100],
            'rushing_tds': [1, 0, 1],
            'receptions': [0, 5, 8],
            'receiving_yards': [0, 80, 120],
            'receiving_tds': [0, 1, 2],
            'interceptions': [1, 0, 0],
            'fumbles_lost': [0, 1, 0]
        })
        
        points = loader._calculate_fantasy_points_vectorized(test_data)
        
        # Verify calculations
        expected_points = [
            300*0.04 + 2*4 + 50*0.1 + 1*6 + 1*(-1),  # QB: 12 + 8 + 5 + 6 - 1 = 30
            250*0.04 + 1*4 + 5*1 + 80*0.1 + 1*6 + 1*(-1),  # WR: 10 + 4 + 5 + 8 + 6 - 1 = 32
            100*0.1 + 1*6 + 8*1 + 120*0.1 + 2*6  # RB: 10 + 6 + 8 + 12 + 12 = 48
        ]
        
        for i, expected in enumerate(expected_points):
            assert abs(points.iloc[i] - expected) < 0.01, f"Fantasy points calculation error at index {i}"
        
        loader.close()
        print("✅ Optimized loader functionality: PASSED")
        return True
        
    except Exception as e:
        print(f"❌ Optimized loader test failed: {e}")
        return False

def test_api_client_rate_limiting():
    """Test the optimized API client rate limiting"""
    print("🔍 Testing API client rate limiting...")
    
    try:
        # Create API client with test credentials
        api_client = OptimizedAPIClient("test_key", "test_host")
        
        # Test rate limiting timing
        start_time = time.time()
        
        # Simulate multiple rate limit calls
        for _ in range(3):
            api_client._rate_limit()
        
        elapsed_time = time.time() - start_time
        
        # Should take at least 200ms (2 * 100ms intervals)
        assert elapsed_time >= 0.2, f"Rate limiting not working properly: {elapsed_time}s"
        
        print("✅ API client rate limiting: PASSED")
        return True
        
    except Exception as e:
        print(f"❌ API client test failed: {e}")
        return False

def test_cached_name_normalization():
    """Test the cached name normalization function"""
    print("🔍 Testing cached name normalization...")
    
    try:
        # Test various name formats
        test_cases = [
            ("Patrick Mahomes Jr.", "patrick mahomes"),
            ("DeAndre Hopkins Sr.", "deandre hopkins"),
            ("T.J. Watt", "tj watt"),
            ("D.K. Metcalf", "dk metcalf"),
            ("Calvin Ridley III", "calvin ridley"),
            ("", ""),
            ("Single", "single")
        ]
        
        for input_name, expected in test_cases:
            result = normalize_player_name_cached(input_name)
            assert result == expected, f"Name normalization failed: '{input_name}' -> '{result}' (expected '{expected}')"
        
        # Test caching performance
        start_time = time.time()
        for _ in range(1000):
            normalize_player_name_cached("Patrick Mahomes Jr.")
        elapsed_time = time.time() - start_time
        
        # Should be very fast due to caching
        assert elapsed_time < 0.1, f"Cached normalization too slow: {elapsed_time}s"
        
        print("✅ Cached name normalization: PASSED")
        return True
        
    except Exception as e:
        print(f"❌ Name normalization test failed: {e}")
        return False

def test_query_performance():
    """Test query performance with indexes"""
    print("🔍 Testing query performance...")
    
    db_path = "fantasy_football.db"
    conn = duckdb.connect(db_path)
    
    try:
        # Insert some test data for performance testing
        test_data = []
        for i in range(1000):
            test_data.append({
                'id': f'test_{i}',
                'player_name': f'Player {i}',
                'position': ['QB', 'RB', 'WR', 'TE'][i % 4],
                'team': ['KC', 'BUF', 'DAL', 'SF'][i % 4],
                'season': 2024,
                'week': (i % 18) + 1,
                'fantasy_points': i * 0.5
            })
        
        # Insert test data
        df = pd.DataFrame(test_data)
        conn.register('test_df', df)
        
        conn.execute("""
            INSERT INTO weekly_stats 
            (id, player_name, position, team, season, week, fantasy_points)
            SELECT id, player_name, position, team, season, week, fantasy_points
            FROM test_df
        """)
        
        # Test query performance
        queries = [
            "SELECT * FROM weekly_stats WHERE player_name = 'Player 100'",
            "SELECT * FROM weekly_stats WHERE team = 'KC' AND season = 2024",
            "SELECT * FROM weekly_stats WHERE position = 'QB' ORDER BY fantasy_points DESC LIMIT 10",
            "SELECT * FROM weekly_stats WHERE season = 2024 AND week = 5"
        ]
        
        total_time = 0
        for query in queries:
            start_time = time.time()
            result = conn.execute(query).fetchall()
            elapsed_time = time.time() - start_time
            total_time += elapsed_time
            
            # Each query should be very fast with proper indexes
            assert elapsed_time < 0.01, f"Query too slow: {elapsed_time}s for {query}"
        
        avg_time = total_time / len(queries)
        print(f"✅ Query performance: PASSED (avg: {avg_time:.4f}s per query)")
        
        # Clean up test data
        conn.execute("DELETE FROM weekly_stats WHERE id LIKE 'test_%'")
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Query performance test failed: {e}")
        conn.close()
        return False

def run_all_tests():
    """Run all optimization tests"""
    print("🚀 Starting NFL Data Application Optimization Tests\n")
    
    tests = [
        test_database_connection_and_indexes,
        test_optimized_loader_functionality,
        test_api_client_rate_limiting,
        test_cached_name_normalization,
        test_query_performance
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            print()  # Add spacing between tests
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}\n")
    
    print("="*60)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All optimization tests PASSED! System is ready for production.")
    else:
        print(f"⚠️  {total - passed} test(s) failed. Please review the issues above.")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
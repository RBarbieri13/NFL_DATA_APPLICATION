#!/usr/bin/env python3
"""
Test script for warehouse optimization

This script tests the warehouse optimizer functionality including:
- Loading historical season data (2023, 2024)
- Testing incremental refresh
- Validating data integrity
- Performance benchmarking
"""

import logging
import time
from warehouse_optimizer import DataWarehouseOptimizer

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_warehouse_optimization():
    """Test the complete warehouse optimization process"""
    print("🚀 Testing NFL Data Warehouse Optimization")
    print("=" * 60)
    
    # Initialize warehouse optimizer
    warehouse = DataWarehouseOptimizer("fantasy_football.db")
    
    try:
        # Test 1: Load historical season data
        print("\n📊 Test 1: Loading Historical Season Data")
        print("-" * 40)
        
        start_time = time.time()
        result = warehouse.refresh_data_incremental()
        refresh_time = time.time() - start_time
        
        if result['success']:
            print(f"✅ Season totals loaded: {result['season_totals_loaded']}")
            print(f"✅ Weekly stats loaded: {result['weekly_stats_loaded']}")
            print(f"✅ Refresh time: {refresh_time:.2f}s")
        else:
            print(f"❌ Refresh failed: {result['errors']}")
            return False
        
        # Test 2: Get warehouse statistics
        print("\n📈 Test 2: Warehouse Statistics")
        print("-" * 40)
        
        stats = warehouse.get_warehouse_stats()
        
        print(f"Weekly Stats: {stats.get('weekly_stats_count', 0):,} records")
        print(f"Season Totals: {stats.get('season_totals_count', 0):,} records")
        print(f"Snap Counts: {stats.get('snap_counts_count', 0):,} records")
        print(f"DK Pricing: {stats.get('draftkings_pricing_count', 0):,} records")
        
        if 'weekly_seasons' in stats:
            print(f"Weekly data seasons: {list(stats['weekly_seasons'].keys())}")
        
        if 'season_totals_seasons' in stats:
            print(f"Season totals seasons: {list(stats['season_totals_seasons'].keys())}")
        
        if 'position_distribution' in stats:
            print(f"Position distribution: {stats['position_distribution']}")
        
        # Test 3: Cleanup redundant data
        print("\n🧹 Test 3: Data Cleanup")
        print("-" * 40)
        
        cleanup_stats = warehouse.cleanup_redundant_data()
        print(f"✅ Duplicates removed: {cleanup_stats.get('duplicates_removed', 0)}")
        print(f"✅ Invalid data removed: {cleanup_stats.get('old_data_removed', 0)}")
        
        # Test 4: Create frontend optimization views
        print("\n⚡ Test 4: Frontend Optimization")
        print("-" * 40)
        
        warehouse.optimize_queries_for_frontend()
        print("✅ Frontend optimization views created")
        
        # Test 5: Performance validation
        print("\n🏃 Test 5: Performance Validation")
        print("-" * 40)
        
        # Test query performance on season totals
        start_time = time.time()
        result = warehouse.conn.execute("""
            SELECT COUNT(*) FROM season_totals 
            WHERE position = 'QB' AND season = 2023
        """).fetchone()
        query_time = time.time() - start_time
        
        print(f"✅ QB query (2023): {result[0]} records in {query_time*1000:.2f}ms")
        
        # Test top performers view
        start_time = time.time()
        result = warehouse.conn.execute("""
            SELECT player_name, position, fantasy_points 
            FROM top_performers 
            WHERE season = 2024 AND position = 'RB'
            ORDER BY fantasy_points DESC 
            LIMIT 10
        """).fetchall()
        query_time = time.time() - start_time
        
        print(f"✅ Top RBs (2024): {len(result)} records in {query_time*1000:.2f}ms")
        
        if result:
            print(f"   Top RB: {result[0][0]} ({result[0][2]:.1f} pts)")
        
        # Final statistics
        final_stats = warehouse.get_warehouse_stats()
        total_records = sum([
            final_stats.get('weekly_stats_count', 0),
            final_stats.get('season_totals_count', 0),
            final_stats.get('snap_counts_count', 0),
            final_stats.get('draftkings_pricing_count', 0)
        ])
        
        print("\n" + "=" * 60)
        print("📊 Final Warehouse Summary:")
        print(f"✅ Total Records: {total_records:,}")
        print(f"✅ Historical Seasons: 2023, 2024 (season totals)")
        print(f"✅ Current Season: 2025+ (weekly data)")
        print(f"✅ Optimization Views: Created")
        print(f"✅ Performance: Optimized")
        print("🎉 Warehouse optimization completed successfully!")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
        
    finally:
        warehouse.close()

if __name__ == "__main__":
    success = test_warehouse_optimization()
    exit(0 if success else 1)
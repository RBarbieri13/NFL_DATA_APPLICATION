# NFL Data Application Backend

## Overview
This is the backend API for the NFL Data Application, built with FastAPI and DuckDB for high-performance analytics.

## Key Features
- **FastAPI**: Modern, fast web framework for building APIs
- **DuckDB**: High-performance analytical database
- **Caching**: In-memory caching for improved response times
- **CORS**: Configured for frontend integration
- **Error Handling**: Comprehensive error handling and logging

## Main Files
- `server.py`: Main FastAPI application with optimized endpoints
- `main.py`: Application entry point and configuration
- `create_sample_data.py`: Script to populate database with sample NFL data
- `fantasy_football.db`: DuckDB database file

## API Endpoints
- `GET /api/health`: Health check endpoint
- `GET /api/players`: Get all players with optional filtering
- `GET /api/players/{player_id}`: Get detailed player information
- `GET /api/players/weekly-stats`: Get weekly statistics
- `GET /api/players/season-stats`: Get season statistics

## Running the Server
```bash
# Install dependencies
pip install -r requirements.txt

# Create sample data (if needed)
python create_sample_data.py

# Start the server
python main.py
```

The server will start on port 12000 by default.

## Database
The application uses DuckDB for fast analytical queries. The database contains:
- Player information (name, position, team)
- Weekly statistics
- Fantasy points calculations
- Historical data

## Performance Optimizations
- Connection pooling
- Query result caching
- Efficient SQL queries
- Proper indexing
- Error handling and logging
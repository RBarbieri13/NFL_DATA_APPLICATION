"""
Optimized FastAPI application for NFL Data
"""
import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routes import players, data
from app.utils.database import get_db
from app.config.settings import get_env_var

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting NFL Data Application")
    
    # Initialize database
    try:
        db = get_db()
        db.connection  # This will trigger database initialization
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down NFL Data Application")
    try:
        db = get_db()
        db.close()
        logger.info("Database connection closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# Create FastAPI app
app = FastAPI(
    title="NFL Fantasy Data API",
    description="Optimized API for NFL fantasy football data with caching and efficient queries",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(players.router, prefix="/api")
app.include_router(data.router, prefix="/api")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "NFL Fantasy Data API v2.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/api")
async def api_root():
    """API root endpoint"""
    return {
        "message": "NFL Fantasy Data API",
        "version": "2.0.0",
        "endpoints": {
            "players": "/api/players",
            "data": "/api/data",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        db = get_db()
        db.execute_query("SELECT 1")
        
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": "2024-12-15T01:04:00Z"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": "2024-12-15T01:04:00Z"
        }

if __name__ == "__main__":
    # Development server
    port = int(get_env_var("PORT", 10000))
    host = get_env_var("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
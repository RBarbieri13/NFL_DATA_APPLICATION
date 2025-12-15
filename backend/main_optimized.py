"""
Ultra-optimized NFL Data Application with FastAPI and data preloading
"""
import logging
import asyncio
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.utils.database import DatabaseManager
from app.services.data_preloader import initialize_preloader
from app.routes.players import router as players_router
from app.routes.data import router as data_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
db_manager = None
preloader = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with data preloading"""
    global db_manager, preloader
    
    # Startup
    logger.info("Starting Ultra-Optimized NFL Data Application")
    
    try:
        # Initialize database
        db_manager = DatabaseManager()
        logger.info("Database initialized successfully")
        
        # Initialize and preload all data for instant access
        logger.info("Initializing data preloader...")
        preloader = await initialize_preloader()
        logger.info("Data preloading completed - all data now in memory for instant access")
        
        # Log preloader statistics
        stats = preloader.get_stats()
        logger.info(f"Preloader stats: {stats}")
        
    except Exception as e:
        logger.error(f"Failed to initialize application: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down NFL Data Application")
    if db_manager:
        db_manager.close()
        logger.info("Database connection closed")

# Create FastAPI app with optimized configuration
app = FastAPI(
    title="Ultra-Optimized NFL Data API",
    description="Lightning-fast NFL player statistics and fantasy data API with preloaded data",
    version="3.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add compression middleware for faster responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Configure CORS with optimized settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Include routers
app.include_router(players_router, prefix="/api")
app.include_router(data_router, prefix="/api")

@app.get("/health")
async def health_check():
    """Enhanced health check endpoint"""
    preloader_status = "loaded" if preloader and preloader.is_loaded else "not_loaded"
    preloader_stats = preloader.get_stats() if preloader else {}
    
    return {
        "status": "healthy",
        "message": "Ultra-Optimized NFL Data API is running",
        "version": "3.0.0",
        "database": "connected" if db_manager else "disconnected",
        "preloader": preloader_status,
        "preloader_stats": preloader_stats,
        "performance": "optimized"
    }

@app.get("/")
async def root():
    """Root endpoint with performance info"""
    return {
        "message": "Ultra-Optimized NFL Data API",
        "version": "3.0.0",
        "features": [
            "Preloaded data for instant access",
            "Advanced caching and indexing",
            "Optimized database queries",
            "Compressed responses",
            "250+ players with comprehensive stats"
        ],
        "performance": "All data preloaded in memory for sub-millisecond response times",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/api/performance")
async def performance_info():
    """Performance and optimization information"""
    preloader_stats = preloader.get_stats() if preloader else {}
    
    return {
        "optimization_level": "maximum",
        "data_access": "preloaded_memory",
        "response_time": "sub_millisecond",
        "caching": "multi_layer",
        "compression": "gzip_enabled",
        "indexing": "optimized",
        "preloader_stats": preloader_stats,
        "features": {
            "instant_filtering": True,
            "real_time_search": True,
            "advanced_pagination": True,
            "trend_analysis": True,
            "top_performers": True
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "main_optimized:app",
        host="0.0.0.0",
        port=10000,
        reload=False,  # Disable reload for maximum performance
        log_level="info",
        access_log=False,  # Disable access logs for better performance
        workers=1  # Single worker to maintain preloaded data
    )
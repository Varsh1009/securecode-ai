from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
from routers import analysis, websocket
# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="SecureCode AI API",
    description="Real-time code vulnerability detection with ML",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analysis.router, prefix="/api/analyze", tags=["analysis"])
app.include_router(websocket.router, tags=["websocket"])  
# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "securecode-api",
        "version": "0.1.0"
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to SecureCode AI API",
        "docs": "/docs",
        "health": "/health"
    }

# Test database connection
@app.get("/test/database")
async def test_database():
    try:
        return {
            "status": "success",
            "message": "Database connection test - coming soon"
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

# Test Redis connection
@app.get("/test/redis")
async def test_redis():
    try:
        import redis
        r = redis.Redis(
            host='localhost',
            port=6379,
            decode_responses=True
        )
        r.ping()
        return {
            "status": "success",
            "message": "Redis is connected"
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

# Test RabbitMQ connection
@app.get("/test/rabbitmq")
async def test_rabbitmq():
    try:
        import pika
        connection = pika.BlockingConnection(
            pika.ConnectionParameters('localhost')
        )
        connection.close()
        return {
            "status": "success",
            "message": "RabbitMQ is connected"
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )
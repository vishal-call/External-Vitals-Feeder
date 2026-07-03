from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import engine, Base, SessionLocal
from . import routes, models
from .streamer import stream_manager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

def seed_db():
    db = SessionLocal()
    # Seed default settings if empty
    if db.query(models.Settings).count() == 0:
        db.add(models.Settings(key="HOSPITALAI_BASE_URL", value="http://localhost:8000"))
        db.add(models.Settings(key="VITALS_ENDPOINT_PATH", value="/api/integrations/vitals/ingest"))
        db.add(models.Settings(key="INTEGRATION_API_KEY", value="default_key", is_secret=True))
    
    # Seed a default device if empty
    if db.query(models.Device).count() == 0:
        db.add(models.Device(device_code="DEV-ICU-001", device_name="ICU Bed 1 Monitor", device_type="icu"))
        db.add(models.Device(device_code="DEV-ER-002", device_name="ER Bed 2 Monitor", device_type="bedside"))
        
    db.commit()
    db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_db()
    yield
    # Cleanup background tasks on shutdown
    stream_manager.stop_all()

app = FastAPI(title="External Vitals Feeder API", lifespan=lifespan)

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

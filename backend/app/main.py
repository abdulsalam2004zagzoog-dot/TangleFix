from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import Base, engine
from . import models
from .routers import auth, events, scheduling

app = FastAPI(title="TangleFix API", version="1.0.0",
              description="Deterministic scheduling and conflict-resolution platform. No AI/ML.")
origins = [x.strip() for x in settings.cors_origins.split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"name": "TangleFix API", "status": "running", "docs": "/docs"}

@app.get("/api/health")
def health():
    return {"status": "ok"}

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(scheduling.router)

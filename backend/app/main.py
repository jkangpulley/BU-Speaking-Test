import os
from dotenv import load_dotenv
load_dotenv(override=True)  # reads .env written during build phase

# Startup diagnostics (shows in Railway deploy logs)
print("=== ENV DIAGNOSTICS ===")
print(f"GROQ_API_KEY present: {'GROQ_API_KEY' in os.environ}")
print(f"SECRET_KEY present: {'SECRET_KEY' in os.environ}")
print(f"PORT: {os.environ.get('PORT', 'NOT SET')}")
print(f"All keys count: {len(os.environ)}")
print("=======================")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine, Base
from .routers import auth, tests, admin as admin_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Speaking Placement Test API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tests.router)
app.include_router(admin_router.router)

# Serve built frontend in production
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")


@app.get("/api/health")
def health():
    return {"status": "ok"}

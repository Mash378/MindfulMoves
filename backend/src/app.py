from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.data.env import server_env
from src.features.auth.auth_router import router as auth_router

app = FastAPI(
    title="MindfulMoves",
    description="An NLP-powered chess platform that provides immersive and authentic practice experiences for players of all skill levels.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[server_env.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

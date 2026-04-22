import os
from dotenv import load_dotenv

load_dotenv()


# Contains all environment variables to avoid direct import, also validate env first to avoid errors
class Env:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "")

    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")

    CHESS_MODEL_PATH: str = os.getenv("CHESS_MODEL_PATH", "")


server_env = Env()

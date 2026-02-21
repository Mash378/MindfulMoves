import os
from dotenv import load_dotenv

load_dotenv()


class Env:
    CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")
    CLERK_PUBLISHABLE_KEY: str = os.getenv("CLERK_PUBLISHABLE_KEY", "")
    CLERK_JWKS_KEY: str = os.getenv("CLERK_JWKS_KEY", "")
    CLERK_WEBHOOK_SIGNING_SECRET: str = os.getenv("CLERK_WEBHOOK_SIGNING_SECRET", "")

    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "")


server_env = Env()

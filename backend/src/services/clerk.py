from clerk_backend_api import Clerk
from src.data.env import server_env

clerk = Clerk(bearer_auth=server_env.CLERK_SECRET_KEY)

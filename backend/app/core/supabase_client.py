from supabase import create_client, Client
from decouple import config

SUPABASE_URL: str = config("SUPABASE_URL")
SUPABASE_SERVICE_KEY: str = config("SUPABASE_SERVICE_KEY")
SUPABASE_BUCKET = "avatars"

def get_supabase_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

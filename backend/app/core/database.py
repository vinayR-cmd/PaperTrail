import os
from supabase import create_client, Client
from app.core.config import settings

supabase_anon: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
supabase_admin: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

def get_anon_client() -> Client:
    return supabase_anon

def get_admin_client() -> Client:
    return supabase_admin

print("Supabase clients initialized")

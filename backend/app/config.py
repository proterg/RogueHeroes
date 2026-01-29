"""
Application Configuration
-------------------------
Settings management using Pydantic. Loads from environment variables
with sensible defaults for development.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database (SQLite for development, PostgreSQL for production)
    database_url: str = "sqlite+aiosqlite:///./rogueheroes.db"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://localhost:5175"]

    # Environment
    debug: bool = True

    # Gemini API (get free key from https://aistudio.google.com/apikey)
    gemini_api_key: str = ""

    # Anthropic Claude API
    anthropic_api_key: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

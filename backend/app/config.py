from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://asha_user:asha_password@db:5432/asha_db"
    secret_key: str = "dev-secret-key-change-in-production-min-32-chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    refresh_token_expire_days: int = 7
    otp_expiry_minutes: int = 10

    email_host: str = "smtp.office365.com"
    email_port: int = 587
    email_user: str = ""
    email_password: str = ""
    email_from: str = "noreply@kpals.org"
    email_backend: str = "console"  # "smtp" or "console"

    admin_email: str = ""
    admin_password: str = ""

    cors_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()

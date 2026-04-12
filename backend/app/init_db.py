import os
from .database import Base, engine, SessionLocal
from .models import *  # noqa: registers all models with Base
from .utils.auth import hash_password


def init_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    email = os.environ.get("ADMIN_EMAIL", "")
    password = os.environ.get("ADMIN_PASSWORD", "")

    if not email or not password:
        print("WARNING: ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin creation.")
        return

    from .models.auth import AdminUser
    db = SessionLocal()
    try:
        existing = db.query(AdminUser).filter(AdminUser.email == email).first()
        if not existing:
            admin = AdminUser(
                email=email,
                password_hash=hash_password(password),
                name="Admin",
            )
            db.add(admin)
            db.commit()
            print(f"Admin user created: {email}")
        else:
            print("Admin user already exists, skipping.")
    finally:
        db.close()

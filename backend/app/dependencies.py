from typing import Optional, Tuple

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from .database import get_db
from .models.auth import AdminUser
from .models.donor import Donor
from .utils.auth import decode_token

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> AdminUser:
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "admin":
            raise HTTPException(status_code=401, detail="Admin token required")
        admin = db.query(AdminUser).filter(
            AdminUser.id == payload.get("sub"), AdminUser.is_active == True
        ).first()
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_donor(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Donor:
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "donor":
            raise HTTPException(status_code=401, detail="Donor token required")
        donor = db.query(Donor).filter(
            Donor.id == payload.get("donor_id"), Donor.is_active == True
        ).first()
        if not donor:
            raise HTTPException(status_code=401, detail="Donor not found")
        return donor
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_auth_context(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: Session = Depends(get_db),
) -> Tuple:
    """Returns (admin_or_none, donor_or_none, role_str). Works for both token types."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
        token_type = payload.get("type")
        if token_type == "admin":
            admin = db.query(AdminUser).filter(
                AdminUser.id == payload.get("sub"), AdminUser.is_active == True
            ).first()
            if not admin:
                raise HTTPException(status_code=401, detail="Admin not found")
            return (admin, None, "admin")
        elif token_type == "donor":
            donor = db.query(Donor).filter(
                Donor.id == payload.get("donor_id"), Donor.is_active == True
            ).first()
            if not donor:
                raise HTTPException(status_code=401, detail="Donor not found")
            return (None, donor, "donor")
        raise HTTPException(status_code=401, detail="Invalid token type")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

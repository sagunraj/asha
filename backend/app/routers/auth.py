from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from jose import JWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.auth import AdminUser, DonorSession, OTPToken
from ..models.donor import Donor
from ..utils.auth import (create_access_token, create_refresh_token,
                          decode_token, generate_otp, verify_password)
from ..utils.email import send_otp_email
from ..config import settings

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class SendOTPRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/send-otp/")
def send_otp(body: SendOTPRequest, db: Session = Depends(get_db)):
    donor = db.query(Donor).filter(
        Donor.email == body.email, Donor.is_active == True
    ).first()
    if not donor:
        raise HTTPException(status_code=404, detail="No account found with this email address.")

    otp = generate_otp()
    token = OTPToken(
        email=body.email,
        otp=otp,
        expires_at=datetime.utcnow() + timedelta(minutes=settings.otp_expiry_minutes),
    )
    db.add(token)
    db.commit()

    send_otp_email(body.email, otp, donor.name)
    return {"message": "OTP sent to email", "email": body.email}


@router.post("/verify-otp/")
def verify_otp(body: VerifyOTPRequest, req: Request, db: Session = Depends(get_db)):
    otp_token = (
        db.query(OTPToken)
        .filter(
            OTPToken.email == body.email,
            OTPToken.otp == body.otp,
            OTPToken.is_used == False,
            OTPToken.expires_at > datetime.utcnow(),
        )
        .order_by(OTPToken.created_at.desc())
        .first()
    )
    if not otp_token:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP.")

    donor = db.query(Donor).filter(Donor.email == body.email, Donor.is_active == True).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found.")

    otp_token.is_used = True
    otp_token.used_at = datetime.utcnow()

    session = DonorSession(
        donor_id=donor.id,
        email=body.email,
        ip_address=req.client.host if req.client else None,
        user_agent=req.headers.get("user-agent", ""),
    )
    db.add(session)
    db.commit()

    access = create_access_token({"donor_id": str(donor.id), "email": donor.email, "type": "donor"})
    refresh = create_refresh_token({"donor_id": str(donor.id), "email": donor.email, "type": "donor"})

    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "donor": {"id": str(donor.id), "name": donor.name, "email": donor.email},
    }


@router.post("/admin-login/")
def admin_login(body: AdminLoginRequest, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(
        AdminUser.email == body.email, AdminUser.is_active == True
    ).first()
    if not admin or not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    admin.last_login = datetime.utcnow()
    db.commit()

    access = create_access_token({"sub": str(admin.id), "email": admin.email, "type": "admin"})
    refresh = create_refresh_token({"sub": str(admin.id), "email": admin.email, "type": "admin"})

    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "admin": {"id": str(admin.id), "name": admin.name, "email": admin.email},
    }


@router.post("/refresh/")
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("token_type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token.")
        t = payload.get("type")
        if t == "admin":
            token = create_access_token({"sub": payload["sub"], "email": payload["email"], "type": "admin"})
        else:
            token = create_access_token({"donor_id": payload["donor_id"], "email": payload["email"], "type": "donor"})
        return {"access_token": token, "token_type": "bearer"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

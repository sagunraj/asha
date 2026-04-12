from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_admin
from ..models.donation import Donation
from ..models.donor import Campaign, Donor, DonorAuditLog

router = APIRouter(prefix="/api/v1/donors", tags=["donors"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class DonorCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str = "United States"
    category: str = "one_time"
    opt_in_email: bool = True
    opt_in_newsletter: bool = True
    notes: Optional[str] = None


class DonorUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    category: Optional[str] = None
    opt_in_email: Optional[bool] = None
    opt_in_newsletter: Optional[bool] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    goal_amount: Optional[float] = None
    start_date: str
    end_date: Optional[str] = None
    is_active: bool = True


# ── Helpers ────────────────────────────────────────────────────────────────────

def donor_to_dict(d: Donor) -> dict:
    return {
        "id": str(d.id),
        "name": d.name,
        "email": d.email,
        "phone": d.phone,
        "address": d.address,
        "city": d.city,
        "state": d.state,
        "zip_code": d.zip_code,
        "country": d.country,
        "category": d.category,
        "total_donations": float(d.total_donations or 0),
        "number_of_donations": d.number_of_donations or 0,
        "last_donation_date": str(d.last_donation_date) if d.last_donation_date else None,
        "opt_in_email": d.opt_in_email,
        "opt_in_newsletter": d.opt_in_newsletter,
        "notes": d.notes,
        "is_active": d.is_active,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


# ── Donors ─────────────────────────────────────────────────────────────────────

@router.get("/statistics/")
def donor_statistics(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    current_year = datetime.utcnow().year
    total = db.query(Donor).filter(Donor.is_active == True).count()
    new_this_year = db.query(Donor).filter(
        Donor.is_active == True,
        func.extract("year", Donor.created_at) == current_year,
    ).count()
    total_raised = db.query(func.sum(Donation.amount)).filter(Donation.is_active == True).scalar() or 0
    return {
        "total": total,
        "active": total,
        "new_this_year": new_this_year,
        "total_raised": float(total_raised),
    }


@router.get("/")
def list_donors(
    search: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = True,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    q = db.query(Donor)
    if is_active is not None:
        q = q.filter(Donor.is_active == is_active)
    if search:
        q = q.filter(
            (Donor.name.ilike(f"%{search}%")) | (Donor.email.ilike(f"%{search}%"))
        )
    if category:
        q = q.filter(Donor.category == category)
    total = q.count()
    donors = q.order_by(Donor.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"count": total, "results": [donor_to_dict(d) for d in donors]}


@router.post("/", status_code=201)
def create_donor(body: DonorCreate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    if db.query(Donor).filter(Donor.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
    donor = Donor(**body.model_dump())
    db.add(donor)
    db.commit()
    db.refresh(donor)
    return donor_to_dict(donor)


@router.get("/{donor_id}/")
def get_donor(donor_id: UUID, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    donor = db.query(Donor).filter(Donor.id == donor_id).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found.")
    return donor_to_dict(donor)


@router.patch("/{donor_id}/")
def update_donor(donor_id: UUID, body: DonorUpdate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    donor = db.query(Donor).filter(Donor.id == donor_id).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found.")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(donor, field, value)
    donor.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(donor)
    return donor_to_dict(donor)


@router.delete("/{donor_id}/", status_code=204)
def delete_donor(donor_id: UUID, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    donor = db.query(Donor).filter(Donor.id == donor_id).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found.")
    donor.is_active = False
    donor.updated_at = datetime.utcnow()
    db.commit()


# ── Campaigns ──────────────────────────────────────────────────────────────────

@router.get("/campaigns/")
def list_campaigns(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    campaigns = db.query(Campaign).filter(Campaign.is_active == True).all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "description": c.description,
            "goal_amount": float(c.goal_amount) if c.goal_amount else None,
            "start_date": str(c.start_date),
            "end_date": str(c.end_date) if c.end_date else None,
            "is_active": c.is_active,
        }
        for c in campaigns
    ]


@router.post("/campaigns/", status_code=201)
def create_campaign(body: CampaignCreate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    from datetime import date
    campaign = Campaign(
        name=body.name,
        description=body.description,
        goal_amount=body.goal_amount,
        start_date=date.fromisoformat(body.start_date),
        end_date=date.fromisoformat(body.end_date) if body.end_date else None,
        is_active=body.is_active,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return {"id": str(campaign.id), "name": campaign.name}

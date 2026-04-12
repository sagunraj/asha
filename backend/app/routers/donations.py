from datetime import date, datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..dependencies import get_auth_context, get_current_admin
from ..models.donation import Donation
from ..models.donor import Donor

router = APIRouter(prefix="/api/v1/donations", tags=["donations"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class DonationCreate(BaseModel):
    donor_id: UUID
    campaign_id: Optional[UUID] = None
    amount: float
    donation_date: str  # ISO date string
    donation_type: str = "one_time"
    is_recurring: bool = False
    recurrence_frequency: Optional[str] = None
    source: str = "check"
    status: str = "completed"
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    tax_year: Optional[int] = None


class DonationUpdate(BaseModel):
    amount: Optional[float] = None
    donation_date: Optional[str] = None
    donation_type: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_frequency: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    campaign_id: Optional[UUID] = None
    is_active: Optional[bool] = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def donation_to_dict(d: Donation, donor_name: str = "") -> dict:
    return {
        "id": str(d.id),
        "donor_id": str(d.donor_id),
        "donor_name": donor_name or (d.donor.name if d.donor else ""),
        "campaign_id": str(d.campaign_id) if d.campaign_id else None,
        "amount": float(d.amount),
        "donation_date": str(d.donation_date),
        "donation_type": d.donation_type,
        "is_recurring": d.is_recurring,
        "recurrence_frequency": d.recurrence_frequency,
        "source": d.source,
        "status": d.status,
        "reference_number": d.reference_number,
        "notes": d.notes,
        "tax_year": d.tax_year,
        "is_active": d.is_active,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


def update_donor_totals(donor: Donor, db: Session):
    row = db.query(
        func.sum(Donation.amount),
        func.count(Donation.id),
        func.max(Donation.donation_date),
    ).filter(
        Donation.donor_id == donor.id,
        Donation.is_active == True,
        Donation.status == "completed",
    ).first()
    donor.total_donations = row[0] or 0
    donor.number_of_donations = row[1] or 0
    donor.last_donation_date = row[2]
    donor.updated_at = datetime.utcnow()


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/statistics/")
def donation_statistics(
    tax_year: Optional[int] = None,
    db: Session = Depends(get_db),
    auth=Depends(get_auth_context),
):
    admin, donor, role = auth
    q = db.query(Donation).filter(Donation.is_active == True)
    if role == "donor":
        q = q.filter(Donation.donor_id == donor.id)
    if tax_year:
        q = q.filter(Donation.tax_year == tax_year)

    rows = q.all()
    total = len(rows)
    total_amount = sum(float(r.amount) for r in rows)
    by_status: dict = {
        "pending": {"count": 0, "amount": 0.0},
        "completed": {"count": 0, "amount": 0.0},
        "failed": {"count": 0, "amount": 0.0},
        "cancelled": {"count": 0, "amount": 0.0},
    }
    for r in rows:
        if r.status in by_status:
            by_status[r.status]["count"] += 1
            by_status[r.status]["amount"] += float(r.amount)

    return {
        "total_donations": total,
        "total_amount": total_amount,
        "average_donation": total_amount / total if total else 0,
        "recurring_count": sum(1 for r in rows if r.is_recurring),
        "one_time_count": sum(1 for r in rows if not r.is_recurring),
        "by_status": by_status,
    }


@router.get("/")
def list_donations(
    tax_year: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    donor_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    auth=Depends(get_auth_context),
):
    admin, donor, role = auth
    q = db.query(Donation).options(joinedload(Donation.donor)).filter(Donation.is_active == True)

    if role == "donor":
        q = q.filter(Donation.donor_id == donor.id)
    elif donor_id:
        q = q.filter(Donation.donor_id == donor_id)

    if tax_year:
        q = q.filter(Donation.tax_year == tax_year)
    if status:
        q = q.filter(Donation.status == status)
    if search and role == "admin":
        q = q.join(Donor).filter(
            (Donor.name.ilike(f"%{search}%")) | (Donor.email.ilike(f"%{search}%"))
        )

    total = q.count()
    donations = q.order_by(Donation.donation_date.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"count": total, "results": [donation_to_dict(d) for d in donations]}


@router.post("/", status_code=201)
def create_donation(body: DonationCreate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    donor = db.query(Donor).filter(Donor.id == body.donor_id).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found.")

    d_date = date.fromisoformat(body.donation_date)
    donation = Donation(
        donor_id=body.donor_id,
        campaign_id=body.campaign_id,
        amount=body.amount,
        donation_date=d_date,
        donation_type=body.donation_type,
        is_recurring=body.is_recurring,
        recurrence_frequency=body.recurrence_frequency,
        source=body.source,
        status=body.status,
        reference_number=body.reference_number,
        notes=body.notes,
        tax_year=body.tax_year or d_date.year,
    )
    db.add(donation)
    db.flush()
    update_donor_totals(donor, db)
    db.commit()
    db.refresh(donation)
    return donation_to_dict(donation, donor.name)


@router.patch("/{donation_id}/")
def update_donation(
    donation_id: UUID,
    body: DonationUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found.")

    data = body.model_dump(exclude_unset=True)
    if "donation_date" in data and data["donation_date"]:
        data["donation_date"] = date.fromisoformat(data["donation_date"])
    for field, value in data.items():
        setattr(donation, field, value)
    donation.updated_at = datetime.utcnow()
    db.commit()

    donor = db.query(Donor).filter(Donor.id == donation.donor_id).first()
    if donor:
        update_donor_totals(donor, db)
        db.commit()

    db.refresh(donation)
    return donation_to_dict(donation)


@router.delete("/{donation_id}/", status_code=204)
def delete_donation(donation_id: UUID, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found.")
    donation.is_active = False
    donation.updated_at = datetime.utcnow()
    db.commit()
    donor = db.query(Donor).filter(Donor.id == donation.donor_id).first()
    if donor:
        update_donor_totals(donor, db)
        db.commit()

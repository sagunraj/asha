from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_admin, get_current_donor
from ..models.donation import Donation
from ..models.donor import Donor
from ..models.tax_receipt import TaxReceipt, TaxReceiptTemplate
from ..utils.email import send_email

router = APIRouter(prefix="/api/v1/tax-receipts", tags=["tax-receipts"])


# ── Amount to words ────────────────────────────────────────────────────────────

def amount_to_words(amount: float) -> str:
    """Convert a dollar amount to English words, e.g. 1250.00 → 'One Thousand Two Hundred Fifty Dollars and No Cents'."""
    ones = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen',
    ]
    tens_words = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    def _below_thousand(n: int) -> str:
        if n == 0:
            return ''
        if n < 20:
            return ones[n]
        if n < 100:
            rest = ones[n % 10]
            return tens_words[n // 10] + (' ' + rest if rest else '')
        rest = _below_thousand(n % 100)
        return ones[n // 100] + ' Hundred' + (' ' + rest if rest else '')

    dollars = int(amount)
    cents = round((amount - dollars) * 100)

    if dollars == 0:
        dollar_str = 'Zero'
    else:
        n = dollars
        parts = []
        if n >= 1_000_000:
            parts.append(_below_thousand(n // 1_000_000) + ' Million')
            n %= 1_000_000
        if n >= 1_000:
            parts.append(_below_thousand(n // 1_000) + ' Thousand')
            n %= 1_000
        if n > 0:
            parts.append(_below_thousand(n))
        dollar_str = ' '.join(parts)

    dollar_label = 'Dollar' if dollars == 1 else 'Dollars'
    if cents == 0:
        return f'{dollar_str} {dollar_label} and No Cents'
    cent_label = 'Cent' if cents == 1 else 'Cents'
    return f'{dollar_str} {dollar_label} and {_below_thousand(cents)} {cent_label}'


# ── Template rendering ─────────────────────────────────────────────────────────

_PLACEHOLDERS = {
    '{{donor_name}}':         lambda ctx: ctx['donor'].name or '',
    '{{donor_email}}':        lambda ctx: ctx['donor'].email or '',
    '{{tax_year}}':           lambda ctx: str(ctx['tax_year']),
    '{{total_amount}}':       lambda ctx: f"${ctx['total_amount']:,.2f}",
    '{{total_amount_words}}': lambda ctx: amount_to_words(ctx['total_amount']),
    '{{receipt_number}}':     lambda ctx: ctx['receipt_number'],
    '{{date}}':               lambda ctx: datetime.utcnow().strftime('%B %d, %Y'),
    '{{organization_name}}':  lambda ctx: 'KPALS',
}


def render_template(body: str, donor: Donor, tax_year: int, total_amount: float, receipt_number: str) -> str:
    ctx = {
        'donor': donor,
        'tax_year': tax_year,
        'total_amount': total_amount,
        'receipt_number': receipt_number,
    }
    for placeholder, fn in _PLACEHOLDERS.items():
        body = body.replace(placeholder, fn(ctx))
    return body


def get_active_template(db: Session) -> Optional[TaxReceiptTemplate]:
    return db.query(TaxReceiptTemplate).filter(TaxReceiptTemplate.is_active == True).first()


# ── Fallback HTML (used when no template exists) ───────────────────────────────

_FALLBACK_BODY = """\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Tax Receipt {{receipt_number}}</title></head>
<body style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:640px;margin:40px auto;color:#1D1D1F;padding:0 20px;">
  <div style="border-bottom:3px solid #0071E3;padding-bottom:20px;margin-bottom:24px;">
    <h1 style="color:#0071E3;margin:0 0 4px;">{{organization_name}}</h1>
    <p style="margin:0;color:#6E6E73;font-size:14px;">Charitable Contribution Receipt</p>
  </div>
  <p style="font-size:15px;">Dear <strong>{{donor_name}}</strong>,</p>
  <p style="font-size:15px;">Thank you for your generous donation during the {{tax_year}} tax year. This serves as your official receipt of a tax-deductible contribution.</p>
  <table style="width:100%;border-collapse:collapse;margin:24px 0;">
    <tr style="background:#F5F5F7;"><td style="padding:10px 14px;font-weight:600;width:40%;">Receipt Number</td><td style="padding:10px 14px;">{{receipt_number}}</td></tr>
    <tr><td style="padding:10px 14px;font-weight:600;">Donor Name</td><td style="padding:10px 14px;">{{donor_name}}</td></tr>
    <tr style="background:#F5F5F7;"><td style="padding:10px 14px;font-weight:600;">Tax Year</td><td style="padding:10px 14px;">{{tax_year}}</td></tr>
    <tr><td style="padding:10px 14px;font-weight:600;">Total Contributions</td><td style="padding:10px 14px;"><strong>{{total_amount}}</strong></td></tr>
    <tr style="background:#F5F5F7;"><td style="padding:10px 14px;font-weight:600;">Amount in Words</td><td style="padding:10px 14px;">{{total_amount_words}}</td></tr>
    <tr><td style="padding:10px 14px;font-weight:600;">Date Issued</td><td style="padding:10px 14px;">{{date}}</td></tr>
  </table>
  <p style="font-size:13px;color:#6E6E73;border-top:1px solid #E5E5EA;padding-top:16px;">
    <strong>{{organization_name}}</strong> is a 501(c)(3) nonprofit organization. No goods or services were provided in exchange for your contribution. Please retain this receipt for your records.
  </p>
  <p style="font-size:12px;color:#AEAEB2;">Generated on {{date}}</p>
</body>
</html>"""


def generate_receipt_html(
    donor: Donor,
    tax_year: int,
    total_amount: float,
    receipt_number: str,
    template: Optional[TaxReceiptTemplate] = None,
) -> str:
    body = template.body_html if template else _FALLBACK_BODY
    return render_template(body, donor, tax_year, total_amount, receipt_number)


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class TemplateCreate(BaseModel):
    name: str
    subject: str
    body_html: str
    sender_name: Optional[str] = "KPALS"
    sender_email: Optional[str] = "noreply@kpals.org"


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _template_dict(t: TaxReceiptTemplate) -> dict:
    return {
        "id": str(t.id),
        "name": t.name,
        "subject": t.subject,
        "body_html": t.body_html,
        "sender_name": t.sender_name,
        "sender_email": t.sender_email,
        "is_active": t.is_active,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _receipt_dict(r: TaxReceipt) -> dict:
    return {
        "id": str(r.id),
        "tax_year": r.tax_year,
        "total_amount": float(r.total_amount),
        "receipt_number": r.receipt_number,
        "receipt_html": r.receipt_html,
        "email_delivery_status": r.email_delivery_status,
        "email_sent_at": r.email_sent_at.isoformat() if r.email_sent_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _email_subject(receipt: TaxReceipt, donor: Donor, db: Session) -> str:
    if receipt.template_id:
        tpl = db.query(TaxReceiptTemplate).filter(TaxReceiptTemplate.id == receipt.template_id).first()
        if tpl and tpl.subject:
            return render_template(tpl.subject, donor, receipt.tax_year, float(receipt.total_amount), receipt.receipt_number)
    return f"Your {receipt.tax_year} Tax Receipt from KPALS"


# ── Template endpoints ─────────────────────────────────────────────────────────

@router.get("/templates/")
def list_templates(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    templates = db.query(TaxReceiptTemplate).order_by(
        TaxReceiptTemplate.created_at.desc(),
    ).all()
    return [_template_dict(t) for t in templates]


@router.post("/templates/")
def create_template(
    body: TemplateCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    t = TaxReceiptTemplate(
        name=body.name,
        subject=body.subject,
        body_html=body.body_html,
        sender_name=body.sender_name or "KPALS",
        sender_email=body.sender_email or "noreply@kpals.org",
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _template_dict(t)


@router.get("/templates/{template_id}/")
def get_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    t = db.query(TaxReceiptTemplate).filter(TaxReceiptTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found.")
    return _template_dict(t)


@router.patch("/templates/{template_id}/")
def update_template(
    template_id: UUID,
    body: TemplateUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    t = db.query(TaxReceiptTemplate).filter(TaxReceiptTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found.")
    for field, val in body.dict(exclude_none=True).items():
        setattr(t, field, val)
    t.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(t)
    return _template_dict(t)


@router.delete("/templates/{template_id}/")
def delete_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    t = db.query(TaxReceiptTemplate).filter(TaxReceiptTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found.")
    db.delete(t)
    db.commit()
    return {"deleted": True}


# ── Admin receipt endpoints ────────────────────────────────────────────────────

@router.get("/")
def list_receipts(
    tax_year: Optional[int] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    q = db.query(TaxReceipt)
    if tax_year:
        q = q.filter(TaxReceipt.tax_year == tax_year)
    total = q.count()
    receipts = q.order_by(TaxReceipt.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    results = []
    for r in receipts:
        donor = db.query(Donor).filter(Donor.id == r.donor_id).first()
        results.append({
            "id": str(r.id),
            "donor_id": str(r.donor_id),
            "donor_name": donor.name if donor else "",
            "donor_email": donor.email if donor else "",
            "tax_year": r.tax_year,
            "total_amount": float(r.total_amount),
            "receipt_number": r.receipt_number,
            "receipt_html": r.receipt_html,
            "email_delivery_status": r.email_delivery_status,
            "email_sent_at": r.email_sent_at.isoformat() if r.email_sent_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return {"count": total, "results": results}


@router.post("/generate/")
def generate_for_year(
    tax_year: int,
    template_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Generate tax receipts for all donors with completed donations in the given year.
    
    If template_id is provided, use that template. Otherwise use the default active template.
    """
    donor_ids = (
        db.query(Donation.donor_id)
        .filter(Donation.tax_year == tax_year, Donation.is_active == True, Donation.status == "completed")
        .distinct()
        .all()
    )

    if template_id:
        template = db.query(TaxReceiptTemplate).filter(TaxReceiptTemplate.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found.")
    else:
        template = get_active_template(db)
    created = 0
    skipped = 0

    for (donor_id,) in donor_ids:
        existing = db.query(TaxReceipt).filter(
            TaxReceipt.donor_id == donor_id, TaxReceipt.tax_year == tax_year
        ).first()
        if existing:
            skipped += 1
            continue

        total = (
            db.query(func.sum(Donation.amount))
            .filter(
                Donation.donor_id == donor_id,
                Donation.tax_year == tax_year,
                Donation.is_active == True,
                Donation.status == "completed",
            )
            .scalar()
            or 0
        )

        count = db.query(TaxReceipt).filter(
            func.extract("year", TaxReceipt.created_at) == tax_year
        ).count()
        receipt_number = f"KPALS-{tax_year}-{str(count + 1).zfill(5)}"

        donor = db.query(Donor).filter(Donor.id == donor_id).first()
        html = generate_receipt_html(donor, tax_year, float(total), receipt_number, template)

        receipt = TaxReceipt(
            donor_id=donor_id,
            tax_year=tax_year,
            total_amount=total,
            receipt_number=receipt_number,
            receipt_html=html,
            template_id=template.id if template else None,
        )
        db.add(receipt)
        db.flush()
        created += 1

    db.commit()
    return {"tax_year": tax_year, "created": created, "skipped": skipped}


@router.post("/{receipt_id}/send-email/")
def send_receipt_email(
    receipt_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    receipt = db.query(TaxReceipt).filter(TaxReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found.")

    donor = db.query(Donor).filter(Donor.id == receipt.donor_id).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found.")

    subject = _email_subject(receipt, donor, db)
    body = (
        f"Dear {donor.name},\n\n"
        f"Please find your {receipt.tax_year} tax receipt below.\n"
        f"Receipt: {receipt.receipt_number}\n"
        f"Total: ${float(receipt.total_amount):,.2f}\n\nKPALS Team"
    )

    ok = send_email(donor.email, subject, body, receipt.receipt_html)
    receipt.email_delivery_status = "sent" if ok else "failed"
    receipt.email_sent_at = datetime.utcnow() if ok else None
    db.commit()

    return {"sent": ok, "email": donor.email}


@router.delete("/{receipt_id}/")
def delete_receipt(
    receipt_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    receipt = db.query(TaxReceipt).filter(TaxReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found.")

    db.delete(receipt)
    db.commit()
    return {"deleted": True}


# ── Donor-facing endpoints ─────────────────────────────────────────────────────

@router.get("/my/")
def get_my_receipts(
    tax_year: Optional[int] = None,
    db: Session = Depends(get_db),
    donor: Donor = Depends(get_current_donor),
):
    q = db.query(TaxReceipt).filter(TaxReceipt.donor_id == donor.id)
    if tax_year:
        q = q.filter(TaxReceipt.tax_year == tax_year)
    return [_receipt_dict(r) for r in q.order_by(TaxReceipt.tax_year.desc()).all()]


@router.post("/my/generate/")
def generate_my_receipt(
    tax_year: int,
    db: Session = Depends(get_db),
    donor: Donor = Depends(get_current_donor),
):
    existing = db.query(TaxReceipt).filter(
        TaxReceipt.donor_id == donor.id,
        TaxReceipt.tax_year == tax_year,
    ).first()
    if existing:
        return {**_receipt_dict(existing), "generated": False}

    total = (
        db.query(func.sum(Donation.amount))
        .filter(
            Donation.donor_id == donor.id,
            Donation.tax_year == tax_year,
            Donation.is_active == True,
            Donation.status == "completed",
        )
        .scalar()
        or 0
    )
    if not total:
        raise HTTPException(
            status_code=400,
            detail="No completed donations found for this year. Only completed donations are included in tax receipts.",
        )

    count = db.query(TaxReceipt).filter(
        func.extract("year", TaxReceipt.created_at) == tax_year
    ).count()
    receipt_number = f"KPALS-{tax_year}-{str(count + 1).zfill(5)}"

    template = get_active_template(db)
    html = generate_receipt_html(donor, tax_year, float(total), receipt_number, template)

    receipt = TaxReceipt(
        donor_id=donor.id,
        tax_year=tax_year,
        total_amount=total,
        receipt_number=receipt_number,
        receipt_html=html,
        template_id=template.id if template else None,
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    return {**_receipt_dict(receipt), "generated": True}


@router.post("/my/{receipt_id}/send-email/")
def send_my_receipt_email(
    receipt_id: UUID,
    db: Session = Depends(get_db),
    donor: Donor = Depends(get_current_donor),
):
    receipt = db.query(TaxReceipt).filter(
        TaxReceipt.id == receipt_id,
        TaxReceipt.donor_id == donor.id,
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found.")

    subject = _email_subject(receipt, donor, db)
    body = (
        f"Dear {donor.name},\n\nYour {receipt.tax_year} tax receipt is attached.\n"
        f"Receipt: {receipt.receipt_number}\nTotal: ${float(receipt.total_amount):,.2f}\n\nKPALS Team"
    )

    ok = send_email(donor.email, subject, body, receipt.receipt_html)
    receipt.email_delivery_status = "sent" if ok else "failed"
    receipt.email_sent_at = datetime.utcnow() if ok else None
    db.commit()
    return {"sent": ok}

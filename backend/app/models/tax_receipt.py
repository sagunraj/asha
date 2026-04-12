import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Numeric, Text, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base

tax_receipt_donations = Table(
    "tax_receipt_donations",
    Base.metadata,
    Column("tax_receipt_id", UUID(as_uuid=True), ForeignKey("tax_receipts.id")),
    Column("donation_id", UUID(as_uuid=True), ForeignKey("donations.id")),
)


class TaxReceiptTemplate(Base):
    __tablename__ = "tax_receipt_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(255), nullable=False, default="Your Tax Receipt from KPALS")
    body_html = Column(Text, nullable=False)
    sender_name = Column(String(255), default="KPALS")
    sender_email = Column(String(255), nullable=False, default="noreply@kpals.org")
    footer_text = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TaxReceipt(Base):
    __tablename__ = "tax_receipts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donor_id = Column(UUID(as_uuid=True), ForeignKey("donors.id"), nullable=False, index=True)
    tax_year = Column(Integer, nullable=False, index=True)
    total_amount = Column(Numeric(12, 2), nullable=False)
    receipt_number = Column(String(100), unique=True, nullable=False)
    template_id = Column(UUID(as_uuid=True), ForeignKey("tax_receipt_templates.id"), nullable=True)
    receipt_html = Column(Text, nullable=True)
    email_sent_at = Column(DateTime, nullable=True)
    email_delivery_status = Column(String(20), default="pending")  # pending, sent, failed
    email_error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    donor = relationship("Donor", back_populates="tax_receipts")
    template = relationship("TaxReceiptTemplate")
    donations_included = relationship("Donation", secondary=tax_receipt_donations)

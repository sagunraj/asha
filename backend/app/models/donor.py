import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer, Numeric, Text, JSON, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class Donor(Base):
    __tablename__ = "donors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    zip_code = Column(String(20), nullable=True)
    country = Column(String(100), default="United States")
    category = Column(String(20), default="one_time")  # one_time, recurring, major, member
    total_donations = Column(Numeric(12, 2), default=0.00)
    number_of_donations = Column(Integer, default=0)
    last_donation_date = Column(Date, nullable=True)
    opt_in_email = Column(Boolean, default=True)
    opt_in_newsletter = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    donations = relationship("Donation", back_populates="donor", lazy="dynamic")
    tax_receipts = relationship("TaxReceipt", back_populates="donor", lazy="dynamic")
    sessions = relationship("DonorSession", back_populates="donor")
    audit_logs = relationship("DonorAuditLog", back_populates="donor")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    goal_amount = Column(Numeric(12, 2), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    donations = relationship("Donation", back_populates="campaign")


class DonorAuditLog(Base):
    __tablename__ = "donor_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donor_id = Column(UUID(as_uuid=True), ForeignKey("donors.id"), nullable=False, index=True)
    action = Column(String(20), nullable=False)  # create, update, delete, restore
    changed_by = Column(String(255), default="admin")
    changed_fields = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow)

    donor = relationship("Donor", back_populates="audit_logs", foreign_keys=[donor_id],
                         primaryjoin="DonorAuditLog.donor_id == Donor.id")

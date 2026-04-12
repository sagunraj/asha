import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class Donation(Base):
    __tablename__ = "donations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donor_id = Column(UUID(as_uuid=True), ForeignKey("donors.id"), nullable=False, index=True)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    donation_date = Column(Date, nullable=False)
    donation_type = Column(String(20), default="one_time")  # one_time, recurring
    is_recurring = Column(Boolean, default=False)
    recurrence_frequency = Column(String(20), nullable=True)  # monthly, quarterly, yearly
    next_expected_donation = Column(Date, nullable=True)
    source = Column(String(20), default="check")  # check, cash, bank_transfer, credit_card, paypal, other
    status = Column(String(20), default="completed")  # pending, completed, failed, cancelled
    reference_number = Column(String(100), unique=True, nullable=True)
    notes = Column(Text, nullable=True)
    tax_year = Column(Integer, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    donor = relationship("Donor", back_populates="donations")
    campaign = relationship("Campaign", back_populates="donations")

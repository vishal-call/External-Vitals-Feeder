from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from .database import Base
from datetime import datetime, timezone

def utc_now():
    return datetime.now(timezone.utc)

class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    device_code = Column(String, unique=True, index=True)
    device_name = Column(String)
    device_type = Column(String) # bedside, icu, portable
    assigned_patient_code = Column(String, nullable=True)
    status = Column(String, default="idle") # idle, streaming, error

class PatientMapping(Base):
    __tablename__ = "patient_mappings"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    patient_code = Column(String, index=True)
    patient_label = Column(String)
    status = Column(String, default="active")

class FeederSession(Base):
    __tablename__ = "feeder_sessions"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    patient_code = Column(String)
    scenario = Column(String)
    interval_seconds = Column(Integer, default=5)
    started_at = Column(DateTime, default=utc_now)
    stopped_at = Column(DateTime, nullable=True)
    correlation_id = Column(String, index=True)

class TransmissionLog(Base):
    __tablename__ = "transmission_logs"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, index=True, nullable=True)
    device_id = Column(String)
    patient_code = Column(String)
    scenario = Column(String)
    payload_json = Column(Text)
    status = Column(String) # pending, success, failed, retrying
    http_status = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    idempotency_key = Column(String, index=True)
    correlation_id = Column(String, index=True)
    latency_ms = Column(Integer, nullable=True)
    attempt_count = Column(Integer, default=1)
    sent_at = Column(DateTime, default=utc_now)

class Settings(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)
    is_secret = Column(Boolean, default=False)

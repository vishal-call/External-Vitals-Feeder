from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class DeviceBase(BaseModel):
    device_code: str
    device_name: str
    device_type: str
    assigned_patient_code: Optional[str] = None
    status: str = "idle"

class DeviceCreate(DeviceBase):
    pass

class DeviceResponse(DeviceBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class FeederSessionStart(BaseModel):
    device_id: str
    patient_code: str
    scenario: str
    interval_seconds: int = 5

class SettingsUpdate(BaseModel):
    key: str
    value: str
    is_secret: bool = False

class LogResponse(BaseModel):
    id: int
    device_id: str
    patient_code: str
    status: str
    http_status: Optional[int]
    error_message: Optional[str]
    idempotency_key: str
    attempt_count: int
    sent_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TestConnectionRequest(BaseModel):
    base_url: str

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from .database import get_db
from . import models, schemas
from .streamer import stream_manager
import uuid
import json
import httpx

router = APIRouter()

@router.get("/devices", response_model=List[schemas.DeviceResponse])
def get_devices(db: Session = Depends(get_db)):
    return db.query(models.Device).all()

@router.post("/devices", response_model=schemas.DeviceResponse)
def create_device(device: schemas.DeviceCreate, db: Session = Depends(get_db)):
    db_device = models.Device(**device.model_dump())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@router.post("/streams/start")
async def start_stream(session_start: schemas.FeederSessionStart, db: Session = Depends(get_db)):
    device = db.query(models.Device).filter(models.Device.device_code == session_start.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    correlation_id = str(uuid.uuid4())
    session = models.FeederSession(
        device_id=session_start.device_id,
        patient_code=session_start.patient_code,
        scenario=session_start.scenario,
        interval_seconds=session_start.interval_seconds,
        correlation_id=correlation_id
    )
    db.add(session)
    device.status = "streaming"
    db.commit()
    db.refresh(session)
    
    stream_manager.start_stream(
        session_id=str(session.id),
        device_id=session.device_id,
        patient_code=session.patient_code,
        scenario=session.scenario,
        interval=session.interval_seconds,
        correlation_id=correlation_id
    )
    return {"status": "started", "session_id": session.id, "correlation_id": correlation_id}

@router.post("/streams/{session_id}/stop")
async def stop_stream(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.FeederSession).filter(models.FeederSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    stream_manager.stop_stream(str(session_id))
    session.stopped_at = models.utc_now()
    
    device = db.query(models.Device).filter(models.Device.device_code == session.device_id).first()
    if device:
        device.status = "idle"
        
    db.commit()
    return {"status": "stopped"}

@router.get("/logs", response_model=List[schemas.LogResponse])
def get_logs(limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.TransmissionLog).order_by(models.TransmissionLog.id.desc()).limit(limit).all()

@router.post("/logs/{log_id}/resend")
async def resend_log(log_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    log = db.query(models.TransmissionLog).filter(models.TransmissionLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
        
    payload = json.loads(log.payload_json)
    
    # Run in background via stream_manager logic
    background_tasks.add_task(
        stream_manager._send_with_retry,
        str(log.session_id) if log.session_id else "manual",
        log.device_id,
        log.patient_code,
        log.scenario,
        payload,
        log.idempotency_key, # Keep idempotency
        log.correlation_id
    )
    return {"status": "queued"}

@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(models.Settings).all()
    return [{"key": s.key, "value": s.value, "is_secret": s.is_secret} for s in settings]

@router.post("/settings")
def update_setting(setting: schemas.SettingsUpdate, db: Session = Depends(get_db)):
    db_setting = db.query(models.Settings).filter(models.Settings.key == setting.key).first()
    if db_setting:
        db_setting.value = setting.value
        db_setting.is_secret = setting.is_secret
    else:
        db_setting = models.Settings(**setting.model_dump())
        db.add(db_setting)
    db.commit()
    return {"status": "success"}

@router.post("/settings/test")
async def test_connection(req: schemas.TestConnectionRequest):
    try:
        url = f"{req.base_url.rstrip('/')}/api/health"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            if response.status_code < 400:
                return {"status": "success"}
            else:
                raise HTTPException(status_code=response.status_code, detail="Connection failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_devices = db.query(models.Device).count()
    active_streams = len(stream_manager.active_tasks)
    total_sent = db.query(models.TransmissionLog).count()
    success_sent = db.query(models.TransmissionLog).filter(models.TransmissionLog.status == "success").count()
    
    return {
        "total_devices": total_devices,
        "active_streams": active_streams,
        "total_sent": total_sent,
        "success_rate": round(success_sent / total_sent * 100, 2) if total_sent > 0 else 100.0
    }

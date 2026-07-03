import asyncio
import httpx
import uuid
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import TransmissionLog, Settings
from .simulator import simulator_engine

logger = logging.getLogger(__name__)

class StreamManager:
    def __init__(self):
        self.active_tasks = {}
        self.client = httpx.AsyncClient()

    async def _get_settings(self):
        db = SessionLocal()
        try:
            settings_records = db.query(Settings).all()
            settings_dict = {s.key: s.value for s in settings_records}
            return {
                "base_url": settings_dict.get("HOSPITALAI_BASE_URL", "http://localhost:8000"),
                "endpoint": settings_dict.get("VITALS_ENDPOINT_PATH", "/api/integrations/vitals/ingest"),
                "api_key": settings_dict.get("INTEGRATION_API_KEY", "")
            }
        finally:
            db.close()

    def start_stream(self, session_id: str, device_id: str, patient_code: str, scenario: str, interval: int, correlation_id: str):
        if session_id in self.active_tasks:
            return
        
        task = asyncio.create_task(
            self._stream_loop(session_id, device_id, patient_code, scenario, interval, correlation_id)
        )
        self.active_tasks[session_id] = task

    def stop_stream(self, session_id: str):
        if session_id in self.active_tasks:
            task = self.active_tasks.pop(session_id)
            task.cancel()
            
    def stop_all(self):
        for task in self.active_tasks.values():
            task.cancel()
        self.active_tasks.clear()

    async def _stream_loop(self, session_id: str, device_id: str, patient_code: str, scenario: str, interval: int, correlation_id: str):
        tick = 0
        try:
            while True:
                # Generate new reading
                payload = simulator_engine.generate_reading(session_id, patient_code, device_id, scenario, tick)
                # Generate exact idempotency key for this reading
                idempotency_key = str(uuid.uuid4())
                
                # Send it
                await self._send_with_retry(session_id, device_id, patient_code, scenario, payload, idempotency_key, correlation_id)
                
                tick += 1
                await asyncio.sleep(interval)
        except asyncio.CancelledError:
            logger.info(f"Stream {session_id} cancelled.")
            raise

    async def _send_with_retry(self, session_id: str, device_id: str, patient_code: str, scenario: str, payload: dict, idempotency_key: str, correlation_id: str):
        settings = await self._get_settings()
        url = f"{settings['base_url'].rstrip('/')}{settings['endpoint']}"
        if "{patient_code}" in url:
            url = url.replace("{patient_code}", str(patient_code))
            
        headers = {
            "Content-Type": "application/json",
            "X-Integration-Key": settings['api_key'],
            "X-Idempotency-Key": idempotency_key,
            "X-Correlation-ID": correlation_id
        }

        max_retries = 3
        attempt = 1
        success = False
        
        db = SessionLocal()
        start_time = datetime.now()
        
        try:
            while attempt <= max_retries and not success:
                try:
                    response = await self.client.post(url, json=payload, headers=headers, timeout=10.0)
                    latency = int((datetime.now() - start_time).total_seconds() * 1000)
                    
                    if response.status_code < 400:
                        success = True
                        self._log_transmission(db, session_id, device_id, patient_code, scenario, payload, "success", 
                                             response.status_code, response.text, None, idempotency_key, correlation_id, latency, attempt)
                    else:
                        if attempt == max_retries:
                            self._log_transmission(db, session_id, device_id, patient_code, scenario, payload, "failed", 
                                                 response.status_code, response.text, f"HTTP Error {response.status_code}", idempotency_key, correlation_id, latency, attempt)
                        else:
                            await asyncio.sleep(2 ** attempt) # Exponential backoff
                            
                except httpx.RequestError as e:
                    if attempt == max_retries:
                        latency = int((datetime.now() - start_time).total_seconds() * 1000)
                        self._log_transmission(db, session_id, device_id, patient_code, scenario, payload, "failed", 
                                             None, None, str(e), idempotency_key, correlation_id, latency, attempt)
                    else:
                        await asyncio.sleep(2 ** attempt)
                        
                attempt += 1
        finally:
            db.close()

    def _log_transmission(self, db: Session, session_id, device_id, patient_code, scenario, payload, status, http_status, response_body, error_message, idempotency_key, correlation_id, latency, attempt):
        log = TransmissionLog(
            session_id=int(session_id) if session_id.isdigit() else None,
            device_id=device_id,
            patient_code=patient_code,
            scenario=scenario,
            payload_json=json.dumps(payload),
            status=status,
            http_status=http_status,
            response_body=response_body,
            error_message=error_message,
            idempotency_key=idempotency_key,
            correlation_id=correlation_id,
            latency_ms=latency,
            attempt_count=attempt
        )
        db.add(log)
        db.commit()

stream_manager = StreamManager()

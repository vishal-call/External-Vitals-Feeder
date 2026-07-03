import random
from datetime import datetime, timezone
from typing import Dict, Any

def get_current_time():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

class VitalsSimulator:
    def __init__(self):
        # We store state per session to allow progression over time
        self.state = {}

    def generate_reading(self, session_id: str, patient_code: str, device_id: str, scenario: str, tick: int) -> Dict[str, Any]:
        
        # Initialize state if not present
        if session_id not in self.state:
            self.state[session_id] = {
                "spo2": random.randint(96, 99),
                "hr": random.randint(70, 95),
                "rr": random.randint(12, 18),
                "temp": round(random.uniform(36.5, 37.2), 1),
                "sbp": random.randint(110, 130),
                "dbp": random.randint(70, 85),
                "consciousness": "ALERT",
                "o2_supp": False
            }

        s = self.state[session_id]

        if scenario == "Stable Adult":
            s["spo2"] = min(100, max(95, s["spo2"] + random.randint(-1, 1)))
            s["hr"] = min(100, max(65, s["hr"] + random.randint(-2, 2)))
            s["rr"] = min(20, max(12, s["rr"] + random.randint(-1, 1)))
            s["temp"] = round(s["temp"] + random.uniform(-0.1, 0.1), 1)

        elif scenario == "Slow Deterioration":
            # SpO2 drops 1% per tick, HR rises 2bpm per tick
            s["spo2"] = max(70, s["spo2"] - 1 + random.randint(-1, 0))
            s["hr"] = min(200, s["hr"] + 2 + random.randint(0, 2))
            if s["spo2"] < 90:
                s["o2_supp"] = True
                s["consciousness"] = "CVPU_VOICE"

        elif scenario == "Sudden Hypoxia":
            if tick < 5:
                # Normal first few ticks
                s["spo2"] = min(100, max(95, s["spo2"] + random.randint(-1, 1)))
                s["hr"] = min(100, max(65, s["hr"] + random.randint(-2, 2)))
            else:
                # Sudden drop
                s["spo2"] = max(60, 84 + random.randint(-2, 2))
                s["rr"] = min(40, 30 + random.randint(-2, 3))
                s["hr"] = min(160, 120 + random.randint(-5, 5))
                s["o2_supp"] = True
                s["consciousness"] = "CVPU_CONFUSED"

        elif scenario == "Severe Tachycardia":
            if tick < 3:
                s["hr"] = min(100, max(65, s["hr"] + random.randint(-2, 2)))
            else:
                s["hr"] = min(220, 140 + random.randint(5, 15))
                s["sbp"] = max(80, s["sbp"] - random.randint(1, 5))
                if s["hr"] > 160:
                    s["consciousness"] = "CVPU_UNRESPONSIVE"

        elif scenario == "Septic Pattern":
            s["temp"] = min(40.0, max(38.8, s["temp"] + random.uniform(0.1, 0.2)))
            s["hr"] = min(160, max(120, s["hr"] + random.randint(-2, 5)))
            s["sbp"] = max(70, s["sbp"] - random.randint(1, 3))
            s["dbp"] = max(40, s["dbp"] - random.randint(1, 2))
            if s["sbp"] <= 90:
                s["consciousness"] = "CVPU_VOICE"

        # Apply realistic constraints
        s["temp"] = round(s["temp"], 1)

        payload = {
            "patient_code": patient_code,
            "device_id": device_id,
            "respiratory_rate": s["rr"],
            "resp_rate": s["rr"],
            "spo2": s["spo2"],
            "spo2_scale": 1,
            "oxygen_supplement": s["o2_supp"],
            "temperature": s["temp"],
            "systolic_bp": s["sbp"],
            "diastolic_bp": s["dbp"],
            "heart_rate": s["hr"],
            "consciousness_level": s["consciousness"],
            "recorded_at": get_current_time(),
            "recorded_by": "Vitals_Feeder_App",
            "source": "external_vitals_feeder"
        }
        
        return payload

simulator_engine = VitalsSimulator()

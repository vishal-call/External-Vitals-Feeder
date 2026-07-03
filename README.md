# External Vitals Feeder

This is a standalone application designed to simulate an external hospital bedside monitor or device gateway. It generates realistic patient vitals and pushes them to a separate system (HospitalAI) via a secure REST API.

## Architecture

- **Backend**: FastAPI running on port 8100. Local SQLite database for persisting streams and logs.
- **Frontend**: Next.js running on port 3100.
- **Data Flow**: The backend uses an asyncio-based background streamer to generate data points and push them out.

## How to Run

```bash
docker-compose up --build
```

- **Frontend UI**: http://localhost:3100
- **Backend API**: http://localhost:8100

## Features
- Idempotency handling for HTTP requests
- Exponential backoff retry logic
- Authentic medical aesthetic for live stream monitoring

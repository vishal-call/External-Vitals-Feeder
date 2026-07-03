@echo off
echo Starting External Vitals Feeder...
docker-compose up -d

echo.
echo =========================================================
echo  External Vitals Feeder is running!
echo  Frontend UI: http://localhost:3100
echo  Backend API: http://localhost:8100
echo =========================================================
echo.
pause

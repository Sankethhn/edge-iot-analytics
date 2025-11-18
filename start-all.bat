@echo off
title Edge IoT Analytics - Starting All Services
color 0A

echo Starting MQTT Broker...
start "Mosquitto MQTT Broker" /MIN cmd /k "mosquitto -v -c mosquitto.conf"

timeout /t 2 /nobreak >nul

echo Starting Cloud Server...
start "Cloud Server" /MIN cmd /k "cd cloud && npm install && node server.js"

timeout /t 2 /nobreak >nul

echo Starting Edge Processor...
start "Edge Processor" /MIN cmd /k "cd edge-device && node edge-processor.js"

timeout /t 2 /nobreak >nul

echo Starting Sensor Simulator...
start "Sensor Simulator" /MIN cmd /k "cd edge-device && node sensor-simulator.js"

timeout /t 2 /nobreak >nul

echo All services started!
echo ----------------------------------------
echo Dashboard will open in your default browser...
start http://localhost:3000

echo.
echo To stop all services, close all the opened command windows.
echo.

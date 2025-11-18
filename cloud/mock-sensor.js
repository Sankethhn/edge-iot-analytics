const io = require('socket.io-client');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/mock-sensor.log' })
  ]
});

// Device configuration
const DEVICE_ID = 'mock-device-001';
const UPDATE_INTERVAL = 5000; // 5 seconds

// Initial values with realistic ranges
let temperature = 25.0; // °C
let humidity = 50.0;    // %
let vibration = 0.1;    // g

// Connect to WebSocket server
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  logger.info('Connected to WebSocket server');
  startDataEmission();
});

socket.on('connect_error', (err) => {
  logger.error(`WebSocket connection error: ${err.message}`);
});

// Simulate sensor drift and environmental changes
function simulateEnvironmentalChanges() {
  // Temperature changes based on time of day (colder at night, warmer during day)
  const hour = new Date().getHours();
  const dayNightCycle = Math.sin((hour / 24) * Math.PI * 2); // -1 to 1 over 24h
  
  // Base temperature varies between 20°C and 30°C based on time of day
  const baseTemp = 25 + (5 * dayNightCycle);
  
  // Add some random variation (±1.5°C)
  const tempVariation = (Math.random() * 3) - 1.5;
  const newTemp = baseTemp + tempVariation;
  
  // Smooth temperature changes (don't jump too quickly)
  temperature = temperature + (newTemp - temperature) * 0.3;
  
  // Humidity is inversely related to temperature and has its own variation
  const humidityBase = 60 - (dayNightCycle * 15); // 45-75% range
  const humidityVariation = (Math.random() * 10) - 5;
  const newHumidity = Math.min(100, Math.max(0, humidityBase + humidityVariation));
  humidity = humidity + (newHumidity - humidity) * 0.2;
  
  // Vibration increases during "daytime" (simulating more activity)
  const vibrationBase = 0.1 + (0.4 * (1 + dayNightCycle) / 2);
  vibration = vibrationBase + (Math.random() * 0.2);
}

// Process and emit sensor data
function emitSensorData() {
  const timestamp = new Date().toISOString();
  
  // Create realistic sensor readings
  const sensorData = {
    deviceId: DEVICE_ID,
    timestamp,
    temperature: parseFloat(temperature.toFixed(2)),
    humidity: parseFloat(humidity.toFixed(2)),
    vibration: parseFloat(vibration.toFixed(4)),
    battery: 95 + (Math.random() * 5), // 95-100%
    rssi: -50 - (Math.random() * 30)   // Signal strength
  };
  
  // Emit the sensor data
  socket.emit('deviceUpdate', sensorData);
  logger.debug(`Emitted sensor data: ${JSON.stringify(sensorData)}`);
  
  // Occasionally generate alerts (10% chance)
  if (Math.random() < 0.1) {
    const alertTypes = [
      { type: 'high_temp', message: 'High temperature detected', threshold: 30 },
      { type: 'low_temp', message: 'Low temperature detected', threshold: 20 },
      { type: 'high_humidity', message: 'High humidity detected', threshold: 80 },
      { type: 'low_humidity', message: 'Low humidity detected', threshold: 30 },
      { type: 'vibration', message: 'High vibration detected', threshold: 0.4 }
    ];
    
    const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const alertData = {
      deviceId: DEVICE_ID,
      timestamp,
      type: alert.type,
      message: alert.message,
      value: sensorData[alert.type.split('_')[1]] || vibration,
      threshold: alert.threshold,
      severity: 'warning'
    };
    
    // Emit the alert
    socket.emit('alert', alertData);
    logger.warn(`Emitted alert: ${JSON.stringify(alertData)}`);
  }
}

// Start the data emission
function startDataEmission() {
  logger.info(`Starting mock data emission every ${UPDATE_INTERVAL/1000} seconds`);
  
  // Start emitting data at regular intervals
  setInterval(() => {
    simulateEnvironmentalChanges();
    emitSensorData();
  }, UPDATE_INTERVAL);
  
  // Initial data emission
  simulateEnvironmentalChanges();
  emitSensorData();
}

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Stopping mock sensor...');
  socket.close();
  process.exit(0);
});

logger.info('Mock sensor service started');

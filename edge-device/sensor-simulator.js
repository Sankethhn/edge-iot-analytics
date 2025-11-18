const mqtt = require('mqtt');
const config = require('../shared/config');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/sensor-simulator.log' })
  ]
});

// Generate a unique device ID
const deviceId = `device-${uuidv4().substring(0, 8)}`;

// Connect to MQTT broker
const client = mqtt.connect(config.mqtt.brokerUrl);

client.on('connect', () => {
  logger.info(`Sensor simulator connected to MQTT broker as ${deviceId}`);
  
  // Start sending sensor data
  setInterval(() => {
    const sensorData = generateSensorData();
    const message = JSON.stringify({
      deviceId,
      timestamp: new Date().toISOString(),
      ...sensorData
    });
    
    client.publish(config.mqtt.topics.sensorData, message);
    logger.debug(`Published sensor data: ${message}`);
  }, config.simulation.interval);
});

client.on('error', (error) => {
  logger.error(`MQTT error: ${error.message}`);
});

// Generate random sensor data
function generateSensorData() {
  return {
    temperature: (Math.random() * (config.simulation.maxTemp - config.simulation.minTemp) + config.simulation.minTemp).toFixed(2),
    humidity: (Math.random() * (config.simulation.maxHumidity - config.simulation.minHumidity) + config.simulation.minHumidity).toFixed(2),
    vibration: (Math.random() * 10).toFixed(2),
    battery: (Math.random() * 20 + 80).toFixed(2) // 80-100%
  };
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down sensor simulator...');
  client.end();
  process.exit(0);
});

logger.info(`Starting IoT Sensor Simulator (${deviceId})...`);

const mqtt = require('mqtt');
const config = require('../shared/config');
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
    new winston.transports.File({ filename: 'logs/edge-processor.log' })
  ]
});

// In-memory storage for recent sensor readings
const sensorReadings = new Map(); // deviceId -> [readings]

// Connect to MQTT broker
const client = mqtt.connect(config.mqtt.brokerUrl);

client.on('connect', () => {
  logger.info('Edge processor connected to MQTT broker');
  
  // Subscribe to sensor data topic
  client.subscribe(config.mqtt.topics.sensorData, (err) => {
    if (err) {
      logger.error(`Failed to subscribe to ${config.mqtt.topics.sensorData}: ${err.message}`);
    } else {
      logger.info(`Subscribed to ${config.mqtt.topics.sensorData}`);
    }
  });
});

// Process incoming messages
client.on('message', (topic, message) => {
  if (topic === config.mqtt.topics.sensorData) {
    try {
      const data = JSON.parse(message.toString());
      processSensorData(data);
    } catch (error) {
      logger.error(`Error processing sensor data: ${error.message}`);
    }
  }
});

function processSensorData(data) {
  const { deviceId } = data;
  
  // Initialize device readings array if it doesn't exist
  if (!sensorReadings.has(deviceId)) {
    sensorReadings.set(deviceId, []);
  }
  
  const deviceReadings = sensorReadings.get(deviceId);
  deviceReadings.push(data);
  
  // Keep only the most recent readings (configurable batch size)
  if (deviceReadings.length > config.edge.batchSize) {
    deviceReadings.shift();
  }
  
  // If we have enough readings, process them
  if (deviceReadings.length >= config.edge.batchSize) {
    analyzeData(deviceReadings);
  }
}

function analyzeData(readings) {
  // Calculate basic statistics
  const temps = readings.map(r => parseFloat(r.temperature));
  const humidities = readings.map(r => parseFloat(r.humidity));
  
  const avgTemp = calculateAverage(temps);
  const avgHumidity = calculateAverage(humidities);
  const tempStdDev = calculateStandardDeviation(temps);
  
  // Check for anomalies
  const latestReading = readings[readings.length - 1];
  const tempAnomaly = isAnomaly(
    parseFloat(latestReading.temperature), 
    avgTemp, 
    tempStdDev
  );
  
  // Prepare processed data
  const processedData = {
    deviceId: latestReading.deviceId,
    timestamp: new Date().toISOString(),
    metrics: {
      temperature: {
        value: latestReading.temperature,
        average: avgTemp.toFixed(2),
        stdDev: tempStdDev.toFixed(2),
        anomaly: tempAnomaly,
        unit: '°C'
      },
      humidity: {
        value: latestReading.humidity,
        average: avgHumidity.toFixed(2),
        unit: '%'
      },
      battery: {
        value: latestReading.battery,
        unit: '%',
        status: parseFloat(latestReading.battery) < 20 ? 'LOW' : 'OK'
      }
    }
  };
  
  // Publish processed data
  client.publish(
    config.mqtt.topics.processedData, 
    JSON.stringify(processedData)
  );
  
  // Log anomalies
  if (tempAnomaly) {
    const alert = {
      deviceId: latestReading.deviceId,
      timestamp: new Date().toISOString(),
      type: 'TEMPERATURE_ANOMALY',
      value: latestReading.temperature,
      average: avgTemp.toFixed(2),
      threshold: (avgTemp + config.edge.anomalyThreshold * tempStdDev).toFixed(2)
    };
    
    client.publish(
      config.mqtt.topics.alerts,
      JSON.stringify(alert)
    );
    
    logger.warn(`Temperature anomaly detected: ${JSON.stringify(alert)}`);
  }
}

// Utility functions
function calculateAverage(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateStandardDeviation(values) {
  const avg = calculateAverage(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(calculateAverage(squareDiffs));
}

function isAnomaly(value, mean, stdDev) {
  return Math.abs(value - mean) > config.edge.anomalyThreshold * stdDev;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down edge processor...');
  client.end();
  process.exit(0);
});

logger.info('Starting Edge Data Processor...');

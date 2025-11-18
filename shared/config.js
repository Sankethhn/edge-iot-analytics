module.exports = {
  // MQTT Broker Configuration (local broker for edge)
  mqtt: {
    brokerUrl: 'mqtt://localhost:1883',
    topics: {
      sensorData: 'sensors/data',
      processedData: 'sensors/processed',
      alerts: 'sensors/alerts'
    }
  },
  
  // Web Server Configuration
  server: {
    port: 3000,
    host: 'localhost'
  },
  
  // Edge Processing Configuration
  edge: {
    processingInterval: 5000, // 5 seconds
    anomalyThreshold: 3, // Standard deviations from mean
    batchSize: 10 // Number of readings to process in a batch
  },
  
  // Sensor Simulation
  simulation: {
    minTemp: 15, // °C
    maxTemp: 35, // °C
    minHumidity: 30, // %
    maxHumidity: 90, // %
    interval: 2000 // ms between readings
  }
};

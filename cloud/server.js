const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const winston = require('winston');
const sensorDataGenerator = require('../src/data/sensorDataGenerator');
const config = require('./config');

// Initialize Express and HTTP server
const app = express();
const server = http.createServer(app);

// Configure WebSocket
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join(__dirname, 'logs', 'cloud-server.log') 
    })
  ]
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// WebSocket connection handler
io.on('connection', (socket) => {
  logger.info('New client connected');
  
  // Send initial data
  const initialData = sensorDataGenerator.getCurrentData();
  socket.emit('initialData', initialData);
  
  // Set up periodic updates
  const updateInterval = setInterval(() => {
    const currentData = sensorDataGenerator.getCurrentData();
    socket.emit('dataUpdate', currentData);
  }, 5000);
  
  // Handle client disconnection
  socket.on('disconnect', () => {
    logger.info('Client disconnected');
    clearInterval(updateInterval);
  });
  
  // Handle errors
  socket.on('error', (error) => {
    logger.error(`WebSocket error: ${error.message}`);
  });
});

// API Endpoints

/**
 * @api {get} /api/current Get current sensor data
 * @apiName GetCurrentData
 * @apiGroup SensorData
 */
app.get('/api/current', (req, res) => {
  try {
    const data = sensorDataGenerator.getCurrentData();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: data.devices,
      history: Object.keys(data.history).reduce((acc, key) => {
        acc[key] = data.history[key].length;
        return acc;
      }, {})
    });
  } catch (error) {
    logger.error(`Error getting current data: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sensor data'
    });
  }
});

/**
 * @api {get} /api/history/:metric Get historical data for a specific metric
 * @apiName GetHistory
 * @apiGroup SensorData
 * @apiParam {String} metric The metric to retrieve (temperature, humidity, etc.)
 */
app.get('/api/history/:metric', (req, res) => {
  try {
    const { metric } = req.params;
    const data = sensorDataGenerator.getCurrentData();
    
    if (!data.history[metric]) {
      return res.status(404).json({
        success: false,
        error: `No history available for metric: ${metric}`
      });
    }
    
    res.json({
      success: true,
      metric,
      count: data.history[metric].length,
      data: data.history[metric]
    });
  } catch (error) {
    logger.error(`Error getting history: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve historical data'
    });
  }
});

/**
 * @api {get} /api/devices List all devices
 * @apiName GetDevices
 * @apiGroup Devices
 */
app.get('/api/devices', (req, res) => {
  try {
    const data = sensorDataGenerator.getCurrentData();
    res.json({
      success: true,
      count: Object.keys(data.devices).length,
      data: data.devices
    });
  } catch (error) {
    logger.error(`Error getting devices: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve device list'
    });
  }
});

/**
 * @api {get} /api/devices/:deviceId Get device by ID
 * @apiName GetDevice
 * @apiGroup Devices
 * @apiParam {String} deviceId The ID of the device to retrieve
 */
app.get('/api/devices/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const data = sensorDataGenerator.getCurrentData();
    const device = Object.values(data.devices).find(d => d.id === deviceId);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: `Device not found: ${deviceId}`
      });
    }
    
    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    logger.error(`Error getting device: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve device information'
    });
  }
});

// Serve the main application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.stack}`);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!require('fs').existsSync(logsDir)) {
  require('fs').mkdirSync(logsDir, { recursive: true });
}

server.listen(PORT, HOST, () => {
  logger.info(`Server running at http://${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle graceful shutdown
const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  // Close the server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force close server after 5 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000);
};

// Handle different shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.stack}`);
  shutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  shutdown('unhandledRejection');
});

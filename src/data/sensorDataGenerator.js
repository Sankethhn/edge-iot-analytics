class SensorDataGenerator {
  constructor() {
    this.devices = {
      temperature: {
        id: 'temp-sensor-1',
        name: 'Temperature Sensor',
        unit: '°C',
        min: 15,
        max: 35,
        current: 22,
        trend: 0,
        history: []
      },
      humidity: {
        id: 'humidity-sensor-1',
        name: 'Humidity Sensor',
        unit: '%',
        min: 30,
        max: 80,
        current: 50,
        trend: 0,
        history: []
      },
      airQuality: {
        id: 'air-sensor-1',
        name: 'Air Quality Sensor',
        unit: 'AQI',
        min: 0,
        max: 100,
        current: 40,
        trend: 0,
        history: []
      },
      energy: {
        id: 'energy-meter-1',
        name: 'Energy Meter',
        unit: 'kW',
        min: 0.2,
        max: 2.5,
        current: 1.2,
        trend: 0,
        history: []
      }
    };
    this.initializeHistory();
  }

  initializeHistory() {
    const now = new Date();
    // Generate 24 hours of historical data
    for (let i = 24; i >= 0; i--) {
      const timestamp = new Date(now);
      timestamp.setHours(timestamp.getHours() - i);
      
      for (const [key, device] of Object.entries(this.devices)) {
        this.updateDeviceValue(device, timestamp, true);
      }
    }
  }

  updateDeviceValue(device, timestamp, isHistorical = false) {
    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();
    const timeFactor = hour + minute / 60;
    
    // Base value based on time of day
    let baseValue;
    let variation;
    
    switch(device.id.split('-')[0]) {
      case 'temp':
        // Temperature follows a daily cycle (colder at night, warmer during day)
        baseValue = 20 + 6 * Math.sin((timeFactor - 12) * Math.PI / 12);
        variation = 0.3;
        break;
        
      case 'humidity':
        // Humidity is inversely related to temperature
        baseValue = 60 - 15 * Math.sin((timeFactor - 12) * Math.PI / 12);
        variation = 1.5;
        break;
        
      case 'air':
        // Air quality is worse during rush hours (8-10 AM and 5-7 PM)
        const isRushHour = (hour >= 8 && hour < 10) || (hour >= 17 && hour < 19);
        baseValue = isRushHour ? 60 + Math.random() * 30 : 30 + Math.random() * 30;
        variation = 5;
        break;
        
      case 'energy':
        // Energy usage is higher during the day
        baseValue = 1.0 + 0.8 * Math.sin((timeFactor - 12) * Math.PI / 12);
        variation = 0.2;
        break;
    }
    
    // Add some randomness
    const newValue = baseValue + (Math.random() * 2 - 1) * variation;
    
    // Calculate trend (if not historical)
    if (!isHistorical) {
      const prevValue = device.current;
      device.trend = ((newValue - prevValue) / prevValue * 100).toFixed(1);
      device.current = Math.max(device.min, Math.min(device.max, newValue));
    }
    
    // Add to history
    const dataPoint = {
      timestamp: timestamp.toISOString(),
      value: Math.max(device.min, Math.min(device.max, newValue)).toFixed(1)
    };
    
    device.history.push(dataPoint);
    
    // Keep only last 24 hours of data
    if (device.history.length > 24) {
      device.history.shift();
    }
    
    return dataPoint;
  }

  updateAllDevices() {
    const now = new Date();
    const updates = {};
    
    for (const [key, device] of Object.entries(this.devices)) {
      this.updateDeviceValue(device, now);
      updates[key] = this.getDeviceData(device);
    }
    
    return updates;
  }

  getDeviceData(device) {
    return {
      id: device.id,
      name: device.name,
      value: Number(device.current.toFixed(1)),
      unit: device.unit,
      status: this.getStatus(device),
      min: device.min,
      max: device.max,
      trend: Number(device.trend)
    };
  }

  getStatus(device) {
    const value = device.current;
    const range = device.max - device.min;
    const position = (value - device.min) / range;
    
    if (position > 0.8 || position < 0.2) {
      return 'warning';
    }
    return 'normal';
  }

  getCurrentData() {
    const result = {
      timestamp: new Date().toISOString(),
      devices: {},
      history: {}
    };
    
    for (const [key, device] of Object.entries(this.devices)) {
      result.devices[key] = this.getDeviceData(device);
      result.history[key] = [...device.history];
    }
    
    return result;
  }
}

// Create a singleton instance
const sensorDataGenerator = new SensorDataGenerator();

// Update data every 5 seconds
setInterval(() => {
  sensorDataGenerator.updateAllDevices();
}, 5000);

module.exports = sensorDataGenerator;

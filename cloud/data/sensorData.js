// Dummy sensor data generator
const generateDummyData = () => {
  const now = new Date();
  const data = {
    timestamp: now.toISOString(),
    devices: {
      temperature: {
        value: (20 + Math.sin(now.getHours() * Math.PI / 12) * 5 + (Math.random() * 2 - 1)).toFixed(1),
        unit: '°C',
        status: 'normal',
        min: 15,
        max: 35,
        trend: (Math.random() > 0.5 ? 1 : -1) * (0.1 + Math.random() * 0.5).toFixed(1)
      },
      humidity: {
        value: (50 + Math.cos(now.getHours() * Math.PI / 12) * 15 + (Math.random() * 4 - 2)).toFixed(1),
        unit: '%',
        status: 'normal',
        min: 30,
        max: 80,
        trend: (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.8).toFixed(1)
      },
      airQuality: {
        value: Math.floor(30 + Math.sin(now.getHours() * Math.PI / 6) * 20 + (Math.random() * 10 - 5)),
        unit: 'AQI',
        status: Math.random() > 0.7 ? 'warning' : 'normal',
        min: 0,
        max: 100
      },
      energy: {
        value: (1.0 + Math.sin(now.getHours() * Math.PI / 12) * 0.8 + (Math.random() * 0.3)).toFixed(2),
        unit: 'kW',
        status: Math.random() > 0.8 ? 'warning' : 'normal',
        min: 0.2,
        max: 2.5
      }
    },
    history: {
      temperature: [],
      humidity: [],
      airQuality: [],
      energy: []
    }
  };

  // Generate 24 hours of historical data
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now);
    time.setHours(now.getHours() - i);
    
    data.history.temperature.push({
      timestamp: time.toISOString(),
      value: (20 + Math.sin((time.getHours() + time.getMinutes()/60) * Math.PI / 12) * 5 + (Math.random() * 2 - 1)).toFixed(1)
    });
    
    data.history.humidity.push({
      timestamp: time.toISOString(),
      value: (50 + Math.cos((time.getHours() + time.getMinutes()/60) * Math.PI / 12) * 15 + (Math.random() * 4 - 2)).toFixed(1)
    });
    
    data.history.airQuality.push({
      timestamp: time.toISOString(),
      value: Math.floor(30 + Math.sin((time.getHours() + time.getMinutes()/60) * Math.PI / 6) * 20 + (Math.random() * 10 - 5))
    });
    
    data.history.energy.push({
      timestamp: time.toISOString(),
      value: (1.0 + Math.sin((time.getHours() + time.getMinutes()/60) * Math.PI / 12) * 0.8 + (Math.random() * 0.3)).toFixed(2)
    });
  }

  return data;
};

module.exports = { generateDummyData };

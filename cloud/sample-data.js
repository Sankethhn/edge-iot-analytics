const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const createHistory = (hours, baseTemp, baseHumidity) => {
  const history = [];
  for (let i = hours - 1; i >= 0; i -= 1) {
    const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
    const tempDrift = Math.sin((timestamp.getHours() / 24) * Math.PI * 2) * 2;
    const humidityDrift = Math.cos((timestamp.getHours() / 24) * Math.PI * 2) * 5;
    const temperature = clamp(baseTemp + tempDrift + (Math.random() * 1.5 - 0.75), 18, 35);
    const humidity = clamp(baseHumidity + humidityDrift + (Math.random() * 6 - 3), 25, 85);

    history.push({
      timestamp: timestamp.toISOString(),
      temperature: parseFloat(temperature.toFixed(1)),
      humidity: parseFloat(humidity.toFixed(1))
    });
  }
  return history;
};

const addMetricSummary = (history, metric) => {
  const values = history.map((point) => point[metric]);
  const average = values.reduce((acc, val) => acc + val, 0) / values.length;
  const variance =
    values.reduce((acc, val) => acc + (val - average) ** 2, 0) / Math.max(values.length - 1, 1);
  const stdDev = Math.sqrt(variance);

  return {
    value: values[values.length - 1],
    average: parseFloat(average.toFixed(1)),
    stdDev: parseFloat(stdDev.toFixed(1)),
    trend: parseFloat((values[values.length - 1] - values[values.length - 2]).toFixed(1))
  };
};

const deviceBlueprints = [
  {
    deviceId: 'edge-node-alpha',
    name: 'Cold Storage Alpha',
    location: 'warehouse_a',
    baseTemperature: 23.5,
    baseHumidity: 42,
    battery: 92,
    power: 2.4,
    vibration: 0.12
  },
  {
    deviceId: 'edge-node-bravo',
    name: 'Assembly Line Bravo',
    location: 'production_line_1',
    baseTemperature: 28.1,
    baseHumidity: 37,
    battery: 78,
    power: 3.1,
    vibration: 0.32
  },
  {
    deviceId: 'edge-node-charlie',
    name: 'Quality Lab Charlie',
    location: 'quality_lab',
    baseTemperature: 21.2,
    baseHumidity: 55,
    battery: 88,
    power: 1.8,
    vibration: 0.08
  },
  {
    deviceId: 'edge-node-delta',
    name: 'Packaging Delta',
    location: 'packaging_bay',
    baseTemperature: 26.4,
    baseHumidity: 48,
    battery: 65,
    power: 2.9,
    vibration: 0.22
  }
];

const devices = deviceBlueprints.map((blueprint, index) => {
  const history = createHistory(24, blueprint.baseTemperature, blueprint.baseHumidity);
  const temperatureMetrics = addMetricSummary(history, 'temperature');
  const humidityMetrics = addMetricSummary(history, 'humidity');
  const timestamp = new Date().toISOString();

  return {
    deviceId: blueprint.deviceId,
    name: blueprint.name,
    location: blueprint.location,
    status: index === 1 ? 'warning' : 'online',
    online: true,
    uptime: `${(Math.random() * 47 + 12).toFixed(1)} hrs`,
    signalStrength: Math.round(70 + Math.random() * 25),
    timestamp,
    temperature: temperatureMetrics.value,
    humidity: humidityMetrics.value,
    battery: blueprint.battery,
    power: blueprint.power,
    vibration: blueprint.vibration,
    history,
    metrics: {
      temperature: {
        ...temperatureMetrics,
        anomaly: temperatureMetrics.value > 30
      },
      humidity: {
        ...humidityMetrics,
        anomaly: humidityMetrics.value > 65
      },
      battery: {
        value: blueprint.battery,
        status: blueprint.battery < 40 ? 'LOW' : 'HEALTHY'
      },
      power: {
        value: blueprint.power,
        unit: 'kW'
      },
      vibration: {
        value: blueprint.vibration,
        unit: 'g'
      }
    }
  };
});

const alerts = [
  {
    deviceId: 'edge-node-bravo',
    type: 'TEMPERATURE_ANOMALY',
    message: 'Temperature exceeded 30°C threshold',
    level: 'warning',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    deviceId: 'edge-node-delta',
    type: 'BATTERY_LOW',
    message: 'Battery dropped below 40%',
    level: 'danger',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString()
  },
  {
    deviceId: 'edge-node-alpha',
    type: 'HUMIDITY_HIGH',
    message: 'Humidity trend rising faster than normal',
    level: 'info',
    timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString()
  }
];

module.exports = {
  devices,
  alerts
};

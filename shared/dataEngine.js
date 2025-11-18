const sampleData = require('../cloud/sample-data');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const createHistoryEntry = (temperature, humidity, timestamp = new Date()) => ({
  timestamp: timestamp.toISOString(),
  temperature: parseFloat(temperature.toFixed(1)),
  humidity: parseFloat(humidity.toFixed(1))
});

const cloneDevice = (device) => ({
  ...device,
  history: Array.isArray(device.history) ? [...device.history] : []
});

const buildUpdatedDevice = (device) => {
  const tempMetric = device.metrics?.temperature || {};
  const humidityMetric = device.metrics?.humidity || {};
  const batteryMetric = device.metrics?.battery || {};

  const baseTemp = parseFloat(tempMetric.value ?? device.temperature ?? 0);
  const baseHumidity = parseFloat(humidityMetric.value ?? device.humidity ?? 0);
  const baseBattery = parseFloat(batteryMetric.value ?? device.battery ?? 100);

  const temperature = clamp(baseTemp + (Math.random() * 0.8 - 0.4), 18, 36);
  const humidity = clamp(baseHumidity + (Math.random() * 2.5 - 1.25), 25, 80);
  const battery = clamp(baseBattery - Math.random() * 0.2, 35, 100);

  const history = Array.isArray(device.history) ? [...device.history] : [];
  history.push(createHistoryEntry(temperature, humidity));
  while (history.length > 48) {
    history.shift();
  }

  const timestamp = new Date().toISOString();

  return {
    ...device,
    timestamp,
    temperature: parseFloat(temperature.toFixed(1)),
    humidity: parseFloat(humidity.toFixed(1)),
    battery: parseFloat(battery.toFixed(1)),
    metrics: {
      ...device.metrics,
      temperature: {
        ...device.metrics?.temperature,
        value: parseFloat(temperature.toFixed(1)),
        trend: parseFloat((temperature - baseTemp).toFixed(1)),
        anomaly: temperature > 32
      },
      humidity: {
        ...device.metrics?.humidity,
        value: parseFloat(humidity.toFixed(1)),
        trend: parseFloat((humidity - baseHumidity).toFixed(1)),
        anomaly: humidity > 68
      },
      battery: {
        ...device.metrics?.battery,
        value: parseFloat(battery.toFixed(1)),
        status: battery < 40 ? 'LOW' : 'HEALTHY'
      }
    },
    history
  };
};

const maybeCreateAlert = (device) => {
  if (Math.random() > 0.25) {
    return null;
  }

  const alertCatalog = [
    {
      type: 'TEMPERATURE_ANOMALY',
      message: 'Temperature moving outside comfort band',
      level: 'warning'
    },
    {
      type: 'BATTERY_LOW',
      message: 'Battery trending low, schedule maintenance',
      level: 'danger'
    },
    {
      type: 'HUMIDITY_HIGH',
      message: 'Humidity spike detected',
      level: 'info'
    }
  ];

  const alertTemplate = alertCatalog[Math.floor(Math.random() * alertCatalog.length)];
  return {
    ...alertTemplate,
    deviceId: device.deviceId,
    timestamp: new Date().toISOString(),
    id: Date.now()
  };
};

const createState = () => {
  const deviceData = new Map();
  sampleData.devices.forEach((device) => {
    deviceData.set(device.deviceId, cloneDevice(device));
  });

  return {
    deviceData,
    alerts: sampleData.alerts ? [...sampleData.alerts] : []
  };
};

const tickState = (state) => {
  const deviceUpdates = [];
  const emittedAlerts = [];

  state.deviceData.forEach((device, deviceId) => {
    const updated = buildUpdatedDevice(device);
    state.deviceData.set(deviceId, updated);
    deviceUpdates.push(updated);

    const alert = maybeCreateAlert(updated);
    if (alert) {
      emittedAlerts.push(alert);
      state.alerts.unshift(alert);
      if (state.alerts.length > 100) {
        state.alerts.pop();
      }
    }
  });

  return { devices: deviceUpdates, alerts: emittedAlerts };
};

const buildSnapshot = (state) => ({
  devices: Array.from(state.deviceData.values()),
  alerts: state.alerts.slice(0, 20),
  timestamp: new Date().toISOString()
});

const ingestDeviceUpdate = (state, data) => {
  const now = new Date().toISOString();
  const existing = state.deviceData.get(data.deviceId) || {};
  const history = Array.isArray(existing.history) ? [...existing.history] : [];

  if (typeof data.temperature === 'number' && typeof data.humidity === 'number') {
    history.push(createHistoryEntry(data.temperature, data.humidity));
    while (history.length > 48) {
      history.shift();
    }
  }

  const device = {
    ...existing,
    ...data,
    timestamp: now,
    history
  };

  state.deviceData.set(data.deviceId, device);
  return device;
};

const registerAlert = (state, alertData) => {
  const alert = {
    ...alertData,
    id: alertData.id || Date.now(),
    timestamp: alertData.timestamp || new Date().toISOString()
  };

  state.alerts.unshift(alert);
  if (state.alerts.length > 100) {
    state.alerts.pop();
  }

  return alert;
};

module.exports = {
  createState,
  tickState,
  buildSnapshot,
  ingestDeviceUpdate,
  registerAlert
};


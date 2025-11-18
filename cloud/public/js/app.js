let socket = null;
const SOCKET_OPTIONS = {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000
};
const FUNCTIONS_ENDPOINT = '/.netlify/functions/telemetry';
let pollingInterval = null;
let pollingEnabled = false;
let socketInitialized = false;

// DOM Elements
const deviceStatusEl = document.getElementById('deviceStatus');
const currentTempEl = document.getElementById('currentTemp');
const currentHumidityEl = document.getElementById('currentHumidity');
const alertsContainer = document.getElementById('alertsContainer');
const connectionStatusEl = document.getElementById('connectionStatus');
const lastUpdateEl = document.getElementById('lastUpdate');
const alertCountEl = document.getElementById('alertCount');
const tempTrendEl = document.getElementById('tempTrend');
const humidityTrendEl = document.getElementById('humidityTrend');
const tempChangeEl = document.getElementById('tempChange');
const humidityChangeEl = document.getElementById('humidityChange');
const toggleTempBtn = document.getElementById('toggleTemp');
const toggleHumidityBtn = document.getElementById('toggleHumidity');
const connectedDevicesEl = document.getElementById('connectedDevices');
const avgTempStatEl = document.getElementById('avgTempStat');
const avgHumidityStatEl = document.getElementById('avgHumidityStat');
const avgTempTrendEl = document.getElementById('avgTempTrend');
const avgHumidityTrendEl = document.getElementById('avgHumidityTrend');
const activeAlertsStatEl = document.getElementById('activeAlertsStat');
const alertSeverityEl = document.getElementById('alertSeverity');
const uptimeStatEl = document.getElementById('uptimeStat');
const deviceFleetEl = document.getElementById('deviceFleet');
const fleetTimestampEl = document.getElementById('fleetTimestamp');
const eventsCountEl = document.getElementById('eventsCount');
const eventTimelineEl = document.getElementById('eventTimeline');
const EMPTY_ALERTS_STATE = `
    <div class="text-center py-8 text-gray-400">
        <i class="fas fa-bell-slash text-2xl mb-2"></i>
        <p>No alerts yet</p>
    </div>
`;

// State
let tempVisible = true;
let humidityVisible = true;
let lastTemp = null;
let lastHumidity = null;
let alertCount = 0;
const fleet = new Map();
const recentEvents = [];

// Chart variables
let tempGauge, humidityGauge, sensorChart;
let sensorData = {
    labels: [],
    temperature: [],
    humidity: [],
    timestamps: []
};

const startPolling = () => {
    if (pollingEnabled) return;
    pollingEnabled = true;
    connectionStatusEl.innerHTML = '<span class="status-indicator status-warning"></span> Polling';
    connectionStatusEl.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800';
    fetchSnapshot(true);
    pollingInterval = setInterval(() => fetchSnapshot(false), 8000);
};

const fetchSnapshot = async (initial = false) => {
    try {
        const response = await fetch(FUNCTIONS_ENDPOINT, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Status ${response.status}`);
        }
        const data = await response.json();
        applySnapshot(data, { replaceFleet: true, hydrate: initial });
    } catch (error) {
        console.error('Error fetching telemetry snapshot:', error);
    }
};

const tryInitializeSocket = () => {
    if (typeof io !== 'function') {
        startPolling();
        return;
    }

    try {
        socket = io(SOCKET_OPTIONS);
        socketInitialized = true;
        attachSocketHandlers();
    } catch (error) {
        console.warn('Socket initialization failed, falling back to polling', error);
        startPolling();
    }
};

const toNumber = (value, fallback = 0) => {
    const parsed = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const formatBadgeTrend = (value) => {
    if (value > 0.5) return 'Rising';
    if (value < -0.5) return 'Cooling';
    return 'Stable';
};

// Toggle chart series
function toggleChartSeries() {
    if (sensorChart) {
        sensorChart.data.datasets[0].hidden = !tempVisible;
        sensorChart.data.datasets[1].hidden = !humidityVisible;
        sensorChart.update();
        
        // Update button states
        toggleTempBtn.classList.toggle('bg-indigo-600', tempVisible);
        toggleTempBtn.classList.toggle('bg-gray-600', !tempVisible);
        toggleHumidityBtn.classList.toggle('bg-indigo-600', humidityVisible);
        toggleHumidityBtn.classList.toggle('bg-gray-600', !humidityVisible);
    }
}

// Event listeners for toggle buttons
toggleTempBtn.addEventListener('click', () => {
    tempVisible = !tempVisible;
    toggleChartSeries();
});

toggleHumidityBtn.addEventListener('click', () => {
    humidityVisible = !humidityVisible;
    toggleChartSeries();
});

// Format time
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// Update last update time
function updateLastUpdateTime() {
    lastUpdateEl.textContent = `Last update: ${formatTime(new Date())}`;
}

// Initialize gauges and charts
function initializeCharts() {
    // Temperature Gauge
    const tempCtx = document.getElementById('tempGauge').getContext('2d');
    tempGauge = new Chart(tempCtx, {
        type: 'gauge',
        data: {
            datasets: [{
                data: [0],
                value: 0,
                minValue: 0,
                backgroundColor: ['#FF6384'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            title: { display: false },
            layout: { padding: { bottom: 20 } },
            needle: {
                radiusPercentage: 2,
                widthPercentage: 3.2,
                lengthPercentage: 80,
                color: 'rgba(0, 0, 0, 1)'
            },
            valueLabel: { display: false },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scale: {
                angleLines: { display: true, color: 'rgba(0, 0, 0, 0.1)' },
                ticks: { display: false },
                min: 0,
                max: 50,
                startAngle: -90,
                endAngle: 90
            }
        }
    });

    // Humidity Gauge
    const humidityCtx = document.getElementById('humidityGauge').getContext('2d');
    humidityGauge = new Chart(humidityCtx, {
        type: 'gauge',
        data: {
            datasets: [{
                data: [0],
                value: 0,
                minValue: 0,
                backgroundColor: ['#36A2EB'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            title: { display: false },
            layout: { padding: { bottom: 20 } },
            needle: {
                radiusPercentage: 2,
                widthPercentage: 3.2,
                lengthPercentage: 80,
                color: 'rgba(0, 0, 0, 1)'
            },
            valueLabel: { display: false },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scale: {
                angleLines: { display: true, color: 'rgba(0, 0, 0, 0.1)' },
                ticks: { display: false },
                min: 0,
                max: 100,
                startAngle: -90,
                endAngle: 90
            }
        }
    });

    // Sensor Data Chart
    const ctx = document.getElementById('sensorChart').getContext('2d');
    sensorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sensorData.labels,
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: sensorData.temperature,
                    borderColor: '#FF6384',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.3,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Humidity (%)',
                    data: sensorData.humidity,
                    borderColor: '#36A2EB',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.3,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Temperature (°C)'
                    },
                    min: 0,
                    max: 50
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Humidity (%)'
                    },
                    min: 0,
                    max: 100,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

// Update device status display
function updateDeviceStatus(device) {
    if (!device) {
        return;
    }

    const isOnline = device.online !== false;
    const statusClass = device.online ? 'status-online' : 'status-offline';
    const statusText = isOnline ? 'Online' : 'Offline';
    const tempValue = toNumber(device.temperature ?? device.metrics?.temperature?.value, null);
    const humidityValue = toNumber(device.humidity ?? device.metrics?.humidity?.value, null);

    deviceStatusEl.innerHTML = `
        <div class="flex items-center">
            <span class="status-indicator ${statusClass}"></span>
            <span class="font-medium">${device.deviceId || 'Unknown Device'}</span>
        </div>
        <div class="text-sm text-gray-600">Status: ${statusText}</div>
        <div class="text-sm text-gray-600">Location: ${device.location || 'Unknown'}</div>
        <div class="text-sm text-gray-600">Last Update: ${new Date(device.timestamp).toLocaleTimeString()}</div>
        <div class="mt-4 grid grid-cols-2 gap-2">
            <div class="bg-gray-50 p-2 rounded">
                <div class="text-xs text-gray-500">Temperature</div>
                <div class="font-medium ${device.metrics?.temperature?.anomaly ? 'text-red-600' : ''}">
                    ${tempValue !== null ? `${tempValue.toFixed(1)}°C` : '--'}
                </div>
            </div>
            <div class="bg-gray-50 p-2 rounded">
                <div class="text-xs text-gray-500">Humidity</div>
                <div class="font-medium">
                    ${humidityValue !== null ? `${humidityValue.toFixed(1)}%` : '--'}
                </div>
            </div>
            <div class="bg-gray-50 p-2 rounded">
                <div class="text-xs text-gray-500">Uptime</div>
                <div class="font-medium">${device.uptime || '--'}</div>
            </div>
            <div class="bg-gray-50 p-2 rounded">
                <div class="text-xs text-gray-500">Signal</div>
                <div class="font-medium">${device.signalStrength ? `${device.signalStrength}%` : '--'}</div>
            </div>
        </div>
    `;
}

// Update gauge values
function updateGauges(temperature, humidity) {
    if (tempGauge && humidityGauge) {
        tempGauge.data.datasets[0].value = temperature;
        tempGauge.update();
        
        humidityGauge.data.datasets[0].value = humidity;
        humidityGauge.update();
    }
    
    if (typeof temperature === 'number') {
        currentTempEl.textContent = temperature.toFixed(1);
    }
    if (typeof humidity === 'number') {
        currentHumidityEl.textContent = humidity.toFixed(1);
    }
}

const resetAlertsContainer = () => {
    alertCount = 0;
    alertCountEl.textContent = '0';
    activeAlertsStatEl.textContent = '0';
    alertSeverityEl.textContent = 'Nominal';
    alertsContainer.innerHTML = EMPTY_ALERTS_STATE;
};

// Add a new alert to the alerts container
function addAlert(alert) {
    alertCount += 1;
    alertCountEl.textContent = alertCount;
    activeAlertsStatEl.textContent = alertCount;
    alertSeverityEl.textContent = alert.level === 'danger' ? 'Critical' : alert.level === 'warning' ? 'Attention' : 'Nominal';

    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${alert.level || 'info'} new-alert`;
    
    const time = new Date(alert.timestamp).toLocaleTimeString();
    alertEl.innerHTML = `
        <div class="flex-1">
            <div class="font-medium">${alert.message || 'Alert'}</div>
            <div class="text-xs opacity-75">${time} • ${alert.deviceId || 'System'}</div>
        </div>
    `;
    
    alertsContainer.insertBefore(alertEl, alertsContainer.firstChild);
    
    // Remove the 'new-alert' class after animation completes
    setTimeout(() => {
        alertEl.classList.remove('new-alert');
    }, 300);
    
    // Keep only the last 20 alerts
    while (alertsContainer.children.length > 20) {
        alertsContainer.removeChild(alertsContainer.lastChild);
    }
    
    // Show/hide no alerts message
    const emptyState = alertsContainer.querySelector('.text-gray-400');
    if (emptyState) {
        emptyState.remove();
    }
}

const renderFleet = () => {
    if (!deviceFleetEl) return;
    const devices = Array.from(fleet.values()).sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    deviceFleetEl.innerHTML = '';

    if (!devices.length) {
        deviceFleetEl.innerHTML = `
            <div class="text-center py-10 text-gray-400">Waiting for telemetry...</div>
        `;
        return;
    }

    devices.forEach((device) => {
        const statusColor = device.metrics?.temperature?.anomaly
            ? 'text-red-400'
            : device.online === false
            ? 'text-gray-400'
            : 'text-green-400';

        deviceFleetEl.innerHTML += `
            <div class="py-3 flex items-center justify-between">
                <div>
                    <p class="text-sm font-semibold text-white">${device.name || device.deviceId}</p>
                    <p class="text-xs text-gray-400">${device.location?.replace(/_/g, ' ') || 'Unknown'}</p>
                </div>
                <div class="flex items-center space-x-6 text-sm">
                    <div>
                        <p class="text-gray-400 text-xs uppercase">Temp</p>
                        <p class="text-white">${toNumber(device.temperature).toFixed(1)}°C</p>
                    </div>
                    <div>
                        <p class="text-gray-400 text-xs uppercase">Humidity</p>
                        <p class="text-white">${toNumber(device.humidity).toFixed(1)}%</p>
                    </div>
                    <div>
                        <p class="text-gray-400 text-xs uppercase">Battery</p>
                        <p class="${toNumber(device.battery) < 40 ? 'text-red-400' : 'text-green-300'}">
                            ${toNumber(device.battery).toFixed(0)}%
                        </p>
                    </div>
                </div>
                <div class="${statusColor} text-xs font-semibold">${device.online === false ? 'Offline' : 'Healthy'}</div>
            </div>
        `;
    });

    fleetTimestampEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
};

const updateStatCards = () => {
    const devices = Array.from(fleet.values());
    if (!devices.length) return;

    const onlineDevices = devices.filter((device) => device.online !== false);
    const avgTemp =
        onlineDevices.reduce((acc, device) => acc + toNumber(device.temperature), 0) /
        Math.max(onlineDevices.length, 1);
    const avgHumidity =
        onlineDevices.reduce((acc, device) => acc + toNumber(device.humidity), 0) /
        Math.max(onlineDevices.length, 1);
    const avgUptime =
        onlineDevices.reduce((acc, device) => acc + toNumber(device.uptime), 0) /
        Math.max(onlineDevices.length, 1);

    connectedDevicesEl.textContent = onlineDevices.length;
    avgTempStatEl.textContent = `${avgTemp.toFixed(1)}°C`;
    avgHumidityStatEl.textContent = `${avgHumidity.toFixed(1)}%`;
    uptimeStatEl.textContent = `Avg uptime ${avgUptime ? avgUptime.toFixed(1) : '--'} hrs`;

    avgTempTrendEl.textContent = formatBadgeTrend(
        toNumber(devices[0].metrics?.temperature?.trend)
    );
    avgHumidityTrendEl.textContent = formatBadgeTrend(
        toNumber(devices[0].metrics?.humidity?.trend)
    );
    activeAlertsStatEl.textContent = alertCount;
};

const renderTimeline = () => {
    if (!eventTimelineEl) return;

    if (!recentEvents.length) {
        eventTimelineEl.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-wave-square text-2xl mb-2"></i>
                <p>Waiting for incoming data...</p>
            </div>
        `;
        eventsCountEl.textContent = '0 events';
        return;
    }

    eventTimelineEl.innerHTML = recentEvents
        .map(
            (event) => `
                <div class="flex items-center justify-between text-sm">
                    <div>
                        <p class="text-white font-semibold">${event.deviceId}</p>
                        <p class="text-xs text-gray-400">
                            Temp ${event.temperature.toFixed(1)}°C • Hum ${event.humidity.toFixed(1)}%
                        </p>
                    </div>
                    <span class="text-xs text-gray-400">${new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
            `
        )
        .join('');

    eventsCountEl.textContent = `${recentEvents.length} events`;
};

const recordEvent = (device) => {
    recentEvents.unshift({
        deviceId: device.deviceId,
        temperature: toNumber(device.temperature),
        humidity: toNumber(device.humidity),
        timestamp: device.timestamp
    });

    if (recentEvents.length > 8) {
        recentEvents.pop();
    }

    renderTimeline();
};

const hydrateHistory = (devices = []) => {
    const points = [];
    devices.forEach((device) => {
        if (Array.isArray(device.history)) {
            device.history.forEach((point) => {
                points.push({
                    timestamp: point.timestamp,
                    temperature: point.temperature,
                    humidity: point.humidity
                });
            });
        }
    });

    points
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .slice(-20)
        .forEach((point) => updateSensorData(point));
};

const applySnapshot = (data, options = {}) => {
    const { replaceFleet = false, hydrate = false } = options;

    if (Array.isArray(data.devices)) {
        if (replaceFleet) {
            fleet.clear();
        }

        data.devices.forEach((device) => {
            fleet.set(device.deviceId, device);
        });

        if (replaceFleet && data.devices.length) {
            const primaryDevice = data.devices[0];
            updateDeviceStatus(primaryDevice);
            updateGauges(toNumber(primaryDevice.temperature), toNumber(primaryDevice.humidity));
        }

        if (hydrate) {
            hydrateHistory(data.devices);
            data.devices.slice(-4).forEach((device) => recordEvent(device));
        }
    }

    if (Array.isArray(data.alerts)) {
        resetAlertsContainer();
        data.alerts.forEach((alert) => addAlert(alert));
    }

    renderFleet();
    updateStatCards();
    renderTimeline();
    updateLastUpdateTime();
};

// Update sensor data chart
function updateSensorData(data) {
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
    const timeString = timestamp.toLocaleTimeString();
    
    // Add new data point
    sensorData.labels.push(timeString);
    sensorData.temperature.push(toNumber(data.temperature));
    sensorData.humidity.push(toNumber(data.humidity));
    
    // Keep only the last 20 data points
    const maxPoints = 20;
    if (sensorData.labels.length > maxPoints) {
        sensorData.labels.shift();
        sensorData.temperature.shift();
        sensorData.humidity.shift();
    }
    
    // Update chart
    sensorChart.data.labels = sensorData.labels;
    sensorChart.data.datasets[0].data = sensorData.temperature;
    sensorChart.data.datasets[1].data = sensorData.humidity;
    sensorChart.update();
}

const attachSocketHandlers = () => {
    if (!socket) return;

    socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        connectionStatusEl.innerHTML = '<span class="status-indicator status-online"></span> Connected';
        connectionStatusEl.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800';
        socket.emit('getInitialData');
    });

    socket.on('initialData', (data) => {
        console.log('Received initial data:', data);
        applySnapshot(data, { replaceFleet: true, hydrate: true });
    });

    socket.on('deviceUpdate', (data) => {
        console.log('Device update:', data);
        fleet.set(data.deviceId, data);
        updateDeviceStatus(data);
        updateGauges(toNumber(data.temperature), toNumber(data.humidity));
        updateSensorData(data);
        recordEvent(data);
        renderFleet();
        updateStatCards();
        updateLastUpdateTime();
    });

    socket.on('alert', (alert) => {
        console.log('New alert:', alert);
        addAlert(alert);
    });

    socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        connectionStatusEl.innerHTML = '<span class="status-indicator status-warning"></span> Connection Error';
        connectionStatusEl.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800';
        if (!pollingEnabled) {
            startPolling();
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
        const deviceStatus = deviceStatusEl.querySelector('div');
        if (deviceStatus) {
            deviceStatus.className = 'flex items-center';
            deviceStatus.innerHTML = `
                <span class="status-indicator status-offline"></span>
                <span class="font-medium">Disconnected from server</span>
            `;
        }
        if (!pollingEnabled) {
            startPolling();
        }
    });
};

// Initialize charts and telemetry transport
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    tryInitializeSocket();
    if (!socketInitialized && !pollingEnabled) {
        startPolling();
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (sensorChart) {
        sensorChart.resize();
    }
});

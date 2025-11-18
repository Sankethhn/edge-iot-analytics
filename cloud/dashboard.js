document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const connectionStatus = document.getElementById('connection-status');
    const lastUpdated = document.getElementById('last-updated');
    const devicesContainer = document.getElementById('devices-container');
    const noDevices = document.getElementById('no-devices');
    const alertsList = document.getElementById('alerts-list');
    const noAlerts = document.getElementById('no-alerts');
    const alertCount = document.getElementById('alert-count');
    
    // Metric elements
    const avgTempElement = document.getElementById('avg-temp');
    const tempStatsElement = document.getElementById('temp-stats');
    const avgHumidityElement = document.getElementById('avg-humidity');
    const humidityStatsElement = document.getElementById('humidity-stats');
    const batteryLevelElement = document.getElementById('battery-level');
    const batteryStatusElement = document.getElementById('battery-status');
    
    // Data storage
    let devices = new Map();
    let alerts = [];
    let temperatureChart, humidityChart;
    const maxDataPoints = 20; // Max data points to show in charts
    
    // Chart initialization
    function initCharts() {
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            scales: {
                x: { display: true, title: { display: true, text: 'Time' } },
                y: { display: true, title: { display: true } }
            },
            plugins: { legend: { display: false } }
        };
        
        // Temperature Chart
        const tempCtx = document.getElementById('temperature-chart').getContext('2d');
        temperatureChart = new Chart(tempCtx, {
            type: 'line',
            data: { labels: [], datasets: [{
                label: 'Temperature (°C)',
                data: [],
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]},
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { ...chartOptions.scales.y, title: { display: true, text: 'Temperature (°C)' } }
                }
            }
        });
        
        // Humidity Chart
        const humidityCtx = document.getElementById('humidity-chart').getContext('2d');
        humidityChart = new Chart(humidityCtx, {
            type: 'line',
            data: { labels: [], datasets: [{
                label: 'Humidity (%)',
                data: [],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]},
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { 
                        ...chartOptions.scales.y, 
                        title: { display: true, text: 'Humidity (%)' },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    }
    
    // Update temperature chart
    function updateTemperatureChart(timestamp, temperature) {
        const chart = temperatureChart;
        const time = new Date(timestamp).toLocaleTimeString();
        
        chart.data.labels.push(time);
        chart.data.datasets[0].data.push(temperature);
        
        if (chart.data.labels.length > maxDataPoints) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        
        chart.update();
    }
    
    // Update humidity chart
    function updateHumidityChart(timestamp, humidity) {
        const chart = humidityChart;
        const time = new Date(timestamp).toLocaleTimeString();
        
        chart.data.labels.push(time);
        chart.data.datasets[0].data.push(humidity);
        
        if (chart.data.labels.length > maxDataPoints) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        
        chart.update();
    }
    
    // Update last updated time
    function updateLastUpdated() {
        lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
    
    // Update metrics overview
    function updateMetricsOverview() {
        if (devices.size === 0) return;
        
        let totalTemp = 0;
        let totalHumidity = 0;
        let totalBattery = 0;
        let deviceCount = 0;
        let latestTemp = null;
        let latestHumidity = null;
        
        devices.forEach(device => {
            if (device.metrics?.temperature) {
                totalTemp += parseFloat(device.metrics.temperature.average || 0);
                latestTemp = device.metrics.temperature;
            }
            if (device.metrics?.humidity) {
                totalHumidity += parseFloat(device.metrics.humidity.average || 0);
                latestHumidity = device.metrics.humidity;
            }
            if (device.metrics?.battery) {
                totalBattery += parseFloat(device.metrics.battery.value || 0);
            }
            deviceCount++;
        });
        
        if (latestTemp) {
            avgTempElement.textContent = `${(totalTemp / deviceCount).toFixed(1)}°C`;
            tempStatsElement.textContent = `${latestTemp.value}°C (σ: ${latestTemp.stdDev || '--'})`;
        }
        
        if (latestHumidity) {
            avgHumidityElement.textContent = `${(totalHumidity / deviceCount).toFixed(1)}%`;
            humidityStatsElement.textContent = `${latestHumidity.value}%`;
        }
        
        if (deviceCount > 0) {
            const avgBattery = totalBattery / deviceCount;
            batteryLevelElement.textContent = `${avgBattery.toFixed(1)}%`;
            batteryStatusElement.textContent = avgBattery < 20 ? 'LOW BATTERY' : 'NORMAL';
            batteryStatusElement.className = `text-xs ${avgBattery < 20 ? 'text-red-600' : 'text-green-600'}`;
        }
    }
    
    // Render device list
    function renderDevices() {
        if (devices.size === 0) {
            noDevices.classList.remove('hidden');
            return;
        }
        
        noDevices.classList.add('hidden');
        devicesContainer.innerHTML = '';
        
        devices.forEach((device, deviceId) => {
            const lastUpdated = new Date(device.timestamp).toLocaleTimeString();
            const temp = device.metrics?.temperature;
            const humidity = device.metrics?.humidity;
            const battery = device.metrics?.battery;
            
            const deviceCard = document.createElement('div');
            deviceCard.className = 'device-card p-4 hover:bg-gray-50 cursor-pointer';
            deviceCard.onclick = () => showDeviceDetails(deviceId);
            
            deviceCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="flex-shrink-0">
                            <i class="fas fa-microchip text-indigo-600 text-2xl"></i>
                        </div>
                        <div>
                            <h3 class="text-md font-medium text-gray-900">${deviceId}</h3>
                            <p class="text-sm text-gray-500">Last updated: ${lastUpdated}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        ${temp ? `
                        <div class="text-center">
                            <span class="text-sm text-gray-500">Temp</span>
                            <div class="text-sm font-medium ${temp.anomaly ? 'text-red-600' : 'text-gray-900'}">
                                ${temp.value}°C
                            </div>
                        </div>
                        ` : ''}
                        ${humidity ? `
                        <div class="text-center">
                            <span class="text-sm text-gray-500">Humidity</span>
                            <div class="text-sm font-medium text-gray-900">${humidity.value}%</div>
                        </div>
                        ` : ''}
                        ${battery ? `
                        <div class="text-center">
                            <span class="text-sm text-gray-500">Battery</span>
                            <div class="text-sm font-medium ${parseFloat(battery.value) < 20 ? 'text-red-600' : 'text-green-600'}">
                                ${battery.value}%
                            </div>
                        </div>
                        ` : ''}
                        <i class="fas fa-chevron-right text-gray-400"></i>
                    </div>
                </div>
            `;
            
            devicesContainer.appendChild(deviceCard);
        });
    }
    
    // Show device details modal
    function showDeviceDetails(deviceId) {
        const device = devices.get(deviceId);
        if (!device) return;
        
        const modal = document.getElementById('device-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalContent = document.getElementById('device-detail-content');
        
        modalTitle.textContent = `Device: ${deviceId}`;
        
        const lastUpdated = new Date(device.timestamp).toLocaleString();
        const temp = device.metrics?.temperature || {};
        const humidity = device.metrics?.humidity || {};
        const battery = device.metrics?.battery || {};
        
        modalContent.innerHTML = `
            <div class="space-y-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-sm font-medium text-gray-500 mb-2">Device Information</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-xs text-gray-500">Device ID</p>
                            <p class="text-sm font-medium">${deviceId}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500">Last Updated</p>
                            <p class="text-sm font-medium">${lastUpdated}</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-sm font-medium text-gray-500 mb-2">Temperature</h4>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <p class="text-xs text-gray-500">Current</p>
                            <p class="text-lg font-bold ${temp.anomaly ? 'text-red-600' : 'text-gray-900'}">
                                ${temp.value || '--'}°C
                                ${temp.anomaly ? '<span class="ml-1 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Anomaly</span>' : ''}
                            </p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500">Average</p>
                            <p class="text-sm font-medium">${temp.average || '--'}°C</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500">Std Dev</p>
                            <p class="text-sm font-medium">${temp.stdDev || '--'}</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-sm font-medium text-gray-500 mb-2">Humidity</h4>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <p class="text-xs text-gray-500">Current</p>
                            <p class="text-lg font-bold text-gray-900">${humidity.value || '--'}%</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500">Average</p>
                            <p class="text-sm font-medium">${humidity.average || '--'}%</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500">Unit</p>
                            <p class="text-sm font-medium">%</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-sm font-medium text-gray-500 mb-2">Battery</h4>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <p class="text-xs text-gray-500">Level</p>
                            <p class="text-lg font-bold ${parseFloat(battery.value) < 20 ? 'text-red-600' : 'text-green-600'}">
                                ${battery.value || '--'}%
                            </p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500">Status</p>
                            <p class="text-sm font-medium">${battery.status || '--'}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500">Unit</p>
                            <p class="text-sm font-medium">%</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    }
    
    // Close modal
    window.closeModal = function() {
        const modal = document.getElementById('device-modal');
        modal.classList.add('hidden');
    };
    
    // Render alerts
    function renderAlerts() {
        if (alerts.length === 0) {
            noAlerts.classList.remove('hidden');
            return;
        }
        
        noAlerts.classList.add('hidden');
        alertsList.innerHTML = '';
        
        alerts.slice(0, 5).forEach(alert => {
            const alertTime = new Date(alert.timestamp).toLocaleTimeString();
            const alertItem = document.createElement('li');
            alertItem.className = 'alert-item p-4 hover:bg-gray-50';
            
            let alertIcon = 'exclamation-triangle';
            let alertColor = 'bg-yellow-100 text-yellow-800';
            
            if (alert.type === 'TEMPERATURE_ANOMALY') {
                alertIcon = 'thermometer-half';
                alertColor = 'bg-red-100 text-red-800';
            } else if (alert.type === 'BATTERY_LOW') {
                alertIcon = 'battery-quarter';
                alertColor = 'bg-orange-100 text-orange-800';
            }
            
            alertItem.innerHTML = `
                <div class="flex items-start">
                    <div class="flex-shrink-0 pt-0.5">
                        <i class="fas fa-${alertIcon} ${alertColor === 'bg-red-100 text-red-800' ? 'text-red-500' : 'text-yellow-500'}"></i>
                    </div>
                    <div class="ml-3 flex-1">
                        <div class="text-sm font-medium text-gray-900">
                            ${alert.deviceId || 'Unknown Device'}
                        </div>
                        <div class="text-sm text-gray-500">
                            ${alert.message || alert.type.replace(/_/g, ' ')}
                        </div>
                        <div class="mt-1 text-xs text-gray-400">
                            ${alertTime}
                        </div>
                    </div>
                </div>
            `;
            
            alertsList.appendChild(alertItem);
        });
        
        // Update alert count
        alertCount.textContent = alerts.length;
        if (alerts.length > 0) {
            alertCount.classList.remove('bg-gray-100', 'text-gray-800');
            alertCount.classList.add('bg-red-100', 'text-red-800');
        } else {
            alertCount.classList.remove('bg-red-100', 'text-red-800');
            alertCount.classList.add('bg-gray-100', 'text-gray-800');
        }
    }
    
    // Handle WebSocket events
    const socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        connectionStatus.innerHTML = '<span class="w-2 h-2 mr-2 bg-green-500 rounded-full"></span> Connected';
        connectionStatus.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800';
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
        connectionStatus.innerHTML = '<span class="w-2 h-2 mr-2 bg-red-500 rounded-full"></span> Disconnected';
        connectionStatus.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800';
    });
    
    socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        connectionStatus.innerHTML = '<span class="w-2 h-2 mr-2 bg-yellow-500 rounded-full"></span> Connection Error';
        connectionStatus.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800';
    });
    
    // Handle initial data
    socket.on('initialData', (data) => {
        console.log('Received initial data:', data);
        devices = new Map(data.devices.map(device => [device.deviceId, device]));
        alerts = data.alerts || [];
        
        renderDevices();
        renderAlerts();
        updateMetricsOverview();
        updateLastUpdated();
    });
    
    // Handle device updates
    socket.on('deviceUpdate', (data) => {
        console.log('Device update:', data);
        devices.set(data.deviceId, data);
        
        // Update charts
        if (data.metrics?.temperature?.value) {
            updateTemperatureChart(data.timestamp, parseFloat(data.metrics.temperature.value));
        }
        if (data.metrics?.humidity?.value) {
            updateHumidityChart(data.timestamp, parseFloat(data.metrics.humidity.value));
        }
        
        renderDevices();
        updateMetricsOverview();
        updateLastUpdated();
    });
    
    // Handle alerts
    socket.on('alert', (alert) => {
        console.log('New alert:', alert);
        alerts.unshift(alert);
        
        // Keep only the last 100 alerts
        if (alerts.length > 100) {
            alerts.pop();
        }
        
        renderAlerts();
        
        // Show browser notification
        if (Notification.permission === 'granted') {
            new Notification(`Alert: ${alert.type.replace(/_/g, ' ')}`, {
                body: `Device: ${alert.deviceId}\n${alert.message || ''}`,
                icon: '/favicon.ico'
            });
        }
    });
    
    // Request notification permission
    if (Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
    
    // Initialize the dashboard
    initCharts();
    
    // Update last updated time every minute
    setInterval(updateLastUpdated, 60000);
    
    // Initial render
    renderDevices();
    renderAlerts();
    updateLastUpdated();
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('device-modal');
        if (event.target === modal) {
            closeModal();
        }
    };
});

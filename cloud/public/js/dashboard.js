// Global variables
let sensorData = [];
let charts = {};

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Load the sensor data
    await loadSensorData();
    
    // Initialize filters
    initializeFilters();
    
    // Initialize charts
    initializeCharts();
    
    // Update dashboard with initial data
    updateDashboard();
    
    // Set up event listeners
    document.getElementById('locationFilter').addEventListener('change', updateDashboard);
    document.getElementById('sensorTypeFilter').addEventListener('change', updateDashboard);
    document.getElementById('timeRangeFilter').addEventListener('change', updateDashboard);
});

// Load sensor data from the generated JSON file
async function loadSensorData() {
    try {
        const response = await fetch('../iot_sensor_data.json');
        const data = await response.json();
        sensorData = data.sensor_readings;
        
        // Parse timestamps
        sensorData.forEach(reading => {
            reading.timestamp = new Date(reading.timestamp);
        });
        
        console.log(`Loaded ${sensorData.length} sensor readings`);
    } catch (error) {
        console.error('Error loading sensor data:', error);
    }
}

// Initialize filter dropdowns
function initializeFilters() {
    const locations = [...new Set(sensorData.map(item => item.location))];
    const sensorTypes = [...new Set(sensorData.map(item => item.type))];
    
    const locationFilter = document.getElementById('locationFilter');
    const sensorTypeFilter = document.getElementById('sensorTypeFilter');
    
    // Populate location filter
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        locationFilter.appendChild(option);
    });
    
    // Populate sensor type filter
    sensorTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        sensorTypeFilter.appendChild(option);
    });
}

// Initialize Chart.js charts
function initializeCharts() {
    const chartConfigs = {
        temperatureChart: {
            type: 'line',
            label: 'Temperature',
            unit: '°C',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)'
        },
        humidityChart: {
            type: 'line',
            label: 'Humidity',
            unit: '%',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)'
        },
        powerChart: {
            type: 'bar',
            label: 'Power Consumption',
            unit: 'W',
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            borderColor: 'rgba(255, 206, 86, 1)'
        },
        vibrationChart: {
            type: 'line',
            label: 'Vibration',
            unit: 'g',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)'
        }
    };
    
    // Create each chart
    Object.entries(chartConfigs).forEach(([chartId, config]) => {
        const ctx = document.getElementById(chartId).getContext('2d');
        charts[chartId] = new Chart(ctx, {
            type: config.type,
            data: {
                labels: [],
                datasets: [{
                    label: `${config.label} (${config.unit})`,
                    data: [],
                    backgroundColor: config.backgroundColor,
                    borderColor: config.borderColor,
                    borderWidth: 1,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false
                    },
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'MMM d, yyyy HH:mm'
                        },
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw.y} ${config.unit}`;
                            }
                        }
                    }
                }
            }
        });
    });
}

// Update dashboard based on filters
function updateDashboard() {
    const locationFilter = document.getElementById('locationFilter').value;
    const sensorTypeFilter = document.getElementById('sensorTypeFilter').value;
    const timeRange = document.getElementById('timeRangeFilter').value;
    
    // Calculate time range
    const now = new Date();
    let startDate = new Date(now);
    
    switch(timeRange) {
        case '24h':
            startDate.setDate(now.getDate() - 1);
            break;
        case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
        case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
        default:
            startDate = new Date(0); // All time
    }
    
    // Filter data
    const filteredData = sensorData.filter(reading => {
        return (locationFilter === 'all' || reading.location === locationFilter) &&
               (sensorTypeFilter === 'all' || reading.type === sensorTypeFilter) &&
               reading.timestamp >= startDate;
    });
    
    // Update alert summary
    updateAlertSummary(filteredData);
    
    // Group data by sensor type and update charts
    const dataByType = groupDataByType(filteredData);
    updateCharts(dataByType);
}

// Group data by sensor type
function groupDataByType(data) {
    return data.reduce((acc, reading) => {
        if (!acc[reading.type]) {
            acc[reading.type] = [];
        }
        acc[reading.type].push(reading);
        return acc;
    }, {});
}

// Update alert summary
function updateAlertSummary(data) {
    const alertCounts = data.reduce((acc, reading) => {
        if (reading.status === 'alert' || reading.status === 'warning') {
            acc[reading.status] = (acc[reading.status] || 0) + 1;
        }
        return acc;
    }, {});
    
    const alertSummary = document.getElementById('alertSummary');
    alertSummary.innerHTML = '';
    
    // Add alert cards
    Object.entries(alertCounts).forEach(([status, count]) => {
        const alertClass = status === 'alert' ? 'danger' : 'warning';
        const alertDiv = document.createElement('div');
        alertDiv.className = 'col-md-6';
        alertDiv.innerHTML = `
            <div class="alert alert-${alertClass}">
                <h5>${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}</h5>
                <p class="mb-0">${status === 'alert' ? 'Critical issues detected' : 'Potential issues to monitor'}</p>
            </div>
        `;
        alertSummary.appendChild(alertDiv);
    });
    
    // If no alerts
    if (Object.keys(alertCounts).length === 0) {
        const noAlertsDiv = document.createElement('div');
        noAlertsDiv.className = 'col-12';
        noAlertsDiv.innerHTML = `
            <div class="alert alert-success">
                <h5>No Alerts</h5>
                <p class="mb-0">All systems operating normally</p>
            </div>
        `;
        alertSummary.appendChild(noAlertsDiv);
    }
}

// Update all charts with filtered data
function updateCharts(dataByType) {
    // Update temperature chart
    updateChart('temperatureChart', 'temperature', dataByType.temperature);
    
    // Update humidity chart
    updateChart('humidityChart', 'humidity', dataByType.humidity);
    
    // Update power chart
    updateChart('powerChart', 'power_consumption', dataByType.power);
    
    // Update vibration chart
    updateChart('vibrationChart', 'vibration', dataByType.vibration);
}

// Update a single chart
function updateChart(chartId, sensorType, data = []) {
    const chart = charts[chartId];
    if (!chart) return;
    
    // Prepare data for the chart
    const labels = data.map(reading => reading.timestamp);
    const values = data.map(reading => ({
        x: reading.timestamp,
        y: reading.value
    }));
    
    // Update chart data
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    
    // Update chart options based on time range
    const timeRange = document.getElementById('timeRangeFilter').value;
    let timeUnit = 'day';
    
    if (timeRange === '24h') {
        timeUnit = 'hour';
    } else if (timeRange === '7d') {
        timeUnit = 'day';
    } else {
        timeUnit = 'week';
    }
    
    chart.options.scales.x.time.unit = timeUnit;
    
    // Update the chart
    chart.update();
}

// Helper function to format dates
function formatDate(date) {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

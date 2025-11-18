# Edge IoT Analytics Platform

## Overview
The Edge IoT Analytics Platform is a comprehensive solution designed to collect, process, and analyze IoT sensor data at the edge. This platform enables real-time data processing, visualization, and monitoring of IoT devices while reducing latency and bandwidth usage by performing computations closer to the data source.

## Features
- **Real-time Data Processing**: Process sensor data in real-time at the edge
- **Cloud Integration**: Seamless synchronization with cloud services for further analysis
- **Dashboard Visualization**: Interactive web-based dashboard for monitoring and analysis
- **MQTT Protocol**: Lightweight messaging protocol for efficient IoT communication
- **Data Generation**: Built-in tools for generating sample IoT sensor data
- **Scalable Architecture**: Designed to handle multiple edge devices and data streams
- **Secure Communication**: Secure MQTT broker configuration for encrypted data transmission

## Key Components
1. **Edge Device Module**
   - Lightweight data processing
   - Local data storage
   - MQTT client for communication

2. **Cloud Backend**
   - Data aggregation and storage
   - User authentication
   - API endpoints for data access

3. **Web Dashboard**
   - Real-time data visualization
   - Device management interface
   - Historical data analysis

4. **Data Generation Tool**
   - Generate sample IoT sensor data
   - Customizable data patterns
   - Support for various sensor types

## Installation

### Prerequisites
- Node.js (v14 or higher)
- Python 3.8+
- Mosquitto MQTT Broker
- MongoDB (for cloud backend)

### Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/edge-iot-analytics.git
   cd edge-iot-analytics
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure the MQTT broker:
   - Update `mosquitto.conf` with your broker settings
   - Start the MQTT broker

## Usage

### Starting the Platform
Run the start script:
```bash
./start-all.bat
```

### Generating Sample Data
```bash
python generate_iot_data.py --sensors 5 --interval 5 --duration 60
```

### Accessing the Dashboard
Open your browser and navigate to:
```
http://localhost:3000/dashboard
```

## Configuration

### MQTT Configuration (`mosquitto.conf`)
```conf
listener 1883
allow_anonymous true
```

### Environment Variables
Create a `.env` file in the root directory:
```env
MQTT_BROKER_URL=mqtt://localhost:1883
MONGODB_URI=mongodb://localhost:27017/iot_analytics
PORT=3000
```

## File Structure
```
edge-iot-analytics/
├── cloud/                 # Cloud backend services
│   ├── public/            # Static files
│   └── src/               # Server source code
├── edge-device/           # Edge device code
│   ├── sensors/           # Sensor simulation
│   └── mqtt/              # MQTT client implementation
├── shared/                # Shared utilities
├── generate_iot_data.py   # Data generation script
├── mosquitto.conf         # MQTT broker configuration
└── start-all.bat          # Startup script
```

## Data Models

### Sensor Data
```javascript
{
  "sensor_id": "sensor_001",
  "timestamp": "2025-03-18T14:30:00Z",
  "temperature": 25.5,
  "humidity": 45.2,
  "pressure": 1013.25,
  "location": {
    "lat": 12.9716,
    "lng": 77.5946
  }
}
```

### Device Metadata
```javascript
{
  "device_id": "device_001",
  "name": "Edge Device 1",
  "type": "temperature_humidity",
  "location": "Building A, Floor 2",
  "last_seen": "2025-03-18T14:30:00Z",
  "status": "online"
}
```

## Contribution
We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Usage in Modern Days
- **Smart Cities**: Real-time monitoring of urban infrastructure
- **Industrial IoT**: Predictive maintenance and process optimization
- **Healthcare**: Remote patient monitoring systems
- **Agriculture**: Precision farming and environmental monitoring
- **Energy Management**: Smart grid and renewable energy optimization

## Future Enhancements
- [ ] Edge AI/ML integration for predictive analytics
- [ ] Support for additional IoT protocols (CoAP, LwM2M)
- [ ] Mobile application for remote monitoring
- [ ] Enhanced security features (TLS, OAuth 2.0)
- [ ] Containerization with Docker and Kubernetes
- [ ] Integration with popular cloud platforms (AWS IoT, Azure IoT, Google Cloud IoT)
- [ ] Advanced analytics and anomaly detection
- [ ] Automated alerting and notification system

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
- MQTT Protocol
- Mosquitto MQTT Broker
- Node.js
- Python
- MongoDB

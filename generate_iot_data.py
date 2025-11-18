import json
import random
from datetime import datetime, timedelta
import numpy as np

# Configuration
NUM_DAYS = 7
READINGS_PER_HOUR = 6
LOCATIONS = ["warehouse_a", "warehouse_b", "production_line_1", "cold_storage"]
SENSOR_TYPES = {
    "temperature": {"unit": "°C", "range": (15, 35), "variation": 2.0},
    "humidity": {"unit": "%", "range": (30, 70), "variation": 5.0},
    "vibration": {"unit": "g", "range": (0.01, 0.5), "variation": 0.05},
    "power": {"unit": "W", "range": (1000, 5000), "variation": 200},
    "pressure": {"unit": "kPa", "range": (95, 110), "variation": 1.0}
}

def generate_sensor_data():
    """Generate realistic IoT sensor data with daily and weekly patterns."""
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=NUM_DAYS)
    current_time = start_time
    
    data = []
    sensor_id = 1
    
    for location in LOCATIONS:
        for sensor_type, config in SENSOR_TYPES.items():
            base_value = random.uniform(*config["range"])
            
            while current_time <= end_time:
                # Add daily pattern (lower at night, higher during day)
                hour = current_time.hour
                daily_variation = np.sin((hour / 24) * 2 * np.pi - np.pi/2) * 0.4 + 0.8
                
                # Add some random noise
                noise = random.uniform(-1, 1) * config["variation"]
                
                # Calculate value with variation
                value = base_value * daily_variation + noise
                value = max(min(value, config["range"][1]), config["range"][0])
                
                # Determine status
                if sensor_type == "temperature":
                    if value > 30 or value < 18:
                        status = "alert"
                    elif value > 28 or value < 20:
                        status = "warning"
                    else:
                        status = "normal"
                else:
                    status = "normal"
                
                data.append({
                    "sensor_id": f"{sensor_type}_{sensor_id}",
                    "type": sensor_type,
                    "value": round(value, 2),
                    "unit": config["unit"],
                    "timestamp": current_time.isoformat() + 'Z',
                    "location": location,
                    "status": status
                })
                
                # Move to next reading time
                current_time += timedelta(minutes=60//READINGS_PER_HOUR)
            
            sensor_id += 1
            current_time = start_time  # Reset for next sensor
    
    return {
        "sensor_readings": data,
        "metadata": {
            "total_readings": len(data),
            "start_time": start_time.isoformat() + 'Z',
            "end_time": end_time.isoformat() + 'Z',
            "locations": LOCATIONS,
            "sensor_types": list(SENSOR_TYPES.keys())
        }
    }

def save_to_file(data, filename="iot_sensor_data.json"):
    """Save generated data to a JSON file."""
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Generated {len(data['sensor_readings'])} sensor readings in {filename}")

if __name__ == "__main__":
    print("Generating IoT sensor data...")
    sensor_data = generate_sensor_data()
    save_to_file(sensor_data, "iot_sensor_data.json")
    print("Data generation complete!")

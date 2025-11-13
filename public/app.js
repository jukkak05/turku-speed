// public/app.js - ~20 lines
const map = L.map('map').setView([60.45, 22.25], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Array to hold vehicles data
let vehicles = [];

async function updateVehicles() {

  try {

    // Fetch vehicles data from our api
    const res = await fetch('/api/vehicles');

    // If response is not ok, throw an error
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json(); 

    // Check if data does not contain vehicles
    if (!data.result?.vehicles) {
      console.warn('No vehicles in response');
      return;
    }
    
    // Run for each returned vehicle object
    Object.entries(data.result.vehicles).forEach(([id, vehicle]) => {

      // If vehicle id is now known
      if (!vehicles[id]) {

        // Add new vehicle pin to map
        vehicles[id]= L.marker([vehicle.latitude, vehicle.longitude]).addTo(map);

      } else {

        // If vehicle id is already on map, update position
        vehicles[id].setLatLng([vehicle.latitude,vehicle.longitude]);

      }

    });
    
  } catch (err) {
    console.log('Unable to fetch vehicle data: ' + err);
  }

}

// Add vehicles to map on start
updateVehicles(); 

// Update vehicles once every 10 sec
setInterval(updateVehicles, 10000);

// public/app.js - ~20 lines
const map = L.map('map').setView([60.45, 22.25], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Store markers 
const markers = {};

async function updateVehicles() {

  try {

    // Fetch vehicles data from our api
    const res = await fetch('/api/vehicles');

    // If response is not ok, throw an error
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json(); 

    // Check if data does not contain vehicles
    if (!data.vehicles) {
      console.warn('No vehicles in response');
      return;
    }
    
    // Run for each returned vehicle object
    Object.entries(data.vehicles).forEach(([id, vehicle]) => {

      // If vehicle id is not known and vehicle has coordinates
      if (!markers[id]) {

        // Add new vehicle marker to map
        markers[id]= L.marker([vehicle.latitude, vehicle.longitude])
        .addTo(map)
        .bindPopup(`<h3>Linja: ${vehicle.lineref}</h3>`);

      } else {

        // If vehicle is already on map, update marker position
        markers[id].setLatLng([vehicle.latitude,vehicle.longitude])
        .setPopupContent(`
          <h3>Linja: ${vehicle.lineref}</h3>
          <p><strong>Nopeus:</strong> ${vehicle.speed} km/h</p>
        `);

      }

    });
    
  } catch (err) {
    console.log('Unable to fetch vehicle data: ' + err);
  }

}

// Add vehicles to map on start
updateVehicles(); 

// Update vehicles once every 8 sec
setInterval(updateVehicles, 8000);

// Create Leaflet map
// Docs: https://leafletjs.com/reference.html
const map = L.map("map").setView([60.45, 22.25], 13);

// Add Openstreetmap tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Store vehicle markers
const markers = {};

// Function to update vehicles
async function updateVehicles() {

  try {
    // Fetch vehicles data from our api
    const res = await fetch("/api/vehicles");

    // If response is not ok, throw an error
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Check if data does not contain vehicles
    if (!data.vehicles) {
      console.warn("No vehicles in response");
      return;
    }

    // Run for each returned vehicle object
    Object.entries(data.vehicles).forEach(([id, vehicle]) => {
      // If vehicle id is new and vehicle has coordinates
      if (!markers[id]) {
        // Add new vehicle marker to map
        markers[id] = L.marker([vehicle.latitude, vehicle.longitude])
          .addTo(map)
          .bindPopup(`
          <h3>Linja: ${vehicle.lineref}</h3>
          <p><strong>Calculating speed...</strong></p>
        `);
      } else {
        // If vehicle is known, update marker position and add speed
        markers[id].setLatLng([vehicle.latitude, vehicle.longitude])
          .setPopupContent(`
          <h3>Linja: ${vehicle.lineref}</h3>
          <p><strong>Nopeus:</strong> ${vehicle.speed} km/h</p>
        `);
      }
    });
  } catch (err) {
    console.warn("Unable to fetch vehicle data: " + err);
  }
}

// Add vehicles to map on start
updateVehicles();

// Update vehicles once every 5 sec
setInterval(updateVehicles, 5000);
// setInterval(() => { 
//   console.log(markers) 
// }, 5000);

// Accordion 
document.querySelectorAll('#accordion button').forEach(button => {
  button.addEventListener('click', function() {
    this.nextElementSibling.style.display === 'none'
    ? this.nextElementSibling.style.display = 'block'
    : this.nextElementSibling.style.display = 'none';
  });
});


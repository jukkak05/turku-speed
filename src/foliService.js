// Poll Föli API
let cachedVehicles = []; 

const fetchVehicles = async () => {
    try {
        const res = await fetch('https://data.foli.fi/siri/vm');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        cachedVehicles = data;
        console.log(`Updated vehicles: ${cachedVehicles.status}`);
    } catch (err) {
        console.error('Failed to fetch vechiles:', err);
    }
}

export function startPolling() {
    // Fetch immediately on startup
    fetchVehicles(); 
    // Then poll api every 10 second
    setInterval(fetchVehicles, 10000);
}

export function getVehicles() {
    return cachedVehicles; 
}
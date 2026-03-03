// Import geolib
// Docs: https://www.npmjs.com/package/geolib
import { getDistance } from "geolib";

// Define LatLon type
type LatLon = { latitude: number; longitude: number};

// import rbush from "npm:rbush";
// import bbox from "npm:@turf/bbox";

// const speedGeoJSON = JSON.parse(
//   await Deno.readTextFile(new URL("../digiroad/turku_speedlimits.json", import.meta.url)),
// );

// const index = new rbush(); 
// const items = speedGeoJSON.features.map((feature, id) => {
//   const [minLon, minLat, maxLon, maxLat] = bbox(feature);
//   return { minX: minLon, minY: minLat, maxX: maxLon, maxY: maxLat, id };
// });
// index.load(items);

// Function to calculate bbox around the vehicle
function _buildBbox(lat, lon, delta = 0.00005) {
  const minLat = lat - delta;
  const maxLat = lat + delta;
  const minLon = lon - delta;
  const maxLon = lon + delta;
  return `${minLon},${minLat},${maxLon},${maxLat},EPSG:4326`;
}

// Function to calculate travelled time in seconds
function calculateTravellingTime(oldTime: number, newTime: number): number {
    return oldTime - newTime; 
}

// Function to calculate travelled distance in meters
function calculateTravellingDistance(from: LatLon, to: LatLon): number {
    // Calculate travelled distance using geolib and vehicle coordinates
    return getDistance(from, to);
}

// Function to calculate travelled speed in km/h
function calculateTravellingSpeed(distance: number, time: number) {
    return Math.round((distance / time) * 3.6); 
}

export { calculateTravellingTime, calculateTravellingDistance, calculateTravellingSpeed };
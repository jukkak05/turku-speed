// Import geolib
// Docs: https://www.npmjs.com/package/geolib
import { getDistance } from "geolib";

// Define LatLon type
type LatLon = { latitude: number; longitude: number};

// Define position sample type (timestamp in seconds)
type PositionSample = LatLon & { timestamp: number };

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
function _buildBbox(lat: number, lon: number, delta = 0.00005) {
  const minLat = lat - delta;
  const maxLat = lat + delta;
  const minLon = lon - delta;
  const maxLon = lon + delta;
  return `${minLon},${minLat},${maxLon},${maxLat},EPSG:4326`;
}

// Function to calculate travelled time in seconds
function calculateTravellingTime(timestamp: number, oldTimestamp: number): number {
    return timestamp - oldTimestamp; 
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

// Function to calculate average speed in km/h over a series of position samples
function calculateAverageSpeed(samples: PositionSample[]): number | undefined {
    if (samples.length < 2) return undefined;

    // Elapsed time between the first and the last sample
    const time = calculateTravellingTime(samples[samples.length - 1].timestamp, samples[0].timestamp);
    if (time <= 0) return undefined;

    // Sum of distances between consecutive samples
    let distance = 0;
    for (let i = 1; i < samples.length; i++) {
        distance += calculateTravellingDistance(samples[i - 1], samples[i]);
    }

    return calculateTravellingSpeed(distance, time);
}

export type { PositionSample };
export { calculateTravellingTime, calculateTravellingDistance, calculateTravellingSpeed, calculateAverageSpeed };
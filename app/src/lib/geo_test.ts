import { assertAlmostEquals, assertEquals } from "@std/assert";
import {
  calculateAverageSpeed,
  calculateTravellingDistance,
  calculateTravellingSpeed,
  calculateTravellingTime,
} from "./geo.ts";

// Turku market square
const KAUPPATORI = { latitude: 60.4509, longitude: 22.2669 };

Deno.test("calculateTravellingTime returns seconds between timestamps", () => {
  assertEquals(calculateTravellingTime(1700000010, 1700000004), 6);
  assertEquals(calculateTravellingTime(1700000004, 1700000004), 0);
});

Deno.test("calculateTravellingDistance returns 0 for the same point", () => {
  assertEquals(calculateTravellingDistance(KAUPPATORI, KAUPPATORI), 0);
});

Deno.test("calculateTravellingDistance returns meters between points", () => {
  // 0.001 degrees of latitude is ~111 meters
  const north = { latitude: KAUPPATORI.latitude + 0.001, longitude: KAUPPATORI.longitude };
  assertAlmostEquals(calculateTravellingDistance(KAUPPATORI, north), 111, 1);
});

Deno.test("calculateTravellingDistance is symmetric", () => {
  const other = { latitude: 60.4518, longitude: 22.2706 };
  assertEquals(
    calculateTravellingDistance(KAUPPATORI, other),
    calculateTravellingDistance(other, KAUPPATORI),
  );
});

Deno.test("calculateTravellingSpeed converts m/s to rounded km/h", () => {
  // 10 m/s = 36 km/h
  assertEquals(calculateTravellingSpeed(40, 4), 36);
  // 50 m in 4 s = 12.5 m/s = 45 km/h
  assertEquals(calculateTravellingSpeed(50, 4), 45);
  // 7 m in 3 s = 8.4 km/h, rounded to 8
  assertEquals(calculateTravellingSpeed(7, 3), 8);
  assertEquals(calculateTravellingSpeed(0, 4), 0);
});

Deno.test("calculateAverageSpeed needs at least two samples over time", () => {
  assertEquals(calculateAverageSpeed([]), undefined);
  assertEquals(calculateAverageSpeed([{ ...KAUPPATORI, timestamp: 1700000000 }]), undefined);
  assertEquals(
    calculateAverageSpeed([
      { ...KAUPPATORI, timestamp: 1700000000 },
      { latitude: KAUPPATORI.latitude + 0.001, longitude: KAUPPATORI.longitude, timestamp: 1700000000 },
    ]),
    undefined,
  );
});

Deno.test("calculateAverageSpeed sums path length over total time", () => {
  // ~111 m north, then ~111 m back south: 222 m in 20 s = ~40 km/h even though start and end are the same point
  const speed = calculateAverageSpeed([
    { ...KAUPPATORI, timestamp: 1700000000 },
    { latitude: KAUPPATORI.latitude + 0.001, longitude: KAUPPATORI.longitude, timestamp: 1700000008 },
    { ...KAUPPATORI, timestamp: 1700000020 },
  ]);
  assertEquals(speed, 40);
});

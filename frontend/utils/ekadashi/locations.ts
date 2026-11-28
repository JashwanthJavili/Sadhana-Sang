import type { EkadashiLocation } from './calendar';

/**
 * Preset cities (major ISKCON centres and large devotee communities).
 * `id` is the key used for verified observance records in the database:
 *   ekadashi/observances/{id}/{fastDate}
 */
export const PRESET_LOCATIONS: EkadashiLocation[] = [
  // India — holy dhamas first
  { id: 'mayapur', name: 'Sridham Mayapur', country: 'India', lat: 23.4167, lon: 88.3833, tz: 'Asia/Kolkata' },
  { id: 'vrindavan', name: 'Vrindavan', country: 'India', lat: 27.5650, lon: 77.6593, tz: 'Asia/Kolkata' },
  { id: 'jagannath-puri', name: 'Jagannath Puri', country: 'India', lat: 19.8135, lon: 85.8312, tz: 'Asia/Kolkata' },
  { id: 'new-delhi', name: 'New Delhi', country: 'India', lat: 28.6667, lon: 77.2167, tz: 'Asia/Kolkata' },
  { id: 'mumbai', name: 'Mumbai', country: 'India', lat: 18.9833, lon: 72.8333, tz: 'Asia/Kolkata' },
  { id: 'kolkata', name: 'Kolkata', country: 'India', lat: 22.5726, lon: 88.3639, tz: 'Asia/Kolkata' },
  { id: 'bengaluru', name: 'Bengaluru', country: 'India', lat: 12.9716, lon: 77.5946, tz: 'Asia/Kolkata' },
  { id: 'chennai', name: 'Chennai', country: 'India', lat: 13.0827, lon: 80.2707, tz: 'Asia/Kolkata' },
  { id: 'hyderabad', name: 'Hyderabad', country: 'India', lat: 17.3850, lon: 78.4867, tz: 'Asia/Kolkata' },
  { id: 'pune', name: 'Pune', country: 'India', lat: 18.5204, lon: 73.8567, tz: 'Asia/Kolkata' },
  { id: 'ahmedabad', name: 'Ahmedabad', country: 'India', lat: 23.0225, lon: 72.5714, tz: 'Asia/Kolkata' },
  { id: 'jaipur', name: 'Jaipur', country: 'India', lat: 26.9124, lon: 75.7873, tz: 'Asia/Kolkata' },
  { id: 'lucknow', name: 'Lucknow', country: 'India', lat: 26.8467, lon: 80.9462, tz: 'Asia/Kolkata' },
  { id: 'chandigarh', name: 'Chandigarh', country: 'India', lat: 30.7333, lon: 76.7794, tz: 'Asia/Kolkata' },
  { id: 'bhubaneswar', name: 'Bhubaneswar', country: 'India', lat: 20.2961, lon: 85.8245, tz: 'Asia/Kolkata' },
  { id: 'guwahati', name: 'Guwahati', country: 'India', lat: 26.1445, lon: 91.7362, tz: 'Asia/Kolkata' },
  { id: 'tirupati', name: 'Tirupati', country: 'India', lat: 13.6288, lon: 79.4192, tz: 'Asia/Kolkata' },
  { id: 'vijayawada', name: 'Vijayawada', country: 'India', lat: 16.5062, lon: 80.6480, tz: 'Asia/Kolkata' },
  { id: 'visakhapatnam', name: 'Visakhapatnam', country: 'India', lat: 17.6868, lon: 83.2185, tz: 'Asia/Kolkata' },
  { id: 'coimbatore', name: 'Coimbatore', country: 'India', lat: 11.0168, lon: 76.9558, tz: 'Asia/Kolkata' },
  { id: 'kochi', name: 'Kochi', country: 'India', lat: 9.9312, lon: 76.2673, tz: 'Asia/Kolkata' },
  { id: 'nagpur', name: 'Nagpur', country: 'India', lat: 21.1458, lon: 79.0882, tz: 'Asia/Kolkata' },
  { id: 'patna', name: 'Patna', country: 'India', lat: 25.5941, lon: 85.1376, tz: 'Asia/Kolkata' },
  // South Asia & Asia-Pacific
  { id: 'kathmandu', name: 'Kathmandu', country: 'Nepal', lat: 27.7172, lon: 85.3240, tz: 'Asia/Kathmandu' },
  { id: 'dhaka', name: 'Dhaka', country: 'Bangladesh', lat: 23.8103, lon: 90.4125, tz: 'Asia/Dhaka' },
  { id: 'colombo', name: 'Colombo', country: 'Sri Lanka', lat: 6.9271, lon: 79.8612, tz: 'Asia/Colombo' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198, tz: 'Asia/Singapore' },
  { id: 'kuala-lumpur', name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.1390, lon: 101.6869, tz: 'Asia/Kuala_Lumpur' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', lat: 22.3193, lon: 114.1694, tz: 'Asia/Hong_Kong' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
  { id: 'melbourne', name: 'Melbourne', country: 'Australia', lat: -37.8136, lon: 144.9631, tz: 'Australia/Melbourne' },
  { id: 'auckland', name: 'Auckland', country: 'New Zealand', lat: -36.8485, lon: 174.7633, tz: 'Pacific/Auckland' },
  { id: 'suva', name: 'Suva', country: 'Fiji', lat: -18.1248, lon: 178.4501, tz: 'Pacific/Fiji' },
  // Middle East & Africa
  { id: 'dubai', name: 'Dubai', country: 'UAE', lat: 25.2048, lon: 55.2708, tz: 'Asia/Dubai' },
  { id: 'johannesburg', name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lon: 28.0473, tz: 'Africa/Johannesburg' },
  { id: 'durban', name: 'Durban', country: 'South Africa', lat: -29.8587, lon: 31.0218, tz: 'Africa/Johannesburg' },
  { id: 'nairobi', name: 'Nairobi', country: 'Kenya', lat: -1.2921, lon: 36.8219, tz: 'Africa/Nairobi' },
  { id: 'mauritius', name: 'Port Louis', country: 'Mauritius', lat: -20.1609, lon: 57.5012, tz: 'Indian/Mauritius' },
  // Europe
  { id: 'london', name: 'London', country: 'United Kingdom', lat: 51.5167, lon: -0.1333, tz: 'Europe/London' },
  { id: 'manchester', name: 'Manchester', country: 'United Kingdom', lat: 53.4808, lon: -2.2426, tz: 'Europe/London' },
  { id: 'dublin', name: 'Dublin', country: 'Ireland', lat: 53.3498, lon: -6.2603, tz: 'Europe/Dublin' },
  { id: 'paris', name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041, tz: 'Europe/Amsterdam' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050, tz: 'Europe/Berlin' },
  { id: 'stockholm', name: 'Stockholm', country: 'Sweden', lat: 59.3293, lon: 18.0686, tz: 'Europe/Stockholm' },
  { id: 'moscow', name: 'Moscow', country: 'Russia', lat: 55.7558, lon: 37.6173, tz: 'Europe/Moscow' },
  // Americas
  { id: 'new-york', name: 'New York', country: 'USA', lat: 40.7167, lon: -74.0, tz: 'America/New_York' },
  { id: 'washington-dc', name: 'Washington, D.C.', country: 'USA', lat: 38.9072, lon: -77.0369, tz: 'America/New_York' },
  { id: 'chicago', name: 'Chicago', country: 'USA', lat: 41.8781, lon: -87.6298, tz: 'America/Chicago' },
  { id: 'houston', name: 'Houston', country: 'USA', lat: 29.7604, lon: -95.3698, tz: 'America/Chicago' },
  { id: 'dallas', name: 'Dallas', country: 'USA', lat: 32.7767, lon: -96.7970, tz: 'America/Chicago' },
  { id: 'los-angeles', name: 'Los Angeles', country: 'USA', lat: 34.05, lon: -118.25, tz: 'America/Los_Angeles' },
  { id: 'san-francisco', name: 'San Francisco', country: 'USA', lat: 37.7749, lon: -122.4194, tz: 'America/Los_Angeles' },
  { id: 'toronto', name: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832, tz: 'America/Toronto' },
  { id: 'vancouver', name: 'Vancouver', country: 'Canada', lat: 49.2827, lon: -123.1207, tz: 'America/Vancouver' },
  { id: 'mexico-city', name: 'Mexico City', country: 'Mexico', lat: 19.4326, lon: -99.1332, tz: 'America/Mexico_City' },
  { id: 'sao-paulo', name: 'São Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333, tz: 'America/Sao_Paulo' },
  { id: 'port-of-spain', name: 'Port of Spain', country: 'Trinidad & Tobago', lat: 10.6549, lon: -61.5019, tz: 'America/Port_of_Spain' },
  { id: 'georgetown', name: 'Georgetown', country: 'Guyana', lat: 6.8013, lon: -58.1551, tz: 'America/Guyana' },
];

export const DEFAULT_LOCATION_ID = 'mayapur';

export const findPreset = (id: string) => PRESET_LOCATIONS.find((l) => l.id === id);

/** Great-circle distance in km */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestPreset(lat: number, lon: number): { location: EkadashiLocation; km: number } {
  let best = PRESET_LOCATIONS[0];
  let bestKm = Infinity;
  for (const l of PRESET_LOCATIONS) {
    const km = distanceKm({ lat, lon }, l);
    if (km < bestKm) {
      best = l;
      bestKm = km;
    }
  }
  return { location: best, km: bestKm };
}

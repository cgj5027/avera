import { RequestFailure } from './requestSafety.ts';
/** City/place-centre distances, not travel distances or exact workplace addresses. */
export const DEFAULT_DISTANCE_MILES = 25;
export const validDistance = value => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 250;
const text = value => typeof value === 'string' ? value.trim().slice(0, 400) : '';
const coords = (lon, lat) => typeof lon === 'number' && typeof lat === 'number' && Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90;

export function milesBetween(a, b) {
  const rad = degrees => degrees * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

/** Request-scoped cache; location strings and coordinates are never stored globally. */
export function createJobArea(profile) {
  const location = text(profile.location);
  const radius = profile.distance_miles ?? DEFAULT_DISTANCE_MILES;
  if (!validDistance(radius)) throw new Error('Invalid search distance');
  const cache = new Map();
  let lookupFailures = false;
  const locate = input => {
    const query = text(input).replace(/\b(remote|hybrid|on[- ]?site)\b/gi, '').replace(/^[\s,–-]+|[\s,–-]+$/g, '').trim();
    if (!query) return Promise.resolve(null);
    const key = query.toLowerCase();
    if (!cache.has(key) && cache.size >= 13) return Promise.resolve(null);
    if (!cache.has(key)) cache.set(key, (async () => {
      const url = new URL('https://photon.komoot.io/api/');
      url.searchParams.set('q', query); url.searchParams.set('limit', '2');
      let response;
      try { response = await fetch(url.toString(), {redirect:'manual',signal:AbortSignal.timeout(5000)}); }
      catch { throw new RequestFailure(503, 'Location lookup is unavailable. Please retry.', 'LOCATION_UNAVAILABLE'); }
      if (!response.ok || response.status >= 300) throw new RequestFailure(503, 'Location lookup is unavailable. Please retry.', 'LOCATION_UNAVAILABLE');
      let body;
      try { body = await response.json(); } catch { throw new RequestFailure(503, 'Location lookup is unavailable. Please retry.', 'LOCATION_UNAVAILABLE'); }
      if (!Array.isArray(body?.features)) throw new RequestFailure(503, 'Location lookup is unavailable. Please retry.', 'LOCATION_UNAVAILABLE');
      const places = body.features.filter(feature => {
        const point=feature?.geometry?.coordinates;
        const kind=feature?.properties?.type;
        return Array.isArray(point) && coords(point[0],point[1]) &&
          !['country','state','county'].includes(kind) && (feature.properties.city || ['city','town','village','locality','postcode','district'].includes(kind));
      });
      if (!places.length) return null;
      const point = places[0].geometry.coordinates;
      const result = {lon:point[0],lat:point[1]};
      // Reject ambiguous cities rather than picking a distant city with the same name.
      if (places[1] && milesBetween(result,{lon:places[1].geometry.coordinates[0],lat:places[1].geometry.coordinates[1]}) > 25) return null;
      return result;
    })());
    return cache.get(key);
  };
  let origin;
  const validate = async () => {
    if (!location) return null;
    origin ??= locate(location);
    const centre = await origin;
    if (!centre) throw new RequestFailure(422, 'Enter a specific city and state or postal code for distance-limited search.', 'LOCATION_REQUIRED');
    return centre;
  };
  return {
    validate,
    get partial() { return lookupFailures; },
    async filter(listings) {
      if (!location) return listings;
      const centre = await validate();
      const output = [];
      // Small batches and a shared 12-destination budget bound lookup cost/latency.
      for (let offset = 0; offset < listings.length; offset += 3) {
        const batch = await Promise.all(listings.slice(offset, offset + 3).map(async listing => {
          let point;
          try { point = await locate(listing.location); } catch { lookupFailures = true; return null; }
          if (!point) return null;
          const distance = milesBetween(centre, point);
          return distance <= radius ? {...listing, distance_miles:Math.round(distance * 10) / 10} : null;
        }));
        output.push(...batch.filter(Boolean));
      }
      if (!output.length && lookupFailures) throw new RequestFailure(503, 'Location lookup is unavailable. Please retry.', 'LOCATION_UNAVAILABLE');
      return output;
    },
  };
}

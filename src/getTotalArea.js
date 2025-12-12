// import fetch from "node-fetch";
import * as turf from "@turf/turf";

/**
 * Fetch relation ID of a city/municipality by name (case-insensitive)
 */
async function getRelationId(name) {
  const query = `
[out:json][timeout:25];
relation["boundary"="administrative"]["name"~"${name}", i];
out ids tags;
`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
    headers: { "Content-Type": "text/plain" }
  });

  const data = await res.json();
  if (!data.elements || data.elements.length === 0) {
    throw new Error(`❌ No administrative boundary found for "${name}"`);
  }

  // Return the first matching relation ID
  return data.elements[0].id;
}

/**
 * Fetch full geometry of a relation by ID
 */
async function getRelationGeometry(id) {
  const query = `
[out:json][timeout:60];
relation(${id});
out geom;
`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
    headers: { "Content-Type": "text/plain" }
  });

  const data = await res.json();
  if (!data.elements || data.elements.length === 0) {
    throw new Error(`❌ Relation ${id} has no geometry`);
  }

  const rel = data.elements[0];

  // Build polygons from member geometry (ways)
  const polygons = [];

  if (rel.geometry) {
    // Some relations have direct geometry
    polygons.push(rel.geometry.map(p => [p.lon, p.lat]));
  } else if (rel.members) {
    // Relations with members (ways)
    for (const m of rel.members) {
      if (m.geometry && m.type === "way") {
        const coords = m.geometry.map(p => [p.lon, p.lat]);
        polygons.push(coords);
      }
    }
  }

  if (polygons.length === 0) {
    throw new Error(`❌ Relation ${id} has no usable geometry`);
  }

  // Wrap as MultiPolygon for Turf
  const feature = turf.multiPolygon([polygons], { relationId: id });

  return feature;
}

/**
 * Calculate area in m² and km²
 */
function calculateArea(feature) {
  const areaSqM = turf.area(feature);
  const areaSqKm = areaSqM / 1_000_000;
  return { areaSqM, areaSqKm };
}

/**
 * Main
 */
async function main() {
  const cityName = process.argv[2] || "Trelleborg";

  try {
    const relationId = await getRelationId(cityName);
    console.log("Found relation ID:", relationId);

    const feature = await getRelationGeometry(relationId);
    console.log("Geometry fetched, calculating area...");

    const area = calculateArea(feature);

    console.log(`Area of "${cityName}":`);
    console.log(`- ${area.areaSqM.toLocaleString()} m²`);
    console.log(`- ${area.areaSqKm.toLocaleString()} km²`);
  } catch (err) {
    console.error(err.message);
  }
}

main();

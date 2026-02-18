import { generate } from './generateCoverageArea.js'
import { scoreCalculation } from './scoreCalculation.js'
import { createGridOvercaptureArea, createCircleOvercaptureArea, fixCrimes } from './helpers.js'
import { getIntersectingBuildingsAI } from './intersectingBuildings.js'
import { getCrimesInPolygon } from './getCrimesInPolygon.js'
import { getAllCrimesAvailable } from './getAllCrimesAvailable.js'
import * as turf from '@turf/turf'
import { WorkerPool } from './pool.js';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = path.resolve(__dirname, "buildingwalkWorker.js");

let SILENT = false

let allpoints = []
let data = {}
let circle


function getBuildingBoundaryPoints(stepSize = 5) {
  const buildings = data.buildings
  const bbox = data.boundingBox
  let pointsAlongBoundary = []

  for (const building of buildings) {
  try {
    const geom = building.geometry;
    if (geom?.type !== "Polygon") {
      if (!SILENT) console.log("Skipping non-polygon:", geom?.type);
      continue;
    }

    if (!Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
      if (!SILENT) console.warn("Invalid geometry:", building);
      continue;
    }

    let boundary;
    if (geom.coordinates.length > 1) {
      // Use only the first (outer) ring
      boundary = turf.lineString(geom.coordinates[0]);
    } else {
      // Otherwise, polygonToLine is fine
      boundary = turf.polygonToLine(building);
      if (boundary.type === "FeatureCollection") {
        // Find the longest line (outer ring)
        boundary = boundary.features.reduce((longest, f) => {
          const len = turf.length(f);
          return !longest || len > turf.length(longest) ? f : longest;
        }, null);
      }
    }

    if (!boundary?.geometry?.coordinates) {
      if (!SILENT) console.warn("Invalid boundary:", boundary);
      continue;
    }

    let offsetBoundary;
    try {
      offsetBoundary = turf.lineOffset(boundary, 0.0005, { units: "kilometers" });
    } catch (err) {
      if (!SILENT) console.warn("lineOffset failed, using original boundary:", err.message);
      offsetBoundary = boundary;
    }

    const perimeter = turf.length(offsetBoundary, { units: "meters" });

    for (let i = 0; i <= perimeter; i += stepSize) {
      try {
        const point = turf.along(offsetBoundary, i, { units: "meters" });
        if (
          point?.geometry &&
          Array.isArray(point.geometry.coordinates) &&
          point.geometry.coordinates.every(Number.isFinite)
        ) {
          if (turf.booleanPointInPolygon(point, circle)) {
            pointsAlongBoundary.push(point);
          }
        } else {
          if (!SILENT) console.warn("Invalid point generated at distance", i);
        }
      } catch (err) {
        if (!SILENT) console.warn("Skipping bad point at distance", i, err.message);
      }
    }

  } catch (err) {
    if (!SILENT) console.error("Error processing building:", err.message);
  }
}


  return turf.featureCollection(pointsAlongBoundary)
}




async function buildingWalk(camPoint, distance, distanceWeight) {
  let currentCam = await generate(data.buildings, data.boundingBox, [camPoint], distance)
  currentCam = currentCam[0]

  let camObject = await scoreCalculation(distanceWeight, currentCam, camPoint, data.crimes, Object.keys(data.crimes))

  allpoints.push( camObject )
}



async function initBuildingwalk(center, distance, gridDensity, activationFunction, year, steps) {
  allpoints = []
  data = {}
  circle = turf.circle([parseFloat(center.split(",")[1]), parseFloat(center.split(",")[0])], distance/1000, { steps: 64, units: 'kilometers' })

  !SILENT && console.time("### Get all intersecting buildings")
  data = await getIntersectingBuildingsAI(center, distance)
  !SILENT && console.timeEnd("### Get all intersecting buildings")

  !SILENT && console.time("### Get all crimes in r*2 bounding box")
  data.crimes = await getCrimesInPolygon(data.boundingBox, data.buildings, year)
  !SILENT && console.timeEnd("### Get all crimes in r*2 bounding box")
  !SILENT && console.time("### Create grid over capture area")
  !SILENT && console.timeEnd("### Create grid over capture area")

  // if (bigN == 1) {
  //   bigN = await getAllCrimesAvailable()
  // } else {
  //   bigN = data.crimes.length
  // }

  let numberOfCrimesInRadius = data.crimes.length

  data.crimes = await fixCrimes(data.crimes)

  data.distance = parseFloat(distance)
  data.gridDensity = parseFloat(gridDensity)

  const sharedData = JSON.parse(JSON.stringify({
    buildings: data.buildings,
    boundingBox: data.boundingBox,
    crimes: data.crimes,
    numberOfCrimesInRadius: numberOfCrimesInRadius
  }));

  // const sharedData = {
  //   buildings: data.buildings,
  //   boundingBox: data.boundingBox,
  //   crimes: data.crimes
  // };

  const pool = new WorkerPool(
    workerPath,
    10,                      // pool size
    sharedData              // shared to all workers
  );

  let points = getBuildingBoundaryPoints(parseInt(steps))
  !SILENT && console.log(`Points in boundary: ${points.features.length}`)

  // await Promise.all(
  //   points.features.map(async (current) => {
  //     let point = current.geometry

  //     await buildingWalk(bigN, point, distance, distanceWeight)
  //   })
  // )
  // const tasks = points.features.map(f => {
  //   return pool.run({
  //     camPoint: f.geometry.coordinates,
  //     bigN,
  //     distance,
  //     distanceWeight
  //   });
  // });

  const workerPromises = points.features.map(f =>
    pool.run({
      activationFunction,
      camPoint: f.geometry,
      distance
    })
  );

  allpoints = (await Promise.all(workerPromises)).map(msg => msg.result);

  await pool.close();
  // allpoints = allpoints.filter(p => p.ok); // keep only successful results

  allpoints.sort((a, b) => {
    return (
      // b.totalCrimeCount - a.totalCrimeCount ||
      b.camInfo.score - a.camInfo.score ||
      a.totalDistance - b.totalDistance
    )
  })
  if (allpoints.length === 0) {
    allpoints[0] = {
      camInfo: {
        score: 0
      },
      totalCount: 0,
      totalCrimeCount: 0,
      pai: 0
    }
  }
  !SILENT && console.log("Building walk best score: " + allpoints[0].camInfo.score)

  return {
    allPoints: allpoints,
    circle: circle,
    buildings: data.buildings,
    crimes: data.crimes,
    boundingBox: data.boundingBox
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  SILENT=true
  let startLoc = process.argv[2]
  let dist = process.argv[3]
  let activationFunction = process.argv[4]
  let year = process.argv[5]

  const start = performance.now()

  let data = await initBuildingwalk(startLoc, dist, 5, activationFunction, year, 5)

  const end = performance.now()
  const elapsed = end - start

  const totalCount = Object.values(data.crimes)
      .reduce((sum, item) => sum + item.count, 0);

  console.log(JSON.stringify(
      {
        "num_startpoints": data.allPoints[0].length,
        "exec_time": Math.round((elapsed/1000)*1000)/1000,
        "best_score": data.allPoints[0].camInfo.score,
        // "weighted_score": data.allPoints[0].camInfo.weighted_score,
        "ind_time": null,
        "avg_time": null,
        "steps": data.allPoints.length,
        "total_crimes": totalCount,
        "seen_crimes": data.allPoints[0].totalCount,
        "unique_crime_coords": data.allPoints[0].totalCrimeCount,
        "pai": data.allPoints[0].pai,
        "area": data.allPoints[0].camInfo.area,
        "total_distance": data.allPoints[0].totalDistance,
        "activation_function": activationFunction
      }
    )
  )

}

export { initBuildingwalk }

import { generate } from './generateCoverageArea.js'
import { scoreCalculation } from './scoreCalculation.js'
import { createGridOvercaptureArea, createCircleOvercaptureArea, fixCrimes } from './helpers.js'
import { getIntersectingBuildingsAI } from './intersectingBuildings.js'
import { getCrimesInPolygon } from './getCrimesInPolygon.js'
import { getAllCrimesAvailable } from './getAllCrimesAvailable.js'
import * as turf from '@turf/turf'

let SILENT = false

let allpoints = []
let data = {}
let circle


// function getBuildingBoundaryPoints(stepSize = 5) {
//   const buildings = data.buildings
//   const bbox = data.boundingBox
//   let pointsAlongBoundary = []



//   for (const building of buildings) {
//     // Handle Polygon buildings
//     if (building.geometry.type === "Polygon") {
//       let boundary = turf.polygonToLine(building)
//       let offsetBoundary = turf.lineOffset(boundary, 0.0005, {units: 'kilometers'})
//       let perimeter = turf.length(offsetBoundary, {units: 'meters'})

//       for (let i = 0; i <= perimeter; i += stepSize) {
//           let point = turf.along(offsetBoundary, i, {units: 'meters'})

//           // if(turf.booleanPointInPolygon(point, turf.cleanCoords(bbox))) {
//           //     pointsAlongBoundary.push(point)
//           // }
//           if(turf.booleanPointInPolygon(point, circle)) {
//               pointsAlongBoundary.push(point)
//               // console.log("yay")
//           }
//           // const insideGrid = turf.booleanPointInPolygon(point, circle)


//           // if(insideGrid) {
//           //     pointsAlongBoundary.push(point)
//           // }

//       }
//     } else {console.log(building.geometry.type)}
//   }

//   // Return as a GeoJSON FeatureCollection
//   return turf.featureCollection(pointsAlongBoundary)
// }
function getBuildingBoundaryPoints(stepSize = 5) {
  const buildings = data.buildings
  const bbox = data.boundingBox
  let pointsAlongBoundary = []

  // for (const building of buildings) {
  //   // console.log(building.geometry.coordinates.length)
  //   try {
  //     if (building.geometry.type === "Polygon") {
  //       // Ensure coordinates exist and are valid
  //       if (!building.geometry.coordinates || !Array.isArray(building.geometry.coordinates)) {
  //         !SILENT && console.warn("Invalid geometry:", building)
  //         continue
  //       }

  //       // Convert Polygon to Line
  //       let boundary = turf.polygonToLine(building)

  //       // polygonToLine can return a FeatureCollection
  //       if (boundary.type === "FeatureCollection") {
  //         boundary = boundary.features[0]
  //       }

  //       // Ensure boundary is valid
  //       if (!boundary || !boundary.geometry || !boundary.geometry.coordinates) {
  //         !SILENT && console.warn("Invalid boundary:", boundary)
  //         continue
  //       }
  //       // if (boundary.type === 'Polygon') {
  //       //   boundary = {
  //       //     type: 'LineString',
  //       //     coordinates: boundary.coordinates[0] // use the outer ring
  //       //   };
  //       // }

  //       // Offset and measure
  //       let offsetBoundary = turf.lineOffset(boundary, 0.0005, {units: 'kilometers'})
  //       let perimeter = turf.length(offsetBoundary, {units: 'meters'})

  //       for (let i = 0; i <= perimeter; i += stepSize) {
  //         let point = turf.along(offsetBoundary, i, {units: 'meters'})

  //         // Only add if point is valid
  //         if (
  //           point &&
  //           point.geometry &&
  //           Array.isArray(point.geometry.coordinates) &&
  //           point.geometry.coordinates.every(Number.isFinite)
  //         ) {
  //           if (turf.booleanPointInPolygon(point, circle)) {
  //             pointsAlongBoundary.push(point)
  //           }
  //         } else {
  //           !SILENT && console.warn("Invalid point generated at distance", i)
  //         }
  //       }
  //     } else {
  //       !SILENT && console.log("Skipping non-polygon:", building.geometry.type)
  //     }
  //   } catch (err) {
  //     !SILENT && console.error("Error processing building:", err, building)
  //   }
  // }
  for (const building of buildings) {
  try {
    const geom = building.geometry;
    if (geom?.type !== "Polygon") {
      if (!SILENT) console.log("Skipping non-polygon:", geom?.type);
      continue;
    }

    // ✅ Ensure coordinates exist and are valid
    if (!Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
      if (!SILENT) console.warn("Invalid geometry:", building);
      continue;
    }

    // ✅ If polygon has multiple rings (outer + holes), use only the outer one
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

    // ✅ Ensure boundary is valid
    if (!boundary?.geometry?.coordinates) {
      if (!SILENT) console.warn("Invalid boundary:", boundary);
      continue;
    }

    // ✅ Offset and measure safely
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




async function buildingWalk(bigN, camPoint, distance, distanceWeight) {
  let currentCam = await generate(data.buildings, data.boundingBox, [camPoint], distance)
  currentCam = currentCam[0]

  let camObject = await scoreCalculation(bigN, distanceWeight, currentCam, camPoint, data.crimes, Object.keys(data.crimes))

  allpoints.push( camObject )
}



async function initBuildingwalk(center, distance, gridDensity, distanceWeight, bigN, year, steps) {
  // console.log(center, distance, gridDensity, distanceWeight, bigN, year)
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
  // let gridArea = await createGridOvercaptureArea(parseFloat(center.split(",")[1]), parseFloat(center.split(",")[0]), distance, gridDensity, data.buildings)
  // let gridArea = await createGridOvercaptureArea(parseFloat(center.split(",")[1]), parseFloat(center.split(",")[0]), distance, data.buildings)
  !SILENT && console.timeEnd("### Create grid over capture area")

  if (bigN == 1) {
    bigN = await getAllCrimesAvailable()
  } else {
    bigN = data.crimes.length
  }

  data.crimes = await fixCrimes(data.crimes)

  data.distance = parseFloat(distance)
  data.gridDensity = parseFloat(gridDensity)

  let points = getBuildingBoundaryPoints(parseInt(steps))
  !SILENT && console.log(`Points in boundary: ${points.features.length}`)
  // console.log(points)

  await Promise.all(
    points.features.map(async (current) => {
      let point = current.geometry
      // console.log(point)
      await buildingWalk(bigN, point, distance, distanceWeight)
    })
  )

  allpoints.sort((a, b) => {
    return (
      // b.totalCrimeCount - a.totalCrimeCount ||
      b.camInfo.score - a.camInfo.score ||
      a.totalDistance - b.totalDistance
    )
  })

  !SILENT && console.log("Building walk best score: " + allpoints[0].camInfo.score)

  return {
    allPoints: allpoints,
    // gridArea: gridArea,
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
  let distWeight = process.argv[4]
  let year = process.argv[5]

  const start = performance.now()

  let data = await initBuildingwalk(startLoc, dist, 5, distWeight, 1, year, 5)
  
  const end = performance.now()
  const elapsed = end - start

  const totalCount = Object.values(data.crimes)
      .reduce((sum, item) => sum + item.count, 0);

  console.log(JSON.stringify(
      {
        "num_startpoints": data.allPoints[0].length,
        "exec_time": Math.round((elapsed/1000)*1000)/1000,
        "best_score": data.allPoints[0].camInfo.score,
        "ind_time": null,
        "avg_time": null,
        "steps": data.allPoints.length,
        "total_crimes": totalCount,
        "seen_crimes": data.allPoints[0].totalCount,
        "unique_crime_coords": data.allPoints[0].totalCrimeCount
      }
    )
  )

}

export { initBuildingwalk }

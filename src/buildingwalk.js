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


function getBuildingBoundaryPoints(stepSize = 5) {
  const buildings = data.buildings
  const bbox = data.boundingBox
  let pointsAlongBoundary = []



  for (const building of buildings) {
    // Handle Polygon buildings
    if (building.geometry.type === "Polygon") {
      let boundary = turf.polygonToLine(building)
      let offsetBoundary = turf.lineOffset(boundary, 0.0005, {units: 'kilometers'})
      let perimeter = turf.length(offsetBoundary, {units: 'meters'})

      for (let i = 0; i <= perimeter; i += stepSize) {
          let point = turf.along(offsetBoundary, i, {units: 'meters'})

          // if(turf.booleanPointInPolygon(point, turf.cleanCoords(bbox))) {
          //     pointsAlongBoundary.push(point)
          // }
          if(turf.booleanPointInPolygon(point, circle)) {
              pointsAlongBoundary.push(point)
              // console.log("yay")
          } else {
            // console.log("noooo")
          }
          // const insideGrid = turf.booleanPointInPolygon(point, circle)


          // if(insideGrid) {
          //     pointsAlongBoundary.push(point)
          // }

      }
    }
  }

  // Return as a GeoJSON FeatureCollection
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
  let gridArea = await createGridOvercaptureArea(parseFloat(center.split(",")[1]), parseFloat(center.split(",")[0]), distance, gridDensity, data.buildings)
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

  console.log("Building walk best score: " + allpoints[0].camInfo.score)

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
  console.time("Building walk exec time")
  /**
   * center
   * distance
   * gridSize (dist between points)
   * dist_weight
   * bigN
   * crimes from year (YYYY or "all")
   * steps in m along buildings
   */
  await initBuildingwalk("55.5636, 12.9746", 100, 5, 0.2, 1, "all", 5)
  console.timeEnd("Building walk exec time")
}

export { initBuildingwalk }

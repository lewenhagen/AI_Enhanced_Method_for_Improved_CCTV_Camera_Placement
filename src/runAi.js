import * as turf from '@turf/turf'
import { generate } from './generateCoverageArea.js'

const bearings = [0, , 45, 90, 135, 180, 225, 270]
/**
 * Required for generate: buildings, boundingBox, pointsOnBoundary, distance
 */

let currentBest = {
  totalCount: null,
  totalDistance: null,
  totalCrimeCount: null,
  score: 0
}

async function runAi(data) {
    // console.log(data)
    let score = 0
    let availableArea = data.areaWithoutBuildings
    let buildings = data.buildings
    let bbox = data.boundingBox
    let crimes = data.crimes
    let crimeCoords = Object.keys(data.crimes)
    let current = turf.point([parseFloat(data.start.split(",")[1]), parseFloat(data.start.split(",")[0])])

    let currentCam = await generate(buildings, bbox, [current], 100)
    currentCam = currentCam[0]

    let totalCount = 0
    let totalDistance = 0
    let crimeCount = 0

    for (const coord of crimeCoords) {
        let crimeAsPoint = turf.point([parseFloat(coord.split(",")[0]), parseFloat(coord.split(",")[1])])
        
        if (turf.booleanPointInPolygon(crimeAsPoint, currentCam.polygon)) {
            let distance = turf.distance(current, crimeAsPoint) * 1000

            crimeCount++
            totalCount += crimes[coord].count
            totalDistance += distance
        }
    }

    // Manage properties for score
    currentCam.totalCount = totalCount
    currentCam.totalDistance = totalDistance.toFixed(4)
    currentCam.totalCrimeCount = crimeCount
    currentCam.score = 1

    return {currentCam: currentCam, bestCam: currentBest}
}

export { runAi }
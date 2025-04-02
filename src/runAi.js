import * as turf from '@turf/turf'
import { generate } from './generateCoverageArea.js'

/**
 * Required for generate: buildings, boundingBox, pointsOnBoundary, distance
 */

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

    let totalCount = 0
    let totalDistance = 0

    for (const coord of crimeCoords) {
        let crimeAsPoint = turf.point([parseFloat(coord.split(",")[0]), parseFloat(coord.split(",")[1])])
        
        if (turf.booleanPointInPolygon(crimeAsPoint, currentCam[0].polygon)) {
            let distance = turf.distance(current, crimeAsPoint) * 1000
           
            totalCount += crimes[coord].count
            totalDistance += distance
        }
    }

    currentCam[0].totalCount = totalCount
    currentCam[0].totalDistance = totalDistance.toFixed(4)

    return currentCam
}

export { runAi }
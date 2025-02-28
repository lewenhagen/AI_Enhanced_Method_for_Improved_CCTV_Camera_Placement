import * as turf from '@turf/turf'
import { generate } from './generateCoverageArea.js'

async function walkAlongBuilding(data, distance) {
    let buildings = data.buildings
    let bbox = data.boundingBox
    let lines = []
    let max = 0
    for (const building of buildings) {
        let line = turf.polygonToLine(building)
        turf.coordEach(line, async function(currentCoord) {
            let result = await generate(buildings, bbox, currentCoord, distance)
            console.log(result)
        })
    }

    return lines
}




export { walkAlongBuilding }

import * as turf from '@turf/turf'
import { generate } from './generateCoverageArea.js'



async function walkAlongBuilding(data, distance) {
    let current = {}
    let result = []
    let buildings = data.buildings
    let bbox = data.boundingBox
    // let max = 0

    for (const building of buildings) {
        
        let boundary = turf.polygonToLine(building)

        let offsetBoundary = turf.lineOffset(boundary, 0.0005, {units: 'kilometers'})

        let perimeter = turf.length(offsetBoundary, {units: 'meters'})
        let stepSize = 1
        let pointsAlongBoundary = []
        
        for (let dist = 0; dist <= perimeter; dist += stepSize) {
            let point = turf.along(offsetBoundary, dist, {units: 'meters'})
            
            if(turf.booleanPointInPolygon(point, turf.cleanCoords(bbox))) {
              pointsAlongBoundary.push(point)
            }
            
        }
        
        result = [...(await generate(buildings, bbox, pointsAlongBoundary, distance))]
        
        // const pointsCollection = turf.featureCollection(pointsAlongBoundary)
        // console.log(line.geometry.coordinates.length)

        // turf.coordEach(line, async function(currentCoord) {
        //     console.log(line)
        //     result.push(await generate(buildings, bbox, currentCoord, distance))
           
        // })
    }
    
    return result
}




export { walkAlongBuilding }

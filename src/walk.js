import * as turf from '@turf/turf'
import { generate } from './generateCoverageArea.js'

let stepSize = 5

async function walkAlongBuilding(data, distance, nrOfCams, overlap) {
    let current = {}
    let result = []
    let buildings = data.buildings
    let bbox = data.boundingBox
    // let max = 0
    // console.log("Building length:", buildings.length)
    for (const building of buildings) {
        if (building.geometry.type === "Polygon") {
            // console.log(building)
            let boundary = turf.polygonToLine(building)

            let offsetBoundary = turf.lineOffset(boundary, 0.0005, {units: 'kilometers'})

            let perimeter = turf.length(offsetBoundary, {units: 'meters'})

            let pointsAlongBoundary = []

            for (let i = 0; i <= perimeter; i += stepSize) {
                let point = turf.along(offsetBoundary, i, {units: 'meters'})

                if(turf.booleanPointInPolygon(point, turf.cleanCoords(bbox))) {
                    pointsAlongBoundary.push(point)
                }

            }

            result = result.concat((await generate(buildings, bbox, pointsAlongBoundary, distance)))

            // const pointsCollection = turf.featureCollection(pointsAlongBoundary)
            // console.log(line.geometry.coordinates.length)

            // turf.coordEach(line, async function(currentCoord) {
            //     console.log(line)
            //     result.push(await generate(buildings, bbox, currentCoord, distance))

            // })
        }

    }

    result.sort((a, b) => b.area - a.area)

    let n = parseInt(nrOfCams)
    let endResult = []
    let remainingPolygons = [...result]

    for (let i = 0; i < remainingPolygons.length && endResult.length < n; i++) {
        let currentPolygon = remainingPolygons[i];

        endResult.push(currentPolygon);

        // remainingPolygons = remainingPolygons.filter(poly => !turf.booleanIntersects(currentPolygon.polygon, poly.polygon));
        remainingPolygons = remainingPolygons.filter(function(poly) {
            if (turf.booleanIntersects(currentPolygon.polygon, poly.polygon)) {
                let a = turf.area(turf.intersect(turf.featureCollection([currentPolygon.polygon, poly.polygon])))
                let tempA = turf.area(currentPolygon.polygon)
                let tempB = turf.area(poly.polygon)
                let total = tempA + tempB
                // console.log(overlap)
                if ((a / total) < parseFloat(overlap)/100) {
                    return poly.polygon
                }
                // return !turf.booleanIntersects(currentPolygon.polygon, poly.polygon)

            } else {
                return poly.polygon
            }

        })

    }


    return endResult

}




export { walkAlongBuilding }

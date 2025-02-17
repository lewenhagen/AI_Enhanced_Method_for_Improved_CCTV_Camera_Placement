import { workerData, parentPort } from "worker_threads"
import * as turf from '@turf/turf'
// console.log(workerData.chunk.length)
let result = []

for (const circle of workerData.chunk) {
    const circleCoords = turf.getCoords(circle.area)[0]
    let newCircle = []
    for (let circleCoord of circleCoords) {
        let pointHolder = []

        for (const building of circle.buildings) {
            if (turf.booleanContains(building, circle.center)) {

                circle.center = turf.nearestPointOnLine(turf.lineString(building.geometry.coordinates[0]), circle.center)

                for (let i = 0; i < 360; i++) {
                    const destinationPoint = turf.destination(circle.center, 0.5, i, { units: 'meters' })

                    if (!turf.booleanContains(building, destinationPoint)) {
                        circle.center = destinationPoint
                        continue
                    }
                }
            }

            const circleCenterCoords = turf.getCoords(circle.center)


            const newline = turf.lineString([circleCenterCoords, circleCoord])
            const cc2 = turf.lineIntersect(newline, building)

            if (cc2.features.length > 0) {
                pointHolder.push(turf.nearestPoint(circle.center, cc2))
            }
        }

        const nearestPoint = pointHolder.length > 0 ?
          turf.getCoord(turf.nearestPoint(circle.center, turf.featureCollection(pointHolder))) :
          circleCoord

        newCircle.push(nearestPoint)
    }
    // console.log(newCircle)
    if (newCircle[-1] !== newCircle[0]) {
        newCircle.push(newCircle[0])
    }

    let c = turf.polygon([newCircle] )
    let bbox = turf.polygon([workerData.boundingBox])
    // console.log(c)
    // console.log(bbox)

    result.push(turf.intersect(turf.featureCollection([c, bbox])))
    result.push(circle.center)
}

parentPort.postMessage(result)
process.exit(0)

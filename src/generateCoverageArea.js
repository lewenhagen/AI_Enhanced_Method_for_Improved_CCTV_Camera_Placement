import * as turf from '@turf/turf'

const circleSteps = 60
let circleHolder = []


/**
 * Main function.
 */
async function generate(buildings, boundingBox, pointsOnBoundary, distance) {

  let result = []
  let checkupFeatureCollection = turf.featureCollection([])

  for (const currentCoord of pointsOnBoundary) {
    // console.log(current)
    // let currentCoord = turf.point(current)
    circleHolder = []
    
    let options = {units: 'kilometers', steps: circleSteps}
    let circle = turf.circle(currentCoord, distance/1000, options)
    const intersectingFeatures = []
      
    buildings.forEach(item => {
        if (turf.booleanIntersects(item, circle)) {
            intersectingFeatures.push(turf.flatten(item).features[0])
        }
    });
  
      
    let circleObj = {"center": currentCoord, "area": circle, "buildings": intersectingFeatures}
    
    const circleCoords = turf.getCoords(circleObj.area)[0]
    let newCircle = []
  
    for (let circleCoord of circleCoords) {
        let pointHolder = []
  
        for (const building of circleObj.buildings) {
            if (turf.booleanContains(building, circleObj.center)) {
  
                circle.center = turf.nearestPointOnLine(turf.lineString(building.geometry.coordinates[0]), circleObj.center)
                // console.log("Nearest point on line: ", turf.getCoords(circle.center))
                for (let i = -180; i <= 180; i++) {
                    const destinationPoint = turf.destination(circleObj.center, 0.0005, i)
  
                    if (!turf.booleanContains(building, destinationPoint)) {
                        circle.circleObj = destinationPoint
                        // console.log("Moving to: ", turf.getCoords(circle.center))
  
                        break
                    }
                }
            }
  
            const circleCenterCoords = turf.getCoords(circleObj.center)
  
  
            const newline = turf.lineString([circleCenterCoords, circleCoord])
            const cc2 = turf.lineIntersect(newline, building)
  
            if (cc2.features.length > 0) {
                pointHolder.push(turf.nearestPoint(circleObj.center, cc2))
            }
        }
  
        const nearestPoint = pointHolder.length > 0 ?
          turf.getCoord(turf.nearestPoint(circleObj.center, turf.featureCollection(pointHolder))) :
          circleCoord
  
        newCircle.push(nearestPoint)
    }
    // console.log(newCircle)
    if (newCircle[-1] !== newCircle[0]) {
        newCircle.push(newCircle[0])
    }
  
    // let c = turf.polygon([newCircle])
  
    // console.log(boundingBox)
  
    let bbox = turf.cleanCoords(boundingBox)
    
    // let circlePoly = turf.polygon([newCircle])
    // if (turf.intersect(turf.featureCollection([turf.polygon([newCircle]), bbox])) !== null) {
    let circlePoly = turf.intersect(turf.featureCollection([turf.polygon([newCircle]), bbox]))
    // console.log(circlePoly)
    let area = circlePoly == null ? turf.area(turf.polygon([newCircle])) : turf.area(circlePoly)
    // }
    // let intersects = false

    // for (const feature of checkupFeatureCollection.features) {
    //   if (turf.booleanIntersects(circlePoly, feature)) {
    //       intersects = true
    //       console.log("Intersection found.")
    //       break
    //   }
    // }
    
    // if (!intersects) {
    //   checkupFeatureCollection.features.push(circlePoly)
    //   result.push({"center": circleObj.center, "polygon": circlePoly, "area": area})
    // }

    
    result.push({"center": circleObj.center, "polygon": circlePoly, "area": area})
    

    // result.push({"center": circleObj.center, "polygon": circlePoly, "area": area})
    // console.log(turf.area(circlePoly))
  
  }
  
  return result
  // Write the resulting GeoJSON to file
  // await fs.writeFile('./output/result.geojson', JSON.stringify(result), 'utf8')
}

export { generate }
// await main()

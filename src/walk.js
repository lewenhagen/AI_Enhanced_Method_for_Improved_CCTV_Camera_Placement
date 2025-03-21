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
                    return poly
                }
                // return !turf.booleanIntersects(currentPolygon.polygon, poly.polygon)
            } else {
                return poly
            }
        })
    }

    let totalArea = null
    let polys = endResult.map(function(item) {
        return item.polygon
    })

    // if (endResult.length < 2) {
    //     totalArea = turf.area(turf.featureCollection(endResult))
    // } else {
    totalArea = turf.area(turf.union(turf.featureCollection(polys)))
    // }

    return {"polys": endResult, "totalArea": totalArea}
}


async function walkAlongBuildingPolyline(data, distance, nrOfCams, overlap, focusLines) {
  let result = []
  let buildings = data.buildings
  let bbox = data.boundingBox
  
  /**
   * Traverse outer boundary of buildings 
   */
  for (const building of buildings) {
      if (building.geometry.type === "Polygon") {
          let offsetBoundaries = []
          let boundary = turf.polygonToLine(building)
          let offsetBoundary = turf.lineOffset(boundary, 0.0005, {units: 'kilometers'})
          // console.log(offsetBoundary.geometry.type)
          if (offsetBoundary.geometry.type === "MultiLineString") {
            const lineStrings = offsetBoundary.geometry.coordinates.map(coords => turf.lineString(coords))
            offsetBoundary = JSON.stringify(turf.flatten(offsetBoundary).features[0])
            
          }
          
          let perimeter = turf.length(offsetBoundary, {units: 'meters'})
          let pointsAlongBoundary = []

          for (let i = 0; i <= perimeter; i += stepSize) {
              let point = turf.along(offsetBoundary, i, {units: 'meters'})

              if(turf.booleanPointInPolygon(point, turf.cleanCoords(bbox))) {
                  pointsAlongBoundary.push(point)
              }
          }
          /**
           * Use generate to calculate coverage area, based on buildings
           */
          result = result.concat((await generate(buildings, bbox, pointsAlongBoundary, distance)))
      }

  }

  /**
   * Sort by largest coverage area
   */
  if (!focusLines) {
    console.log("Focusing on area")
    result.sort((a, b) => b.area - a.area)
  }
  
  /**
   * Remove all polygons that dont intersect with the lineString
   */
  const totalLineLength = turf.length(data.line, { units: 'meters' });

  result = result.filter(function(poly) {
    if (turf.booleanIntersects(data.line, poly.polygon)) {
      
      let intersections = turf.lineIntersect(data.line, poly.polygon)
      let splitPoints = intersections.features.map(f => f.geometry.coordinates)
      let segments = [];
      if (splitPoints.length > 0) {
          let prevPoint = data.line.geometry.coordinates[0];

          splitPoints.forEach(point => {
              let slicedSegment = turf.lineSlice(turf.point(prevPoint), turf.point(point), data.line);
              segments.push(slicedSegment);
              prevPoint = point;
          });

          let lastSegment = turf.lineSlice(turf.point(prevPoint), turf.point(data.line.geometry.coordinates[data.line.geometry.coordinates.length - 1]), data.line);
          segments.push(lastSegment);
      } else {
          segments.push(data.line);
      }

      let coveredLength = 0;
      let uncoveredLength = 0;
      let coveredSegments = [];
      let uncoveredSegments = [];
      
      segments.forEach(segment => {
          let midpoint = turf.along(segment, turf.length(segment, { units: 'meters' }) / 2, { units: 'meters' });
          let isCovered = turf.booleanPointInPolygon(midpoint, poly.polygon);
      
          let segmentLength = turf.length(segment, { units: 'meters' });
          if (isCovered) {
              coveredLength += segmentLength;
              coveredSegments.push(segment);
          } else {
              uncoveredLength += segmentLength;
              uncoveredSegments.push(segment);
          }
      });
    
      /**
       * Calulate the percentage
       */
      poly.percentage = (coveredLength / totalLineLength) * 100
      // console.log(intersections)
      // // let clipped = turf.lineSplit(data.line, intersections)
      
      // let meters = turf.length(lineoverlap, {units: "meters"})
      
      return poly
    }
  })

  /**
   * Sort by largest coverage percentage
   */
  if (focusLines) {
    console.log("Focusing on line")
    result.sort((a, b) => b.percentage - a.percentage)
  }
  

  /**
   * Remove polygons that dont match percentage coverage
   */
  
  let n = parseInt(nrOfCams)
  let endResult = []
  let remainingPolygons = [...result]

  for (let i = 0; i < remainingPolygons.length && endResult.length < n; i++) {
      let currentPolygon = remainingPolygons[i];
      // console.log(currentPolygon.polygon)
      endResult.push(currentPolygon);

      remainingPolygons = remainingPolygons.filter(function(poly) {
          if (turf.booleanIntersects(currentPolygon.polygon, poly.polygon)) {
              let a = turf.area(turf.intersect(turf.featureCollection([currentPolygon.polygon, poly.polygon])))
              let tempA = turf.area(currentPolygon.polygon)
              let tempB = turf.area(poly.polygon)
              let total = tempA + tempB
              
              if ((a / total) < parseFloat(overlap)/100) {
                  return poly
              }
              
          } else {
              return poly
          }
      })
  }


  // let intersectingLength = 0
  // let totalLinelength = turf.length(data.line, {units: "meters"})
  // console.log("total line length:", totalLinelength)
  
  // for (const poly of result) {
  //     poly.meters = 0
  //     let clipped = turf.lineSplit(data.line, poly.polygon)
  //     clipped.features.forEach(segment => {
  //       console.log(turf.length(segment, { units: 'meters' }))
  //         // if (turf.booleanPointInPolygon(segment.geometry.coordinates[0], poly.polygon)) {
  //         //     intersectingLength += turf.length(segment, { units: 'meters' });
  //         //     console.log("interecting length:", intersectingLength)
  //         //     poly.meters += turf.length(segment, { units: 'meters' })
  //         //   }
  //     })
  // }

  let totalArea = null
  let polys = endResult.map(function(item) {
      return item.polygon
  })

  totalArea = turf.area(turf.union(turf.featureCollection(polys)))

  return {"polys": endResult, "totalArea": totalArea}

}




export { walkAlongBuilding, walkAlongBuildingPolyline }

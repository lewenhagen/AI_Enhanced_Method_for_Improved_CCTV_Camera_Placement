import * as turf from '@turf/turf'

/**
 *
 * @param {number} centerLong
 * @param {number} centerLat
 * @param {Array} buildings
 * @param {number} distance
 * @param {number} gridDensity
 * @returns {FeatureCollection} The points inside capture area
 */
function createGridOvercaptureArea(centerLong, centerLat, distance, gridDensity, buildings) {
  const buildingsCollection = {
    type: "FeatureCollection",
    features: buildings.map(f => ({
      type: "Feature",
      geometry: f.geometry,
      properties: f.properties || {}
    }))
  }
  const center = [centerLong, centerLat]
  const radius = (distance/1000)
  const circle = turf.circle(center, radius, { steps: 64, units: 'kilometers' })
  const circleBbox = turf.bbox(circle)
  const grid = turf.pointGrid(circleBbox, gridDensity, { units: 'meters', mask: circle })
  const filteredPoints = turf.featureCollection(
    grid.features.filter(point =>
      !buildingsCollection.features.some(building =>
        turf.booleanPointInPolygon(point, building)
      )
    )
  )

  return filteredPoints

}



/**
 *
 * @param {number} centerLong
 * @param {number} centerLat
 * @param {Array} buildings
 * @param {number} distance
 * @returns {Feature} The circle inside capture area
 */
function createCircleOvercaptureArea(centerLong, centerLat, distance, buildings) {
  const buildingsCollection = {
    type: "FeatureCollection",
    features: buildings.map(f => ({
      type: "Feature",
      geometry: f.geometry,
      properties: f.properties || {}
    }))
  }
  const center = [centerLong, centerLat]
  const radius = (distance/1000)
  const circle = turf.circle(center, radius, { steps: 64, units: 'kilometers' })
  const circleBbox = turf.bbox(circle)
  console.log(circle)
  const filteredPoints = turf.featureCollection(
    circle.geometry.features.filter(point =>
      !buildingsCollection.features.some(building =>
        turf.booleanPointInPolygon(point, building)
      )
    )
  )

  return filteredPoints

}


async function fixCrimes (crimes) {
  let result = {}
  for (const crime of crimes) {
    let location = `${crime.longitude},${crime.latitude}`

    if(result[location] !== undefined) {
        result[location].count++

        if (result[location].codes[crime.crime_code] !== undefined) {

          result[location].codes[crime.crime_code].count++
        } else {
          result[location].codes[crime.crime_code] = {count: 1}
        }
    } else {
      result[location] = {
          count: 1,
          codes: {},
          feature: crime.location
      }
      result[location].codes.count = 1
    }
  }

  return result
}

export { createGridOvercaptureArea, fixCrimes, createCircleOvercaptureArea }

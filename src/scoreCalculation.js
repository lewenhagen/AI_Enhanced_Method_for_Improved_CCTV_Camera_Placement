import * as turf from '@turf/turf'

async function scoreCalculation(bigN, DISTANCE_WEIGHT, currentCam, currentPoint, crimes, crimeCoords) {
  let totalCount = 0
  let totalDistance = 0
  let crimeCount = 0
  let gridScore = 0

  currentCam.connectedCrimes = []
  currentCam.score = 0

  for (const coord of crimeCoords) {
    let crimeAsPoint = turf.point([parseFloat(coord.split(",")[0]), parseFloat(coord.split(",")[1])])

    /**
     *  If the crime coordinate is inside the coverage area
     */
    if (turf.booleanPointInPolygon(crimeAsPoint, currentCam.polygon)) {
      let distance = turf.distance(currentPoint, crimeAsPoint) * 1000 // In meters
      distance = distance < 1 ? 1 : distance

      /**
       * Adds the crime position to the cameras pool of "hits"
       * crimes[coord] = Crime info with amount of crimes at the same coordinate
       * crimeInfo = ^
       * distance = distance in meters
       * uniqueCount (crimes[coord].count) = the amount of crimes at the same coordinate, i.e. 500
       */

      let scoreObject = {
        crimeInfo: crimes[coord],
        crimeDistance: distance,
        uniqueCount: crimes[coord].count,
        crimeScore: crimes[coord].count / Math.max((distance * DISTANCE_WEIGHT), 1)
      }

      /**
       * Holds the grid point's (grid coordinates) summed score. Divide this by N.
       */
      gridScore += scoreObject.crimeScore

      currentCam.connectedCrimes.push(scoreObject)

      /**
       * Increase the grid point's pool of "hits"
       */
      crimeCount++

      /**
       * totalCount holds the total crimes reported, i.e. 3000 for the camera position
       */
      totalCount += crimes[coord].count
      totalDistance += distance
    } // EO if in polygon

  } // EO for crime in crimes



  // currentCam.score = crimeCount / Object.keys(crimes).length

  const distanceWeightedScore = gridScore / bigN || 0
  // const normalizedCrimeCount = crimeCount / Object.keys(crimes).length || 0 // % of total crime coords this camera covers

  currentCam.score = parseFloat(distanceWeightedScore)

  return {
    "camInfo": currentCam,
    "totalCrimeCount": crimeCount, // unique crime coordinates
    "totalCount": totalCount, // all reported crimes
    "totalDistance": totalDistance
  }
}


async function normalizeScoreForVisualization(allPoints, features) {
    let scores = []

    scores = allPoints.map(p => p.camInfo.score)

    const max = Math.max(...scores)

    // Normalize the scores
    const normalized = scores.map(v => v/max)
    // console.log(normalized)
    // const normalized = scores.map(v => Math.pow(Math.log(v + 1) / Math.log(max + 1), 0.5))
    // console.log(`Normalized max score: ${normalized}`)
    // A keyholder function from coordinates
    const coordKey = coords => coords.join(',')

    const scoreMap = new Map()

    allPoints.forEach((point, i) => {
      const key = coordKey(point.camInfo.center.coordinates)

      scoreMap.set(key, normalized[i])
    })

    /**
      * For each feature in grid, set opacityscore to use clientside
      */
    features.forEach(feature => {
      const key = coordKey(feature.geometry.coordinates)
      const normScore = scoreMap.get(key)

      feature.properties.opacityScore = normScore ?? 0
    })

    return features
}

export { scoreCalculation, normalizeScoreForVisualization }

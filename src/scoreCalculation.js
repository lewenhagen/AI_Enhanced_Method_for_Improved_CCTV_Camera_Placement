import * as turf from '@turf/turf'

const areas = {
  "malmö": 76.81 * 10000
}

/**
Sigmoid → smooth drop, mostly cares about distance near the midpoint
Linear → straight penalty from near → far
Uniform → flat line (distance ignored completely)
 */

// function sigmoid(d, maxDistance) {
//   const midpoint = maxDistance / 2;
//   const steepness = 10 / maxDistance;
//   return 1 / (1 + Math.exp(steepness * (d - midpoint)));
// }

function sigmoid(d, maxDistance) {
  if (d >= maxDistance) return 0;
  const midpoint = maxDistance / 2;
  const steepness = 10 / maxDistance;
  return 1 / (1 + Math.exp(steepness * (d - midpoint)));
}

function linear(d, maxDistance) {
  return Math.max(0, 1 - d / maxDistance);
}


function uniform(d, maxDistance) {
  return d < maxDistance ? 1 : 0;
}

const activationFunctions = {
  "sigmoid": sigmoid,
  "linear": linear,
  "uniform": uniform
}


async function scoreCalculation(activation, currentCam, currentPoint, crimes, crimeCoords, numberOfCrimesInRadius, boundingBox, MAX_DISTANCE) {
  let totalCount = 0
  let totalDistance = 0
  let crimeCount = 0
  let gridScore = 0
  // let weight_score = 0

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
        crimeScore: crimes[coord].count * activationFunctions[activation](distance, MAX_DISTANCE)
      }
      //linear, sigmeud, uniform

      /**
       * Holds the grid point's (grid coordinates) summed score. Divide this by N.
       */
      gridScore += scoreObject.crimeScore

      // weight_score += (Math.max(distance * DISTANCE_WEIGHT, 1))

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
  // console.log(turf.area(currentCam.polygon))
  // console.log(totalCount/numberOfCrimesInRadius) / (turf.area(currentCam.polygon) / areas["malmö"])
  // console.log("Total: " + numberOfCrimesInRadius)
  // console.log("Found in area: " + totalCount)
  // currentCam.score = crimeCount / Object.keys(crimes).length

  // const distanceWeightedScore =  // / bigN || 0
  // const normalizedCrimeCount = crimeCount / Object.keys(crimes).length || 0 // % of total crime coords this camera covers

  currentCam.score = parseFloat(gridScore)
  currentCam.activation = activation
  // currentCam.weighted_score = weight_score > 0 ? gridScore / weight_score : 0
  // currentCam.weighted_score2 = gridScore / crimeCount
  // currentCam.weighted_score = 0
  // currentCam.weighted_score2 = 0


  return {
    "camInfo": currentCam,
    "totalCrimeCount": crimeCount, // unique crime coordinates
    "totalCount": totalCount, // all reported crimes
    "totalDistance": totalDistance,
    "pai": (totalCount/numberOfCrimesInRadius) / (turf.area(currentCam.polygon) / turf.area(boundingBox))
  }
}


async function normalizeScoreForVisualization(allPoints, features) {
    let scores = []

    scores = allPoints.map(p => p.camInfo.score)

    const max = Math.max(...scores)

    const normalized = scores.map(v => v/max)
    const coordKey = coords => coords.join(',')
    const scoreMap = new Map()

    allPoints.forEach((point, i) => {
      const key = coordKey(point.camInfo.center.coordinates)

      scoreMap.set(key, normalized[i])
    })

    features.forEach(feature => {
      const key = coordKey(feature.geometry.coordinates)
      const normScore = scoreMap.get(key)

      feature.properties.opacityScore = normScore ?? 0
    })

    return features
}

async function normalizeScoreForBuildingWalkVisualization(allPoints) {
    let scores = []
    let result = []
    scores = allPoints.map(p => p.camInfo.score)

    const max = Math.max(...scores)

    for (let i = 0; i < allPoints.length; i++) {
      allPoints[i].camInfo.visualColor = allPoints[i].camInfo.score / max
    }

    return allPoints
}

export { scoreCalculation, normalizeScoreForVisualization, normalizeScoreForBuildingWalkVisualization }


// fixa area för malmö
// PAI för position score

// (brotten som fångas / alla brott ) / (cctv area / malmö area)
// läs på om PAI index (prediction accuracy index)

//visa bästa automatiskt
//skicka till clipboard

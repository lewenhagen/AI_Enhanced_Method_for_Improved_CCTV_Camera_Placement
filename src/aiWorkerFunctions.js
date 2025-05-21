async function calculateScore(currentCam, currentPoint, crimeCoords, crimes) {
  let totalCount = 0
  let totalDistance = 0
  let crimeCount = 0
  currentCam.connectedCrimes = []
  currentCam.score = 0
  for (const coord of crimeCoords) {
    let crimeAsPoint = turf.point([parseFloat(coord.split(",")[0]), parseFloat(coord.split(",")[1])])

    if (turf.booleanPointInPolygon(crimeAsPoint, currentCam.polygon)) {
      let distance = turf.distance(currentPoint, crimeAsPoint) * 1000

      currentCam.connectedCrimes.push({
        crimeInfo: crimes[coord],
        distance: distance,
        uniqueCount: crimes[coord].count,
        prescore: crimes[coord].count / distance
      })

      crimeCount++
      totalCount += crimes[coord].count // denna sist
      totalDistance += distance
    }
    // calculate score here!!
    // currentCam.score = 0
    let allPreScore = 0
    for (const crime of currentCam.connectedCrimes) {
      allPreScore += crime.prescore
    }

    currentCam.score = parseFloat((allPreScore / totalCount).toFixed(4)) || 0

  }

  return {
    "camInfo": currentCam,
    "totalCrimeCount": crimeCount,
    "totalCount": totalCount,
    "totalDistance": totalDistance
  }
}

async function getRandomDirection() {
  let directions = ["up", "down", "left", "right"]
  if (directions.length === 0) {
    directions = ["up", "down", "left", "right"]
  }
  const randomIndex = Math.floor(Math.random() * directions.length)
  const poppedDirection = directions.splice(randomIndex, 1)[0]

  return poppedDirection
}

async function takeStepInGridCalculateScore(dir, currentPoint, buildings, bbox, distance) {
  let currentCam = await generate(buildings, bbox, [currentPoint], distance)
  currentCam = currentCam[0]
  let nextPoint = await move(currentPoint, dir)
  if (!nextPoint.success) {
    return false
  }
  // let camCoverage = await generate(buildings, bbox, [nextPoint.point.geometry], distance)
  // camCoverage = camCoverage[0]

  let scoreObject = await calculateScore(currentCam, nextPoint.point.geometry, crimeCoords, crimes)

  return {point: nextPoint, score: scoreObject}
}

export { calculateScore, getRandomDirection, takeStepInGridCalculateScore }

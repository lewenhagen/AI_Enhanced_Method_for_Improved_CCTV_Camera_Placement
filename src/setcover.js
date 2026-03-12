export function selectGreedyCameras(cameras, N) {
  const selected = [];
  const coveredCrimes = new Set();
  const remaining = [...cameras];

  for (let i = 0; i < N && remaining.length > 0; i++) {

    let bestIndex = -1;
    let bestGain = -1;

    for (let j = 0; j < remaining.length; j++) {

      const cam = remaining[j];
      const crimes = cam.camInfo.connectedCrimes || [];

      let gain = 0;

      for (const crime of crimes) {
        const coords = crime.crimeInfo.feature.coordinates;
        const key = `${coords[0]},${coords[1]}`;

        if (!coveredCrimes.has(key)) {
          gain++;
        }
      }

      if (gain > bestGain) {
        bestGain = gain;
        bestIndex = j;
      }
    }

    if (bestIndex === -1) break;

    const chosen = remaining.splice(bestIndex, 1)[0];

    for (const crime of chosen.camInfo.connectedCrimes) {
      const coords = crime.crimeInfo.feature.coordinates;
      const key = `${coords[0]},${coords[1]}`;
      coveredCrimes.add(key);
    }

    selected.push(chosen);
  }

  return selected;
}
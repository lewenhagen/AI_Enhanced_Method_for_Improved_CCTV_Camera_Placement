import { parentPort, workerData } from 'worker_threads';
import { generate } from './generateCoverageArea.js';
import { scoreCalculation } from './scoreCalculation.js';

(async () => {
  try {
    const { sharedData, camPoint, bigN, distance, distanceWeight } = workerData;

    const { buildings, boundingBox, crimes } = sharedData;

    let currentCam = await generate(buildings, boundingBox, [camPoint], distance);
    currentCam = currentCam[0];

    const camObject = await scoreCalculation(
      bigN,
      distanceWeight,
      currentCam,
      camPoint,
      crimes,
      Object.keys(crimes)
    );

    parentPort.postMessage(camObject);
  } catch (err) {
    parentPort.postMessage({ error: err.message });
  }
})();

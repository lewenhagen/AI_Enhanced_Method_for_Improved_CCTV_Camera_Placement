import { parentPort, workerData } from 'worker_threads';
import { generate } from './generateCoverageArea.js';
import { scoreCalculation } from './scoreCalculation.js';

const { buildings, boundingBox, crimes, numberOfCrimesInRadius } = workerData.sharedData;

parentPort.on('message', async ({ distanceWeight, camPoint, distance }) => {

  try {
    let currentCam = await generate(buildings, boundingBox, [camPoint], distance);
    currentCam = currentCam[0];

    const camObject = await scoreCalculation(
      distanceWeight,
      currentCam,
      camPoint,
      crimes,
      Object.keys(crimes),
      numberOfCrimesInRadius,
      boundingBox
    );

    parentPort.postMessage({ ok: true, result: camObject });
  } catch (e) {
    parentPort.postMessage({ ok: false, error: e.toString() });
  }
});

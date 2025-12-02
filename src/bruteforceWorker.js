import { parentPort, workerData } from 'worker_threads';
import { generate } from './generateCoverageArea.js';
import { scoreCalculation } from './scoreCalculation.js';

const { buildings, boundingBox, crimes } = workerData.sharedData;

parentPort.on('message', async ({ bigN, distanceWeight, camPoint, distance }) => {

  try {
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

    parentPort.postMessage({ ok: true, result: camObject });
  } catch (e) {
    parentPort.postMessage({ ok: false, error: e.toString() });
  }
});

// unifiedWorker.js
import { parentPort, workerData } from 'worker_threads';
import { generate } from './generateCoverageArea.js';
import { scoreCalculation } from './scoreCalculation.js';

const { buildings, boundingBox, crimes } = workerData.sharedData;

parentPort.on('message', async (msg) => {
  try {
    let { type, bigN, distanceWeight, camPoint, distance } = msg;

    // Shared logic for both methods
    // generate() always needs a single camPoint
    let currentCam = await generate(buildings, boundingBox, [camPoint], distance);
    currentCam = currentCam[0];

    // scoreCalculation is also shared
    const camObject = await scoreCalculation(
      bigN,
      distanceWeight,
      currentCam,
      camPoint,
      crimes,
      Object.keys(crimes)
    );

    parentPort.postMessage({
      ok: true,
      type,               // echo back which method requested this
      result: camObject
    });

  } catch (e) {
    parentPort.postMessage({
      ok: false,
      error: e.toString()
    });
  }
});

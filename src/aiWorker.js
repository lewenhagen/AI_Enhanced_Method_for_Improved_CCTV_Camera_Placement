// worker.js
import { parentPort } from "worker_threads"

import { getRandomPointFromGrid } from "./reinforcement.js"
import { generate } from "./generateCoverageArea.js"
import { getRandomDirection, calculateScore } from "./aiWorkerFunctions.js";


parentPort.on('message', async ({ buildings, bbox, distance }) => {
  let startPoint = (await getRandomPointFromGrid()).geometry;
  let lastPoint = startPoint;
  let allPoints = [];

  let startCam = await generate(buildings, bbox, [startPoint], distance);
  startCam = startCam[0];

  let lastScore = await calculateScore(startCam, startPoint);
  allPoints.push(lastScore);

  let dir = await getRandomDirection();

  let i = 0;
  while (i < 100) {
    let stepObject = await takeStepInGridCalculateScore(dir, lastPoint);

    if (stepObject !== false) {
      if (stepObject.score.camInfo.score > lastScore.camInfo.score) {
        allPoints.push(stepObject.score);
        lastPoint = stepObject.point.point.geometry;
        lastScore = stepObject.score;
      } else {
        dir = await getRandomDirection();
      }
    }

    i++;
  }

  // Send result back to main thread
  parentPort.postMessage(allPoints);
});

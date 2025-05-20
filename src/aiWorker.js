import { workerData, parentPort } from "worker_threads"
import * as turf from '@turf/turf'
// console.log(workerData.chunk.length)
let result = []

for (const calculation of workerData.chunk) {
    result.push("")
}

parentPort.postMessage(result)
process.exit(0)

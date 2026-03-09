import { spawn } from 'child_process';
import { promises as fs } from 'fs'
import { appendFile } from 'fs/promises';
const fileName = "poss_2026.json"
// const years = [2018, 2019, 2020]
// const radiuses = [100, 150, 200]
const radiuses = [100]
const methods = ["bruteforce", "buildingwalk"]
let currentHotspot = 1
let result = []
// let center = "55.5636,12.9746"
// let dist_weights = [0, 0.2, 0.4, 0.6, 0.8, 1]
let activations = ["sigmoid", "uniform"]

let ystad = await JSON.parse(await fs.readFile("hotspots/ystad.json"))
let trelleborg = await JSON.parse(await fs.readFile("hotspots/trelleborg.json"))
let lund = await JSON.parse(await fs.readFile("hotspots/lund.json"))

let hotspots_map = [
    {
        "startCoords": ystad,
        "city": "Ystad"
    },
    {
        "startCoords": trelleborg,
        "city": "Trelleborg"
    },
    {
        "startCoords": lund,
        "city": "Lund"
    }
]

await fs.writeFile(fileName, '[\n', 'utf8');
let isFirst = true;   // track commas

function runScript(method, center, radius, activationFunction, year, city) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [`src/${method}.js`, center, radius, activationFunction]);

    let output = '';

    child.stdout.on('data', async data => {
    const temp = JSON.parse(data.toString());

    const entry = {
      rank: currentHotspot,
      city: city,
      center: temp.coordinates,
      best_score: temp.best_score,
      seen_crimes: temp.seen_crimes,
      coverage_area: temp.coverage_area,
      activation_function: activationFunction,
      method: method
    };

    const json = JSON.stringify(entry, null, 2);

    if (!isFirst) {
      await fs.appendFile(fileName, ',\n' + json);
    } else {
      await fs.appendFile(fileName, json);
      isFirst = false;
    }
  });
    child.stderr.on('data', data => console.error('stderr:', data.toString()));

    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve(output.trim());
      else reject(new Error(`Process exited with code ${code}`));
    });
  });
}
let testCounter = 1
let coordCounter = 1
let methodCounter = 1
let activationCounter = 1
let radiusCounter = 1

for (const item of hotspots_map) {

    // testCounter = 1
    // currentHotspot = 1
    coordCounter = 1
    for (const pos of item.startCoords) {

        // currentHotspot ++
        radiusCounter = 1
        for (let radius of radiuses) {
            activationCounter = 1

            for (let af of activations) {
                methodCounter = 1
                for (let method of methods) {

                    await runScript(method, pos, radius, af, "all", item.city)
                    // console.log(`Evaluate against year: ${item.year}, Center: ${pos}, Radius: ${radius}, Dist_weight: ${af}, Method: ${method} done.`)
		                console.log(`Rank: ${coordCounter}`)
                    console.log(`Test: ${testCounter}/${hotspots_map.length}`)
                    console.log(`Coordinate: ${coordCounter}/${item.startCoords.length}`)
                    console.log(`Radius: ${radiusCounter}/${radiuses.length}`)
                    console.log(`Activation: ${activationCounter}/${activations.length}`)
                    console.log(`Method: ${methodCounter}/${methods.length}`)
                    console.log("----------------------------")
                    methodCounter++
                }
                activationCounter++
            }
            radiusCounter++
        }
        // }
        coordCounter++
    }
    testCounter++

}
await fs.appendFile(fileName, '\n]\n');
// await fs.writeFile(fileName', JSON.stringify(result, null, 2), 'utf8')

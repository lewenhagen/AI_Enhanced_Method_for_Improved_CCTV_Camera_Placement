import { spawn } from 'child_process';
import { promises as fs } from 'fs'
import { appendFile } from 'fs/promises';
const fileName = "experiment-20260123.json"
const years = [2018, 2019, 2020]
// const radiuses = [100, 150, 200]
const radiuses = [50, 100, 150, 200]
const methods = ["bruteforce", "hillclimb", "buildingwalk", "dfs"]

let result = []
// let center = "55.5636,12.9746"
let dist_weights = [0, 0.2, 0.4, 0.6, 0.8, 1]

let hotspots2017 = await JSON.parse(await fs.readFile("hotspots/hotspots_2017.json"))
let hotspots2018 = await JSON.parse(await fs.readFile("hotspots/hotspots_2018.json"))
let hotspots2019 = await JSON.parse(await fs.readFile("hotspots/hotspots_2019.json"))

let hotspots_map = [
    {
        "startCoords": hotspots2017,
        "year": 2018
    },
    {
        "startCoords": hotspots2018,
        "year": 2019
    },
    {
        "startCoords": hotspots2019,
        "year": 2020
    }
]

await fs.writeFile(fileName, '[\n', 'utf8');
let isFirst = true;   // track commas

function runScript(method, center, radius, dist_weight, year) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [`src/${method}.js`, center, radius, dist_weight, year]);

    let output = '';
    // child.stdout.on('data', data => {
    //     let temp = JSON.parse(data.toString())
    //     result.push(
    //         {
    //             "method": method,
    //             "year": year,
    //             "radius": radius,
    //             "num_startpoints": temp.num_startpoints,
    //             "execution_time": temp.exec_time,
    //             "best_score": temp.best_score
    //         }
    //     )
    // });
    child.stdout.on('data', async data => {
    const temp = JSON.parse(data.toString());

    const entry = {
      method,
      year,
      radius,
      dist_weight: dist_weight,
      num_startpoints: temp.num_startpoints,
      execution_time: temp.exec_time,
      best_score: temp.best_score,
      weighted_score: temp.weighted_score,
      ind_time: temp.ind_time,
      avg_time: temp.avg_time,
      steps: temp.steps,
      total_crimes: temp.total_crimes,
      seen_crimes: temp.seen_crimes,
      unique_crime_coords: temp.unique_crime_coords,
      pai: temp.pai
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
let distWeightCounter = 1
let radiusCounter = 1

for (const item of hotspots_map) {
    // testCounter = 1
    coordCounter = 1
    for (const pos of item.startCoords) {

        radiusCounter = 1
        for (let radius of radiuses) {
            distWeightCounter = 1

            for (let dw of dist_weights) {
                methodCounter = 1
                for (let method of methods) {

                    await runScript(method, pos, radius, dw, item.year)
                    // console.log(`Evaluate against year: ${item.year}, Center: ${pos}, Radius: ${radius}, Dist_weight: ${dw}, Method: ${method} done.`)
                    console.log(`Test: ${testCounter}/${hotspots_map.length}`)
                    console.log(`Coordinate: ${coordCounter}/${item.startCoords.length}`)
                    console.log(`Radius: ${radiusCounter}/${radiuses.length}`)
                    console.log(`Dist_weight: ${distWeightCounter}/${dist_weights.length}`)
                    console.log(`Method: ${methodCounter}/${methods.length}`)
                    console.log("----------------------------")
                    methodCounter++
                }
                distWeightCounter++
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

import { spawn } from 'child_process';
import { promises as fs } from 'fs'
import { appendFile } from 'fs/promises';



const years = [2016, 2017, 2018, 2019]
const radiuses = [100, 50]
const methods = ["bruteforce"]
let result = []
let center = "55.5636,12.9746"
let dist_weight = 0.2

await fs.writeFile('experiment.json', '[\n', 'utf8');
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
      num_startpoints: temp.num_startpoints,
      execution_time: temp.exec_time,
      best_score: temp.best_score
    };

    const json = JSON.stringify(entry, null, 2);

    if (!isFirst) {
      await fs.appendFile('experiment.json', ',\n' + json);
    } else {
      await fs.appendFile('experiment.json', json);
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

for (let year of years) {
    for (let radius of radiuses) {
        for (let method of methods) {
            await runScript(method, center, radius, dist_weight, year)
            console.log(year, radius, method + " done.")
        }
    }
}
await fs.appendFile('experiment.json', '\n]\n');
// await fs.writeFile('experiment.json', JSON.stringify(result, null, 2), 'utf8')

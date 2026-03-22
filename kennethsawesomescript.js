// import { spawn } from "child_process";
// import { promises as fs } from "fs";
// import path from "path";
// import csv from "csv-parser";
// import { createReadStream } from "fs";

// const radiuses = [100];
// const methods = ["bruteforce", "buildingwalk"];
// const hotspotFolders = ["all", "violent", "theft"];
// const activations = ["uniform"];

// async function main() {

//   for (const folder of hotspotFolders) {

//     const folderPath = `hotspots/${folder}`;
//     const files = (await fs.readdir(folderPath)).filter(f => f.endsWith(".csv"));

//     for (const file of files) {

//       const filePath = path.join(folderPath, file);

//       // prefix is everything before the first "."
//       const prefix = file.split(".")[0];

//       console.log(`Processing ${file} → prefix ${prefix}`);

//       const coords = [];

//       await new Promise((resolve, reject) => {
//         createReadStream(filePath)
//           .pipe(csv())
//           .on("data", row => {
//             coords.push(`${row.latitude},${row.longitude}`);
//           })
//           .on("end", resolve)
//           .on("error", reject);
//       });

//       let rank = 1;

//       for (const pos of coords) {
//         for (let radius of radiuses) {
//           for (let af of activations) {
//             for (let method of methods) {

//               const fileName = `output_${prefix}_${folder}_${method}_${af}.json`;
//               const temp = await runScript(method, pos, radius, af, prefix);

//               // append results for this file
//               const entry = {
//                 rank: rank,
//                 city: prefix,
//                 center: temp.coordinates,
//                 best_score: temp.best_score,
//                 seen_crimes: temp.seen_crimes,
//                 coverage_area: temp.coverage_area,
//                 activation_function: af,
//                 method: method
//               };

//               // if file exists, append; otherwise create new array
//               let fileData = [];
//               try {
//                 const existing = await fs.readFile(fileName, "utf8");
//                 fileData = JSON.parse(existing);
//               } catch (err) {
//                 fileData = [];
//               }

//               fileData.push(entry);
//               await fs.writeFile(`hotspots/output/${fileName}`, JSON.stringify(fileData, null, 2));

//             }
//           }
//         }
//         rank++;
//       }

//     }

//   }

// }

// function runScript(method, center, radius, activationFunction, prefix) {

//   return new Promise((resolve, reject) => {

//     const child = spawn("node", [
//       `src/${method}.js`,
//       center,
//       radius,
//       activationFunction,
//       "all",
//       prefix
//     ]);

//     let output = "";

//     child.stdout.on("data", data => {
//       output += data.toString();
//     });

//     child.stderr.on("data", data => {
//       console.error("stderr:", data.toString());
//     });

//     child.on("close", code => {

//       if (code !== 0) {
//         reject(new Error(`Process exited with code ${code}`));
//         return;
//       }

//       try {
//         resolve(JSON.parse(output));
//       } catch (err) {
//         reject(err);
//       }

//     });

//   });

// }

// main();

import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import csv from "csv-parser";
import { createReadStream } from "fs";

const radiuses = [100];
const methods = ["bruteforce", "buildingwalk"];
const hotspotFolders = ["narcotics"];
const activations = ["uniform"];
const outputDir = "hotspots/output";

async function main() {

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  for (const folder of hotspotFolders) {

    const folderPath = `hotspots/${folder}`;
    const files = (await fs.readdir(folderPath)).filter(f => f.endsWith(".csv"));

    for (const file of files) {

      const filePath = path.join(folderPath, file);
      const prefix = file.split(".")[0];
      console.log(`Processing ${file} → prefix ${prefix}`);

      // Load CSV coordinates
      const coords = [];
      await new Promise((resolve, reject) => {
        createReadStream(filePath)
          .pipe(csv())
          .on("data", row => coords.push(`${row.latitude},${row.longitude}`))
          .on("end", resolve)
          .on("error", reject);
      });

      // Loop over method/activation/radius
      for (const method of methods) {
        for (const af of activations) {
          for (const radius of radiuses) {

            const fileName = `output_${prefix}_${folder}_${method}_${af}.json`;
            const filePathOut = path.join(outputDir, fileName);

            // Read existing file if it exists
            let fileData = [];
            try {
              const existing = await fs.readFile(filePathOut, "utf8");
              fileData = JSON.parse(existing);
            } catch {
              fileData = [];
            }

            let rank = fileData.length + 1;

            // Run all coordinates and collect results
            for (const pos of coords) {
              const temp = await runScript(method, pos, radius, af, prefix);

              fileData.push({
                // rank: rank++,
                city: prefix,
                center: temp.coordinates,
                best_score: temp.best_score,
                seen_crimes: temp.seen_crimes,
                coverage_area: temp.coverage_area,
                activation_function: af,
                method
              });
            }

            // Write updated JSON file once
            await fs.writeFile(filePathOut, JSON.stringify(fileData, null, 2));
            console.log(`Saved ${fileData.length} entries → ${fileName}`);
          }
        }
      }
    }
  }
}

function runScript(method, center, radius, activationFunction, prefix) {
  // console.log(method, center, radius, activationFunction, prefix)
  return new Promise((resolve, reject) => {
    const child = spawn("node", [
      `src/${method}.js`,
      center,
      radius,
      activationFunction,
      "all",
      prefix
    ]);

    let output = "";

    child.stdout.on("data", data => output += data.toString());
    child.stderr.on("data", data => console.error("stderr:", data.toString()));

    child.on("close", code => {
      if (code !== 0) return reject(new Error(`Process exited with code ${code}`));
      try {
        resolve(JSON.parse(output));
      } catch (err) {
        reject(err);
      }
    });
  });
}

main();

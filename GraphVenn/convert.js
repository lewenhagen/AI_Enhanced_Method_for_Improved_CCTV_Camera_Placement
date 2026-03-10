import fs from "fs";
let name = "Lund"
const lines = fs.readFileSync(`GraphVenn_result_top30_optimal_${name}_d=100_p=4.csv`, "utf8").trim().split("\n");

const result = lines
  .slice(1)
  .map(line => {
    const [rank, , lat, lon] = line.split(",");
    return `${rank}, ${lat.trim()}, ${lon.trim()}`;
  })
  .filter(Boolean);

fs.writeFileSync(`${name.toLowerCase()}.json`, JSON.stringify(result, null, 2));

console.log(`${name.toLowerCase()}.json created`);

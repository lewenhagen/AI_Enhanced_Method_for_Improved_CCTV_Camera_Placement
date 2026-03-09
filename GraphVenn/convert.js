import fs from "fs";

const lines = fs.readFileSync("GraphVenn_result_top30_optimal_Ystad_d=100_p=4.csv", "utf8").trim().split("\n");

const result = lines
  .slice(1)
  .map(line => {
    const [, , lat, lon] = line.split(",");
    return `${lat.trim()}, ${lon.trim()}`;
  })
  .filter(Boolean);

fs.writeFileSync("ystad.json", JSON.stringify(result, null, 2));

console.log("coords.json created");

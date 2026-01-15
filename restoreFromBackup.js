import { exec } from "child_process";
import { MongoClient } from "mongodb";

const MONGO_URI = "mongodb://root:pass@localhost:27017";
const DATABASE = "sweden";
const COLLECTION = "crimes";
const BACKUP_PATH = "./backup.archive.gz";

// Drop the collection first
async function dropCollection() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE);

    console.log(`Dropping collection: ${DATABASE}.${COLLECTION}`);
    await db.collection(COLLECTION).drop().catch(() => {
      console.log("Collection did not exist, continuing...");
    });

    console.log("Collection dropped successfully");
  } finally {
    await client.close();
  }
}

// Restore using mongorestore
function restoreFromBackup() {
  return new Promise((resolve, reject) => {
    console.log("Starting restore...");

    const cmd = `
      mongorestore \
        --gzip \
        --archive="${BACKUP_PATH}" \
        --nsInclude="${DATABASE}.${COLLECTION}" \
        --username="root" \
        --password="pass" \
        --authenticationDatabase="admin"
    `;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("Restore failed:", stderr);
        return reject(error);
      }
      console.log(stdout);
      console.log("Restore completed!");
      resolve();
    });
  });
}

async function run() {
  try {
    await dropCollection();
    await restoreFromBackup();
    console.log("🎉 Done!");
  } catch (err) {
    console.error("Error:", err);
  }
}

run();

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/User.js";
import 'dotenv/config'

async function main() {
  await mongoose.connect(`mongodb://${process.env.MONGOUSER}:${process.env.MONGOPASS}@localhost:27017/auth?authSource=admin`);

  const hash = await bcrypt.hash("", 12);

  await User.deleteMany({});
  await User.create({ passwordHash: hash });

  console.log("Password set");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

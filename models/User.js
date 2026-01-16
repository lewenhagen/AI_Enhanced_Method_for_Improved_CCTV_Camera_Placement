import mongoose from "mongoose"

const UserSchema = new mongoose.Schema({
  passwordHash: {
    type: String,
    required: true
  }
})

export default mongoose.model("User", UserSchema)
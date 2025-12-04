import mongoose from "mongoose";

const entitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    photos: [{ type: String }],   // array of Cloudinary URLs
    type: { type: String },       // e.g. "user", "product", "admin"
  },
  { timestamps: true }
);

const Entity = mongoose.model("Entity", entitySchema);

export default Entity;
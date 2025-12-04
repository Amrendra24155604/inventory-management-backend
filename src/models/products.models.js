import mongoose from "mongoose";
//to be controlled by admin only
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  variant: { type: String },
    photoUrl: String, 
  initialQuantity: { type: Number, required: true, min: 0 },
  quantityAvailable: {
  type: Number,
  required: true,
  min: 0,
  default: function () {
    return this.initialQuantity;
  }
},
  createdByAdmin: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Product", productSchema);
import mongoose from "mongoose";

const borrowItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  quantityRequested: {
    type: Number,
    required: true,
    min: 1
  },
  quantityReturned: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingReturn: {
  type: Number,
  default: 0,
  min: 0
},
  returnApproved: {
    type: Number,
    default: 0,
    min: 0
  },
  condition: {
    type: String,
    enum: ["good", "damaged", "lost"],
    default: "good"
  },
  notes: {
    type: String
  }
});
const borrowRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    items: [borrowItemSchema],

    status: {
      type: String,
      enum: ["pending", "approved", "declined", "on-hold", "expired","returned"],
      default: "pending"
    },

    returnStatus: {
      type: String,
      enum: ["none", "pending", "partial", "complete"],
      default: "none"
    },

    purpose: {
      type: String,
    },

    expiry: {
      type: Date
    }
  },
  { timestamps: true }
);

export default mongoose.model("BorrowRequest", borrowRequestSchema);
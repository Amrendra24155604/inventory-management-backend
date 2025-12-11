import { User } from "../models/users.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail } from "../utils/mail.js";
import jwt from "jsonwebtoken";
import BorrowRequest from "../models/BorrowRequest.js";
import Product from "../models/products.models.js";

// POST /api/borrow
// const createBorrowRequest = async (req, res) => {
//   try {
//     const { items } = req.body;
//     const userId = req.user._id;

//     for (const item of items) {
//       const product = await Product.findById(item.product);
//       if (!product) {
//         return res.status(404).json({ success: false, message: "Product not found.", timestamp: new Date().toISOString() });
//       }
//       if (item.quantityRequested > product.quantityAvailable) {
//         return res.status(400).json({
//           success: false,
//           message: `Requested quantity for ${product.name} exceeds available stock (${product.quantityAvailable}).`,
//           timestamp: new Date().toISOString()
//         });
//       }
//     }

//     const borrowRequest = await BorrowRequest.create({ user: userId, items });
//     res.status(201).json({ success: true, data: borrowRequest, timestamp: new Date().toISOString() });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Failed to create borrow request.", timestamp: new Date().toISOString() });
//   }
// };
const createBorrowRequest = async (req, res) => {
  try {
    const { items, purpose, expiry } = req.body;
    const userId = req.user._id;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
          timestamp: new Date().toISOString()
        });
      }
      if (item.quantityRequested > product.quantityAvailable) {
        return res.status(400).json({
          success: false,
          message: `Requested quantity for ${product.name} exceeds available stock (${product.quantityAvailable}).`,
          timestamp: new Date().toISOString()
        });
      }
    }

    const borrowRequest = await BorrowRequest.create({
      user: userId,
      items,
      ...(purpose && { purpose }),
      ...(expiry && { expiry }),
      status: "pending"
    });
    console.log(BorrowRequest?.status);
    
    res.status(201).json({
      success: true,
      data: borrowRequest,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to create borrow request.",
      timestamp: new Date().toISOString()
    });
  }
};
// PATCH /api/borrow/:id/approve
const approveBorrowRequest = async (req, res) => {
  try {
    const request = await BorrowRequest.findById(req.params.id).populate("items.product");
    if (!request) {
      return res.status(404).json({ message: "Borrow request not found.", timestamp: new Date().toISOString() });
    }

    if (!["pending", "on-hold"].includes(request.status)) {
      return res.status(400).json({ message: "Invalid request status.", timestamp: new Date().toISOString() });
    }

    for (const item of request.items) {
      const product = await Product.findById(item.product._id);
      if (!product) {
        return res.status(404).json({ message: `Product not found.`, timestamp: new Date().toISOString() });
      }

      if (product.quantityAvailable < item.quantityRequested) {
        return res.status(400).json({
          success: false,
          details: [{ name: product.name, requested: item.quantityRequested, available: product.quantityAvailable }],
          timestamp: new Date().toISOString()
        });
      }

      product.quantityAvailable -= item.quantityRequested;
      await product.save({ validateBeforeSave: false });
    }

    request.status = "approved";
    await request.save();
    res.json({ success: true, message: "Borrow request approved.", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: "Internal server error during approval.", timestamp: new Date().toISOString() });
  }
};

// PATCH /api/borrow/:id/return
const requestReturn = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({
        message: "Invalid items format.",
        timestamp: new Date().toISOString(),
      });
    }

    const request = await BorrowRequest.findById(req.params.id).populate("items.product");
    if (!request || request.status !== "approved") {
      return res.status(400).json({
        message: "Invalid borrow request.",
        timestamp: new Date().toISOString(),
      });
    }

    let updated = false;

    request.items.forEach((item) => {
      const returned = items.find(
        (i) => i.product?.toString() === item.product._id.toString()
      );

      if (returned) {
        const alreadyReturned = Number(item.quantityReturned || 0);
        const maxReturnable = item.quantityRequested - alreadyReturned;
        const requestedQty = Number(returned.quantityReturned);

        if (!isNaN(requestedQty) && requestedQty > 0 && maxReturnable > 0) {
          const qtyToHold = Math.min(requestedQty, maxReturnable);
          item.pendingReturn = qtyToHold;
          item.condition = returned.condition || item.condition || "good";
          item.notes = returned.notes || item.notes || "";
          updated = true;
        }
      }
    });

    if (!updated) {
      return res.status(400).json({
        message: "No valid items found to return or all items already returned.",
        timestamp: new Date().toISOString(),
      });
    }

    request.returnStatus = "pending";
    request.markModified("items");
    await request.save();

    res.json({
      success: true,
      message: "Return request submitted.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Return request error:", err);
    res.status(500).json({
      message: "Return request failed.",
      timestamp: new Date().toISOString(),
    });
  }
};

// PATCH /api/borrow/:id/decline
const declineBorrowRequest = async (req, res) => {
  try {
    const request = await BorrowRequest.findById(req.params.id);
    if (!request || !["pending", "on-hold"].includes(request.status)) {
  return res.status(400).json({ message: "Invalid request.", timestamp: new Date().toISOString() });
}

    request.status = "declined";
    await request.save();
    res.json({ success: true, message: "Borrow request declined.", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: "Decline failed.", timestamp: new Date().toISOString() });
  }
};

// DELETE /api/borrow/:id
const deleteBorrowRequest = async (req, res) => {
  try {
    const request = await BorrowRequest.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found.", timestamp: new Date().toISOString() });
    }
    res.json({ success: true, message: "Borrow request deleted.", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: "Delete failed.", timestamp: new Date().toISOString() });
  }
};

// PATCH /api/borrow/:id/hold
const holdBorrowRequest = async (req, res) => {
  try {
    const request = await BorrowRequest.findById(req.params.id);
    if (!request || request.status !== "pending") {
      return res.status(400).json({ message: "Invalid request.", timestamp: new Date().toISOString() });
    }

    request.status = "on-hold";
    await request.save();
    res.json({ success: true, message: "Borrow request put on hold.", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: "Hold failed.", timestamp: new Date().toISOString() });
  }
};

// PATCH /api/borrow/:id/return/direct
const approveReturnDirect = async (req, res) => {
  try {
    const request = await BorrowRequest.findById(req.params.id).populate("items.product");
    if (!request) return res.status(404).json({ message: "Request not found.", timestamp: new Date().toISOString() });

    for (const item of request.items) {
      const product = await Product.findById(item.product._id);
      const returnedQty = item.quantityRequested;
      product.quantityAvailable += returnedQty;
      await product.save({ validateBeforeSave: false });
      item.quantityReturned = returnedQty;
    }

    request.returnStatus = "approved";
    request.status = "returned";
    await request.save({ validateBeforeSave: false });

    res.json({ success: true, message: "Direct return approved.", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: "Return approval failed.", timestamp: new Date().toISOString() });
  }
};

// PATCH /api/borrow/:id/return/approve
// PATCH /api/borrow/:id/return/approve
const approveReturn = async (req, res) => {
  try {
    const request = await BorrowRequest.findById(req.params.id).populate("items.product");
    if (!request) {
      return res.status(404).json({
        message: "Borrow request not found.",
        timestamp: new Date().toISOString(),
      });
    }

    if (request.status !== "approved") {
      return res.status(400).json({
        message: "Invalid borrow request status.",
        timestamp: new Date().toISOString(),
      });
    }

    if (request.returnStatus !== "pending") {
      return res.status(400).json({
        message: "No pending return request to approve.",
        timestamp: new Date().toISOString(),
      });
    }

    let anyUpdated = false;

    for (const item of request.items) {
      const product = await Product.findById(item.product._id);
      const pendingQty = Number(item.pendingReturn || 0);
      const alreadyReturned = Number(item.quantityReturned || 0);
      const maxReturnable = item.quantityRequested - alreadyReturned;
      const qtyToApprove = Math.min(pendingQty, maxReturnable);

      if (!isNaN(qtyToApprove) && qtyToApprove > 0) {
        product.quantityAvailable += qtyToApprove;
        await product.save({ validateBeforeSave: false });

        item.quantityReturned = alreadyReturned + qtyToApprove;
        item.pendingReturn = 0;
        anyUpdated = true;
      }
    }

    if (!anyUpdated) {
      return res.status(400).json({
        message: "No new items to approve. All returned items already processed.",
        timestamp: new Date().toISOString(),
      });
    }

    const allReturned = request.items.every(
      (item) => Number(item.quantityReturned || 0) >= Number(item.quantityRequested || 0)
    );

    request.returnStatus = allReturned ? "complete" : "partial";
    request.status = allReturned ? "returned" : "approved";

    request.markModified("items");
    await request.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: "Return approved.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Return approval error:", err);
    res.status(500).json({
      message: "Return approval failed.",
      timestamp: new Date().toISOString(),
    });
  }
};
// GET /api/borrow/all
const getAllBorrowRequests = async (req, res) => {
  try {
    const requests = await BorrowRequest.find()
      .populate("user")
      .populate("items.product")
      .sort({ createdAt: -1 });

    const formatted = requests.map((req) => ({
      ...req.toObject(),
      requestedAt: req.createdAt,
    }));

    res.json({
      success: true,
      data: formatted,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch all requests.",
      timestamp: new Date().toISOString()
    });
  }
};

// GET /api/borrow/my
const getMyBorrowRequests = async (req, res) => {
  try {
    const requests = await BorrowRequest.find({ user: req.user._id })
      .populate("items.product")
      .sort({ createdAt: -1 });

    const formatted = requests.map((req) => ({
      ...req.toObject(),
      requestedAt: req.createdAt,
    }));

    res.json({
      success: true,
      data: formatted,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch requests.",
      timestamp: new Date().toISOString()
    });
  }
};
// controller/borrowController.js
 const getExpiredApprovedBorrows = async (req, res) => {
  try {
    const now = new Date();
    const expiredRequests = await BorrowRequest.find({
      status: "approved",
      expiry: { $exists: true, $lt: now }
    }).populate("user").populate("items.product");

    res.status(200).json({
      success: true,
      data: expiredRequests,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch expired borrow requests.",
      timestamp: new Date().toISOString()
    });
  }
};
export {
  createBorrowRequest,
  approveBorrowRequest,
  requestReturn,
  approveReturn,
  approveReturnDirect,
  declineBorrowRequest,
  deleteBorrowRequest,
  holdBorrowRequest,
  getAllBorrowRequests,
  getMyBorrowRequests,
  getExpiredApprovedBorrows
};
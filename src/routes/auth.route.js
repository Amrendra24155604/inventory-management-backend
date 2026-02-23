import { Router } from "express";
import { registerUser,login, logoutUser, verifyEmail, refreshAccessToken,changeCurrentPassword, forgotPasswordRequest, resetForgotPassword, getCurrentUser, resendEmailVerification } from "../controllers/auth.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { googleAuthHandler ,leaveAdmin,getAdminRequests,requestAdminAccess,adminRequests,handleAdminRequest,getMemberProfile,teamDetails,completeProfile,googleLoginHandler} from "../controllers/auth.controllers.js";
import { userChangeCurrentPasswordValidator,userForgotPasswordValidator, userLoginValidator,userRegisterValidator, userResetForgotPasswordValidator } from "../validators/index.js";
import { isAdmin } from "../middlewares/isAdmin.js";
import { updateProduct,deleteProduct,createProduct,allProducts } from "../controllers/product.controllers.js";


const router = Router()
router.post("/test", (req, res) => {
  console.log("BODY RECEIVED:", req.body);
  res.json({ received: req.body });
});
router.post("/register",userRegisterValidator(),validate, registerUser)
router.get("/verify-email/:verificationToken",verifyEmail)
router.get("/email-verified/:verificationToken", verifyEmail);
router.get("/refresh-token",refreshAccessToken)
router.post("/forgot-password",userForgotPasswordValidator(),validate,forgotPasswordRequest)
router.post("/reset-password/:resetToken",userResetForgotPasswordValidator(),validate,resetForgotPassword)
router.post("/current-user",verifyJWT,getCurrentUser)
router.get("/current-user",verifyJWT,getCurrentUser)
router.post("/change-password",userChangeCurrentPasswordValidator,validate,changeCurrentPassword)
router.post("/resend-email-verification",verifyJWT,resendEmailVerification)
router.post("/login",login)
router.post("/logout",verifyJWT,logoutUser)
router.post("/google-register", googleAuthHandler);
router.post("/google-login", googleLoginHandler);
// routes/user.route.js
router.post("/complete-profile", verifyJWT,completeProfile);
// routes/teamRoutes.js
router.get("/profile/:rollNumber", getMemberProfile);
// Submit admin request (user)
router.post("/request-admin",verifyJWT, requestAdminAccess);

// Get all pending requests (admin)
router.get("/admin/requests",verifyJWT, getAdminRequests);

// Handle request decision (admin)
router.post("/admin/handle-request",verifyJWT, handleAdminRequest);
router.post("/leave-admin",verifyJWT, leaveAdmin);
router.get("/teams",teamDetails)



// Get all products
router.get("/productList",verifyJWT, isAdmin,allProducts);

// Create a product
router.post("/createProduct",verifyJWT, isAdmin, createProduct);

// Update a product
router.put("/products/:id",verifyJWT, isAdmin, updateProduct);

//delete a product
router.delete("/products/:id", verifyJWT, isAdmin, deleteProduct);


import {
  createBorrowRequest,
  getMyBorrowRequests,
  getAllBorrowRequests,
  approveBorrowRequest,
  requestReturn,
  approveReturn,
  declineBorrowRequest,
  holdBorrowRequest,
  deleteBorrowRequest,
  approveReturnDirect,
  getExpiredApprovedBorrows
} from "../controllers/borrow.controllers.js";


// User routes
router.post("/borrow", verifyJWT, createBorrowRequest);
router.get("/my", verifyJWT, getMyBorrowRequests);
router.patch("/:id/return", verifyJWT, requestReturn);

// Admin routes
router.get("/all", verifyJWT, isAdmin, getAllBorrowRequests);
router.patch("/borrow/:id/approve", verifyJWT, isAdmin, approveBorrowRequest);
router.patch("/:id/return/approve", verifyJWT, isAdmin, approveReturn);
router.patch("/borrow/:id/return/direct", verifyJWT,isAdmin,approveReturnDirect);
router.patch("/borrow/:id/decline", declineBorrowRequest);
router.patch("/borrow/:id/hold", holdBorrowRequest);
router.delete("/borrow/:id", verifyJWT, isAdmin, deleteBorrowRequest);
router.get("/borrow/expired-approved", verifyJWT,isAdmin, getExpiredApprovedBorrows);
export default router
// Add to your routes temporarily
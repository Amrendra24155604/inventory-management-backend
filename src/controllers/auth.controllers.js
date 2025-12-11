import { User } from "../models/users.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail } from "../utils/mail.js";
import jwt from "jsonwebtoken"

const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // true in production (HTTPS), false in development (HTTP)
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // "none" for cross-origin in prod, "lax" for same-origin in dev
  maxAge: 15 * 60 * 1000 *10
};

//on the view admin page the admin can either accept or decline a request
 const handleAdminRequest = asyncHandler(async (req, res) => {
  const { targetUserId, action } = req.body;

  const user = await User.findById(targetUserId);
  if (!user || user.role !== "pending") {
    return res.status(404).json({ success: false, message: "No pending request found" });
  }

  if (action === "accept") {
    user.role = "admin";
  } else if (action === "declin") {
    user.role = "user";
  }

  user.adminRequest = []; // clear request history

  await user.save();

  res.status(200).json({ success: true, message: `Request ${action}ed successfully` });
});

//when the admin clicks on the view admin request he shoulld see all the pending requests
const adminRequests = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user || user.role === "admin") return res.status(400).json({ message: "Invalid request" });

  user.role = "pending";
  await user.save();

  const admins = await User.find({ role: "admin" });
  admins.forEach(async (admin) => {
    admin.adminRequest.push({ userId: user._id });
    await admin.save();
  });

  res.status(200).json({ message: "Admin request submitted" });
};

// POST /api/v1/auth/request-admin
//admin can see all the requests pending or which he can accept or decline
const getAdminRequests = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  const usersWithRequests = await User.find({ role: "pending" })
    .select("username email rollNumber domain adminRequest");

  res.status(200).json({ success: true, requests: usersWithRequests });
});
//now we create a function to request for admin post to the admin (for users only)
//change the role to pending in the backend

const requestAdminAccess = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

 const alreadyRequested = user.adminRequest.find(
  (r) => r.userId.toString() === userId.toString()
);//returns true if any of userId with admin request 

  if (alreadyRequested || user.role === "pending") {
    return res.status(400).json({ success: false, message: "Request already submitted" });
  }

  user.adminRequest.push({ userId: userId, requestedAt: new Date() });
  user.role = "pending";

  await user.save();

  res.status(200).json({ success: true, message: "Admin request submitted successfully" });
});

const seedAdmin = async () => {
  const email = "amrendraky06@gmail.com";
  const user = await User.findOne({ email });
  if (user && user.role !== "admin") {
    user.role = "admin";
    await user.save();
    console.log("Seeded initial admin:", email);
  }
};

const teamDetails= async (req, res) => {
  try {
    const domainOptions = [
  "Web Development",
  "App Development",
  "Android/Spring Boot",
  "Internet of Things(IOT)",
  "Competitive Programming",
  "Machine Learning",
  "Administration",
  "Content Writing",
  "Graphic Design / UIUX",
  "Marketing & Management",
  "Video Editing / Photography"
];
    const users = await User.find({
      isProfileCompleted: true,
      domain: { $in: domainOptions }
    }).select("username photoUrl email rollNumber role domain avatar name");

    const teams = {};

    domainOptions.forEach((domain) => {
      teams[domain] = [];
    });

   users.forEach((user) => {
  if (teams[user.domain]) {
    teams[user.domain].push({
      username: user.username,
      name:user.name,
      email: user.email,
      rollNumber: user.rollNumber,
      role: user.role,
      photoUrl:user.photoUrl
    });
  }
});

// Sort each team: admins first
Object.keys(teams).forEach((domain) => {
  teams[domain].sort((a, b) => {
    if (a.role === "admin" && b.role !== "admin") return -1;
    if (a.role !== "admin" && b.role === "admin") return 1;
    return 0;
  });
});


console.log(teams);

    res.status(200).json({ success: true, teams });
  } catch (err) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

const leaveAdmin = async (req, res) => {
  try {
    const userId = req.user.id; // assuming req.user is populated by auth middleware

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "You are not an admin" });
    }

    user.role = "user";
    await user.save();

    return res.status(200).json({
      success: true,
      message: "You have successfully left the admin role",
    });
  } catch (err) {
    console.error("Leave admin error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMemberProfile = async (req, res) => {
  try {
    const { rollNumber } = req.params;

    const user = await User.findOne({
      rollNumber,
      isProfileCompleted: true
    }).select("username name photoUrl email role rollNumber domain avatar");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found or profile incomplete" });
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const generateAccessAndRefreshToken = async (userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    } catch (error) {
        console.error("Token generation error:", error);
        throw new ApiError(500,"OOPS,something went wrong")
    }
}

import { validationResult } from "express-validator";

const googleAuthHandler = asyncHandler(async (req, res) => {
  const { email, username, googleId } = req.body;
  
  if (!email || !username || !googleId) {
    return res.status(400).json({
      success: false,
      message: "Missing required Google user fields",
    });
  }
  let user = await User.findOne({
    $or: [{ googleId }, { email }],
  });
  
  if (user) {
    return res.status(409).json({
      success: false,
      message: "Account already exists. Please log in instead.",
    });
  }
  
  
  // If not, create a new user
  if (!user) {
    user = new User({
      email,
      username,
      googleId,
      role: email === "amrendraky06@gmail.com" ? "admin" : "user",
      
      isEmailVerified: true, // Firebase already verifies email
    });
    
    await user.save({validateBeforeSave:false});
  }
  
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
  );
  
  if (!createdUser) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user after creation",
    });
  }
  
  return res.status(200).json(
    new ApiResponse(200, { user: createdUser }, "Google user authenticated successfully")
  );
});

const googleLoginHandler = asyncHandler(async (req, res) => {
  const { email, googleId } = req.body;
  
  if (!email || !googleId) {
    throw new ApiError(400, "Missing required Google login fields");
  }
  
  const user = await User.findOne({ $or: [{ googleId }, { email }] });
  
  if (!user) {
    throw new ApiError(401, "No account found. Please register with Google first.");
  }
  
  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  
  // Get user profile
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
  );
  
  // Set cookies
  //   const options = {
    //     httpOnly: true,
    //     secure: true,
    //     sameSite: "Lax",
    //   };
    
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "Google user logged in successfully"
      )
    );
  });

// const registerUser = asyncHandler(async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     const messages = errors.array().map(err => err.msg);
//     return res.status(400).json({
//       success: false,
//       message: "Validation failed",
//       errors: messages,
//     });
//   }
  
//   const { email, password, username } = req.body;

//   const existedUser = await User.findOne({
//     $or: [{ username }, { email }],
//   });
  
//   if (existedUser) {
//     return res.status(409).json({
//       success: false,
//       message: "User with email or username already exists",
//     });
//   }
  
//   const user = await User.create({
//     email,
//     password,
//     username,
//     role: email === "amrendraky06@gmail.com" ? "admin" : "user",
    
//     isEmailVerified: false,
//   });
  
//   const { unHashedToken, HashedToken, tokenExpiry } = user.generateTemporaryToken();
//   user.emailVerficationToken = HashedToken;
//   user.emailVerficationExpiry = tokenExpiry;
//   await user.save({ validateBeforeSave: false });
  
//   await sendEmail({
//     email: user.email,
//     subject: "Please verify your email",
//     mailgenContent: emailVerificationMailgenContent(
//       user.username,
//       `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
//     ),
//   });

//   const createdUser = await User.findById(user._id).select(
//     "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
//   );
  
//   if (!createdUser) {
//     throw new ApiError(500, "Something went wrong while registering a user");
//   }
  
//   return res.status(201).json(
//     new ApiResponse(200, { user: createdUser }, "User registered successfully. Verification email sent.")
//   );
// });
import admin from "../../firebase.js";

// import crypto from "crypto";

// const registerUser = asyncHandler(async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     const messages = errors.array().map(err => err.msg);
//     return res.status(400).json({ success: false, message: "Validation failed", errors: messages });
//   }

//   const { email, password, username } = req.body;

//   const existingUser = await User.findOne({ $or: [{ email }, { username }] });
//   if (existingUser) {
//     return res.status(409).json({ success: false, message: "User already exists" });
//   }

//   const firebaseUser = await admin.auth().createUser({ email, password, displayName: username });

//   const rawToken = crypto.randomBytes(32).toString("hex");
//   const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

//   const verificationLink = `http://localhost:8000/api/v1/auth/verify-email/${rawToken}`;

//   await sendEmail({
//     email,
//     subject: "Verify your email",
//     mailgenContent: emailVerificationMailgenContent(username, verificationLink),
//   });

//   await User.create({
//     email,
//     username,
//     password,
//     firebaseUid: firebaseUser.uid,
//     emailVerficationToken: hashedToken,
//     emailVerficationExpiry: Date.now() + 1000 * 60 * 60 * 24,
//     isEmailVerified: false,
//   });

//   res.status(201).json({
//     success: true,
//     message: "Verification email sent. Please check your inbox.",
//   });
// });
import crypto from "crypto";

const registerUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(err => err.msg);
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: messages,
    });
  }

  const { email, password, username } = req.body;

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "User with this email or username already exists",
    });
  }

  const firebaseUser = await admin.auth().createUser({
    email,
    password,
    displayName: username,
  });

  //  Generate custom verification token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiry = Date.now() + 1000 * 60 * 30; // 30 minutes

  //  Store user in MongoDB
  const user = await User.create({
    email,
    username,
    password,
    firebaseUid: firebaseUser.uid,
    role: email === "amrendraky06@gmail.com" ? "admin" : "user",
    isEmailVerified: false,
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: expiry,
  });

  // Send verification email with custom link
  const verificationLink = `http://localhost:5173/email-verified/${rawToken}`;
  await sendEmail({
    email,
    subject: "Verify your email",
    mailgenContent: emailVerificationMailgenContent(username, verificationLink),
  });

  return res.status(201).json({
    success: true,
    message: "User registered. Verification email sent.",
    user: {
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
});
const login = asyncHandler(async (req,res)=>{
  const {email,password,username} = req.body
  if(!email) throw new ApiError(400,"Email required")
    const user = await User.findOne({email})
  
  if(!user){
    throw new ApiError(400,"user not found")
  }
    const isPasswordValid = await user.isPasswordCorrect(password)
    
    if(!isPasswordValid) throw new ApiError(409,"invalid Password")
      
      const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)
      
      const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
      )
      
      // const options = {
        //     httpOnly : true,
        //     secure : true
        // }
        return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options)
        .json(
          new ApiResponse(
            200,
            {
                user:loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in successfully"
          )
        )
})
      
const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,{
            $set:{
              refreshToken:""
            },
            
          },
        {
            new:true,
          },
        )
    // const options = {
    //     httpOnly:true,
    //     secure:true
    // }
    return res
    .status(200).clearCookie("accessToken",options)
    .clearCookie("refreshToken",options).json(new ApiResponse(200,{},"User logged Out"))
  })
  
  const getCurrentUser = asyncHandler(async(req,res,next)=>{
    return res.status(200).json(new ApiResponse(200,req.user,"current User fetched succesfully"))
  })


const completeProfile = asyncHandler(async (req, res) => {
  const { name, rollNumber, domain, photoUrl } = req.body;

  // Validate required fields
  if (!name || !rollNumber || !domain) {
    return res.status(400).json({ 
      success: false,
      message: "All fields (name, rollNumber, domain) are required" 
    });
  }

  // Find the user by ID (set by verifyJWT middleware)
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ 
      success: false,
      message: "User not found" 
    });
  }

  // Update fields
  user.name = name;
  user.rollNumber = rollNumber;
  user.domain = domain;
  if (photoUrl) {
    user.photoUrl = photoUrl;   // save Cloudinary URL if provided
  }
  user.isProfileCompleted = true;

  // Save with validation
  await user.save({ validateBeforeSave: true });

  // Return updated user
  return res.status(200).json({ 
    success: true,
    message: "Profile updated successfully", 
    data: user 
  });
});

// const verifyEmail = asyncHandler(async (req,res,next)=>{
//   const {verificationToken} = req.params
  
//   if(!verificationToken)
//     throw new ApiError(400,"email verification token is missing")
  
//   let HashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex")
  
//   const user = await User.findOne({
//     emailVerficationToken:HashedToken,
//     emailVerficationExpiry:{$gt:Date.now()}
//   })
  
//   if(!user){
//     throw new ApiError(400,"token is not valid or is expired")
//   }
//   user.emailVerficationToken = undefined
//   user.emailVerficationExpiry= undefined
//   user.isEmailVerified = true
//   await user.save({validateBeforeSave:false})
  
//   return res.status(200).json(new ApiResponse(200,{
//     isEmailVerified:true
//   }),
//   "Email is verified"    
// )
// })
const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;
  if (!verificationToken) throw new ApiError(400, "Missing token");

  const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) throw new ApiError(400, "Invalid or expired token");

  user.emailVerficationToken = undefined;
  user.emailVerficationExpiry = undefined;
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  return res.redirect("http://localhost:5173/login");
});
const resendEmailVerification = asyncHandler(async(req,res)=>{
  const user = await User.findById(req.user._id)
  
  if(!user) throw new ApiError(404,"User does not exist")
    
    if(user.isEmailVerified){
      throw new ApiError(409,"Email is already verified")
    }
    return res.status(200).json(new ApiResponse(200,{},"mail sent to your email id"))
})

const refreshAccessToken = asyncHandler(async(req,res,next)=>{
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
  
  if(!incomingRefreshToken) throw new ApiError(401,"Unauthorized access")
    
    try {
      const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
      const user = await User.findById(decodedToken?._id)
      if(!user) throw new ApiError(401,"Inavlid Refresh Token")
        if(incomingRefreshToken!==user?.refreshToken)
          throw new ApiError(401,"expired Refresh Token")
        
        // const options = {
          //     httpOnly:true,
          //     secure:true
          // }
          const {accessToken,refreshToken:newRefreshToken} = await generateAccessAndRefreshToken(user._id)
          user.refreshToken = newRefreshToken
          await user.save()
          return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",newRefreshToken,options).json(new ApiResponse(200,{accessToken,refreshToken:newRefreshToken},"Access token refreshed"))
          
        } catch (error) {
          throw new ApiError(401,"Invalid refresh token")
        }
      })
      
const forgotPasswordRequest = asyncHandler(async(req,res)=>{
        const {email} = req.body
        const user = await User.findOne({email})
        if(!user){
        throw new ApiError(404,"User does not exist",[])}

        const {unHashedToken,HashedToken,tokenExpiry} = user.generateTemporaryToken()
        user.forgotPasswordToken = HashedToken
        user.forgotPasswordExpiry = tokenExpiry
        
        await user.save({validateBeforeSave:false})
        
        await sendEmail({
          email:user?.email,
          subject:"Password reset request",
          mailgenContent:forgotPasswordMailgenContent(
            user.username,
            `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`
          )
        })
        return res.status(200).json(new ApiResponse(200,{},"password reset mail sent to your mail successfully"))
        
        
})

const resetForgotPassword = asyncHandler(async(req,res)=>{
  const {resetToken} = req.params
  const {newPassword} = req.body
  let HashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")
  
  const user = await User.findOne({
    forgotPasswordToken:HashedToken,
    forgotPasswordExpiry:{$gt:Date.now()}
  })
  if(!user){
    throw new ApiError(401,"token is invalid or expired")
  }
  user.forgotPasswordExpiry = undefined
  user.forgotPasswordToken = undefined
  
  user.password = newPassword
  
  await user.save({validateBeforeSave:false})
  
  return res.status(200).json(new ApiResponse(200,{},"Password reset successfully"))
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
  const {oldPassword,newPassword} = req.body
  const user = await User.findById(req.user?._id)
  
  const isPasswordValid = await user.isPasswordCorrect(oldPassword)
  
  if(!isPasswordValid){
    throw new ApiError(400,"invalid old password")
  }
  user.password = newPassword
  await user.save({validateBeforeSave:false})
  return res.status(200).json(new ApiResponse(
    200,{},"Password saved Successfully"
     ))
})


export {registerUser,leaveAdmin,handleAdminRequest,requestAdminAccess,seedAdmin,getAdminRequests,adminRequests,teamDetails,completeProfile,googleLoginHandler,googleAuthHandler,login,logoutUser,getCurrentUser,verifyEmail,resendEmailVerification,refreshAccessToken,forgotPasswordRequest,resetForgotPassword,changeCurrentPassword}

// const registerUser = asyncHandler(async (req,res)=>{
// //     console.log("METHOD:", req.method);
// // console.log("HEADERS:", req.headers);
// // console.log("BODY RECEIVED:", req.body);
// // console.log("hu");
// // console.log("u");
// console.log("BODY RECEIVED:", req.body);

// //  if (!req.body || Object.keys(req.body).length === 0) {
// //   return res.status(400).json({ message: "Missing request body" });
// // }
// if (!req.body || typeof req.body !== "object") {
//   return res.status(400).json({ message: "Missing or invalid request body" });
// }

// // const { email, password, username } = req.body;
//     console.log("BODY RECEIVED:", req.body);
//   const { email, password, username } = req.body;
//   if (!email || !password || !username) {
//   return res.status(400).json({ message: "All fields are required" });
// }
//     const existedUser = await User.findOne({
//         $or:[{username},{email}]
//     })

//     if(existedUser){
//         throw new ApiError(409,"user with email or username exists",[])
//     }

//     const user = await User.create({
//         email,password,username,isEmailVerified:false
//     })

//     const {unHashedToken,HashedToken,tokenExpiry} = user.generateTemporaryToken()

//     user.emailVerficationToken = HashedToken
//     user.emailVerficationExpiry = tokenExpiry
//     await user.save({validateBeforeSave:false})

//     await sendEmail({
//         email:user?.email,
//         subject:"please verify your email",
//         mailgenContent:emailVerificationMailgenContent(
//             user.username,
//             `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
//         )
//     })

//     const createdUser = await User.findById(user._id).select(
//         "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
//     )

//     if(!createdUser){
//         throw new ApiError(500,"Something went wrong while registering a user")
//     }
//     return res.status(201).json(new ApiResponse(200,{user:createdUser},"user registered successfully and verification has been sent to your email"))
// })


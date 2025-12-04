import { User } from "../models/users.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async(req,res,next)=>{
    // const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","")
    const authHeader = req.header("Authorization");
const token =
  req.cookies?.accessToken ||
  (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);
console.log("Cookies:", req.cookies);
// console.log("Access Token:", accessToken);
// console.log("Refresh Token:",req.refreshToken);
console.log("Authorization Header:", req.header("Authorization"));
    if(!token){
    
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -emailVerificationToken -emailVerificationExpiry -refreshToken")
        if(!user){
        throw new ApiError(500,"Invalid Access Token")
    }
    req.user = user
    next()
    } catch (error) {console.log(error);
    
        throw new ApiError(401,"Invalid Access Token")
    }
})
// export const verifyJWT = asyncHandler(async (req, res, next) => {
//   const authHeader = req.header("Authorization");
//   const token =
//     req.cookies?.accessToken ||
//     (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

//   console.log("Cookies:", req.cookies);
//   console.log("Authorization Header:", authHeader);

//   if (!token) {
//     throw new ApiError(401, "Unauthorized request");
//   }

//   try {
//     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
//     const user = await User.findById(decodedToken.id).select("-password");

//     if (!user) {
//       throw new ApiError(401, "Invalid Access Token");
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     console.error("JWT verification failed:", error);
//     throw new ApiError(401, "Invalid Access Token");
//   }
// });
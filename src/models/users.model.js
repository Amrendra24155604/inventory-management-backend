import { refreshToken } from "firebase-admin/app";
import mongoose,{Schema} from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import crypto from "crypto"
const userSchema = new Schema({
   photoUrl: String,
    avatar:{
        type:{
            url:String,
            localPath:String,
        },
        default:{
            url:`https://placehold.co/200x200`,
            localPath:""
        }
    },
    name:{
      type:String,
    },
    username:{
      type:String,
      required:true,
      unique:true,
      lowercase:true,
      trim:true,
      index:true
    },
    googleId: {
  type: String,
  unique: true,
  sparse: true, // allows null values without violating uniqueness
},

    email:{
      type:String,
      required:true,
      unique:true,
      trim:true
    },
    domain:{
      type:String
    },
    isProfileCompleted:{
      type:Boolean,
      default:false
    },
    rollNumber:{
      type:Number,
      unique:true,
    },
    role: {
    type: String,
    enum: ["user", "admin","pending"],
    default: "user"
  },
  adminRequest: [
    {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      requestedAt: { type: Date, default: Date.now }
    }
  ],


    fullName:{
      type:String,
      trim:true
    },
    password: {
  type: String,
  required: function () {
    return !this.googleId;
  },
},

    isEmailVerified:{
      type:Boolean,
      default:false
    },
    refreshToken:{
      type:String
    },
    forgotPasswordToken:{
      type:String
    },
    forgotPasswordExpiry:{
      type:Date
    },
    emailVerficationToken:{
      type:String
    },
    emailVerficationExpiry:{
      type:String
    },
  
}, {timestamps:true})

userSchema.pre("save",async function(next){
  if(!this.isModified("password")) return next()

    this.password = await bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
  return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function(){
  return jwt.sign({
    _id:this._id,
    email:this.email,
    username:this.username
  },
  process.env.ACCESS_TOKEN_SECRET,
  {expiresIn:process.env.ACCESS_TOKEN_EXPIRY}
)
}
userSchema.methods.generateRefreshToken = function(){
  return jwt.sign({
    _id:this._id,
    email:this.email,
    username:this.username
  },
  process.env.REFRESH_TOKEN_SECRET,
  {expiresIn:process.env.REFRESH_TOKEN_EXPIRY}  
)
}
userSchema.methods.generateTemporaryToken = function(){
  const unHashedToken = crypto.randomBytes(20).toString("hex")

  const hashedToken = crypto.createHash("sha256")
  .update(unHashedToken)
  .digest("hex")

  const tokenExpiry = Date.now()+(20*60*100)
  return {hashedToken,unHashedToken,tokenExpiry}
}
export const User = mongoose.model('User', userSchema);
// import mongoose from 'mongoose';

// const userSchema = new mongoose.Schema({
//   uid: { type: String, required: true, unique: true },
//   email: { type: String, required: true },
//   name: String,
//   role: { type: String, enum: ['admin', 'member'], default: 'member' }
// });

// export default mongoose.model('User', userSchema);
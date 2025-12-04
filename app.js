// app.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { seedAdmin } from "../backend/src/controllers/auth.controllers.js";

import healthCheckRouter from "./src/routes/healthcheck.routes.js";
import authRouter from "./src/routes/auth.route.js";

dotenv.config();
const app = express();

// Basic configuration
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// ✅ Robust CORS setup
const allowedOrigins = ["http://localhost:5173", "http://10.192.218.149:5173"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow server-to-server or curl
      const normalizedOrigins = allowedOrigins.map(o => o.replace(/\/$/, ""));
      const normalizedOrigin = origin.replace(/\/$/, "");
      if (normalizedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Remove or replace this line
// app.options("*", cors());   <-- causes PathError

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup (disk storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Routes
app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);

// Sample route
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// File upload route (generic)
app.post("/api/v1/upload", upload.array("photos", 5), async (req, res) => {
  try {
    const photoUrls = [];
    for (const file of req.files) {
      const uploaded = await cloudinary.uploader.upload(file.path, {
        folder: "uploads",
      });
      photoUrls.push(uploaded.secure_url);
    }
    res.json({ success: true, photos: photoUrls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed admin
seedAdmin();

export default app;


// // app.js
// import express from "express";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import {seedAdmin} from "../backend/src/controllers/auth.controllers.js"
// const app = express();

// // Basic configuration
// app.use(express.json({ limit: "16kb" }));
// app.use(express.urlencoded({ extended: true, limit: "16kb" }));
// app.use(express.static("public"));
// app.use(cookieParser())
// // app.use(
// //   cors({
// //     origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
// //     credentials: true,
// //     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
// //     allowedHeaders: ["Content-Type", "Authorization"],
// //   })
// // );
// const allowedOrigins = process.env.CORS_ORIGIN
//   ? process.env.CORS_ORIGIN.split(",")
//   : ["http://localhost:5173","http://10.192.218.149:5173/"];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );



// seedAdmin()
// export default app;
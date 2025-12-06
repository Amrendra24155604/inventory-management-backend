// app.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { seedAdmin } from "./src/controllers/auth.controllers.js";
import healthCheckRouter from "./src/routes/healthcheck.routes.js";
import authRouter from "./src/routes/auth.route.js";

dotenv.config();
const app = express();

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic configuration
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// CORS setup
const allowedOrigins = [
  "http://localhost:5173", // local dev
  "https://inventory-management-frontend-5ioh.vercel.app", // deployed frontend
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.options(/.*/, cors());

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

// API Routes
app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);

// File upload route
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

// Serve Vite frontend build
// Serve Vite frontend build
app.use(express.static(path.join(__dirname, "frontend/dist")));

// Catch-all for client-side routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "frontend/dist", "index.html"));
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
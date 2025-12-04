// // index.js
import dotenv from "dotenv";
import connectDB from "./src/db/index.js";

dotenv.config({ path: "./.env" });
const port = process.env.PORT || 3000;
connectDB()
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`✅ Server running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error");
    console.error(err);
  });
import app from './app.js';

// app.listen(port, () => {
//   console.log(`🚀 Server running on http://localhost:${port}`);
// });
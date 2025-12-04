// import Product from "../models/products.models.js";
// import { asyncHandler } from "../utils/async-handler.js";

// // Get all products
// const allProducts = async (req, res) => {
//   const products = await Product.find();
//   res.json(products);
// };

// // Create a product
// const createProduct = async (req, res) => {
//   try {
//     const { name, variant,photoUrl, initialQuantity } = req.body;

//     const product = new Product({
//       name,
//       variant,
//       initialQuantity,
//       quantityAvailable: initialQuantity,photoUrl 
//     });
//     await product.save();
//     res.status(201).json(product);
//   } catch (err) {
//     console.error("❌ Product creation failed:", err.message);
//     res.status(500).json({ message: "Failed to create product." });
//   }
// };

// // Update a product
// const updateProduct = async (req, res) => {
//   const { name, variant,photoUrl, initialQuantity, quantityAvailable } = req.body;

//   const product = await Product.findByIdAndUpdate(
//     req.params.id,
//     { name, variant,photoUrl, initialQuantity, quantityAvailable },
//     { new: true }
//   );

//   res.json(product);
// };

// const deleteProduct = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const product = await Product.findById(id);

//   if (!product) {
//     throw new ApiError(404, "Product not found");
//   }

//   await product.deleteOne();
//   res.status(200).json({ message: "Product deleted successfully" });
// });

// export {allProducts,createProduct,updateProduct,deleteProduct}

import Product from "../models/products.models.js";
import { asyncHandler } from "../utils/async-handler.js";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

// Multer setup (memory storage so we don’t need an uploads folder)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Get all products
const allProducts = asyncHandler(async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// Create a product
const createProduct = asyncHandler(async (req, res) => {
  try {
    const { name, variant,photoUrl, initialQuantity } = req.body;

    // If a file is uploaded, push it to Cloudinary
    if (req.file) {
      const uploaded = await cloudinary.uploader.upload_stream(
        { folder: "products" },
        (error, result) => {
          if (error) throw error;
          photoUrl = result.secure_url;
        }
      );
    }

    const product = new Product({
      name,
      variant,
      initialQuantity,
      quantityAvailable: initialQuantity,
      photoUrl,
    });
product.photoUrl=photoUrl;
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error("❌ Product creation failed:", err.message);
    res.status(500).json({ message: "Failed to create product." });
  }
});

// Update a product
const updateProduct = asyncHandler(async (req, res) => {
  const { name, variant,photoUrl, initialQuantity, quantityAvailable } = req.body;

  if (req.file) {
    const uploaded = await cloudinary.uploader.upload_stream(
      { folder: "products" },
      (error, result) => {
        if (error) throw error;
        photoUrl = result.secure_url;
      }
    );
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { name, variant, photoUrl, initialQuantity, quantityAvailable },
    { new: true }
  );

  res.json(product);
});

// Delete a product
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  await product.deleteOne();
  res.status(200).json({ message: "Product deleted successfully" });
});

export { allProducts, createProduct, updateProduct, deleteProduct, upload };
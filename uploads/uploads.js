app.post("/api/v1/upload", upload.array("photos", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const photoUrls = [];
    for (const file of req.files) {
      const uploaded = await cloudinary.uploader.upload(file.path, {
        folder: "uploads",
      });
      photoUrls.push(uploaded.secure_url);
    }
    res.json({ success: true, photos: photoUrls });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});
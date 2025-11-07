// config/multer.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

// Configuration du stockage Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "services", // 📁 Dossier dans ton Cloudinary
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

// Middleware multer
const upload = multer({ storage });

module.exports = upload;

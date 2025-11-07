const express = require("express");
const router = express.Router();
const {
  createProvider,
  getAllProviders,
  getProviderById,
  updateProvider,
  toggleFollowProvider,
  getMyProviderProfile,
} = require("../controllers/providerController");
const { protect } = require("../middleware/auth");
const upload = require("../config/multer");

// Routes PUBLIQUES
// @route   GET /api/providers
// @desc    Obtenir tous les prestataires
// @access  Public
router.get("/", getAllProviders);

// @route   GET /api/providers/:id
// @desc    Obtenir un prestataire par ID
// @access  Public
router.get("/:id", getProviderById);

// Routes PROTÉGÉES
// @route   POST /api/providers
// @desc    Créer un profil prestataire
// @access  Private
router.post(
  "/",
  protect,
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "bannerPic", maxCount: 1 },
  ]),
  createProvider
);

// @route   GET /api/providers/my-profile
// @desc    Obtenir mon profil prestataire
// @access  Private (Provider)
router.get("/my-profile", getMyProviderProfile);

// @route   PUT /api/providers/:id
// @desc    Mettre à jour un profil prestataire
// @access  Private (Provider/Admin)
router.put("/:id", updateProvider);

// @route   POST /api/providers/:id/follow
// @desc    Suivre/Ne plus suivre un prestataire
// @access  Private
router.post("/:id/follow", toggleFollowProvider);

module.exports = router;

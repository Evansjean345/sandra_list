const express = require("express");
const router = express.Router();
const {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServicesByProvider,
} = require("../controllers/serviceController");
const upload = require("../config/multer");
const { verifyToken } = require("../middleware/verifiyToken");
const { protect } = require("../middleware/auth");

// @route   GET /api/services
// @desc    Obtenir tous les services avec filtres
// @access  Public
router.get("/", getAllServices);

// @route   GET /api/services/provider/:providerId
// @desc    Obtenir les services d'un prestataire
// @access  Public
router.get("/provider/:providerId", getServicesByProvider);

// @route   GET /api/services/:id
// @desc    Obtenir un service par ID
// @access  Public
router.get("/:id", getServiceById);

// @route   POST /api/services
// @desc    Créer un nouveau service
// @access  Private (Provider)
router.post("/", protect, upload.single("image"), createService);

// @route   PUT /api/services/:id
// @desc    Mettre à jour un service
// @access  Private (Provider/Admin)
router.put("/:id", updateService);

// @route   DELETE /api/services/:id
// @desc    Supprimer un service
// @access  Private (Provider/Admin)
router.delete("/:id", deleteService);

module.exports = router;

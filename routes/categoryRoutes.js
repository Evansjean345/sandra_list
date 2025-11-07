const express = require("express");
const router = express.Router();
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

// Routes PUBLIQUES
// @route   GET /api/categories
// @desc    Obtenir toutes les catégories
// @access  Public
router.get("/", getAllCategories);

// @route   GET /api/categories/:id
// @desc    Obtenir une catégorie par ID
// @access  Public
router.get("/:id", getCategoryById);

// Routes ADMIN
// @route   POST /api/categories
// @desc    Créer une catégorie
// @access  Private (Admin)
router.post("/", createCategory);

// @route   PUT /api/categories/:id
// @desc    Mettre à jour une catégorie
// @access  Private (Admin)
router.put("/:id", updateCategory);

// @route   DELETE /api/categories/:id
// @desc    Supprimer une catégorie
// @access  Private (Admin)
router.delete("/:id", deleteCategory);

module.exports = router;

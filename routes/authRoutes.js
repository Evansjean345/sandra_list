const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
} = require("../controllers/authController");

// @route   POST /api/auth/register
// @desc    Inscription d'un nouvel utilisateur
// @access  Public
router.post("/register", register);

// @route   POST /api/auth/login
// @desc    Connexion utilisateur
// @access  Public
router.post("/login", login);

// @route   GET /api/auth/me
// @desc    Obtenir le profil de l'utilisateur connecté
// @access  Private
router.get("/me", getMe);

// @route   PUT /api/auth/update-profile
// @desc    Mettre à jour le profil
// @access  Private
router.put("/update-profile", updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Changer le mot de passe
// @access  Private
router.put("/change-password", changePassword);

module.exports = router;

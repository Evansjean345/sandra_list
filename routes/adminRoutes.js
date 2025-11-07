const express = require("express");
const router = express.Router();
const {
  getGlobalStats,
  getAllUsers,
  toggleUserStatus,
  verifyProvider,
  toggleProviderSuspension,
  updateProviderAccountType,
  revealClientContact,
  getPopularServices,
  getTopProviders,
  getRevenueStats,
} = require("../controllers/adminController");

// STATISTIQUES
// @route   GET /api/admin/stats
// @desc    Statistiques globales
router.get("/stats", getGlobalStats);

// @route   GET /api/admin/stats/popular-services
// @desc    Services les plus populaires
router.get("/stats/popular-services", getPopularServices);

// @route   GET /api/admin/stats/top-providers
// @desc    Meilleurs prestataires
router.get("/stats/top-providers", getTopProviders);

// @route   GET /api/admin/stats/revenue
// @desc    Statistiques de revenus
router.get("/stats/revenue", getRevenueStats);

// GESTION UTILISATEURS
// @route   GET /api/admin/users
// @desc    Liste de tous les utilisateurs
router.get("/users", getAllUsers);

// @route   PATCH /api/admin/users/:id/toggle-status
// @desc    Activer/Suspendre un utilisateur
router.patch("/users/:id/toggle-status", toggleUserStatus);

// GESTION PRESTATAIRES
// @route   PATCH /api/admin/providers/:id/verify
// @desc    Vérifier un prestataire
router.patch("/providers/:id/verify", verifyProvider);

// @route   PATCH /api/admin/providers/:id/toggle-suspension
// @desc    Suspendre/Activer un prestataire
router.patch("/providers/:id/toggle-suspension", toggleProviderSuspension);

// @route   PATCH /api/admin/providers/:id/account-type
// @desc    Changer le type de compte
router.patch("/providers/:id/account-type", updateProviderAccountType);

// GESTION RÉSERVATIONS
// @route   PATCH /api/admin/bookings/:id/reveal-contact
// @desc    Révéler les coordonnées du client
router.patch("/bookings/:id/reveal-contact", revealClientContact);

module.exports = router;

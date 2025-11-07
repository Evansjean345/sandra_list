const express = require("express");
const router = express.Router();
const {
  createBooking,
  getAllBookings,
  getMyBookings,
  getProviderBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  rateBooking,
} = require("../controllers/bookingControllers");

// Routes CLIENTS
// @route   POST /api/bookings
// @desc    Créer une réservation
// @access  Private (Client)
router.post("/", createBooking);

// @route   GET /api/bookings/my-bookings
// @desc    Obtenir mes réservations
// @access  Private (Client)
router.get("/my-bookings", getMyBookings);

// @route   PATCH /api/bookings/:id/cancel
// @desc    Annuler une réservation
// @access  Private (Client)
router.patch("/:id/cancel", cancelBooking);

// @route   POST /api/bookings/:id/rate
// @desc    Évaluer une réservation
// @access  Private (Client)
router.post("/:id/rate", rateBooking);

// Routes PRESTATAIRES
// @route   GET /api/bookings/provider-bookings
// @desc    Obtenir les réservations du prestataire
// @access  Private (Provider)
router.get("/provider-bookings", getProviderBookings);

// Routes ADMIN
// @route   GET /api/bookings/all
// @desc    Obtenir toutes les réservations
// @access  Private (Admin)
router.get("/all", getAllBookings);

// @route   PATCH /api/bookings/:id/status
// @desc    Mettre à jour le statut d'une réservation
// @access  Private (Admin)
router.patch("/:id/status", updateBookingStatus);

// Route COMMUNE (permissions vérifiées dans le controller)
// @route   GET /api/bookings/:id
// @desc    Obtenir une réservation par ID
// @access  Private
router.get("/:id", getBookingById);

module.exports = router;

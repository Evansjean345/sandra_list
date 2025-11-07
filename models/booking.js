const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  // ✨ NOUVEAU: Numéro de réservation unique
  bookingNumber: {
    type: String,
    unique: true,
    required: true,
  },

  // ✨ CHANGEMENT: client au lieu de customer
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // ✨ NOUVEAU: Informations de contact (gérées par admin)
  contactInfo: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
  },

  // ✨ NOUVEAU: Prestataire assigné
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceProvider",
    required: true,
  },

  // ✨ CHANGEMENT: services au lieu d'articles
  services: [
    {
      service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
      },
      quantity: { type: Number, default: 1 },
      price: { type: Number, required: true },
      selectedOptions: [
        // ✨ NOUVEAU
        {
          name: { type: String },
          price: { type: Number },
        },
      ],
    },
  ],

  // ✨ NOUVEAU: Date et heure de rendez-vous
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String }, // "14:30"

  // ✨ NOUVEAU: Lieu de la prestation
  serviceLocation: {
    type: {
      type: String,
      enum: ["client_address", "provider_location", "to_be_determined"],
      required: true,
    },
    address: { type: String },
    city: { type: String },
    district: { type: String },
    coordinates: { lat: Number, lng: Number },
    instructions: { type: String },
  },

  // ✨ NOUVEAU: Notes du client
  clientNotes: { type: String },

  // ✨ AMÉLIORATION: Tarification structurée
  pricing: {
    serviceTotal: { type: Number, required: true },
    platformFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
  },

  // ✨ AMÉLIORATION: Statuts adaptés aux services
  status: {
    type: String,
    enum: [
      "pending", // En attente de confirmation
      "confirmed", // Confirmée
      "in_progress", // En cours
      "completed", // Terminée
      "cancelled", // Annulée
      "no_show", // Client absent
    ],
    default: "pending",
  },

  // ✨ NOUVEAU: Historique des changements de statut
  statusHistory: [
    {
      status: { type: String },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      changedAt: { type: Date, default: Date.now },
      note: { type: String },
    },
  ],

  // ✨ AMÉLIORATION: Paiement détaillé
  payment: {
    method: {
      type: String,
      enum: ["cash", "mobile_money", "card", "bank_transfer"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
    paidAt: { type: Date },
    transactionId: { type: String },
  },

  // ✨ NOUVEAU: Notes pour communication admin-prestataire
  providerNotes: { type: String },
  adminNotes: { type: String },

  // ✨ CRUCIAL: Gestion de la confidentialité
  visibility: {
    providerCanSeeContact: { type: Boolean, default: false },
  },

  // ✨ NOUVEAU: Évaluations mutuelles
  rating: {
    clientRating: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      ratedAt: { type: Date },
    },
    providerRating: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      ratedAt: { type: Date },
    },
  },

  createdAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
});

module.exports = mongoose.model("Booking", bookingSchema);

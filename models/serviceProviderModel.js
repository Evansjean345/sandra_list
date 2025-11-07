const mongoose = require("mongoose");

const serviceProviderSchema = new mongoose.Schema({
  // ✨ CHANGEMENT: businessName au lieu de name
  businessName: { type: String, required: true },
  description: { type: String, required: true },
  profilePic: { type: String },
  bannerPic: { type: String },

  // ✨ CHANGEMENT: owner au lieu de manager
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // ✨ CHANGEMENT: services au lieu d'articles
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],

  // ✨ NOUVEAU: Catégories de services offerts
  serviceCategories: [{ type: String }], // Ex: ["Plomberie", "Électricité"]

  // ✨ AMÉLIORATION: Disponibilité structurée au lieu de simples heures
  availability: {
    schedule: [
      {
        day: {
          type: String,
          enum: [
            "Lundi",
            "Mardi",
            "Mercredi",
            "Jeudi",
            "Vendredi",
            "Samedi",
            "Dimanche",
          ],
        },
        isOpen: { type: Boolean, default: true },
        openingTime: { type: String }, // "08:00"
        closingTime: { type: String }, // "18:00"
      },
    ],
    acceptsEmergency: { type: Boolean, default: false }, // ✨ NOUVEAU
  },

  // ✨ NOUVEAU: Type de service (crucial pour les services)
  serviceType: {
    type: String,
    required: true,
    enum: ["mobile", "fixed", "both"],
    // mobile: se déplace chez le client
    // fixed: le client vient au local
    // both: les deux options
  },

  // ✨ AMÉLIORATION: Localisation détaillée
  location: {
    address: { type: String },
    city: { type: String, required: true },
    district: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    serviceRadius: { type: Number }, // ✨ NOUVEAU: Rayon d'intervention en km
  },

  phoneNumber: { type: String, required: true },
  whatsappNumber: { type: String }, // ✨ NOUVEAU
  email: { type: String },

  socialMediaLinks: {
    facebook: { type: String },
    instagram: { type: String },
    twitter: { type: String },
    tiktok: { type: String }, // ✨ NOUVEAU
  },

  accountType: {
    type: String,
    default: "standard",
    enum: ["standard", "premium", "vip"], // "premium" remplace "corporate"
  },

  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  ratings: [], // Structure similaire mais avec référence à Booking

  // ✨ NOUVEAU: Moyenne des notes calculée
  averageRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },

  // ✨ NOUVEAU: Statistiques
  completedBookings: { type: Number, default: 0 },

  // ✨ NOUVEAU: Documents de vérification
  verificationDocuments: {
    isVerified: { type: Boolean, default: false },
    documents: [
      {
        type: { type: String }, // "ID", "License", "Insurance"
        url: { type: String },
        verifiedAt: { type: Date },
      },
    ],
  },

  // ✨ NOUVEAU: Statut du compte
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ServiceProvider", serviceProviderSchema);

const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  // ✨ CHANGEMENT: title au lieu de name
  title: { type: String, required: true },
  category: { type: String, required: true },
  subCategory: { type: String, required: true },
  description: { type: String, required: true },

  // ✨ AMÉLIORATION: Structure de tarification plus flexible
  pricing: {
    basePrice: { type: Number, required: true },
    priceType: {
      type: String,
      required: true,
      enum: ["fixed", "hourly", "estimate"],
      // fixed: prix fixe
      // hourly: prix par heure (ex: 8000 FCFA/heure)
      // estimate: sur devis (prix = 0)
    },
    currency: { type: String, default: "FCFA" },
  },

  // ✨ AMÉLIORATION: Discount avec date de validité
  discount: {
    hasDiscount: { type: Boolean, default: false },
    discountedPrice: { type: Number },
    percentDiscount: { type: Number },
    validUntil: { type: Date }, // ✨ NOUVEAU: Date d'expiration
  },

  imageUrls: [{ type: String }],

  // ✨ NOUVEAU: Durée estimée du service
  estimatedDuration: {
    value: { type: Number },
    unit: {
      type: String,
      enum: ["minutes", "hours", "days"],
    },
  },

  // ✨ CHANGEMENT: isAvailable au lieu de stock
  isAvailable: { type: Boolean, default: true },

  // ✨ CHANGEMENT: provider au lieu de shop
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceProvider",
    required: true,
  },

  // ✨ NOUVEAU: Exigences pour le service
  requirements: [{ type: String }], // Ex: ["Accès à l'eau", "Électricité"]

  // ✨ NOUVEAU: Options supplémentaires payantes
  additionalOptions: [
    {
      name: { type: String },
      price: { type: Number },
      description: { type: String },
    },
  ],

  // ✨ NOUVEAU: Tags pour recherche
  tags: [{ type: String }], // Ex: ["urgent", "weekend", "24/7"]

  // ✨ NOUVEAU: Statistiques
  viewCount: { type: Number, default: 0 },
  bookingCount: { type: Number, default: 0 },

  // ✨ NOUVEAU: Évaluations spécifiques au service
  ratings: [],
  averageRating: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Service", serviceSchema);

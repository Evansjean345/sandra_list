const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  // ✨ CHANGEMENT: name au lieu de category
  name: {
    type: String,
    required: true,
    unique: true,
  },

  // ✨ NOUVEAU: Description
  description: { type: String },

  // ✨ NOUVEAU: Icône et image
  icon: { type: String },
  imageUrl: { type: String },

  // ✨ AMÉLIORATION: Sous-catégories structurées
  subCategories: [
    {
      name: { type: String, required: true },
      description: { type: String },
      icon: { type: String },
    },
  ],

  // ✨ NOUVEAU: Ordre d'affichage
  displayOrder: { type: Number, default: 0 },

  // ✨ NOUVEAU: Visibilité
  isActive: { type: Boolean, default: true },

  // ✨ NOUVEAU: Statistiques
  totalProviders: { type: Number, default: 0 },
  totalServices: { type: Number, default: 0 },

  // ✨ NOUVEAU: Tags
  tags: [{ type: String }],

  // ✨ NOUVEAU: Popularité
  popularity: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Category", categorySchema);

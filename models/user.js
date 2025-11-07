const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // ✨ CHANGEMENT: Nouveaux rôles adaptés aux services
  role: {
    type: String,
    required: true,
    default: "client",
    enum: ["client", "provider", "admin"], // 'provider' remplace 'manager'
  },

  // ✨ NOUVEAU: Photo de profil
  profilePicture: { type: String },

  // ✨ CHANGEMENT: Lien vers profil prestataire au lieu de shops
  providerProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceProvider", // Remplace shopsManaged
  },

  // ✨ CHANGEMENT: Suivre des prestataires au lieu de boutiques
  followingProviders: [
    { type: mongoose.Schema.Types.ObjectId, ref: "ServiceProvider" },
  ], // Remplace followingShops

  // ✨ NOUVEAU: Historique des réservations
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],

  // ✨ NOUVEAU: Préférences de notification
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
  },

  // ✨ NOUVEAU: Statut du compte
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("User", userSchema);

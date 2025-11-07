// ========================================
// IMPORTATIONS
// ========================================
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const morgan = require("morgan");

// Charger les variables d'environnement depuis .env
dotenv.config();

// ========================================
// INITIALISATION DE L'APPLICATION
// ========================================
const app = express();

// ========================================
// MIDDLEWARES GLOBAUX
// ========================================
// Parser le JSON dans les requêtes
app.use(express.json());

// Parser les données de formulaire
app.use(express.urlencoded({ extended: true }));

// Activer CORS (Cross-Origin Resource Sharing)
app.use(cors());

// Logger les requêtes HTTP (utile en développement)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ========================================
// CONNEXION À LA BASE DE DONNÉES
// ========================================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connecté avec succès");
  })
  .catch((error) => {
    console.error("❌ Erreur de connexion MongoDB:", error.message);
    process.exit(1); // Arrêter l'application si la connexion échoue
  });

// ========================================
// ROUTES DE BASE
// ========================================

// Route d'accueil (pour tester que l'API fonctionne)
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🎉 Bienvenue sur l'API La Liste de Sandra",
    version: "1.0.0",
    status: "running",
    routes: {
      auth: "/api/auth",
      services: "/api/services",
      bookings: "/api/bookings",
      providers: "/api/providers",
      categories: "/api/categories",
      admin: "/api/admin",
    },
  });
});

// Route de santé (health check)
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// IMPORTATION ET UTILISATION DES ROUTES
// ========================================

// 1. Routes d'authentification
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// 2. Routes des services
const serviceRoutes = require("./routes/serviceRoutes");
app.use("/api/services", serviceRoutes);

// 3. Routes des réservations
const bookingRoutes = require("./routes/bookingRoutes");
app.use("/api/bookings", bookingRoutes);

// 4. Routes des prestataires
const providerRoutes = require("./routes/providerRoutes");
app.use("/api/providers", providerRoutes);

// 5. Routes des catégories
const categoryRoutes = require("./routes/categoryRoutes");
app.use("/api/categories", categoryRoutes);

// 6. Routes admin
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// ========================================
// GESTION DES ERREURS 404 (Route non trouvée)
// ========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "❌ Route non trouvée",
    path: req.originalUrl,
    method: req.method,
  });
});

// ========================================
// MIDDLEWARE DE GESTION DES ERREURS GLOBALES
// ========================================
app.use((error, req, res, next) => {
  console.error("Erreur capturée:", error);

  // Erreur de validation Mongoose
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({
      success: false,
      message: "Erreur de validation",
      errors,
    });
  }

  // Erreur d'ID invalide
  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "ID invalide",
    });
  }

  // Erreur de duplication (email/phone déjà existant)
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `Ce ${field} existe déjà`,
    });
  }

  // Erreur générique
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Erreur serveur interne",
  });
});

// ========================================
// DÉMARRAGE DU SERVEUR
// ========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("\n" + "=".repeat(50));
  console.log("🚀 SERVEUR DÉMARRÉ");
  console.log("=".repeat(50));
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || "development"}`);
  console.log(`⏰ Démarré à: ${new Date().toLocaleString("fr-FR")}`);
  console.log("=".repeat(50));
  console.log("\n📚 Routes disponibles:");
  console.log(`   ✅ Auth:       http://localhost:${PORT}/api/auth`);
  console.log(`   ✅ Services:   http://localhost:${PORT}/api/services`);
  console.log(`   ✅ Bookings:   http://localhost:${PORT}/api/bookings`);
  console.log(`   ✅ Providers:  http://localhost:${PORT}/api/providers`);
  console.log(`   ✅ Categories: http://localhost:${PORT}/api/categories`);
  console.log(`   ✅ Admin:      http://localhost:${PORT}/api/admin`);
  console.log("\n");
});

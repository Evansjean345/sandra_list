const express = require("express");
const serverless = require("serverless-http");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Charger les variables d'environnement depuis .env
dotenv.config();

//routes
const adminRoutes = require("../routes/adminRoutes");
const authRoutes = require("../routes/authRoutes");
const bookingRoutes = require("../routes/bookingRoutes");
const categoryRoutes = require("../routes/categoryRoutes"); // Corrigé
const providerRoutes = require("../routes/providerRoutes");
const serviceRoutes = require("../routes/serviceRoutes");

// ========================================
// INITIALISATION DE L'APPLICATION
// ========================================
const app = express();

// ========================================
// MIDDLEWARES GLOBAUX
// ========================================

// Configuration CORS
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
};

app.use(cors(corsOptions));

// Parser le JSON dans les requêtes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Body parser (déjà inclus dans express, mais gardé pour compatibilité)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Logger les requêtes HTTP (uniquement si morgan est installé)
if (process.env.NODE_ENV === "development") {
  try {
    const morgan = require("morgan");
    app.use(morgan("dev"));
  } catch (err) {
    console.log("Morgan not installed, skipping HTTP logging");
  }
}

// Variable pour gérer la connexion MongoDB
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb+srv://evansJean:Azerty0987@cluster0.a2k1t6d.mongodb.net/sandra_list?retryWrites=true&w=majority",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      }
    );
    isConnected = true;
    console.log("Database connected");
  } catch (err) {
    console.error("Connection failed:", err.message);
    throw err;
  }
};
// ========================================
// ROUTES
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

// ✅ APRÈS (spécifique)
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/bookings", bookingRoutes);

// ========================================
// GESTION DES ERREURS
// ========================================

// Route 404 - Non trouvé
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route non trouvée",
    path: req.originalUrl,
  });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error("❌ Erreur:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Erreur interne du serveur",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ========================================
// SERVERLESS HANDLER
// ========================================

// Wrapper pour connecter à la DB avant chaque requête
const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();
    return serverless(app)(event, context);
  } catch (err) {
    console.error("Handler error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Erreur de connexion à la base de données",
      }),
    };
  }
};

module.exports.handler = handler;

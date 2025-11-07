const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const ServiceProvider = require("../models/serviceProviderModel");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Inscription d'un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, phone, email, password, role } = req.body;

    // Validation des champs requis
    if (!name || !phone || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs sont obligatoires",
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Un utilisateur avec cet email ou téléphone existe déjà",
      });
    }

    // Valider le rôle
    const validRoles = ["client", "provider", "admin"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Rôle invalide. Choisir: client, provider ou admin",
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = await User.create({
      name,
      phone,
      email,
      password: hashedPassword,
      role: role || "client",
    });

    // Créer le profil prestataire si nécessaire
    if (user.role === "provider") {
      try {
        await ServiceProvider.create({
          user: user._id,
          services: [],
        });
      } catch (providerError) {
        console.error("Erreur création profil prestataire:", providerError);
        // On continue même si la création du profil échoue
        // Le profil pourra être créé plus tard
      }
    }

    // Générer le token
    const token = generateToken(user._id);

    // Retourner les données sans le mot de passe
    const userResponse = {
      _id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      isVerified: user.isVerified,
      token: token,
    };

    res.status(201).json({
      success: true,
      message: "Inscription réussie",
      data: userResponse,
    });
  } catch (error) {
    console.error("Erreur inscription:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'inscription",
      error: error.message,
    });
  }
};
// @desc    Connexion utilisateur
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier si email et password sont fournis
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Veuillez fournir un email et un mot de passe",
      });
    }

    // Trouver l'utilisateur et inclure le mot de passe
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Votre compte a été désactivé. Contactez l'administration.",
      });
    }

    // Vérifier le mot de passe
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    // Retourner les données sans le mot de passe
    const userResponse = {
      _id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      providerProfile: user.providerProfile,
      isVerified: user.isVerified,
      token: generateToken(user._id),
    };

    res.status(200).json({
      success: true,
      message: "Connexion réussie",
      data: userResponse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la connexion",
      error: error.message,
    });
  }
};

// @desc    Obtenir le profil de l'utilisateur connecté
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("providerProfile")
      .populate("followingProviders", "businessName profilePic averageRating"); //à corriger plus tard la version pour popluate mettre serviceprovider

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du profil",
      error: error.message,
    });
  }
};

// @desc    Mettre à jour le profil
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, profilePicture, notifications } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    // Mettre à jour les champs
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (profilePicture) user.profilePicture = profilePicture;
    if (notifications)
      user.notifications = { ...user.notifications, ...notifications };

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profil mis à jour avec succès",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du profil",
      error: error.message,
    });
  }
};

// @desc    Changer le mot de passe
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Veuillez fournir l'ancien et le nouveau mot de passe",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    // Vérifier l'ancien mot de passe
    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Mot de passe actuel incorrect",
      });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Mot de passe changé avec succès",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors du changement de mot de passe",
      error: error.message,
    });
  }
};

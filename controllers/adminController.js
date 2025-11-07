const User = require("../models/user");
const ServiceProvider = require("../models/serviceProviderModel");
const Booking = require("../models/booking");
const Service = require("../models/serviceModel");
const Category = require("../models/category");

// @desc    Obtenir les statistiques globales
// @route   GET /api/admin/stats
// @access  Private (Admin)
exports.getGlobalStats = async (req, res) => {
  try {
    // Compter les utilisateurs par rôle
    const totalUsers = await User.countDocuments();
    const totalClients = await User.countDocuments({ role: "client" });
    const totalProviders = await User.countDocuments({ role: "provider" });
    const totalAdmins = await User.countDocuments({ role: "admin" });

    // Compter les prestataires et services
    const totalServiceProviders = await ServiceProvider.countDocuments();
    const activeProviders = await ServiceProvider.countDocuments({
      isActive: true,
      isSuspended: false,
    });
    const totalServices = await Service.countDocuments();
    const availableServices = await Service.countDocuments({
      isAvailable: true,
    });

    // Compter les réservations par statut
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: "pending" });
    const confirmedBookings = await Booking.countDocuments({
      status: "confirmed",
    });
    const completedBookings = await Booking.countDocuments({
      status: "completed",
    });
    const cancelledBookings = await Booking.countDocuments({
      status: "cancelled",
    });

    // Calculer le revenu total (frais de plateforme)
    const revenueData = await Booking.aggregate([
      { $match: { status: "completed", "payment.status": "paid" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$pricing.platformFee" },
          totalAmount: { $sum: "$pricing.totalAmount" },
        },
      },
    ]);

    const revenue = revenueData[0] || { totalRevenue: 0, totalAmount: 0 };

    // Catégories actives
    const totalCategories = await Category.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          clients: totalClients,
          providers: totalProviders,
          admins: totalAdmins,
        },
        providers: {
          total: totalServiceProviders,
          active: activeProviders,
        },
        services: {
          total: totalServices,
          available: availableServices,
        },
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
        },
        revenue: {
          platformFees: revenue.totalRevenue,
          totalTransactions: revenue.totalAmount,
        },
        categories: totalCategories,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des statistiques",
      error: error.message,
    });
  }
};

// @desc    Obtenir tous les utilisateurs
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const { role, isActive, search, page = 1, limit = 20 } = req.query;

    let filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select("-password")
      .populate("providerProfile", "businessName averageRating")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(skip);

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des utilisateurs",
      error: error.message,
    });
  }
};

// @desc    Suspendre/Activer un utilisateur
// @route   PATCH /api/admin/users/:id/toggle-status
// @access  Private (Admin)
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    // Ne pas permettre de désactiver son propre compte
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas désactiver votre propre compte",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: user.isActive
        ? "Utilisateur activé avec succès"
        : "Utilisateur suspendu avec succès",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la modification du statut",
      error: error.message,
    });
  }
};

// @desc    Vérifier un prestataire
// @route   PATCH /api/admin/providers/:id/verify
// @access  Private (Admin)
exports.verifyProvider = async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Prestataire non trouvé",
      });
    }

    provider.verificationDocuments.isVerified = true;
    await provider.save();

    res.status(200).json({
      success: true,
      message: "Prestataire vérifié avec succès",
      data: provider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la vérification",
      error: error.message,
    });
  }
};

// @desc    Suspendre/Activer un prestataire
// @route   PATCH /api/admin/providers/:id/toggle-suspension
// @access  Private (Admin)
exports.toggleProviderSuspension = async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Prestataire non trouvé",
      });
    }

    provider.isSuspended = !provider.isSuspended;
    await provider.save();

    res.status(200).json({
      success: true,
      message: provider.isSuspended
        ? "Prestataire suspendu avec succès"
        : "Suspension levée avec succès",
      data: provider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la modification",
      error: error.message,
    });
  }
};

// @desc    Changer le type de compte d'un prestataire
// @route   PATCH /api/admin/providers/:id/account-type
// @access  Private (Admin)
exports.updateProviderAccountType = async (req, res) => {
  try {
    const { accountType } = req.body;

    if (!["standard", "premium", "vip"].includes(accountType)) {
      return res.status(400).json({
        success: false,
        message: "Type de compte invalide. Choisir: standard, premium ou vip",
      });
    }

    const provider = await ServiceProvider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Prestataire non trouvé",
      });
    }

    provider.accountType = accountType;
    await provider.save();

    res.status(200).json({
      success: true,
      message: `Compte mis à niveau vers ${accountType}`,
      data: provider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour",
      error: error.message,
    });
  }
};

// @desc    Révéler les coordonnées du client au prestataire
// @route   PATCH /api/admin/bookings/:id/reveal-contact
// @access  Private (Admin)
exports.revealClientContact = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Réservation non trouvée",
      });
    }

    booking.visibility.providerCanSeeContact = true;
    await booking.save();

    res.status(200).json({
      success: true,
      message: "Coordonnées du client révélées au prestataire",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la révélation des coordonnées",
      error: error.message,
    });
  }
};

// @desc    Obtenir les services les plus populaires
// @route   GET /api/admin/stats/popular-services
// @access  Private (Admin)
exports.getPopularServices = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const popularServices = await Service.find({ isAvailable: true })
      .sort({ bookingCount: -1, averageRating: -1 })
      .limit(Number(limit))
      .populate("provider", "businessName location");

    res.status(200).json({
      success: true,
      count: popularServices.length,
      data: popularServices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération",
      error: error.message,
    });
  }
};

// @desc    Obtenir les prestataires les mieux notés
// @route   GET /api/admin/stats/top-providers
// @access  Private (Admin)
exports.getTopProviders = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topProviders = await ServiceProvider.find({
      isActive: true,
      isSuspended: false,
    })
      .sort({ averageRating: -1, completedBookings: -1 })
      .limit(Number(limit))
      .select("-ratings -verificationDocuments");

    res.status(200).json({
      success: true,
      count: topProviders.length,
      data: topProviders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération",
      error: error.message,
    });
  }
};

// @desc    Obtenir les revenus par période
// @route   GET /api/admin/stats/revenue
// @access  Private (Admin)
exports.getRevenueStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let matchFilter = {
      status: "completed",
      "payment.status": "paid",
    };

    if (startDate && endDate) {
      matchFilter.completedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const revenueByMonth = await Booking.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: "$completedAt" },
            month: { $month: "$completedAt" },
          },
          totalRevenue: { $sum: "$pricing.platformFee" },
          totalAmount: { $sum: "$pricing.totalAmount" },
          bookingsCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: revenueByMonth,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des revenus",
      error: error.message,
    });
  }
};

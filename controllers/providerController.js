const ServiceProvider = require("../models/serviceProviderModel");
const User = require("../models/user");

// @desc    Créer un profil prestataire
// @route   POST /api/providers
// @access  Private

exports.createProvider = async (req, res) => {
  try {
    if (req.user.providerProfile) {
      return res.status(400).json({
        success: false,
        message: "Vous avez déjà un profil prestataire",
      });
    }

    const {
      businessName,
      description,
      serviceCategories,
      availability,
      serviceType,
      location,
      phoneNumber,
      whatsappNumber,
      email,
      socialMediaLinks,
    } = req.body;

    // ✅ Gestion intelligente de serviceCategories
    let categoriesArray = [];
    if (typeof serviceCategories === "string") {
      categoriesArray = serviceCategories.split(",").map((c) => c.trim());
    } else if (Array.isArray(serviceCategories)) {
      categoriesArray = serviceCategories;
    }

    // ✅ Images depuis Cloudinary
    const profilePic = req.files?.profilePic?.[0]?.path || null;
    const bannerPic = req.files?.bannerPic?.[0]?.path || null;

    // ✅ Création du prestataire
    const provider = await ServiceProvider.create({
      businessName,
      description,
      owner: req.user._id,
      serviceCategories: categoriesArray,
      availability: availability ? JSON.parse(availability) : {},
      serviceType,
      location: location ? JSON.parse(location) : {},
      phoneNumber,
      whatsappNumber,
      email,
      socialMediaLinks: socialMediaLinks ? JSON.parse(socialMediaLinks) : {},
      profilePic,
      bannerPic,
    });

    await User.findByIdAndUpdate(req.user._id, {
      role: "provider",
      providerProfile: provider._id,
    });

    res.status(201).json({
      success: true,
      message: "Profil prestataire créé avec succès",
      data: provider,
    });
  } catch (error) {
    console.error("❌ Erreur création provider :", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création du profil prestataire",
      error: error.message,
    });
  }
};

// @desc    Obtenir tous les prestataires
// @route   GET /api/providers
// @access  Public
exports.getAllProviders = async (req, res) => {
  try {
    const {
      category,
      city,
      serviceType,
      minRating,
      search,
      sort,
      page = 1,
      limit = 20,
    } = req.query;

    let filter = { isActive: true, isSuspended: false };

    if (category) filter.serviceCategories = category;
    if (serviceType) filter.serviceType = { $in: [serviceType, "both"] };
    if (minRating) filter.averageRating = { $gte: Number(minRating) };
    if (city) filter["location.city"] = { $regex: city, $options: "i" };

    // Recherche par mot-clé
    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Options de tri
    let sortOption = {};
    if (sort === "rating") sortOption = { averageRating: -1 };
    else if (sort === "bookings") sortOption = { completedBookings: -1 };
    else sortOption = { createdAt: -1 };

    const skip = (page - 1) * limit;

    const providers = await ServiceProvider.find(filter)
      .select("-ratings -verificationDocuments")
      .populate("services", "title pricing imageUrls")
      .sort(sortOption)
      .limit(Number(limit))
      .skip(skip);

    const total = await ServiceProvider.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: providers.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: providers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des prestataires",
      error: error.message,
    });
  }
};

// @desc    Obtenir un prestataire par ID
// @route   GET /api/providers/:id
// @access  Public
exports.getProviderById = async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id)
      .populate("services")
      .populate("ratings.user", "name profilePicture");

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Prestataire non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      data: provider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du prestataire",
      error: error.message,
    });
  }
};

// @desc    Mettre à jour le profil prestataire
// @route   PUT /api/providers/:id
// @access  Private (Provider/Admin)
exports.updateProvider = async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Prestataire non trouvé",
      });
    }

    // Vérifier les permissions
    if (
      provider.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Non autorisé à modifier ce profil",
      });
    }

    const updatedProvider = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Profil mis à jour avec succès",
      data: updatedProvider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du profil",
      error: error.message,
    });
  }
};

// @desc    Suivre/Ne plus suivre un prestataire
// @route   POST /api/providers/:id/follow
// @access  Private
exports.toggleFollowProvider = async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Prestataire non trouvé",
      });
    }

    const user = await User.findById(req.user._id);

    // Vérifier si déjà suivi
    const isFollowing = user.followingProviders.includes(provider._id);

    if (isFollowing) {
      // Ne plus suivre
      user.followingProviders = user.followingProviders.filter(
        (id) => id.toString() !== provider._id.toString()
      );
      provider.followers = provider.followers.filter(
        (id) => id.toString() !== user._id.toString()
      );
    } else {
      // Suivre
      user.followingProviders.push(provider._id);
      provider.followers.push(user._id);
    }

    await user.save();
    await provider.save();

    res.status(200).json({
      success: true,
      message: isFollowing
        ? "Vous ne suivez plus ce prestataire"
        : "Vous suivez maintenant ce prestataire",
      isFollowing: !isFollowing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'action",
      error: error.message,
    });
  }
};

// @route   GET /api/providers/my-profile
// @access  Private (Provider)
exports.getMyProviderProfile = async (req, res) => {
  try {
    if (!req.user.providerProfile) {
      return res.status(404).json({
        success: false,
        message: "Vous n'avez pas de profil prestataire",
      });
    }

    const provider = await ServiceProvider.findById(req.user.providerProfile)
      .populate("services")
      .populate("followers", "name email");

    res.status(200).json({
      success: true,
      data: provider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du profil",
      error: error.message,
    });
  }
};

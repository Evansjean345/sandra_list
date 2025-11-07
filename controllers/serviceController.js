const Service = require("../models/serviceModel");
const ServiceProvider = require("../models/serviceProviderModel");

// @desc    Obtenir tous les services (avec filtres optionnels)
// @route   GET /api/services
// @access  Public
// ========================================
// @desc    Obtenir tous les services (avec filtres optionnels)
// @route   GET /api/services
// @access  Public
exports.getAllServices = async (req, res) => {
  try {
    // Récupérer les paramètres de requête
    const {
      category,
      subCategory, // 🆕 récupère la sous-catégorie
      city,
      minPrice,
      maxPrice,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    // Construire le filtre
    let filter = { isAvailable: true };

    // Filtrer par catégorie
    if (category) {
      filter.category = category;
    }

    // 🆕 Filtrer par sous-catégorie
    if (subCategory) {
      filter.subCategory = subCategory;
    }

    // Filtrer par recherche (titre ou description)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Filtrer par prix
    if (minPrice || maxPrice) {
      filter["pricing.basePrice"] = {};
      if (minPrice) filter["pricing.basePrice"].$gte = Number(minPrice);
      if (maxPrice) filter["pricing.basePrice"].$lte = Number(maxPrice);
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Récupérer les services
    const services = await Service.find(filter)
      .populate("provider", "businessName location phoneNumber averageRating")
      .limit(Number(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    // Filtrer par ville (si spécifié)
    let filteredServices = services;
    if (city) {
      filteredServices = services.filter(
        (service) =>
          service.provider &&
          service.provider.location.city.toLowerCase() === city.toLowerCase()
      );
    }

    // Compter le total
    const total = await Service.countDocuments(filter);

    // Réponse
    res.status(200).json({
      success: true,
      count: filteredServices.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: filteredServices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des services",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Obtenir un service par ID
// @route   GET /api/services/:id
// @access  Public
// ========================================
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate(
      "provider",
      "businessName location phoneNumber averageRating serviceType"
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service non trouvé",
      });
    }

    // Incrémenter le compteur de vues
    service.viewCount += 1;
    await service.save();

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du service",
      error: error.message,
    });
  }
};

exports.createService = async (req, res) => {
  try {
    // Vérifier que l'utilisateur a un profil prestataire
    if (!req.user.providerProfile) {
      return res.status(403).json({
        success: false,
        message: "Vous devez avoir un profil prestataire pour créer un service",
      });
    }

    const {
      title,
      category,
      subCategory,
      description,
      pricing,
      estimatedDuration,
      tags,
      requirements,
      additionalOptions,
    } = req.body;

    // 🖼️ Récupération de l'URL Cloudinary
    let imageUrls = [];
    if (req.file && req.file.path) {
      imageUrls = [req.file.path]; // Cloudinary renvoie `path` = URL sécurisée
    }

    // Création du service
    const service = await Service.create({
      title,
      category,
      subCategory,
      description,
      pricing: pricing ? JSON.parse(pricing) : {},
      estimatedDuration: estimatedDuration ? JSON.parse(estimatedDuration) : {},
      tags: tags ? JSON.parse(tags) : [],
      requirements: requirements ? JSON.parse(requirements) : [],
      additionalOptions: additionalOptions ? JSON.parse(additionalOptions) : [],
      imageUrls,
      provider: req.user.providerProfile,
    });

    // Ajout au profil du prestataire
    await ServiceProvider.findByIdAndUpdate(req.user.providerProfile, {
      $push: { services: service._id },
    });

    res.status(201).json({
      success: true,
      message: "Service créé avec succès",
      data: service,
    });
  } catch (error) {
    console.error("Erreur création service:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création du service",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Mettre à jour un service
// @route   PUT /api/services/:id
// @access  Private (Provider/Admin)
// ========================================
exports.updateService = async (req, res) => {
  try {
    // Trouver le service
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service non trouvé",
      });
    }

    // Vérifier les permissions (propriétaire ou admin)
    const isOwner =
      service.provider.toString() === req.user.providerProfile?.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Non autorisé à modifier ce service",
      });
    }

    // Mettre à jour le service
    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Service mis à jour avec succès",
      data: updatedService,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du service",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Supprimer un service
// @route   DELETE /api/services/:id
// @access  Private (Provider/Admin)
// ========================================
exports.deleteService = async (req, res) => {
  try {
    // Trouver le service
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service non trouvé",
      });
    }

    // Vérifier les permissions
    const isOwner =
      service.provider.toString() === req.user.providerProfile?.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Non autorisé à supprimer ce service",
      });
    }

    // Retirer le service du profil du prestataire
    await ServiceProvider.findByIdAndUpdate(service.provider, {
      $pull: { services: service._id },
    });

    // Supprimer le service
    await service.deleteOne();

    res.status(200).json({
      success: true,
      message: "Service supprimé avec succès",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du service",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Obtenir les services d'un prestataire
// @route   GET /api/services/provider/:providerId
// @access  Public
// ========================================
exports.getServicesByProvider = async (req, res) => {
  try {
    const services = await Service.find({
      provider: req.params.providerId,
      isAvailable: true,
    });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des services",
      error: error.message,
    });
  }
};

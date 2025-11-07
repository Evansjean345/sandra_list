const Booking = require("../models/booking");
const Service = require("../models/serviceModel");
const ServiceProvider = require("../models/serviceProviderModel");
const User = require("../models/user");

// @desc    Créer une réservation
// @route   POST /api/bookings
// @access  Private (Client)
exports.createBooking = async (req, res) => {
  try {
    const {
      services,
      scheduledDate,
      scheduledTime,
      serviceLocation,
      clientNotes,
      paymentMethod,
    } = req.body;

    // Validation : Vérifier que des services sont fournis
    if (!services || services.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Veuillez sélectionner au moins un service",
      });
    }

    // Validation : Date et heure
    if (!scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "Veuillez fournir une date et une heure de rendez-vous",
      });
    }

    // Validation : Lieu de prestation
    if (!serviceLocation || !serviceLocation.type) {
      return res.status(400).json({
        success: false,
        message: "Veuillez spécifier le lieu de la prestation",
      });
    }

    // Récupérer les informations des services
    const serviceIds = services.map((s) => s.service);
    const serviceDetails = await Service.find({
      _id: { $in: serviceIds },
      isAvailable: true,
    }).populate("provider");

    if (serviceDetails.length !== services.length) {
      return res.status(404).json({
        success: false,
        message: "Un ou plusieurs services sont introuvables ou indisponibles",
      });
    }

    // Vérifier que tous les services appartiennent au même prestataire
    const providerId = serviceDetails[0].provider._id;
    const allSameProvider = serviceDetails.every(
      (s) => s.provider._id.toString() === providerId.toString()
    );

    if (!allSameProvider) {
      return res.status(400).json({
        success: false,
        message: "Tous les services doivent appartenir au même prestataire",
      });
    }

    // Vérifier que le prestataire est actif
    const provider = await ServiceProvider.findById(providerId);
    if (!provider.isActive || provider.isSuspended) {
      return res.status(400).json({
        success: false,
        message: "Ce prestataire n'est pas disponible actuellement",
      });
    }

    // Calculer le montant total
    let serviceTotal = 0;
    const servicesWithPrices = services.map((s) => {
      const serviceDetail = serviceDetails.find(
        (sd) => sd._id.toString() === s.service
      );

      // Prix de base (avec réduction si applicable)
      let itemTotal =
        serviceDetail.discount?.hasDiscount &&
        serviceDetail.discount?.discountedPrice
          ? serviceDetail.discount.discountedPrice
          : serviceDetail.pricing.basePrice;

      itemTotal *= s.quantity || 1;

      // Ajouter les options supplémentaires
      if (s.selectedOptions && s.selectedOptions.length > 0) {
        const optionsTotal = s.selectedOptions.reduce(
          (sum, opt) => sum + (opt.price || 0),
          0
        );
        itemTotal += optionsTotal;
      }

      serviceTotal += itemTotal;

      return {
        service: s.service,
        quantity: s.quantity || 1,
        price: itemTotal,
        selectedOptions: s.selectedOptions || [],
      };
    });

    // Calculer les frais de plateforme (10%)
    const platformFee = Math.round(serviceTotal * 0.1);
    const totalAmount = serviceTotal + platformFee;

    // Créer la réservation
    const booking = await Booking.create({
      client: req.user._id,
      contactInfo: {
        name: req.user.name,
        phone: req.user.phone,
        email: req.user.email,
      },
      provider: providerId,
      services: servicesWithPrices,
      scheduledDate,
      scheduledTime,
      serviceLocation,
      clientNotes,
      pricing: {
        serviceTotal,
        platformFee,
        totalAmount,
      },
      payment: {
        method: paymentMethod,
        status: "pending",
      },
    });

    // Ajouter la réservation à l'utilisateur
    await User.findByIdAndUpdate(req.user._id, {
      $push: { bookings: booking._id },
    });

    // Incrémenter les compteurs de réservation pour chaque service
    for (const serviceId of serviceIds) {
      await Service.findByIdAndUpdate(serviceId, {
        $inc: { bookingCount: 1 },
      });
    }

    // Populate pour la réponse
    await booking.populate(
      "provider",
      "businessName phoneNumber location averageRating"
    );
    await booking.populate("services.service", "title imageUrls pricing");

    res.status(201).json({
      success: true,
      message:
        "Réservation créée avec succès. En attente de confirmation de l'administrateur.",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création de la réservation",
      error: error.message,
    });
  }
};

// @desc    Obtenir toutes les réservations (Admin uniquement)
// @route   GET /api/bookings/all
// @access  Private (Admin)
exports.getAllBookings = async (req, res) => {
  try {
    const { status, provider, client, page = 1, limit = 20 } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (provider) filter.provider = provider;
    if (client) filter.client = client;

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(filter)
      .populate("client", "name phone email profilePicture")
      .populate("provider", "businessName phoneNumber location")
      .populate("services.service", "title imageUrls")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(skip);

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des réservations",
      error: error.message,
    });
  }
};

// @desc    Obtenir mes réservations (Client)
// @route   GET /api/bookings/my-bookings
// @access  Private (Client)
exports.getMyBookings = async (req, res) => {
  try {
    const { status } = req.query;

    let filter = { client: req.user._id };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate(
        "provider",
        "businessName phoneNumber location profilePic averageRating serviceType"
      )
      .populate("services.service", "title imageUrls pricing")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de vos réservations",
      error: error.message,
    });
  }
};

// @desc    Obtenir les réservations d'un prestataire
// @route   GET /api/bookings/provider-bookings
// @access  Private (Provider)
exports.getProviderBookings = async (req, res) => {
  try {
    if (!req.user.providerProfile) {
      return res.status(403).json({
        success: false,
        message:
          "Vous devez être un prestataire pour accéder à cette ressource",
      });
    }

    const { status } = req.query;

    let filter = { provider: req.user.providerProfile };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate("services.service", "title imageUrls pricing")
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    // Masquer les informations de contact si non autorisé
    const sanitizedBookings = bookings.map((booking) => {
      const bookingObj = booking.toObject();

      // Si le prestataire n'a pas l'autorisation de voir le contact
      if (!booking.visibility.providerCanSeeContact) {
        bookingObj.contactInfo = {
          name: "Client #" + booking.bookingNumber.slice(-4),
          phone: "***********",
          email: "***********",
        };
        // Ne pas exposer le client ID
        delete bookingObj.client;
      }

      return bookingObj;
    });

    res.status(200).json({
      success: true,
      count: sanitizedBookings.length,
      data: sanitizedBookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des réservations",
      error: error.message,
    });
  }
};

// @desc    Obtenir une réservation par ID
// @route   GET /api/bookings/:id
// @access  Private
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("client", "name phone email profilePicture")
      .populate(
        "provider",
        "businessName phoneNumber location profilePic averageRating"
      )
      .populate(
        "services.service",
        "title imageUrls pricing estimatedDuration"
      );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Réservation non trouvée",
      });
    }

    // Vérifier les permissions
    const isClient = booking.client._id.toString() === req.user._id.toString();
    const isProvider =
      req.user.providerProfile &&
      booking.provider._id.toString() === req.user.providerProfile.toString();
    const isAdmin = req.user.role === "admin";

    if (!isClient && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Non autorisé à voir cette réservation",
      });
    }

    // Convertir en objet pour pouvoir le modifier
    const bookingObj = booking.toObject();

    // Masquer contact si prestataire sans autorisation
    if (isProvider && !booking.visibility.providerCanSeeContact) {
      bookingObj.contactInfo = {
        name: "Client #" + booking.bookingNumber.slice(-4),
        phone: "***********",
        email: "***********",
      };
      delete bookingObj.client;
    }

    res.status(200).json({
      success: true,
      data: bookingObj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la réservation",
      error: error.message,
    });
  }
};

// @desc    Mettre à jour le statut d'une réservation (Admin)
// @route   PATCH /api/bookings/:id/status
// @access  Private (Admin)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    // Validation du statut
    const validStatuses = [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
      "no_show",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Choisir parmi: ${validStatuses.join(", ")}`,
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Réservation non trouvée",
      });
    }

    // Vérifier les transitions de statut valides
    const currentStatus = booking.status;

    // Ne pas permettre de modifier une réservation déjà complétée
    if (currentStatus === "completed" && status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Impossible de modifier une réservation terminée",
      });
    }

    // Mettre à jour le statut avec historique
    booking.updateStatus(status, req.user._id, note || "");

    // Si le statut passe à "completed", incrémenter le compteur du prestataire
    if (status === "completed" && currentStatus !== "completed") {
      await ServiceProvider.findByIdAndUpdate(booking.provider, {
        $inc: { completedBookings: 1 },
      });
    }

    await booking.save();

    // Populate pour la réponse
    await booking.populate("provider", "businessName");
    await booking.populate("client", "name email");

    res.status(200).json({
      success: true,
      message: `Statut mis à jour vers "${status}" avec succès`,
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du statut",
      error: error.message,
    });
  }
};

// @desc    Annuler une réservation
// @route   PATCH /api/bookings/:id/cancel
// @access  Private (Client)
exports.cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Réservation non trouvée",
      });
    }

    // Vérifier que c'est le client
    if (booking.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Non autorisé à annuler cette réservation",
      });
    }

    // Vérifier le statut actuel
    if (["completed", "cancelled"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Cette réservation ne peut pas être annulée (déjà terminée ou annulée)",
      });
    }

    // Vérifier si la réservation est en cours
    if (booking.status === "in_progress") {
      return res.status(400).json({
        success: false,
        message:
          "Impossible d'annuler une réservation en cours. Contactez l'administrateur.",
      });
    }

    // Annuler la réservation
    const cancelNote = reason
      ? `Annulée par le client. Raison: ${reason}`
      : "Annulée par le client";

    booking.updateStatus("cancelled", req.user._id, cancelNote);
    await booking.save();

    res.status(200).json({
      success: true,
      message: "Réservation annulée avec succès",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'annulation de la réservation",
      error: error.message,
    });
  }
};

// @desc    Annuler une réservation
// @route   PATCH /api/bookings/:id/cancel
// @access  Private (Client)
exports.cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Réservation non trouvée",
      });
    }

    // Vérifier que c'est le client
    if (booking.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Non autorisé à annuler cette réservation",
      });
    }

    // Vérifier le statut actuel
    if (["completed", "cancelled"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Cette réservation ne peut pas être annulée (déjà terminée ou annulée)",
      });
    }

    // Vérifier si la réservation est en cours
    if (booking.status === "in_progress") {
      return res.status(400).json({
        success: false,
        message:
          "Impossible d'annuler une réservation en cours. Contactez l'administrateur.",
      });
    }

    // Annuler la réservation
    const cancelNote = reason
      ? `Annulée par le client. Raison: ${reason}`
      : "Annulée par le client";

    booking.updateStatus("cancelled", req.user._id, cancelNote);
    await booking.save();

    res.status(200).json({
      success: true,
      message: "Réservation annulée avec succès",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'annulation de la réservation",
      error: error.message,
    });
  }
};

// @desc    Évaluer une réservation (Client)
// @route   POST /api/bookings/:id/rate
// @access  Private (Client)
exports.rateBooking = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    // Validation de la note
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "La note doit être entre 1 et 5",
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Réservation non trouvée",
      });
    }

    // Vérifier que c'est le client
    if (booking.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Non autorisé à évaluer cette réservation",
      });
    }

    // Vérifier que la réservation est terminée
    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez évaluer qu'une réservation terminée",
      });
    }

    // Vérifier si déjà évalué
    if (booking.rating.clientRating) {
      return res.status(400).json({
        success: false,
        message: "Vous avez déjà évalué cette réservation",
      });
    }

    // Ajouter l'évaluation à la réservation
    booking.rating.clientRating = {
      rating,
      comment: comment || "",
      ratedAt: Date.now(),
    };

    await booking.save();

    // Ajouter l'évaluation au prestataire
    const provider = await ServiceProvider.findById(booking.provider);

    provider.ratings.push({
      user: req.user._id,
      booking: booking._id,
      rating,
      comment: comment || "",
      createdAt: Date.now(),
    });

    // Recalculer la moyenne des notes
    provider.updateRatings();
    await provider.save();

    // Ajouter l'évaluation à chaque service réservé
    for (const serviceItem of booking.services) {
      const service = await Service.findById(serviceItem.service);
      if (service) {
        service.ratings.push({
          user: req.user._id,
          rating,
          comment: comment || "",
          createdAt: Date.now(),
        });
        service.updateAverageRating();
        await service.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Évaluation ajoutée avec succès",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'évaluation",
      error: error.message,
    });
  }
};

// @desc    Obtenir les statistiques de réservations (Admin)
// @route   GET /api/bookings/stats
// @access  Private (Admin)
exports.getBookingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let matchFilter = {};

    if (startDate && endDate) {
      matchFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Statistiques par statut
    const statusStats = await Booking.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$pricing.totalAmount" },
        },
      },
    ]);

    // Réservations par jour
    const bookingsByDay = await Booking.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
      { $limit: 30 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusStats,
        bookingsByDay,
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

const Category = require("../models/category");

// @desc    Obtenir toutes les catégories
// @route   GET /api/categories
// @access  Public
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      displayOrder: 1,
      name: 1,
    });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des catégories",
      error: error.message,
    });
  }
};

// @desc    Obtenir une catégorie par ID
// @route   GET /api/categories/:id
// @access  Public
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Catégorie non trouvée",
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la catégorie",
      error: error.message,
    });
  }
};

// @desc    Créer une catégorie (Admin uniquement)
// @route   POST /api/categories
// @access  Private (Admin)
exports.createCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      icon,
      imageUrl,
      subCategories,
      displayOrder,
      tags,
    } = req.body;

    // Vérifier si la catégorie existe déjà
    const existingCategory = await Category.findOne({ name });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Cette catégorie existe déjà",
      });
    }

    const category = await Category.create({
      name,
      description,
      icon,
      imageUrl,
      subCategories,
      displayOrder,
      tags,
    });

    res.status(201).json({
      success: true,
      message: "Catégorie créée avec succès",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création de la catégorie",
      error: error.message,
    });
  }
};

// @desc    Mettre à jour une catégorie (Admin uniquement)
// @route   PUT /api/categories/:id
// @access  Private (Admin)
exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Catégorie non trouvée",
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Catégorie mise à jour avec succès",
      data: updatedCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour de la catégorie",
      error: error.message,
    });
  }
};

// @desc    Supprimer une catégorie (Admin uniquement)
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Catégorie non trouvée",
      });
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: "Catégorie supprimée avec succès",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de la catégorie",
      error: error.message,
    });
  }
};

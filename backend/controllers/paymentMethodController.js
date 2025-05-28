const PaymentMethod = require('../models/PaymentMethod');
const Patient = require('../models/Patient');
const logger = require('../config/logger');

// @desc    Get all payment methods for patient
// @route   GET /api/payment-methods
// @access  Private/Patient
exports.getPaymentMethods = async (req, res) => {
  try {
    logger.info(`Récupération des méthodes de paiement pour l'utilisateur ${req.user._id}`);

    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });

    if (!patient) {
      logger.warn(`Profil patient non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }

    // Get all payment methods for the patient
    const paymentMethods = await PaymentMethod.find({ patient: patient._id })
      .sort({ isDefault: -1, createdAt: -1 });

    logger.info(`${paymentMethods.length} méthodes de paiement récupérées pour l'utilisateur ${req.user._id}`);
    res.json(paymentMethods);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des méthodes de paiement: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a new payment method
// @route   POST /api/payment-methods
// @access  Private/Patient
exports.addPaymentMethod = async (req, res) => {
  try {
    logger.info(`Ajout d'une nouvelle méthode de paiement pour l'utilisateur ${req.user._id}`);

    const {
      name,
      type,
      cardholderName,
      lastFourDigits,
      expiryMonth,
      expiryYear,
      billingAddress,
      isDefault
    } = req.body;

    // Validate the necessary fields based on type
    if (!type) {
      return res.status(400).json({ message: 'Le type de méthode de paiement est requis' });
    }

    if (type === 'card') {
      if (!cardholderName || !lastFourDigits || !expiryMonth || !expiryYear) {
        return res.status(400).json({ message: 'Les détails de la carte sont incomplets' });
      }

      // Validate last four digits
      if (!/^\d{4}$/.test(lastFourDigits)) {
        return res.status(400).json({ message: 'Les 4 derniers chiffres de la carte doivent être au format numérique' });
      }

      // Validate expiry date
      const currentYear = new Date().getFullYear() % 100; // Get last two digits of current year
      const month = parseInt(expiryMonth, 10);
      const year = parseInt(expiryYear, 10);
      
      if (month < 1 || month > 12) {
        return res.status(400).json({ message: 'Le mois d\'expiration doit être entre 1 et 12' });
      }
      
      if (year < currentYear || (year === currentYear && month < new Date().getMonth() + 1)) {
        return res.status(400).json({ message: 'La date d\'expiration est dépassée' });
      }
    }

    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });

    if (!patient) {
      logger.warn(`Profil patient non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }

    // If set as default, remove default from other payment methods
    if (isDefault) {
      await PaymentMethod.updateMany(
        { patient: patient._id, isDefault: true },
        { isDefault: false }
      );
    }

    // Create a new payment method
    const paymentMethod = new PaymentMethod({
      patient: patient._id,
      name: name || `Carte se terminant par ${lastFourDigits}`,
      type,
      cardholderName,
      lastFourDigits,
      expiryMonth,
      expiryYear,
      billingAddress,
      isDefault: isDefault || false
    });

    const savedPaymentMethod = await paymentMethod.save();
    logger.info(`Nouvelle méthode de paiement ajoutée pour l'utilisateur ${req.user._id}`);

    res.status(201).json(savedPaymentMethod);
  } catch (error) {
    logger.error(`Erreur lors de l'ajout d'une méthode de paiement: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a payment method
// @route   PUT /api/payment-methods/:id
// @access  Private/Patient
exports.updatePaymentMethod = async (req, res) => {
  try {
    const paymentMethodId = req.params.id;
    logger.info(`Mise à jour de la méthode de paiement ${paymentMethodId} pour l'utilisateur ${req.user._id}`);

    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });

    if (!patient) {
      logger.warn(`Profil patient non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }

    // Find the payment method
    const paymentMethod = await PaymentMethod.findById(paymentMethodId);

    if (!paymentMethod) {
      logger.warn(`Méthode de paiement ${paymentMethodId} non trouvée`);
      return res.status(404).json({ message: 'Méthode de paiement non trouvée' });
    }

    // Verify ownership
    if (paymentMethod.patient.toString() !== patient._id.toString()) {
      logger.warn(`L'utilisateur ${req.user._id} n'est pas autorisé à modifier cette méthode de paiement`);
      return res.status(403).json({ message: 'Non autorisé' });
    }

    // Update fields
    const updatableFields = [
      'name',
      'cardholderName',
      'expiryMonth',
      'expiryYear',
      'billingAddress',
      'isDefault'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        paymentMethod[field] = req.body[field];
      }
    });

    // If set as default, remove default from other payment methods
    if (req.body.isDefault === true) {
      await PaymentMethod.updateMany(
        { 
          patient: patient._id, 
          isDefault: true,
          _id: { $ne: paymentMethodId }
        },
        { isDefault: false }
      );
    }

    const updatedPaymentMethod = await paymentMethod.save();
    logger.info(`Méthode de paiement ${paymentMethodId} mise à jour pour l'utilisateur ${req.user._id}`);

    res.json(updatedPaymentMethod);
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour de la méthode de paiement: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set a payment method as default
// @route   PUT /api/payment-methods/:id/default
// @access  Private/Patient
exports.setDefaultPaymentMethod = async (req, res) => {
  try {
    const paymentMethodId = req.params.id;
    logger.info(`Définition de la méthode de paiement ${paymentMethodId} comme défaut pour l'utilisateur ${req.user._id}`);

    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });

    if (!patient) {
      logger.warn(`Profil patient non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }

    // Find the payment method
    const paymentMethod = await PaymentMethod.findById(paymentMethodId);

    if (!paymentMethod) {
      logger.warn(`Méthode de paiement ${paymentMethodId} non trouvée`);
      return res.status(404).json({ message: 'Méthode de paiement non trouvée' });
    }

    // Verify ownership
    if (paymentMethod.patient.toString() !== patient._id.toString()) {
      logger.warn(`L'utilisateur ${req.user._id} n'est pas autorisé à modifier cette méthode de paiement`);
      return res.status(403).json({ message: 'Non autorisé' });
    }

    // Remove default from all payment methods for this patient
    await PaymentMethod.updateMany(
      { patient: patient._id },
      { isDefault: false }
    );

    // Set this payment method as default
    paymentMethod.isDefault = true;
    const updatedPaymentMethod = await paymentMethod.save();

    logger.info(`Méthode de paiement ${paymentMethodId} définie comme défaut pour l'utilisateur ${req.user._id}`);
    res.json(updatedPaymentMethod);
  } catch (error) {
    logger.error(`Erreur lors de la définition de la méthode de paiement par défaut: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a payment method
// @route   DELETE /api/payment-methods/:id
// @access  Private/Patient
exports.deletePaymentMethod = async (req, res) => {
  try {
    const paymentMethodId = req.params.id;
    logger.info(`Suppression de la méthode de paiement ${paymentMethodId} pour l'utilisateur ${req.user._id}`);

    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });

    if (!patient) {
      logger.warn(`Profil patient non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }

    // Find the payment method
    const paymentMethod = await PaymentMethod.findById(paymentMethodId);

    if (!paymentMethod) {
      logger.warn(`Méthode de paiement ${paymentMethodId} non trouvée`);
      return res.status(404).json({ message: 'Méthode de paiement non trouvée' });
    }

    // Verify ownership
    if (paymentMethod.patient.toString() !== patient._id.toString()) {
      logger.warn(`L'utilisateur ${req.user._id} n'est pas autorisé à supprimer cette méthode de paiement`);
      return res.status(403).json({ message: 'Non autorisé' });
    }

    // Check if it's the default payment method
    if (paymentMethod.isDefault) {
      // Find another payment method to set as default
      const otherPaymentMethod = await PaymentMethod.findOne({
        patient: patient._id,
        _id: { $ne: paymentMethodId }
      });

      if (otherPaymentMethod) {
        otherPaymentMethod.isDefault = true;
        await otherPaymentMethod.save();
      }
    }

    // Delete the payment method
    await paymentMethod.deleteOne();

    logger.info(`Méthode de paiement ${paymentMethodId} supprimée pour l'utilisateur ${req.user._id}`);
    res.json({ message: 'Méthode de paiement supprimée' });
  } catch (error) {
    logger.error(`Erreur lors de la suppression de la méthode de paiement: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
}; 
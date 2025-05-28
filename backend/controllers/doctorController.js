const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Specialization = require('../models/Specialization');
const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');
const logger = require('../config/logger');

// @desc    Obtenir tous les médecins
// @route   GET /api/doctors
// @access  Public
exports.getAllDoctors = async (req, res) => {
  try {
    logger.info('Récupération de tous les médecins');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let query = { verified: true };
    
    // Filtrer par spécialisation
    if (req.query.specialization) {
      query.specialization = req.query.specialization;
    }
    
    // Recherche par nom
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { full_name: searchRegex },
        { first_name: searchRegex },
        { last_name: searchRegex }
      ];
    }
    
    // Filtrer par tarif
    if (req.query.minPrice) {
      query.price = { $gte: parseInt(req.query.minPrice) };
    }
    if (req.query.maxPrice) {
      if (query.price) {
        query.price.$lte = parseInt(req.query.maxPrice);
      } else {
        query.price = { $lte: parseInt(req.query.maxPrice) };
      }
    }
    
    // Filtrer par expérience
    if (req.query.minExperience) {
      query.experience = { $gte: parseInt(req.query.minExperience) };
    }
    
    // Trier par note, prix ou expérience
    let sortOption = {};
    if (req.query.sort === 'price-asc') {
      sortOption = { price: 1 };
    } else if (req.query.sort === 'price-desc') {
      sortOption = { price: -1 };
    } else if (req.query.sort === 'experience-desc') {
      sortOption = { experience: -1 };
    } else if (req.query.sort === 'rating-desc') {
      sortOption = { averageRating: -1 };
    } else {
      sortOption = { createdAt: -1 }; // Par défaut : les plus récents d'abord
    }
    
    const doctors = await Doctor.find(query)
      .populate('specialization')
      .populate('user', 'fullName email')
      .skip(skip)
      .limit(limit)
      .sort(sortOption);
    
    const total = await Doctor.countDocuments(query);
    
    logger.info(`${doctors.length} médecins récupérés`);
    
    res.json({
      doctors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des médecins: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir un médecin par ID
// @route   GET /api/doctors/:id
// @access  Public
exports.getDoctorById = async (req, res) => {
  try {
    logger.info(`Récupération du médecin avec l'ID ${req.params.id}`);
    
    const doctor = await Doctor.findById(req.params.id)
      .populate('specialization')
      .populate('user', 'fullName email');
    
    if (!doctor) {
      logger.warn(`Médecin avec l'ID ${req.params.id} non trouvé`);
      return res.status(404).json({ message: 'Médecin non trouvé' });
    }
    
    // Si le médecin n'est pas vérifié et que l'utilisateur n'est pas admin
    if (!doctor.verified && (!req.user || req.user.role !== 'Admin')) {
      logger.warn(`Tentative d'accès à un médecin non vérifié ${req.params.id}`);
      return res.status(404).json({ message: 'Médecin non trouvé' });
    }

    // Calculate average rating
    const averageRating = doctor.ratings && doctor.ratings.length > 0 
      ? doctor.ratings.reduce((sum, rating) => sum + rating.value, 0) / doctor.ratings.length 
      : 0;
    
    // Get recent appointments count
    const appointmentsCount = await Appointment.countDocuments({ 
      doctor: doctor._id,
      status: 'completed'
    });
    
    const doctorResponse = {
      ...doctor.toJSON(),
      averageRating: averageRating.toFixed(1),
      ratingsCount: doctor.ratings ? doctor.ratings.length : 0,
      appointmentsCount
    };
    
    logger.info(`Médecin ${req.params.id} récupéré avec succès`);
    res.json(doctorResponse);
  } catch (error) {
    logger.error(`Erreur lors de la récupération du médecin: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour le profil du médecin
// @route   PUT /api/doctors/profile
// @access  Private/Doctor
exports.updateDoctorProfile = async (req, res) => {
  try {
    logger.info(`Mise à jour du profil médecin pour l'utilisateur ${req.user._id}`);
    
    const doctor = await Doctor.findOne({ user: req.user._id });
    
    if (!doctor) {
      logger.warn(`Profil médecin non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil médecin non trouvé' });
    }
    
    // Vérifier la spécialisation si fournie
    if (req.body.specializationId) {
      const specialization = await Specialization.findById(req.body.specializationId);
      if (!specialization) {
        return res.status(400).json({ message: 'Spécialisation non valide' });
      }
      doctor.specialization = req.body.specializationId;
    }
    
    // Mettre à jour les champs
    const updatableFields = [
      'first_name', 'last_name', 'about', 'education', 'experience',
      'price', 'doctor_image', 'languages', 'certificate_url',
      'workExperience', 'dob', 'gender', 'address', 'phone'
    ];
    
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        doctor[field] = req.body[field];
      }
    });
    
    // Générer le nom complet à partir du prénom et du nom
    if (req.body.first_name || req.body.last_name) {
      const firstName = req.body.first_name || doctor.first_name || '';
      const lastName = req.body.last_name || doctor.last_name || '';
      doctor.full_name = `${firstName} ${lastName}`.trim();
    }

    // Si le médecin met à jour ses informations pour la première fois
    if (!doctor.profileCompleted) {
      doctor.profileCompleted = true;
    }
    
    const updatedDoctor = await doctor.save();
    logger.info(`Profil médecin mis à jour pour ${req.user._id}`);
    
    res.json(updatedDoctor);
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du profil médecin: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Vérifier un médecin (admin uniquement)
// @route   PUT /api/doctors/:id/verify
// @access  Private/Admin
exports.verifyDoctor = async (req, res) => {
  try {
    logger.info(`Vérification du médecin ${req.params.id} par l'admin ${req.user._id}`);
    
    if (req.user.role !== 'Admin') {
      logger.warn(`Tentative non autorisée de vérification de médecin par ${req.user._id}`);
      return res.status(403).json({ message: 'Non autorisé' });
    }
    
    const { status, rejectionReason } = req.body;
    
    if (!status || !['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Statut de vérification invalide' });
    }
    
    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({ message: 'Raison de rejet requise' });
    }
    
    const doctor = await Doctor.findById(req.params.id).populate('user');
    
    if (!doctor) {
      logger.warn(`Médecin ${req.params.id} non trouvé pour vérification`);
      return res.status(404).json({ message: 'Médecin non trouvé' });
    }
    
    doctor.verified = status === 'verified';
    doctor.verificationStatus = status;
    doctor.verifiedAt = new Date();
    doctor.verifiedBy = req.user._id;
    
    if (status === 'rejected') {
      doctor.rejectionReason = rejectionReason;
    }
    
    const updatedDoctor = await doctor.save();
    
    // Mettre à jour le statut du profil dans User aussi
    await User.findByIdAndUpdate(doctor.user._id, { 
      profileStatus: status === 'verified' ? 'approved' : 'rejected'
    });
    
    logger.info(`Médecin ${req.params.id} ${status === 'verified' ? 'vérifié' : 'rejeté'} avec succès`);
    
    // TODO: Envoyer une notification au médecin
    
    res.json({
      message: `Le médecin a été ${status === 'verified' ? 'vérifié' : 'rejeté'} avec succès`,
      doctor: updatedDoctor
    });
  } catch (error) {
    logger.error(`Erreur lors de la vérification du médecin: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Noter un médecin
// @route   POST /api/doctors/:id/rate
// @access  Private/Patient
exports.rateDoctor = async (req, res) => {
  try {
    logger.info(`Notation du médecin ${req.params.id} par l'utilisateur ${req.user._id}`);
    
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Note invalide. Doit être entre 1 et 5.' });
    }
    
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      logger.warn(`Médecin ${req.params.id} non trouvé pour notation`);
      return res.status(404).json({ message: 'Médecin non trouvé' });
    }
    
    // Vérifier si l'utilisateur a déjà consulté ce médecin
    const hasAppointment = await Appointment.findOne({
      doctor: doctor._id,
      patient: { user: req.user._id },
      status: 'completed'
    });
    
    if (!hasAppointment) {
      logger.warn(`L'utilisateur ${req.user._id} n'a pas eu de rendez-vous avec le médecin ${req.params.id}`);
      return res.status(403).json({ message: 'Vous devez avoir consulté ce médecin pour le noter' });
    }
    
    // Vérifier si l'utilisateur a déjà noté ce médecin
    const existingRatingIndex = doctor.ratings 
      ? doctor.ratings.findIndex(r => r.user.toString() === req.user._id.toString()) 
      : -1;
    
    if (existingRatingIndex !== -1) {
      // Mettre à jour la note existante
      doctor.ratings[existingRatingIndex].value = rating;
      if (comment) {
        doctor.ratings[existingRatingIndex].comment = comment;
      }
      doctor.ratings[existingRatingIndex].updatedAt = new Date();
    } else {
      // Ajouter une nouvelle note
      if (!doctor.ratings) {
        doctor.ratings = [];
      }
      
      doctor.ratings.push({
        user: req.user._id,
        value: rating,
        comment: comment || '',
        createdAt: new Date()
      });
    }
    
    // Calculer et mettre à jour la note moyenne
    const totalRatings = doctor.ratings.reduce((sum, r) => sum + r.value, 0);
    doctor.averageRating = totalRatings / doctor.ratings.length;
    
    const updatedDoctor = await doctor.save();
    logger.info(`Médecin ${req.params.id} noté avec succès`);
    
    res.json({
      message: 'Note enregistrée avec succès',
      averageRating: updatedDoctor.averageRating,
      ratingsCount: updatedDoctor.ratings.length
    });
  } catch (error) {
    logger.error(`Erreur lors de la notation du médecin: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir les avis d'un médecin
// @route   GET /api/doctors/:id/reviews
// @access  Public
exports.getDoctorReviews = async (req, res) => {
  try {
    logger.info(`Récupération des avis du médecin ${req.params.id}`);
    
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      logger.warn(`Médecin ${req.params.id} non trouvé pour les avis`);
      return res.status(404).json({ message: 'Médecin non trouvé' });
    }
    
    // Si aucun avis
    if (!doctor.ratings || doctor.ratings.length === 0) {
      return res.json({
        reviews: [],
        averageRating: 0,
        totalReviews: 0
      });
    }
    
    // Trier les avis par date (les plus récents d'abord)
    const sortedReviews = [...doctor.ratings].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Récupérer les informations des utilisateurs pour chaque avis
    const reviewsWithUserDetails = await Promise.all(sortedReviews.map(async (review) => {
      const user = await User.findById(review.user).select('fullName');
      return {
        ...review.toObject(),
        userName: user ? user.fullName : 'Utilisateur anonyme'
      };
    }));
    
    // Calculer la note moyenne
    const averageRating = doctor.ratings.reduce((sum, r) => sum + r.value, 0) / doctor.ratings.length;
    
    logger.info(`${doctor.ratings.length} avis récupérés pour le médecin ${req.params.id}`);
    
    res.json({
      reviews: reviewsWithUserDetails,
      averageRating,
      totalReviews: doctor.ratings.length
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des avis du médecin: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir les statistiques du médecin connecté
// @route   GET /api/doctors/stats
// @access  Private/Doctor
exports.getDoctorStats = async (req, res) => {
  try {
    logger.info(`Récupération des statistiques pour le médecin ${req.user._id}`);
    
    const doctor = await Doctor.findOne({ user: req.user._id });
    
    if (!doctor) {
      logger.warn(`Profil médecin non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil médecin non trouvé' });
    }
    
    // Calculer le nombre de rendez-vous par statut
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Total des rendez-vous
    const totalAppointments = await Appointment.countDocuments({ doctor: doctor._id });
    
    // Rendez-vous aujourd'hui
    const todaysAvailabilities = await Availability.find({
      doctor: doctor._id,
      date: {
        $gte: startOfToday,
        $lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    const todaysAvailabilityIds = todaysAvailabilities.map(a => a._id);
    const todaysAppointments = await Appointment.countDocuments({ 
      doctor: doctor._id,
      availability: { $in: todaysAvailabilityIds }
    });
    
    // Rendez-vous ce mois-ci
    const thisMonthsAppointments = await Appointment.countDocuments({
      doctor: doctor._id,
      createdAt: { $gte: startOfMonth }
    });
    
    // Rendez-vous par statut
    const appointmentsByStatus = await Appointment.aggregate([
      { $match: { doctor: doctor._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Formater les résultats
    const statusCounts = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      rescheduled: 0
    };
    
    appointmentsByStatus.forEach(item => {
      statusCounts[item._id] = item.count;
    });
    
    // Récupérer la note moyenne
    const averageRating = doctor.ratings && doctor.ratings.length > 0
      ? doctor.ratings.reduce((sum, r) => sum + r.value, 0) / doctor.ratings.length
      : 0;
    
    // Calculer les revenus totaux
    const completedAppointments = await Appointment.find({
      doctor: doctor._id,
      status: 'completed',
      paymentStatus: 'completed'
    });
    
    const totalRevenue = completedAppointments.reduce((sum, app) => sum + app.price, 0);
    
    // Revenus ce mois-ci
    const thisMonthRevenue = completedAppointments
      .filter(app => app.completedAt >= startOfMonth)
      .reduce((sum, app) => sum + app.price, 0);
    
    logger.info(`Statistiques récupérées pour le médecin ${req.user._id}`);
    
    res.json({
      totalAppointments,
      todaysAppointments,
      thisMonthAppointments: thisMonthsAppointments,
      appointmentsByStatus: statusCounts,
      averageRating: averageRating.toFixed(1),
      reviewsCount: doctor.ratings ? doctor.ratings.length : 0,
      totalRevenue,
      thisMonthRevenue
    });
  } catch (error) {
    logger.error(`Erreur lors de la récupération des statistiques du médecin: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
}; 
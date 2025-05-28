const Patient = require('../models/Patient');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const PatientResponse = require('../models/PatientResponse');
const Question = require('../models/Question');
const Specialization = require('../models/Specialization');
const logger = require('../config/logger');

// @desc    Get patient profile
// @route   GET /api/patients/profile
// @access  Private/Patient
exports.getPatientProfile = async (req, res) => {
  try {
    logger.info(`Récupération du profil patient pour l'utilisateur ${req.user._id}`);
    
    const patient = await Patient.findOne({ user: req.user._id });
    
    if (!patient) {
      logger.warn(`Profil patient non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }
    
    // Get the user data to include email, fullName etc.
    const user = await User.findById(req.user._id).select('-password');
    
    // Get the count of completed appointments
    const appointmentsCount = await Appointment.countDocuments({
      patient: patient._id,
      status: 'completed'
    });
    
    // Get the recommended doctors
    let recommendedDoctors = [];
    if (patient.recommendedDoctors && patient.recommendedDoctors.length > 0) {
      recommendedDoctors = await Doctor.find({
        _id: { $in: patient.recommendedDoctors },
        verified: true
      })
      .populate('specialization')
      .select('full_name first_name last_name doctor_image specialization price experience ratings');
    }
    
    // Get the saved doctors
    let savedDoctors = [];
    if (patient.savedDoctors && patient.savedDoctors.length > 0) {
      savedDoctors = await Doctor.find({
        _id: { $in: patient.savedDoctors },
        verified: true
      })
      .populate('specialization')
      .select('full_name first_name last_name doctor_image specialization price experience ratings');
    }
    
    // Format the response
    const patientResponse = {
      ...patient.toObject(),
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        verified: user.verified,
        profileStatus: user.profileStatus
      },
      appointmentsCount,
      recommendedDoctors,
      savedDoctors
    };
    
    logger.info(`Profil patient récupéré pour l'utilisateur ${req.user._id}`);
    res.json(patientResponse);
  } catch (error) {
    logger.error(`Erreur lors de la récupération du profil patient: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update patient profile
// @route   PUT /api/patients/profile
// @access  Private/Patient
exports.updatePatientProfile = async (req, res) => {
  try {
    logger.info(`Mise à jour du profil patient pour l'utilisateur ${req.user._id}`);
    
    // Find the patient
    let patient = await Patient.findOne({ user: req.user._id });
    
    if (!patient) {
      logger.warn(`Profil patient non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }
    
    // Update fields
    const updatableFields = [
      'first_name', 'last_name', 'date_of_birth', 'gender',
      'blood_type', 'height', 'weight', 'address', 'phone',
      'emergency_contact_name', 'emergency_contact_phone',
      'medical_conditions', 'allergies', 'medications'
    ];
    
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        patient[field] = req.body[field];
      }
    });
    
    // If the user is updating their profile for the first time
    if (!patient.profileCompleted) {
      patient.profileCompleted = true;
    }
    
    const updatedPatient = await patient.save();
    
    logger.info(`Profil patient mis à jour pour l'utilisateur ${req.user._id}`);
    res.json(updatedPatient);
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du profil patient: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Save a doctor as favorite
// @route   POST /api/patients/save-doctor/:doctorId
// @access  Private/Patient
exports.saveDoctor = async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    
    logger.info(`Enregistrement du médecin ${doctorId} comme favori pour l'utilisateur ${req.user._id}`);
    
    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });
    
    if (!patient) {
      logger.warn(`Profil patient non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }
    
    // Verify the doctor exists and is verified
    const doctor = await Doctor.findOne({ _id: doctorId, verified: true });
    
    if (!doctor) {
      logger.warn(`Médecin ${doctorId} non trouvé ou non vérifié`);
      return res.status(404).json({ message: 'Médecin non trouvé ou non vérifié' });
    }
    
    // Check if the doctor is already saved
    if (patient.savedDoctors && patient.savedDoctors.includes(doctorId)) {
      return res.status(400).json({ message: 'Ce médecin est déjà dans vos favoris' });
    }
    
    // Add the doctor to saved doctors
    if (!patient.savedDoctors) {
      patient.savedDoctors = [];
    }
    
    patient.savedDoctors.push(doctorId);
    await patient.save();
    
    logger.info(`Médecin ${doctorId} ajouté aux favoris pour l'utilisateur ${req.user._id}`);
    res.status(200).json({ 
      message: 'Médecin ajouté aux favoris',
      savedDoctor: doctor
    });
  } catch (error) {
    logger.error(`Erreur lors de l'enregistrement du médecin comme favori: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove a doctor from favorites
// @route   DELETE /api/patients/save-doctor/:doctorId
// @access  Private/Patient
exports.removeSavedDoctor = async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    
    logger.info(`Suppression du médecin ${doctorId} des favoris pour l'utilisateur ${req.user._id}`);
    
    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });
    
    if (!patient) {
      logger.warn(`Profil patient non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }
    
    // Check if the doctor is saved
    if (!patient.savedDoctors || !patient.savedDoctors.includes(doctorId)) {
      return res.status(400).json({ message: 'Ce médecin n\'est pas dans vos favoris' });
    }
    
    // Remove the doctor from saved doctors
    patient.savedDoctors = patient.savedDoctors.filter(id => id.toString() !== doctorId);
    await patient.save();
    
    logger.info(`Médecin ${doctorId} supprimé des favoris pour l'utilisateur ${req.user._id}`);
    res.status(200).json({ message: 'Médecin supprimé des favoris' });
  } catch (error) {
    logger.error(`Erreur lors de la suppression du médecin des favoris: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit assessment responses
// @route   POST /api/patients/assessment
// @access  Private/Patient
exports.submitAssessment = async (req, res) => {
  try {
    const { responses } = req.body;
    
    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ message: 'Réponses d\'évaluation manquantes ou invalides' });
    }
    
    logger.info(`Soumission de l'évaluation pour l'utilisateur ${req.user._id} avec ${responses.length} réponses`);
    
    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });
    
    if (!patient) {
      logger.warn(`Profil patient non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }
    
    // Process each response
    const savedResponses = [];
    
    // Get all specializations
    const allSpecializations = await Specialization.find({});
    
    // Initialize scores for each specialization
    const specializationScores = {};
    allSpecializations.forEach(spec => {
      specializationScores[spec._id.toString()] = 0;
    });
    
    // Process each response
    for (const resp of responses) {
      const { questionId, answer } = resp;
      
      if (!questionId || answer === undefined) {
        logger.warn(`Réponse invalide: questionId ou answer manquant`);
        continue;
      }
      
      // Get the question details
      const question = await Question.findById(questionId);
      
      if (!question) {
        logger.warn(`Question ${questionId} non trouvée`);
        continue;
      }
      
      // Save the response
      const patientResponse = new PatientResponse({
        user: req.user._id,
        question: questionId,
        response: answer.toString()
      });
      
      const savedResponse = await patientResponse.save();
      savedResponses.push(savedResponse);
      
      // Update scores
      const questionSpecId = question.specialization ? question.specialization.toString() : null;
      
      if (questionSpecId && specializationScores.hasOwnProperty(questionSpecId) && question.scoring) {
        let score = 0;
        
        if (question.type === 'YesNo') {
          // For Yes/No questions
          score = answer === true || answer === 'true' ? 
            (question.scoring.yes || 0) : 
            (question.scoring.no || 0);
        } else if (question.type === 'MultiChoice') {
          // For multiple choice questions
          score = question.scoring[answer] || 0;
        } else if (question.type === 'Text') {
          // For text questions, the score might be predefined
          score = question.scoring.default || 0;
        }
        
        specializationScores[questionSpecId] += score;
      }
    }
    
    // Update patient's assessment results
    const assessmentResults = {
      specializations: Object.keys(specializationScores).map(specId => ({
        specializationId: specId,
        score: specializationScores[specId]
      })),
      completed_at: new Date()
    };
    
    // Sort specializations by score
    assessmentResults.specializations.sort((a, b) => b.score - a.score);
    
    // Get top recommendations (e.g., top 3 specializations)
    const topSpecializationIds = assessmentResults.specializations
      .filter(spec => spec.score > 0) // Only consider positive scores
      .slice(0, 3) // Take top 3
      .map(spec => spec.specializationId);
    
    // Find doctors matching the top specializations
    if (topSpecializationIds.length > 0) {
      const recommendedDoctors = await Doctor.find({
        specialization: { $in: topSpecializationIds },
        verified: true
      })
      .limit(5) // Limit to 5 doctors
      .select('_id');
      
      patient.recommendedDoctors = recommendedDoctors.map(doc => doc._id);
    }
    
    // Update patient assessment status
    patient.has_taken_assessment = true;
    patient.assessment_results = assessmentResults;
    
    await patient.save();
    
    // Update the user's assessment status too
    await User.findByIdAndUpdate(req.user._id, { hasCompletedAssessment: true });
    
    logger.info(`Évaluation complétée pour l'utilisateur ${req.user._id}`);
    
    res.status(201).json({
      message: 'Évaluation traitée avec succès',
      assessmentResults,
      savedResponses: savedResponses.length
    });
  } catch (error) {
    logger.error(`Erreur lors du traitement de l'évaluation: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get assessment results
// @route   GET /api/patients/assessment
// @access  Private/Patient
exports.getAssessmentResults = async (req, res) => {
  try {
    logger.info(`Récupération des résultats d'évaluation pour l'utilisateur ${req.user._id}`);
    
    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });
    
    if (!patient) {
      logger.warn(`Profil patient non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }
    
    // Check if the patient has taken the assessment
    if (!patient.has_taken_assessment) {
      return res.status(400).json({ message: 'Vous n\'avez pas encore passé l\'évaluation' });
    }
    
    // Get recommended doctors with details
    let recommendedDoctors = [];
    if (patient.recommendedDoctors && patient.recommendedDoctors.length > 0) {
      recommendedDoctors = await Doctor.find({
        _id: { $in: patient.recommendedDoctors },
        verified: true
      })
      .populate('specialization')
      .select('full_name first_name last_name doctor_image specialization price experience ratings');
    }
    
    // Get specialization details
    const specializationDetails = await Promise.all(
      patient.assessment_results.specializations.map(async (spec) => {
        const specialization = await Specialization.findById(spec.specializationId);
        return {
          ...spec.toObject(),
          name: specialization ? specialization.name : 'Spécialisation inconnue'
        };
      })
    );
    
    // Format the response
    const response = {
      has_taken_assessment: patient.has_taken_assessment,
      assessment_results: {
        ...patient.assessment_results.toObject(),
        specializations: specializationDetails
      },
      recommendedDoctors
    };
    
    logger.info(`Résultats d'évaluation récupérés pour l'utilisateur ${req.user._id}`);
    res.json(response);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des résultats d'évaluation: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get patient medical history (appointments)
// @route   GET /api/patients/medical-history
// @access  Private/Patient
exports.getMedicalHistory = async (req, res) => {
  try {
    logger.info(`Récupération de l'historique médical pour l'utilisateur ${req.user._id}`);
    
    // Find the patient
    const patient = await Patient.findOne({ user: req.user._id });
    
    if (!patient) {
      logger.warn(`Profil patient non trouvé pour l'utilisateur ${req.user._id}`);
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }
    
    // Get all completed appointments with notes
    const appointments = await Appointment.find({
      patient: patient._id,
      status: 'completed'
    })
    .populate({
      path: 'doctor',
      select: 'full_name first_name last_name doctor_image specialization',
      populate: {
        path: 'specialization',
        select: 'name'
      }
    })
    .populate('availability')
    .sort({ createdAt: -1 });
    
    // Format the response
    const medicalHistory = appointments.map(appointment => {
      const appointmentDate = appointment.availability && appointment.availability.date
        ? new Date(appointment.availability.date).toLocaleDateString('fr-FR')
        : 'Date inconnue';
        
      return {
        _id: appointment._id,
        doctor: {
          _id: appointment.doctor._id,
          name: appointment.doctor.full_name || `${appointment.doctor.first_name || ''} ${appointment.doctor.last_name || ''}`.trim(),
          specialization: appointment.doctor.specialization ? appointment.doctor.specialization.name : 'Non spécifiée'
        },
        date: appointmentDate,
        time: appointment.slotStartTime,
        status: appointment.status,
        hasNotes: appointment.hasNotes || false
      };
    });
    
    logger.info(`Historique médical récupéré pour l'utilisateur ${req.user._id}`);
    res.json(medicalHistory);
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'historique médical: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
}; 
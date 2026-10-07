const Appointment = require('../models/Appointment');
const Donor = require('../models/Donor');
const Doctor = require('../models/Doctor');
const Notification = require('../models/Notification');
const { createNotification } = require('../services/notificationService');

// POST /api/appointments  (admin)
const createAppointment = async (req, res, next) => {
  try {
    const { donorId, doctorId, type, date, time, hospital, reason, notes } = req.body;

    const donor = await Donor.findById(donorId).populate('userId');
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found.' });

    const appointment = await Appointment.create({
      donorId,
      doctorId: doctorId || null,
      adminId: req.user._id,
      type,
      date,
      time,
      hospital,
      reason,
      notes,
    });

    // Notify donor
    const typeLabel = type === 'MONTHLY_HEALTH_CHECK' ? 'Monthly Health Check' : 'Doctor Consultation';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    // Populate doctor info for email
    const doctorDoc = doctorId ? await Doctor.findById(doctorId).lean() : null;
    await createNotification({
      userId: donor.userId._id,
      title: `Appointment Scheduled: ${typeLabel}`,
      message: `An appointment has been scheduled for you on ${new Date(date).toLocaleDateString()} at ${time}, ${hospital}. Reason: ${reason}`,
      type: 'APPOINTMENT',
      relatedId: appointment._id,
      relatedModel: 'Appointment',
      clickUrl: `${clientUrl}/donor/appointments`,
      emailData: {
        appointmentIsNew: true,
        type,
        date,
        time,
        hospital,
        doctorName: doctorDoc ? doctorDoc.name : null,
        reason,
      },
    });

    res.status(201).json({ success: true, message: 'Appointment scheduled.', appointment });
  } catch (error) {
    next(error);
  }
};

// GET /api/appointments
const getAppointments = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'DONOR') {
      const donor = await Donor.findOne({ userId: req.user._id });
      if (!donor) return res.status(200).json({ success: true, appointments: [] });
      filter.donorId = donor._id;
    }

    const { type, status, page = 1, limit = 20 } = req.query;
    if (type) filter.type = type;
    if (status) filter.status = status;

    const appointments = await Appointment.find(filter)
      .populate('donorId', 'bloodGroup donorStatus userId')
      .populate('doctorId', 'name specialization hospital phone')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Populate donor user info
    const populated = await Appointment.populate(appointments, { path: 'donorId.userId', select: 'name email phone' });

    res.status(200).json({ success: true, appointments });
  } catch (error) {
    next(error);
  }
};

// PUT /api/appointments/:id
const updateAppointment = async (req, res, next) => {
  try {
    const { status, cancellationReason, date, time, notes } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    if (status) {
      appointment.status = status;
      if (status === 'COMPLETED') appointment.completedAt = new Date();
      if (status === 'CANCELLED') appointment.cancellationReason = cancellationReason;
    }
    if (date) appointment.date = date;
    if (time) appointment.time = time;
    if (notes) appointment.notes = notes;

    await appointment.save();

    // Notify donor of update
    const donor = await Donor.findById(appointment.donorId).populate('userId');
    if (donor) {
      const updateClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const isCancelled = status === 'CANCELLED';
      const statusMsg = isCancelled
        ? `Your appointment has been cancelled. Reason: ${cancellationReason || 'Not specified'}.`
        : `Your appointment status has been updated to: ${status || 'Updated'}.`;
      await createNotification({
        userId: donor.userId._id || donor.userId,
        title: isCancelled ? 'Appointment Cancelled' : 'Appointment Updated',
        message: statusMsg,
        type: 'APPOINTMENT',
        relatedId: appointment._id,
        clickUrl: `${updateClientUrl}/donor/appointments`,
        emailData: {
          appointmentCancelled: isCancelled,
          type:                 appointment.type,
          date:                 appointment.date,
          time:                 appointment.time,
          hospital:             appointment.hospital,
          status:               appointment.status,
          cancellationReason:   cancellationReason,
        },
      });
    }

    res.status(200).json({ success: true, message: 'Appointment updated.', appointment });
  } catch (error) {
    next(error);
  }
};


// DELETE /api/appointments/:id  (admin only)
const deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    // 1. Delete all Notifications linked to this appointment
    await Notification.deleteMany({ relatedId: appointment._id, relatedModel: 'Appointment' });

    // 2. Hard-delete the Appointment document
    // Donor account, health reports, and doctor data are NOT touched.
    await Appointment.findByIdAndDelete(appointment._id);

    res.status(200).json({ success: true, message: 'Appointment deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createAppointment, getAppointments, updateAppointment, deleteAppointment };


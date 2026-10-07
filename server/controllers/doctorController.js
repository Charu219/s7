const Doctor = require('../models/Doctor');

// GET /api/doctors
const getDoctors = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const doctors = await Doctor.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, doctors });
  } catch (error) {
    next(error);
  }
};

// POST /api/doctors  (admin)
const createDoctor = async (req, res, next) => {
  try {
    const { name, specialization, hospital, phone, email, availableDays, availableTime } = req.body;
    const doctor = await Doctor.create({
      name, specialization, hospital, phone, email, availableDays, availableTime,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, message: 'Doctor added.', doctor });
  } catch (error) {
    next(error);
  }
};

// PUT /api/doctors/:id  (admin)
const updateDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    res.status(200).json({ success: true, message: 'Doctor updated.', doctor });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/doctors/:id  (admin)
const deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, { status: 'INACTIVE' }, { new: true });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    res.status(200).json({ success: true, message: 'Doctor deactivated.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDoctors, createDoctor, updateDoctor, deleteDoctor };

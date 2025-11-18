const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Location = require('../models/Location');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { getDistance } = require('geolib');

// Check in attendance
router.post('/checkin', verifyToken, async (req, res) => {
  try {
    const { locationId, latitude, longitude } = req.body;

    if (!locationId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Location ID, latitude, and longitude are required.' });
    }

    const location = await Location.findById(locationId);
    if (!location || !location.isActive) {
      return res.status(404).json({ error: 'Location not found or inactive.' });
    }

    // Calculate distance between user location and designated location
    const distance = getDistance(
      { latitude, longitude },
      { latitude: location.latitude, longitude: location.longitude }
    );

    if (distance > location.radius) {
      return res.status(400).json({ 
        error: 'You are too far from the designated location.',
        distance,
        allowedRadius: location.radius
      });
    }

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      user: req.userId,
      checkInTime: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      return res.status(400).json({ error: 'You have already checked in today.' });
    }

    const attendance = new Attendance({
      user: req.userId,
      location: locationId,
      checkInTime: new Date(),
      checkInLatitude: latitude,
      checkInLongitude: longitude
    });

    await attendance.save();
    await attendance.populate(['user', 'location']);

    res.status(201).json({ 
      message: 'Check-in successful',
      attendance 
    });
  } catch (error) {
    console.error('Error checking in:', error);
    res.status(500).json({ error: 'Server error during check-in.' });
  }
});

// Check out attendance
router.post('/checkout', verifyToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    // Find today's check-in record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      user: req.userId,
      checkInTime: { $gte: today, $lt: tomorrow },
      checkOutTime: null
    });

    if (!attendance) {
      return res.status(404).json({ error: 'No active check-in found for today.' });
    }

    attendance.checkOutTime = new Date();
    attendance.checkOutLatitude = latitude;
    attendance.checkOutLongitude = longitude;

    await attendance.save();
    await attendance.populate(['user', 'location']);

    res.json({ 
      message: 'Check-out successful',
      attendance 
    });
  } catch (error) {
    console.error('Error checking out:', error);
    res.status(500).json({ error: 'Server error during check-out.' });
  }
});

// Get user's attendance history
router.get('/my-attendance', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = { user: req.userId };

    if (startDate || endDate) {
      query.checkInTime = {};
      if (startDate) query.checkInTime.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.checkInTime.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [attendance, total] = await Promise.all([
      Attendance.find(query)
        .populate('location', 'name')
        .sort({ checkInTime: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(query)
    ]);

    res.json({ 
      attendance,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Server error fetching attendance.' });
  }
});

// Get all attendance (admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId, locationId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};

    if (userId) query.user = userId;
    if (locationId) query.location = locationId;

    if (startDate || endDate) {
      query.checkInTime = {};
      if (startDate) query.checkInTime.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.checkInTime.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [attendance, total] = await Promise.all([
      Attendance.find(query)
        .populate('user', 'name email employeeId')
        .populate('location', 'name')
        .populate('manuallyUpdatedBy', 'name email')
        .sort({ checkInTime: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(query)
    ]);

    res.json({ 
      attendance,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Server error fetching attendance.' });
  }
});

// Manual create/update attendance (admin only)
router.post('/manual', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { 
      userId, 
      locationId, 
      checkInTime, 
      checkOutTime, 
      latitude, 
      longitude,
      status,
      notes,
      reason
    } = req.body;

    if (!userId || !locationId || !checkInTime || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        error: 'User ID, location ID, check-in time, latitude, and longitude are required.' 
      });
    }

    const attendance = new Attendance({
      user: userId,
      location: locationId,
      checkInTime: new Date(checkInTime),
      checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
      checkInLatitude: latitude,
      checkInLongitude: longitude,
      checkOutLatitude: longitude,
      checkOutLongitude: longitude,
      status: status || 'present',
      notes: notes || '',
      isManualEntry: true,
      manuallyUpdatedBy: req.userId,
      manualUpdateReason: reason || 'Manual entry by admin'
    });

    await attendance.save();
    await attendance.populate(['user', 'location', 'manuallyUpdatedBy']);

    res.status(201).json({ 
      message: 'Attendance created successfully',
      attendance 
    });
  } catch (error) {
    console.error('Error creating manual attendance:', error);
    res.status(500).json({ error: 'Server error creating attendance.' });
  }
});

// Update attendance (admin only)
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { 
      checkInTime, 
      checkOutTime, 
      status, 
      notes,
      reason
    } = req.body;

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    if (checkInTime !== undefined) attendance.checkInTime = new Date(checkInTime);
    if (checkOutTime !== undefined) attendance.checkOutTime = checkOutTime ? new Date(checkOutTime) : null;
    if (status !== undefined) attendance.status = status;
    if (notes !== undefined) attendance.notes = notes;

    attendance.isManualEntry = true;
    attendance.manuallyUpdatedBy = req.userId;
    attendance.manualUpdateReason = reason || 'Updated by admin';

    await attendance.save();
    await attendance.populate(['user', 'location', 'manuallyUpdatedBy']);

    res.json({ 
      message: 'Attendance updated successfully',
      attendance 
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: 'Server error updating attendance.' });
  }
});

// Delete attendance (admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    res.json({ message: 'Attendance deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ error: 'Server error deleting attendance.' });
  }
});

// Get today's attendance status
router.get('/today/status', verifyToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      user: req.userId,
      checkInTime: { $gte: today, $lt: tomorrow }
    }).populate('location', 'name');

    res.json({ 
      hasCheckedIn: !!attendance,
      attendance: attendance || null
    });
  } catch (error) {
    console.error('Error checking attendance status:', error);
    res.status(500).json({ error: 'Server error checking status.' });
  }
});

module.exports = router;

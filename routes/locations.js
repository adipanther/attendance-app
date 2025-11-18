const express = require('express');
const router = express.Router();
const Location = require('../models/Location');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Get all locations
router.get('/', verifyToken, async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Server error fetching locations.' });
  }
});

// Get single location
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!location) {
      return res.status(404).json({ error: 'Location not found.' });
    }

    res.json({ location });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ error: 'Server error fetching location.' });
  }
});

// Create location (admin only)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, description, latitude, longitude, radius } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Name, latitude, and longitude are required.' });
    }

    const location = new Location({
      name,
      description,
      latitude,
      longitude,
      radius: radius || 100,
      createdBy: req.userId
    });

    await location.save();
    await location.populate('createdBy', 'name email');

    res.status(201).json({ 
      message: 'Location created successfully',
      location 
    });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Server error creating location.' });
  }
});

// Update location (admin only)
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, description, latitude, longitude, radius, isActive } = req.body;
    
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found.' });
    }

    if (name !== undefined) location.name = name;
    if (description !== undefined) location.description = description;
    if (latitude !== undefined) location.latitude = latitude;
    if (longitude !== undefined) location.longitude = longitude;
    if (radius !== undefined) location.radius = radius;
    if (isActive !== undefined) location.isActive = isActive;

    await location.save();
    await location.populate('createdBy', 'name email');

    res.json({ 
      message: 'Location updated successfully',
      location 
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Server error updating location.' });
  }
});

// Delete location (admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found.' });
    }

    // Soft delete
    location.isActive = false;
    await location.save();

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Server error deleting location.' });
  }
});

module.exports = router;

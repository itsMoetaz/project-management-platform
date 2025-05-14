// controllers/resignationController.js
const Resignation = require('../models/Resignation');

// Create a new resignation request
exports.submitResignation = async (req, res) => {
  try {
    const { userId, workspaceId, reason, effectiveDate, comment } = req.body;

    // Validate required fields
    if (!userId || !workspaceId || !reason || !effectiveDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if the effective date is in the future
    const effectiveDateObj = new Date(effectiveDate);
    if (effectiveDateObj <= new Date()) {
      return res.status(400).json({ message: 'Effective date must be in the future' });
    }

    const resignation = new Resignation({
      userId,
      workspaceId,
      reason,
      effectiveDate: effectiveDateObj,
      comment: comment || '',
    });

    await resignation.save();
    res.status(201).json({ message: 'Resignation submitted successfully', resignation });
  } catch (error) {
    console.error('Error submitting resignation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all resignations for a user or workspace (optional)
// exports.getResignations = async (req, res) => {
//   try {
//     const { userId, workspaceId } = req.query;
//     const query = {};
//     if (userId) query.userId = userId;
//     if (workspaceId) query.workspaceId = workspaceId;

//     const resignations = await Resignation.find(query).populate('userId', 'name email');
//     res.status(200).json(resignations);
//   } catch (error) {
//     console.error('Error fetching resignations:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };
const mongoose = require('mongoose');

exports.getResignations = async (req, res) => {
  try {
    const { userId, workspaceId } = req.query;
    const query = {};
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid userId format' });
      }
      query.userId = userId;
    }
    if (workspaceId) query.workspaceId = workspaceId;

    const resignations = await Resignation.find(query).populate('userId', 'name email');
    res.status(200).json(resignations);
  } catch (error) {
    console.error('Error fetching resignations:', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// Update resignation status (e.g., approve/reject) - optional
exports.updateResignationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const resignation = await Resignation.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!resignation) {
      return res.status(404).json({ message: 'Resignation not found' });
    }

    res.status(200).json({ message: 'Status updated successfully', resignation });
  } catch (error) {
    console.error('Error updating resignation status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// models/Resignation.js
const mongoose = require('mongoose');

const resignationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },
  reason: {
    type: String,
    required: true,
    enum: ['Personal Reasons', 'Career Change', 'Relocation', 'Other'],
  },
  effectiveDate: {
    type: Date,
    required: true,
  },
  comment: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Resignation', resignationSchema);
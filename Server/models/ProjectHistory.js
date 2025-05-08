const mongoose = require('mongoose');

const projectHistorySchema = new mongoose.Schema({
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  },
  action: {
    type: String,
    enum: ['CREATE_TASK', 'COMPLETE_TASK', 'ASSIGN_TASK', 'UPDATE_TASK', 'DELETE_TASK', 'OTHER'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  meta: {
    type: Object
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProjectHistory', projectHistorySchema);
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['invitation', 'mention', 'task_assignment', 'comment', 'deadline', 'other'],
      default: 'other'
    },
    message: {
      type: String,
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    relatedWorkspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace'
    },
    relatedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    relatedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    relatedInvitation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invitation'
    },
    actionLink: {
      type: String
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);
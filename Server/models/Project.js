const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    project_name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['not started', 'in progress', 'completed'],
      default: 'not started',
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    id_teamMembre: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    id_tasks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    }],
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    deadline_notification_sent: {
      type: Boolean,
      default: false
  },
    // GitHub specific fields
    github_repo_id: {
      type: String,
      sparse: true,  // Allows null values but maintains uniqueness for non-null values
    },
    github_repo_url: {
      type: String,
    },
    github_repo_owner: {
      type: String,
    },
    github_repo_branch: {
      type: String,
      default: 'main'
    },
    github_last_sync: {
      type: Date
    },
  },
  {
    timestamps: true, 
  }
);

// Add a compound index to ensure uniqueness of repositories within a workspace
projectSchema.index({ workspace: 1, github_repo_id: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Project', projectSchema);
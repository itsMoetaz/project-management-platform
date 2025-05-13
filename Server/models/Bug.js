const mongoose = require("mongoose");

const bugSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },
    complexity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
   
    closure_date: {
      type: Date,
      required: false,
    },
    module: {
      type: String,
      enum: ["FRONTEND", "BACKEND", "API", "DATABASE", "INFRASTRUCTURE", "OTHER"],
      required: true,
    },
    type: {
      type: String,
      enum: ["UI", "PERFORMANCE", "SECURITY", "FUNCTIONAL", "LOGIC", "OTHER"],
      required: true,
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reported_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
    image: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Index pour optimiser les recherches par projet et statut
bugSchema.index({ project_id: 1, status: 1 });

const Bug = mongoose.model("Bug", bugSchema);

module.exports = Bug;

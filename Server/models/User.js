const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function() {
        return this.authentication_method === 'local';
      }
    },
    passwordChangedAt: {  
      type: Date,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
    passwordResetVerified: {
      type: Boolean,
      default: false,
    },
    authentication_method: {
      type: String,
      enum: ['local', 'google', 'github'], // Add more methods if needed
      default: 'local',
    },
    google_id: {
      type: String,
      sparse: true
    },
    github_id: {
      type: String,
      sparse: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'], // Add more roles if needed
      default: 'user',
    },
    two_factor_enabled: {
      type: Boolean,
      default: false,
    },
    last_login: {
      type: Date,
    },
    profile_picture: {
      type: String,
      default: '', // You can set a default profile picture URL
    },
    bio:{
      type: String,
      default: '',
      trim: true,
    },
    phone_number: {
      type: String,
      default: '', 
    },
    skills: [{  
      type: String,
      trim: true,
    }],
    isVerified: {
      type: Boolean,
      default: false
  },
  workspaces: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace'  // Make sure this ref matches your Workspace model name
  }] ,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, 
  }
);
userSchema.index({ google_id: 1 }, { 
  unique: true, 
  partialFilterExpression: { google_id: { $ne: null } } 
});
module.exports = mongoose.model('User', userSchema);
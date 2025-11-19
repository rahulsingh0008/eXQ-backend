const mongoose = require('mongoose');

/**
 * Team Schema - Students can create/join teams
 */
const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  maxMembers: {
    type: Number,
    default: 4,
    min: 3,
    max: 4
  },
  department: {
    type: String,
    trim: true
  },
  domain: {
    type: String,
    trim: true
  },
  // Optional: faculty assigned to mentor / oversee this team
  assignedFaculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);
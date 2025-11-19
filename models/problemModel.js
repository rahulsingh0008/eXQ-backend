const mongoose = require('mongoose');

/**
 * Problem Schema - Store academic problems for sale
 */
const problemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Problem title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Problem description is required']
  },
  domain: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    default: 60,
    min: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  upvotes: {
    type: Number,
    default: 0
  },
  upvotedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: {
    type: Number,
    default: 0
  },
  downvotedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  purchased: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for search optimization
problemSchema.index({ title: 'text', description: 'text', domain: 'text' });

module.exports = mongoose.model('Problem', problemSchema);
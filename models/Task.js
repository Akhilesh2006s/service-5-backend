import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['assigned', 'in-progress', 'completed', 'reviewed', 'closed'],
    default: 'assigned'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  description: {
    type: String,
    required: true
  },
  instructions: {
    type: String,
    default: ''
  },
  workProof: [{
    type: String, // URLs to uploaded files
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  workerRemarks: {
    type: String,
    default: ''
  },
  officialRemarks: {
    type: String,
    default: ''
  },
  completionDate: {
    type: Date
  },
  reviewDate: {
    type: Date
  },
  digitalSignature: {
    type: String, // Base64 encoded signature
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    signedAt: {
      type: Date
    }
  },
  report: {
    type: String, // Generated report content
    generatedAt: {
      type: Date
    }
  }
}, {
  timestamps: true
});

export default mongoose.model('Task', taskSchema);


import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['infrastructure', 'healthcare', 'education', 'transport', 'sanitation', 'safety', 'other']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'resolved', 'rejected'],
    default: 'pending'
  },
  location: {
    type: String,
    required: true
  },
  coordinates: {
    lat: Number,
    lng: Number
  },
  images: [{
    url: String, // URL to uploaded image
    base64Data: String // Base64 fallback data
  }],
  videos: [{
    url: String, // URL to uploaded video
    base64Data: String // Base64 fallback data
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  department: {
    type: String,
    required: false,
    default: 'general'
  },
  estimatedCost: {
    type: Number,
    default: 0
  },
  actualCost: {
    type: Number,
    default: 0
  },
  resolutionNotes: {
    type: String,
    default: ''
  },
  resolutionImages: [{
    type: String
  }],
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  engagementScore: {
    type: Number,
    default: 0
  },
  deadline: {
    type: Date
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Calculate engagement score
postSchema.methods.calculateEngagementScore = function() {
  const upvoteWeight = 1;
  const commentWeight = 2;
  const timeWeight = 0.1;
  
  const upvotes = this.upvotes.length;
  const comments = this.comments.length;
  const daysSinceCreated = Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
  
  this.engagementScore = (upvotes * upvoteWeight) + (comments * commentWeight) + (daysSinceCreated * timeWeight);
  return this.engagementScore;
};

export default mongoose.model('Post', postSchema);


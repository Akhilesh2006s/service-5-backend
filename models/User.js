import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['citizen', 'government', 'worker', 'admin'],
    required: true
  },
  aadhaarNumber: {
    type: String,
    required: function() {
      return this.role === 'citizen';
    },
    unique: function() {
      return this.role === 'citizen';
    },
    sparse: true
  },
  location: {
    type: String,
    required: function() {
      return this.role === 'citizen';
    }
  },
  department: {
    type: String,
    required: function() {
      return ['government', 'worker'].includes(this.role);
    }
  },
  designation: {
    type: String,
    required: function() {
      return ['government', 'worker'].includes(this.role);
    }
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.role === 'worker';
    }
  },
  permissions: [{
    type: String,
    enum: ['create_officials', 'create_workers', 'assign_tasks', 'generate_reports', 'manage_departments']
  }],
  verified: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    required: function() {
      return ['government', 'worker'].includes(this.role);
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);

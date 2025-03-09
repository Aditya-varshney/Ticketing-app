import mongoose from 'mongoose';

// This model represents the assignment of a user to a helpdesk
const AssignmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  helpdesk: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Ensure a user can only be assigned to one helpdesk at a time
AssignmentSchema.index({ user: 1 }, { unique: true });

export default mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema);

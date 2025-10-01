import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pillName: {
    type: String,
    required: true,
    trim: true
  },
  dosage: {
    type: String,
    trim: true
  },
  times: {
    type: [String],
    required: true
  },
  riskScore: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now, // sets current date/time by default
    required: true
  },
  quantity: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

export default Schedule;

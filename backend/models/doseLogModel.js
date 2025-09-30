import mongoose from 'mongoose';

const doseLogSchema = new mongoose.Schema({
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['taken', 'missed']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const DoseLog = mongoose.model('DoseLog', doseLogSchema);

export default DoseLog;
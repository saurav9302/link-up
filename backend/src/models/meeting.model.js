const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  meetingCode: {
    type: String,
    required: true,
    unique: true
  }

}, { timestamps: true });

const Meeting = mongoose.model("Meeting", meetingSchema);

module.exports = { Meeting };
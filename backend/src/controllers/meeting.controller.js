const crypto = require("crypto");
const { Meeting } = require("../models/meeting.model");
const { User } = require("../models/users.model");

const createMeeting = async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const user = await User.findOne({ token });

    if (!user) {
      return res.status(401).json({
        message: "Invalid Token",
      });
    }

    if (!user.tokenExpiry || user.tokenExpiry < new Date()) {
      return res.status(401).json({ message: "Token expired" });
      }

    let meetingCode;
    let meetingExists = true;

    while (meetingExists) {
      meetingCode = crypto.randomBytes(3).toString("hex").toUpperCase();

      const existingMeeting = await Meeting.findOne({ meetingCode });

      if (!existingMeeting) {
        meetingExists = false;
      }
    }

    const meeting = await Meeting.create({
      user_id: user._id,
      meetingCode,
    });

    return res.status(201).json({
      message: "Meeting Created",
      meeting,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const verifyMeeting = async (req, res) => {
  try {
    const { meetingCode } = req.params;

    const meeting = await Meeting.findOne({
      meetingCode: meetingCode.toUpperCase(),
    });
    if (!meeting) {
      return res.status(404).json({
        exists: false,
        message: "Meeting not found",
      });
    }

    return res.status(200).json({
      exists: true,
      meetingCode: meeting.meetingCode,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
module.exports = {
  createMeeting,
  verifyMeeting,
};

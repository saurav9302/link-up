const express = require("express");
const {login,register,verifyToken } = require("../controllers/user.controller.js");
const { createMeeting,verifyMeeting } = require("../controllers/meeting.controller.js");

const router = express.Router();

router.route("/login").post(login);
router.route("/register").post(register);
router.get("/verify", verifyToken);
router.post("/create-meeting", createMeeting);
router.get("/verify-meeting/:meetingCode", verifyMeeting);
module.exports = router;
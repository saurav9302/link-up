const { User } = require("../models/users.model");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Please provide username and password" });
  }

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    const token = crypto.randomBytes(20).toString("hex");

    user.token = token;
    user.tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    return res.status(200).json({ token });
  } catch (e) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const register = async (req, res) => {
  try {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (password.length < 6) {
     return res.status(400).json({ message: "Password must be at least 6 characters" })
    }
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      username,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "User Registered Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({
        valid: false,
        message: "No token provided",
      });
    }

    const user = await User.findOne({ token });

    if (!user) {
      return res.status(401).json({
        valid: false,
        message: "Invalid token",
      });
    }

    if (!user.tokenExpiry || user.tokenExpiry < new Date()) {
      return res.status(401).json({ valid: false, message: "Token expired" });
    }

    return res.status(200).json({
      valid: true,
      username: user.username,
    });
  } catch (err) {
    return res.status(500).json({
      valid: false,
      message: "Server Error",
    });
  }
};

module.exports = { login, register, verifyToken };
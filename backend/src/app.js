require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");

const { Meeting } = require("./models/meeting.model");
const { connectToSocket } = require("./controllers/socketManager");
const userRoutes = require("./routes/users");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 8000;
const CLIENT_URL = process.env.CLIENT_URL;

connectToSocket(server);

app.use(
  cors({
    origin: CLIENT_URL || "*",
    methods: ["GET", "POST"],
  })
);

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

app.get("/home", (req, res) => {
  res.json({ hello: "World" });
});

const start = async () => {
  try {
    const connectionDb = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${connectionDb.connection.host}`);

    // Remove all active meetings whenever the server restarts.....
  
    await Meeting.deleteMany({});

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

start();
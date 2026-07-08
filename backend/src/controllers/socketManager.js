const { Server } = require("socket.io");
const { Meeting } = require("../models/meeting.model");

let connections = {};
let messages = {};
let users = {};
let clientIdToSocket = {};
let roomHostClientId = {};
let pendingRemoval = {};
let lastSpeakerVolumes = {};
let currentActiveSpeaker = {};
let lastSwitchTime = {};

const SWITCH_HOLD_MS = 1500;
const SILENCE_THRESHOLD = 1000;

const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  const emitParticipants = (room) => {
    const hostSocketId = clientIdToSocket[roomHostClientId[room]];
    const participantList = (connections[room] || []).map(id => ({
      id,
      name: users[id]?.name || "User",
    }));
    io.to(room).emit("participants", participantList, hostSocketId);
  };

  const isHost = (socket) => {
    const clientId = users[socket.id]?.clientId;
    const room = users[socket.id]?.room;
    return room && clientId && roomHostClientId[room] === clientId;
  };

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-call", (roomId, name, clientId) => {
      socket.join(roomId);

      if (!connections[roomId]) connections[roomId] = [];

      //Cancel pending host transfer if the user reconnects
      if (pendingRemoval[clientId]) {
        clearTimeout(pendingRemoval[clientId]);
        delete pendingRemoval[clientId];
      }

      // send existing users to new joiner....joiner should not offer first
      
      connections[roomId].forEach(existingId => {
        io.to(socket.id).emit("user-joined", existingId, users[existingId]?.name || "User", false);
      });

      connections[roomId].push(socket.id);

      users[socket.id] = { name: name || "Guest", room: roomId, clientId };
      clientIdToSocket[clientId] = socket.id;

      // host is decided once by clientId, not by socket order
      if (!roomHostClientId[roomId]) {
        roomHostClientId[roomId] = clientId;
      }

      emitParticipants(roomId);

      // existing users offer first to the new joiner
      // Notify existing participants about the new user.
      connections[roomId].forEach(id => {
        if (id !== socket.id) {
          io.to(id).emit("user-joined", socket.id, users[socket.id].name, true);
        }
      });

      if (messages[roomId]) {
        messages[roomId].forEach(msg => {
          io.to(socket.id).emit("chat-message", msg.data, msg.sender, msg["socket-id-sender"]);
        });
      }
    });

    socket.on("speaking", (id, volume) => {
      const room = users[socket.id]?.room;
      if (!room) return;

      if (!lastSpeakerVolumes[room]) lastSpeakerVolumes[room] = {};
      lastSpeakerVolumes[room][id] = { volume, timestamp: Date.now() };

      //Remove inactive speaker entries
      const now = Date.now();
      Object.keys(lastSpeakerVolumes[room]).forEach(sid => {
        if (now - lastSpeakerVolumes[room][sid].timestamp > 1000) {
          delete lastSpeakerVolumes[room][sid];
        }
      });

      // pick the loudest person above threshold
      let loudestId = null;
      let loudestVolume = SILENCE_THRESHOLD;
      Object.entries(lastSpeakerVolumes[room]).forEach(([sid, entry]) => {
        if (entry.volume > loudestVolume) {
          loudestVolume = entry.volume;
          loudestId = sid;
        }
      });

      if (!loudestId) return;

      const lastSwitch = lastSwitchTime[room] || 0;
      const alreadyActive = currentActiveSpeaker[room] === loudestId;
      
      // Avoid switching the active speaker too frequently
      if (!alreadyActive && now - lastSwitch < SWITCH_HOLD_MS) {
        return;
      }

      if (!alreadyActive) {
        currentActiveSpeaker[room] = loudestId;
        lastSwitchTime[room] = now;
        io.to(room).emit("active-speaker", loudestId);
      }
    });

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      const room = users[socket.id]?.room;
      if (!room) return;

      if (!messages[room]) messages[room] = [];
      messages[room].push({ sender, data, "socket-id-sender": socket.id });

      connections[room].forEach(id => {
        io.to(id).emit("chat-message", data, sender, socket.id);
      });
    });

    socket.on("remove-user", (targetId) => {
      const room = users[socket.id]?.room;
      if (!room) return;

      if (isHost(socket)) {
        io.to(targetId).emit("remove-user");
        connections[room] = connections[room].filter(id => id !== targetId);
        delete users[targetId];
        connections[room].forEach(id => io.to(id).emit("user-left", targetId));
        emitParticipants(room);
      }
    });

    socket.on("mute-user", (targetId) => {
      const room = users[socket.id]?.room;
      if (!room) return;
      if (isHost(socket)) io.to(targetId).emit("mute-user");
    });

    socket.on("mute-all", () => {
      const room = users[socket.id]?.room;
      if (!room) return;
      if (isHost(socket)) {
        connections[room].forEach(id => {
          if (id !== socket.id) io.to(id).emit("mute-user");
        });
      }
    });

    socket.on("disconnect", async () => {
      console.log("User disconnected:", socket.id);

      const room = users[socket.id]?.room;
      const clientId = users[socket.id]?.clientId;
      if (!room) return;

      connections[room] = connections[room]?.filter(id => id !== socket.id);
      delete users[socket.id];

      if (clientIdToSocket[clientId] === socket.id) {
        delete clientIdToSocket[clientId];
      }

      connections[room]?.forEach(id => io.to(id).emit("user-left", socket.id));

      if (connections[room]?.length > 0) {
        // host left...wait 5s before handing off.....covers a quick refresh
        // Wait before assigning a new host
        if (roomHostClientId[room] === clientId) {
          pendingRemoval[clientId] = setTimeout(() => {
            const nextSocketId = connections[room]?.[0];
            if (nextSocketId) {
              roomHostClientId[room] = users[nextSocketId]?.clientId;
            }
            delete pendingRemoval[clientId];
            emitParticipants(room);
          }, 5000);
        }
        emitParticipants(room);
      } else {
        delete connections[room];
        delete messages[room];
        delete roomHostClientId[room];
        delete lastSpeakerVolumes[room];
        delete currentActiveSpeaker[room];
        delete lastSwitchTime[room];

        await Meeting.deleteOne({ meetingCode: room });
        console.log(`Meeting ${room} deleted`);
      }
    });
  });
};

module.exports = { connectToSocket };
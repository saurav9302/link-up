import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/authcontext";

function JoinMeeting() {
  const { verifyMeeting } = useContext(AuthContext);

  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  const navigate = useNavigate();

  const handleJoin = async () => {
    const trimmedName = name.trim();
    const trimmedRoom = roomId.trim();

    if (!trimmedName || !trimmedRoom) {
      alert("Please enter your name and meeting ID");
      return;
    }

    if (trimmedName.length < 2) {
      alert("Enter a valid name");
      return;
    }

    //navigate to meeting
    const meetingExists = await verifyMeeting(trimmedRoom);

    if (!meetingExists) {
      alert("Meeting not found");
      return;
    }

    navigate(`/meet/${trimmedRoom.toUpperCase()}`, {
      state: {
        name: trimmedName,
        roomId: trimmedRoom.toUpperCase(),
        isHost: false,
      },
    });
    sessionStorage.setItem("guestName", trimmedName);
  };

  return (
    <div
      style={{
        backgroundColor: "#0d0d0d",
        minHeight: "100vh",
        color: "white",
      }}
      className="d-flex justify-content-center align-items-center"
    >
      <div className="bg-dark p-4 rounded" style={{ width: "350px" }}>
        <h3 className="text-center mb-4">Join Meeting</h3>

        {/* NAME */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="Your Name"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
        </div>

        {/* ROOM ID */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="Meeting ID"
            className="form-control"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
        </div>

        {/* JOIN BUTTON */}
        <button className="btn btn-primary w-100 mb-3" onClick={handleJoin}>
          Join Meeting
        </button>

        {/* BACK */}
        <p
          className="text-center"
          style={{ cursor: "pointer", color: "#0d6efd" }}
          onClick={() => navigate("/")}
        >
          ← Back to Home
        </p>
      </div>
    </div>
  );
}

export default JoinMeeting;

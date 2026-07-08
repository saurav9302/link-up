import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/authcontext";
import meetingImage from "../assets/meeting.jpg";
import logo from "../assets/logo.png";

function LandingPage() {
  const navigate = useNavigate();
  const { userData, logout, verifyUser, createMeeting } =
    useContext(AuthContext);

  const handleStartMeeting = async () => {
    const isValid = await verifyUser();

    if (!isValid) {
      navigate("/auth", { state: { isLogin: true } });
      return;
    }

    const roomId = await createMeeting();

    if (!roomId) {
      alert("Unable to create meeting.");
      return;
    }

    navigate(`/meet/${roomId}`, {
      state: {
        roomId,
        isHost: true,
      },
    });
  };

  return (
    <div
      style={{ backgroundColor: "#0d0d0d", minHeight: "100vh", color: "white" }}
    >
      <nav className="navbar navbar-dark bg-dark px-4">
       <span
  className="navbar-brand mb-0 h1 d-flex align-items-center gap-2"
  style={{
    fontWeight: 700,
    letterSpacing: "-0.5px",
    background: "linear-gradient(90deg, #0d6efd, #00d4ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  }}
>
  <img src={logo} alt="LinkUp logo" style={{ height: "32px", width: "auto" }} />
  LinkUp
</span>

        <div>
          {userData ? (
            <>
              <span className="me-3">Welcome, {userData.username}</span>
              <button className="btn btn-danger" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-outline-light me-2"
                onClick={() => navigate("/auth", { state: { isLogin: true } })}
              >
                Login
              </button>

              <button
                className="btn btn-primary"
                onClick={() => navigate("/auth", { state: { isLogin: false } })}
              >
                Register
              </button>
            </>
          )}
        </div>
      </nav>

      <div className="container-fluid text-center mt-5">
        <h1 className="mb-3">Connect. Collaborate. Communicate.</h1>

        <p className="mb-4">A simple video meeting platform for everyone.</p>

        <button
          className="btn btn-primary me-3"
          onClick={() => navigate("/join")}
        >
          Join Meeting
        </button>

        <button className="btn btn-outline-light" onClick={handleStartMeeting}>
          Start Meeting
        </button>
      </div>

      <div className="container-fluid text-center mt-5">
        <img
          src={meetingImage}
          alt="meeting"
          style={{ width: "70%", borderRadius: "10px" }}
        />
      </div>

      <div className="container-fluid mt-5">
        <div className="row text-center">
          <div className="col-md-4 mb-3">
            <h4>Video Calls</h4>
            <p>High quality video meetings</p>
          </div>

          <div className="col-md-4 mb-3">
            <h4>Chat</h4>
            <p>Send messages during meetings</p>
          </div>

          <div className="col-md-4 mb-3">
            <h4>Screen Share</h4>
            <p>Share your screen easily</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;

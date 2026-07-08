import React, { useEffect, useRef, useState, useContext } from "react";
import io from "socket.io-client";
import { useLocation, useParams } from "react-router-dom";
import { AuthContext } from "../contexts/authcontext";
import "../css/videoMeet.css";

import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";
import { MdCallEnd, MdScreenShare } from "react-icons/md";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { HiUsers } from "react-icons/hi";

const server_url = import.meta.env.VITE_SERVER_URL;

// Use a fixed id for logged-in users and a temporary id for guests...
const getClientId = (userData) => {
  if (userData?.username) return `user:${userData.username}`;

  let id = sessionStorage.getItem("clientId");
  if (!id) {
    id = `guest:${crypto.randomUUID()}`;
    sessionStorage.setItem("clientId", id);
  }
  return id;
};

export default function VideoMeet() {
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const connections = useRef({});
  const userNames = useRef({});
  const location = useLocation();
  const { userData } = useContext(AuthContext);
  const audioIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const audioEnabledRef = useRef(true);

  const { id: roomId } = useParams();
  const guestName = location.state?.name || sessionStorage.getItem("guestName");
  const name = guestName || userData?.username || "Guest";

  const [videos, setVideos] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [hostId, setHostId] = useState(null);
  const [activeSpeaker, setActiveSpeaker] = useState(null);

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const [showParticipants, setShowParticipants] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  const [focusedVideo, setFocusedVideo] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    if (!guestName && !userData?.username) {
      window.location.href = "/join";
    }
  }, []);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      cameraStreamRef.current = stream;

      window.localStream = stream;
      setLocalStream(stream);
      detectAudio(stream);
    } catch (err) {
      alert("Unable to access your camera or microphone. Please allow permission and try again.");
      window.location.href = "/";
    }
  };

  const detectAudio = (stream) => {
    audioContextRef.current = new AudioContext();
    const audioContext = audioContextRef.current;
    const analyser = audioContext.createAnalyser();
    const mic = audioContext.createMediaStreamSource(stream);
    mic.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    audioIntervalRef.current = setInterval(() => {
      if (!audioEnabledRef.current) return;
      analyser.getByteFrequencyData(data);
      const volume = data.reduce((a, b) => a + b, 0);
      socketRef.current.emit("speaking", socketIdRef.current, volume);
    }, 500);
  };

  const connectSocket = () => {
    socketRef.current = io(server_url);

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", roomId, name, getClientId(userData));
    });

    socketRef.current.on("participants", (list, host) => {
      setParticipants(list);
      setHostId(host);
      list.forEach((p) => {
        userNames.current[p.id] = p.name;
      });
    });

    socketRef.current.on("active-speaker", setActiveSpeaker);

    socketRef.current.on("chat-message", (data, sender, senderId) => {
      if (senderId === socketIdRef.current) return;
      setMessages((prev) => [...prev, { sender, text: data }]);
    });

    socketRef.current.on("remove-user", () => {
      alert("Removed by host");
      window.location.href = "/";
    });

    socketRef.current.on("mute-user", () => {
      window.localStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      setAudioEnabled(false);
      alert("Host muted you");
    });

    socketRef.current.on("user-left", (id) => {
      setVideos((prev) => prev.filter((v) => v.id !== id));
      if (connections.current[id]) {
        connections.current[id].close();
        delete connections.current[id];
      }
    });

    socketRef.current.on("user-joined", async (id, userName, isInitiator) => {
      userNames.current[id] = userName;

      const peer = new RTCPeerConnection(peerConfig);
      connections.current[id] = peer;

      window.localStream.getTracks().forEach((track) => {
        peer.addTrack(track, window.localStream);
      });

      peer.ontrack = (event) => {
        setVideos((prev) => {
          if (id === socketIdRef.current) return prev;
          if (prev.find((v) => v.id === id)) return prev;
          return [...prev, { id, stream: event.streams[0], name: userName }];
        });
      };

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit("signal", id, JSON.stringify({ ice: event.candidate }));
        }
      };

      // only the side told to initiate sends the offer
      // Prevent both users from creating an offer at the same time
      if (isInitiator) {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socketRef.current.emit("signal", id, JSON.stringify({ sdp: peer.localDescription }));
      }
    });

    socketRef.current.on("signal", async (fromId, message) => {
      const signal = JSON.parse(message);
      let peer = connections.current[fromId];

      if (!peer) {
        peer = new RTCPeerConnection(peerConfig);
        connections.current[fromId] = peer;

        window.localStream.getTracks().forEach((track) => {
          peer.addTrack(track, window.localStream);
        });

        peer.ontrack = (event) => {
          setVideos((prev) => {
            if (fromId === socketIdRef.current) return prev;
            if (prev.find((v) => v.id === fromId)) return prev;
            return [
              ...prev,
              {
                id: fromId,
                stream: event.streams[0],
                name: userNames.current[fromId] || "User",
              },
            ];
          });
        };

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current.emit("signal", fromId, JSON.stringify({ ice: event.candidate }));
          }
        };
      }

      if (signal.sdp) {
        if (signal.sdp.type === "offer") {
         // Accept the offer only if the peer is ready
          if (peer.signalingState !== "stable") return;

          await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socketRef.current.emit("signal", fromId, JSON.stringify({ sdp: peer.localDescription }));
        } else if (signal.sdp.type === "answer") {
          // ignore a answer if we weren't waiting for one
          if (peer.signalingState !== "have-local-offer") return;

          await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        }
      }

      if (signal.ice) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(signal.ice));
        } catch (e) {
          // ignore failed ICE candidates
        }
      }
    });
  };

  useEffect(() => {
    if (!roomId) return;
    (async () => {
      await getUserMedia();
      connectSocket();
    })();
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, focusedVideo]);

  const toggleAudio = () => {
    window.localStream.getAudioTracks()[0].enabled = !audioEnabled;
    setAudioEnabled(!audioEnabled);
  };

  const toggleVideo = () => {
    window.localStream.getVideoTracks()[0].enabled = !videoEnabled;
    setVideoEnabled(!videoEnabled);
  };

  const switchToCamera = () => {
    const cameraTrack = cameraStreamRef.current.getVideoTracks()[0];

    Object.values(connections.current).forEach((peer) => {
      const sender = peer.getSenders().find((s) => s.track && s.track.kind === "video");
      if (sender) sender.replaceTrack(cameraTrack);
    });

    localVideoRef.current.srcObject = cameraStreamRef.current;
    window.localStream = cameraStreamRef.current;
    setLocalStream(cameraStreamRef.current);

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        switchToCamera();
        return;
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;

      const screenTrack = screenStream.getVideoTracks()[0];

      Object.values(connections.current).forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });

      localVideoRef.current.srcObject = screenStream;
      window.localStream = screenStream;
      setLocalStream(screenStream);
      setIsScreenSharing(true);

      // Return to the camera after screen sharing ends..
      screenTrack.onended = () => switchToCamera();
    } catch (err) {
      // user likely cancelled the screen share prompt
    }
  };

  const endCall = () => {
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    if (audioContextRef.current) audioContextRef.current.close();

    window.localStream.getTracks().forEach((track) => track.stop());
    Object.values(connections.current).forEach((peer) => peer.close());
    socketRef.current.disconnect();
    window.location.href = "/";
  };

  const handleFocus = (id) => {
    setFocusedVideo((prev) => (prev === id ? null : id));
  };

  const isLocalFocused = focusedVideo === "local";
  const isRemoteFocused = focusedVideo && focusedVideo !== "local";
  const showLocal = !focusedVideo || isLocalFocused;
  const displayedVideos = isRemoteFocused
    ? videos.filter((v) => v.id === focusedVideo)
    : isLocalFocused
    ? []
    : videos;

  const sendMessage = () => {
    if (!messageInput.trim()) return;
    socketRef.current.emit("chat-message", messageInput, name);
    setMessages((prev) => [...prev, { sender: "You", text: messageInput }]);
    setMessageInput("");
  };

  // Runs when leaving the meeting page ...End Call, Back button, refresh, navigation...
  useEffect(() => {
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();

      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }

      Object.values(connections.current).forEach((peer) => peer.close());

      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return (
    <div className="meeting-container">
      {chatOpen && (
        <div className="chat-box">
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <p key={i} className={msg.sender === "You" ? "msg-mine" : ""}>
                <b>{msg.sender}: </b>
                {msg.text}
              </p>
            ))}
          </div>

          <div className="chat-input">
            <input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type message..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}

      {showParticipants && (
        <div className="participants">
          <h3>Participants</h3>

          {socketIdRef.current === hostId && (
            <button
              onClick={() => socketRef.current.emit("mute-all")}
              style={{
                width: "100%",
                marginBottom: "10px",
                background: "orange",
                color: "white",
                border: "none",
                padding: "5px",
              }}
            >
              Mute All
            </button>
          )}

          {participants.map((p) => (
            <div key={p.id} className="participant">
              {p.name} {p.id === hostId && "(Host)"}

              {socketIdRef.current === hostId && p.id !== hostId && (
                <>
                  <button
                    onClick={() => socketRef.current.emit("mute-user", p.id)}
                    style={{ marginLeft: "5px", background: "orange", color: "white" }}
                  >
                    Mute
                  </button>
                  <button
                    onClick={() => socketRef.current.emit("remove-user", p.id)}
                    style={{ marginLeft: "5px", background: "red", color: "white" }}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        className="video-grid"
        style={{
          gridTemplateColumns: focusedVideo ? "1fr" : "repeat(auto-fit, minmax(250px, 1fr))",
        }}
      >
        {showLocal && (
          <div onClick={() => handleFocus("local")} className="video-box">
            <video ref={localVideoRef} autoPlay muted />
            <span>{name} (You)</span>
          </div>
        )}

        {displayedVideos.map((video) => (
          <div
            key={video.id}
            onClick={() => handleFocus(video.id)}
            className={`video-box ${activeSpeaker === video.id ? "active" : ""}`}
          >
            <video ref={(ref) => ref && (ref.srcObject = video.stream)} autoPlay />
            <span>{video.name}</span>
          </div>
        ))}
      </div>

      <div className="controls">
        <button className="control-btn" onClick={toggleAudio}>
          {audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>

        <button className="control-btn" onClick={toggleVideo}>
          {videoEnabled ? <FaVideo /> : <FaVideoSlash />}
        </button>

        <button className="control-btn" onClick={() => setShowParticipants(!showParticipants)}>
          <HiUsers />
        </button>

        <button className="control-btn" onClick={() => setChatOpen(!chatOpen)}>
          <IoChatbubbleEllipsesOutline />
        </button>

        <button className="control-btn" onClick={toggleScreenShare}>
          <MdScreenShare />
        </button>

        <button className="control-btn end-btn" onClick={endCall}>
          <MdCallEnd />
        </button>
      </div>
    </div>
  );
}
# LinkUp

A real-time video meeting platform built with the MERN stack and WebRTC — create or join meetings, chat, share your screen, and manage participants, all in the browser.

## Features

- **Peer-to-peer video calls** via WebRTC, signaled over Socket.IO
- **User accounts** (register/login) alongside guest access — no account needed to join a meeting
- **Host controls** — mute individual participants, mute all, remove a participant
- **Live chat** during meetings
- **Screen sharing** with automatic fallback to camera when sharing ends
- **Active speaker detection** — highlights whoever is currently speaking loudest, with hold-time smoothing to avoid flicker when multiple people talk at once
- **Persistent host identity** — refreshing the page doesn't strip you of host status or kick you out of the call
- **Responsive layout** — chat and participant panels adapt on smaller screens

## Tech Stack

**Frontend:** React (Vite), React Router, Bootstrap, Socket.IO client, native WebRTC APIs
**Backend:** Node.js, Express, Socket.IO, MongoDB (Mongoose), bcrypt

## Project Structure

```
/backend
  package.json
  src/
    app.js                  # Express + Socket.IO entry point
    controllers/
      socketManger.js       # WebRTC signaling, room/host logic, active-speaker logic
      user.controller.js    # Auth: login, register, token verification
      meeting.controller.js # Meeting creation + verification
    models/
      users.model.js
      meeting.model.js
    routes/
      users.js

/frontend
  index.html
  package.json
  src/
    pages/
      landing.jsx
      authentication.jsx
      joinMeeting.jsx
      videoMeet.jsx
    contexts/
      authcontext.jsx      # Auth state, login/register/logout, meeting creation/verification
    css/
      videoMeet.css
    App.jsx
    main.jsx
```

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally or a MongoDB Atlas connection string

### 1. Clone the repo
```bash
git clone https://github.com/saurav9302/link-up.git
cd link-up
```

### 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env
```
Fill in `.env`:
```
PORT=8000
MONGO_URI=mongodb://127.0.0.1:27017/linkup
CLIENT_URL=http://localhost:5173
```
Start the server:
```bash
npm start
```

### 3. Frontend setup
```bash
cd frontend
npm install
```
Create a `.env` file:
```
VITE_SERVER_URL=http://localhost:8000
```
Start the dev server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## How It Works

### Video calls (WebRTC)
Each participant creates a direct peer-to-peer connection with every other participant. The Node server only handles **signaling** — exchanging offers, answers, and ICE candidates over Socket.IO — the actual audio/video stream never touches the server.

To avoid both peers trying to initiate a connection at the same time (a race condition that causes calls to silently fail to connect), the server designates one side of each pair as the initiator. The client also checks `RTCPeerConnection.signalingState` before applying an incoming offer or answer, so a stray or duplicate signaling message can't crash an already-established connection.

### Host persistence across refresh
Each client generates a stable identifier — a logged-in user's identifier is tied to their username, a guest's is a random ID stored in `sessionStorage` for that browser tab. When the host's socket disconnects (e.g. from a page refresh), the server waits a few seconds before reassigning host status to someone else. If the same identifier reconnects within that window, they keep their host status and nobody else in the call sees any change.

### Authentication
Passwords are hashed with bcrypt before being stored and must be at least 6 characters (enforced on both the client and the server, since client-side checks alone can be bypassed). Login issues a random token that is valid for 7 days — after that, `verifyToken` rejects it and the user is prompted to log in again.

### Active speaker detection
Each client periodically measures its own microphone volume and reports it to the server. The server tracks the loudest reported volume per room and only switches the highlighted "active speaker" if a different participant has been clearly loudest for a minimum hold time — this prevents the UI from flickering rapidly between participants when multiple people speak at once. Muted participants never report volume, so they can't be flagged as speaking.

## Known Limitations

- Uses a STUN-only ICE configuration — calls between participants on strict/corporate NATs may fail to connect without a TURN server fallback.
- No password reset flow.

## License

This project is for educational/portfolio purposes.
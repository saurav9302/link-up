import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/landing";
import Authentication from "./pages/authentication";
import JoinMeeting from "./pages/joinMeeting";


import VideoMeet from "./pages/videoMeet";

function App() {
  return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<Authentication />} />
        <Route path="/meet/:id" element={<VideoMeet />} />
        <Route path="/join" element={<JoinMeeting />} />
      </Routes>
  );
}

export default App;
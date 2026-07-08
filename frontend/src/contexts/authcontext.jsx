import axios from "axios";
import { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const client = axios.create({
  baseURL: `${SERVER_URL}/api/v1/users`,
});

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const navigate = useNavigate();

  const handleRegister = async (name, username, password) => {
    try {
      const res = await client.post("/register", { name, username, password });

      if (res.status === 201) {
        alert("Registered successfully");
        navigate("/auth", { state: { isLogin: true } });
      }
    } catch (err) {
      alert("Register failed");
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const res = await client.post("/login", { username, password });

      if (res.status === 200) {
        const user = { username };

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(user));
        setUserData(user);

        alert("Login successful");
        navigate("/");
      }
    } catch (err) {
      alert("Login failed");
    }
  };

  const verifyUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return false;

    try {
      const res = await client.get("/verify", {
        headers: { Authorization: token },
      });
      return res.data.valid;
    } catch (err) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUserData(null);
      return false;
    }
  };

  const createMeeting = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await client.post(
        "/create-meeting",
        {},
        { headers: { Authorization: token } }
      );
      return res.data.meeting.meetingCode;
    } catch (err) {
      return null;
    }
  };

  const verifyMeeting = async (meetingCode) => {
    try {
      const res = await client.get(`/verify-meeting/${meetingCode.toUpperCase()}`);
      return res.data.exists;
    } catch (err) {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUserData(null);
    navigate("/auth");
  };

  return (
    <AuthContext.Provider
      value={{
        userData,
        handleRegister,
        handleLogin,
        logout,
        verifyUser,
        createMeeting,
        verifyMeeting,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
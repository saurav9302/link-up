import React, { useState, useContext } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/authcontext";

function Authentication() {
  const location = useLocation();

  const [isLogin, setIsLogin] = useState(location.state?.isLogin ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
  });

  const { handleLogin, handleRegister } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const { name, username, password } = formData;

    const trimmedName = name.trim();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      alert("Username and password are required");
      return;
    }

    if (!isLogin && !trimmedName) {
      alert("Name is required");
      return;
    }

    if (trimmedPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isLogin) {
        await handleLogin(trimmedUsername, trimmedPassword);
      } else {
        await handleRegister(trimmedName, trimmedUsername, trimmedPassword);
      }
    } finally {
      setIsSubmitting(false);
    }
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
        <h3 className="text-center mb-4">{isLogin ? "Login" : "Signup"}</h3>

        {!isLogin && (
          <div className="mb-3">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              className="form-control"
              value={formData.name}
              onChange={handleChange}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
        )}

        <div className="mb-3">
          <input
            type="text"
            name="username"
            placeholder="Username"
            className="form-control"
            value={formData.username}
            onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        <div className="mb-3">
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="form-control"
            value={formData.password}
            onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        <button
          className="btn btn-primary w-100 mb-3"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Please wait..." : isLogin ? "Login" : "Signup"}
        </button>

        <p className="text-center">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span
            style={{
              color: "#0d6efd",
              cursor: "pointer",
              marginLeft: "5px",
            }}
            onClick={() => setIsLogin((prev) => !prev)}
          >
            {isLogin ? "Signup" : "Login"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Authentication;
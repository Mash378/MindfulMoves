import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSettings } from "./SettingsContext";

export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [newValue, setNewValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");
  
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, changeUsername, setChangeUsername, changePassword, setChangePassword } = useSettings();

  // Check if we came from settings (and whether it was from game or not)
  const fromGame = location.state?.fromGame === true;

  useEffect(() => {
    if (changeUsername) {
      setMode("change-username");
      setChangeUsername(false);
    } else if (changePassword) {
      setMode("change-password");
      setChangePassword(false);
    }
  }, [changeUsername, changePassword, setChangeUsername, setChangePassword]);

  const pageBgClass = {
    light: "bg-white text-black",
    dark: "bg-gray-800 text-white",
    game: "bg-[#0f172a] text-green-400",
    sky: "bg-gradient-to-r from-blue-400 to-blue-600 text-blue-100",
    candy: "bg-gradient-to-r from-pink-400 to-purple-400 text-pink-100",
  }[theme];

  const buttonBgClass = {
    light: "bg-blue-600 text-white",
    dark: "bg-blue-600 text-white",
    game: "bg-gray-600 text-green-400",
    sky: "bg-blue-800 text-blue-100",
    candy: "bg-pink-500 text-pink-100",
  }[theme];

  const buttonHoverClass = {
    light: "hover:bg-blue-700",
    dark: "hover:bg-blue-700",
    game: "hover:bg-gray-700",
    sky: "hover:bg-blue-700",
    candy: "hover:bg-pink-600",
  }[theme];

  const textBgClass = {
    light: "text-blue-600",
    dark: "text-blue-600",
    game: "text-green-400",
    sky: "text-blue-100",
    candy: "text-pink-100",
  }[theme];

  const textHoverClass = {
    light: "hover:text-blue-800",
    dark: "hover:text-blue-800",
    game: "hover:text-green-600",
    sky: "hover:text-blue-700",
    candy: "hover:text-pink-600",
  }[theme];

  async function handleLogin(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setError("");
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, password }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Login failed");
        return;
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("playerName", name);
      navigate("/game");
    } catch (err) {
      clearTimeout(timeout);
      setError(
        err.name === "AbortError"
          ? "Request timed out"
          : "Could not connect to server",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeUsername(e) {
    e.preventDefault();
    if (!newValue.trim()) {
      setError("Please enter a new username");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password to confirm");
      return;
    }

    setError("");
    setLoading(true);
    const token = localStorage.getItem("token");
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/change-username`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          currentPassword: password,
          newUsername: newValue 
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Failed to change username");
        return;
      }

      localStorage.setItem("playerName", newValue);
      // Navigate back to settings preserving the fromGame state
      navigate("/settings", { state: { activeTab: "account", fromGame: fromGame } });
    } catch (err) {
      clearTimeout(timeout);
      setError(
        err.name === "AbortError"
          ? "Request timed out"
          : "Could not connect to server",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!newValue.trim()) {
      setError("Please enter a new password");
      return;
    }
    if (newValue !== confirmValue) {
      setError("Passwords do not match");
      return;
    }
    if (newValue.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your current password");
      return;
    }

    setError("");
    setLoading(true);
    const token = localStorage.getItem("token");
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/change-password`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          currentPassword: password,
          newPassword: newValue 
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Failed to change password");
        return;
      }

      // Navigate back to settings preserving the fromGame state
      navigate("/settings", { state: { activeTab: "account", fromGame: fromGame } });
    } catch (err) {
      clearTimeout(timeout);
      setError(
        err.name === "AbortError"
          ? "Request timed out"
          : "Could not connect to server",
      );
    } finally {
      setLoading(false);
    }
  }

  const handleCancel = () => {
    // Navigate back to settings preserving the fromGame state
    navigate("/settings", { state: { activeTab: "account", fromGame: fromGame } });
    // Reset all form fields
    setName("");
    setPassword("");
    setNewValue("");
    setConfirmValue("");
    setError("");
    setMode("login");
  };

  return (
    <div
      className="h-screen w-screen fixed inset-0 flex flex-col items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 right-4 px-4 py-2 bg-gray-600 text-white 
                    rounded-lg hover:bg-gray-700 transition shadow-md
                    flex items-center gap-2 z-10"
      >
        <span className="text-lg">←</span>
        Back to Home
      </button>

      <div
        className={`relative flex flex-col items-center p-10 rounded-lg shadow-lg w-96 min-h-[520px] ${pageBgClass}`}
      >
        {/* The content of this div will change based on the mode (login, change-username, change-password) */}
        {mode === "login" && (
          <>
            <h2 className="text-5xl font-bold">Login Page</h2>
            <form onSubmit={handleLogin} className="flex flex-col items-center mt-24">
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-4 py-2 mb-4 rounded-lg border-2 border-gray-400 w-64"
              />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-4 py-2 mb-4 rounded-lg border-2 border-gray-400 w-64"
              />

              {error && <p className="absolute bottom-44 left-1/2 transform -translate-x-1/2 text-red-600 text-sm mb-4">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className={`absolute bottom-32 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg transition ${buttonBgClass} ${buttonHoverClass} disabled:opacity-50`}
              >
                {loading ? "Logging in..." : "Submit"}
              </button>
            </form>
            <button
              type="button"
              className={`absolute bottom-16 left-1/2 transform -translate-x-1/2 mt-4 px-6 py-3 text-2xl transition ${textBgClass} ${textHoverClass}`}
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </button>
          </>
        )}

        {mode === "change-username" && (
          <>
            <h2 className="text-4xl font-bold mb-8">Change Username</h2>
            <form onSubmit={handleChangeUsername} className="flex flex-col items-center w-full">
              <input
                type="text"
                placeholder="Current username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-4 py-2 mb-4 rounded-lg border-2 border-gray-400 w-64"
                disabled={loading}
              />
              <input
                type="text"
                placeholder="New username"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="px-4 py-2 mb-4 rounded-lg border-2 border-gray-400 w-64"
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-4 py-2 mb-4 rounded-lg border-2 border-gray-400 w-64"
                disabled={loading}
              />

              {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

              <div className="flex gap-4 mt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg transition ${buttonBgClass} ${buttonHoverClass} disabled:opacity-50`}
                >
                  {loading ? "Changing..." : "Change Username"}
                </button>
              </div>
            </form>
          </>
        )}

        {mode === "change-password" && (
          <>
            <h2 className="text-4xl font-bold mb-8">Change Password</h2>
            <form onSubmit={handleChangePassword} className="flex flex-col items-center w-full">
              <input
                type="password"
                placeholder="Current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-4 py-2 mb-4 rounded-lg border-2 border-gray-400 w-64"
                disabled={loading}
              />
              <input
                type="password"
                placeholder="New password"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="px-4 py-2 mb-4 rounded-lg border-2 border-gray-400 w-64"
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                className="px-4 py-2 mb-4 rounded-lg border-2 border-gray-400 w-64"
                disabled={loading}
              />

              {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

              <div className="flex gap-4 mt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg transition ${buttonBgClass} ${buttonHoverClass} disabled:opacity-50`}
                >
                  {loading ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
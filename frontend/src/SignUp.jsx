import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "./SettingsContext";

export default function SignUp() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme } = useSettings();

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

  async function handleSubmit(e) {
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, password }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Sign up failed");
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
        className={`relative flex flex-col items-center p-10 rounded-lg shadow-lg w-96 h-[520px] ${pageBgClass}`}
      >
        <h2 className="text-5xl font-bold">Sign Up Page</h2>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center mt-24"
        >
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-2 mb-4 rounded-lg border-2 border-gray-400 w-64 "
          />
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-2 mb-10 rounded-lg border-2 border-gray-400 w-64"
          />

          {error && <p className="absolute bottom-44 left-1/2 transform -translate-x-1/2 text-red-600 text-sm mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`absolute bottom-32 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg transition ${buttonBgClass} ${buttonHoverClass} disabled:opacity-50`}
          >
            {loading ? "Signing up..." : "Submit"}
          </button>
        </form>
        <button
          type="button"
          className={`absolute bottom-16 left-1/2 transform -translate-x-1/2 mt-4 px-6 py-3 text-2xl transition ${textBgClass} ${textHoverClass}`}
          onClick={() => navigate("/login")}
        >
          Login
        </button>
      </div>
    </div>
  );
}

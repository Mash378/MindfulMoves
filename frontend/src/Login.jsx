import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useSettings } from "./SettingsContext"

export default function Login() {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const { theme } = useSettings();

    const pageBgClass = {
        light: "bg-white text-black",
        dark: "bg-gray-800 text-white",
        game: "bg-[#0f172a] text-green-400",
        sky: "bg-gradient-to-r from-blue-400 to-blue-600 text-blue-100",
        candy: "bg-gradient-to-r from-pink-400 to-purple-400 text-pink-100"
    }[theme];

    const buttonBgClass = {
        light: "bg-blue-600 text-white",
        dark: "bg-blue-600 text-white",
        game: "bg-gray-600 text-green-400",
        sky: "bg-blue-800 text-blue-100",
        candy: "bg-pink-500 text-pink-100"
    }[theme];

    const buttonHoverClass = {
        light: "hover:bg-blue-700",
        dark: "hover:bg-blue-700",
        game: "hover:bg-gray-700",
        sky: "hover:bg-blue-700",
        candy: "hover:bg-pink-600"
    }[theme];

    const textBgClass = {
        light: "text-blue-600",
        dark: "text-blue-600",
        game: "text-green-400",
        sky: "text-blue-100",
        candy: "text-pink-100"
    }[theme];

    const textHoverClass = {
        light: "hover:text-blue-800",
        dark: "hover:text-blue-800",
        game: "hover:text-green-600",
        sky: "hover:text-blue-700",
        candy: "hover:text-pink-600"
    }[theme];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            alert("Please enter your name");
            return;
        }
        if (!password.trim()) {
            alert("Please enter your password");
            return;
        }
        
        // Register the player
        // TODO: Relpce localStorage.setItem("playerName", name); and add logic to send the name to a backend here
        localStorage.setItem("playerName", name);
        localStorage.setItem("playerPassword", password);
        navigate("/game");
    }
  return (
    <div className="h-screen w-screen fixed inset-0 flex flex-col items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/background.png')" }}>
      <button
          onClick={() => navigate("/")}
          className="absolute top-4 right-4 px-4 py-2 bg-gray-600 text-white 
                    rounded-lg hover:bg-gray-700 transition shadow-md
                    flex items-center gap-2 z-10"
      >
          <span className="text-lg">←</span>
          Back to Home
      </button>

      <div className={`flex flex-col items-center  p-10 rounded-lg shadow-lg w-96 ${pageBgClass}`}>
        <h2 className="text-5xl font-bold">Login Page</h2>

        <form onSubmit={handleSubmit} className="flex flex-col items-center mt-24">
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

          <button
          onClick={handleSubmit}
          className={`px-6 py-3 rounded-lg transition ${buttonBgClass} ${buttonHoverClass}`}
          >
            Submit
          </button>
        </form>
        <button
          type="button"
          className={`mt-4 px-6 py-3 text-2xl transition ${textBgClass} ${textHoverClass}`}
          onClick={() => navigate("/signup")}
          >
          Sign Up
        </button>
      </div>
    </div>
  )
}
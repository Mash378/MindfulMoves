import { useState } from "react"
import { useNavigate } from "react-router-dom";
import { useSettings } from "./SettingsContext"

export default function Leaderboard() {
  const [count, setCount] = useState(0)
  const navigate = useNavigate();
  const { theme } = useSettings();

  const pageBgClass = {  
    light: "bg-white text-black",
    dark: "bg-gray-800 text-white",
    game: "bg-[#0f172a] text-green-400",
    sky: "bg-gradient-to-r from-blue-400 to-blue-600 text-blue-100",
    candy: "bg-gradient-to-r from-pink-400 to-purple-400 text-pink-100"
  }[theme];

  return (
    <div className={`h-screen w-screen fixed inset-0 flex flex-col items-center justify-center bg-cover bg-center`}
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

        <div className={`h-screen flex flex-col items-center ${pageBgClass} bg-opacity-80 p-10 rounded-lg shadow-lg`}>
        <h1 className="text-5xl font-bold mt-16 mb-20">Leaderboard</h1>
            <div className="text-xl">
                <p>Top Players:</p>
                <ol style={{ marginTop: '20px' }}>
                <li>1. Name - xx wins</li>
                </ol>
            </div>
        </div>
    </div>
  )
}

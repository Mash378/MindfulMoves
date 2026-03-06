import { useState } from "react"
import { useNavigate } from "react-router-dom";
import { useTheme } from "./ThemeContext";

export default function Home() {
  const [count, setCount] = useState(0)
  const navigate = useNavigate();
  const { theme } = useTheme();

   const buttonBgClass = {
    light: "bg-blue-600 text-white",
    dark: "bg-blue-600 text-white",
    game: "bg-[#0f172a] text-green-400",
    sky: "bg-blue-400 text-blue-100",
    candy: "bg-pink-400 text-pink-100"
  }[theme];

  const buttonHoverClass = {
    light: "hover:bg-blue-700",
    dark: "hover:bg-blue-700",
    game: "hover:bg-gray-700",
    sky: "hover:bg-blue-500",
    candy: "hover:bg-pink-500"
  }[theme];

  return (
    <>
    <div className="h-screen w-screen fixed inset-0 flex flex-col items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/background.png')" }}
    >

      <img
        src="/chess-piece1.png"
        alt="Chess Piece"
        className="absolute bottom-16 left-16"
      />

      <img
        src="/chess-piece2.png"
        alt="Chess Piece"
        className="absolute bottom-26 left-64"
      />

      <img
        src="/chess-piece3.png"
        alt="Chess Piece"
        className="absolute bottom-0 right-52 w-100 h-auto rotate-155"
      />

      <img
        src="/chess-piece4.png"
        alt="Chess Piece"
        className="absolute bottom-16 right-0"
      />


      <h1 className="text-7xl text-black font-bold font-serif text-shadow-lg mb-42">MindfulMoves</h1>
      <button
      className={`w-80 px-8 py-4 text-2xl rounded-lg transition ${buttonBgClass} ${buttonHoverClass}` }
      onClick={() => navigate("/signup")}
      >
      Start Game
    </button>
    <div className="flex gap-6 mt-20">
      <button
      className={`w-40 px-6 py-3 rounded-lg transition ${buttonBgClass} ${buttonHoverClass}`}
      onClick={() => navigate("/leaderboard")}
      >
      Leader Board
    </button>
    <button
      className={`w-40 px-6 py-3 rounded-lg transition ${buttonBgClass} ${buttonHoverClass}`}
      onClick={() => navigate("/settings")}
      >
      Settings
    </button>
    <button
      className={`w-40 px-6 py-3 rounded-lg transition ${buttonBgClass} ${buttonHoverClass}`}
      onClick={() => navigate("/credits")}
      >
      Credits
    </button>
    </div>
    
  </div>
  </>
  )
}

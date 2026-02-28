import { useState } from "react"
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [count, setCount] = useState(0)
  const navigate = useNavigate();

  return (
    <>
    <div className="h-screen w-screen fixed inset-0 flex flex-col items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      <h1 className="text-7xl font-bold mb-46">MindfulMoves</h1>
      <button
      className="w-80 px-8 py-4 text-2xl bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      onClick={() => navigate("/signup")}
      >
      Start Game
    </button>
    <div className="flex gap-6 mt-20">
      <button
      className="w-40 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      onClick={() => navigate("/leaderboard")}
      >
      Leader Board
    </button>
    <button
      className="w-40 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      onClick={() => navigate("/settings")}
      >
      Settings
    </button>
    <button
      className="w-40 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      onClick={() => navigate("/credits")}
      >
      Credits
    </button>
    </div>
    
  </div>
  </>
  )
}

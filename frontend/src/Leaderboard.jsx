import { useState } from "react"
import { useNavigate } from "react-router-dom";
import { useSettings } from "./SettingsContext"

export default function Leaderboard() {
  const [count, setCount] = useState(0)
  const navigate = useNavigate();
  const { theme, difficulty } = useSettings();
  
  const [currentDifficulty, setCurrentDifficulty] = useState(difficulty || "medium");
  
  const difficulties = ["easy", "medium", "hard", "magnus"];
  
  // Mock leaderboard data - replace with actual data from backend
  const leaderboardData = {
    easy: [
      { name: "Player1", wins: 10 },
      { name: "Player2", wins: 9 },
      { name: "Player3", wins: 8 },
      { name: "Player4", wins: 7 },
      { name: "Player5", wins: 6 },
      { name: "Player6", wins: 5 },
      { name: "Player7", wins: 4 },
      { name: "Player8", wins: 3 },
      { name: "Player9", wins: 2 },
      { name: "Player10", wins: 1 }
    ],
    medium: [
      { name: "Player1", wins: 10 },
      { name: "Player2", wins: 9 },
      { name: "Player3", wins: 8 },
      { name: "Player4", wins: 7 },
      { name: "Player5", wins: 6 },
      { name: "Player6", wins: 5 },
      { name: "Player7", wins: 4 },
      { name: "Player8", wins: 3 },
      { name: "Player9", wins: 2 },
      { name: "Player10", wins: 1 }
    ],
    hard: [
      { name: "Player1", wins: 10 },
      { name: "Player2", wins: 9 },
      { name: "Player3", wins: 8 },
      { name: "Player4", wins: 7 },
      { name: "Player5", wins: 6 },
      { name: "Player6", wins: 5 },
      { name: "Player7", wins: 4 },
      { name: "Player8", wins: 3 },
      { name: "Player9", wins: 2 },
      { name: "Player10", wins: 1 }
    ],
    magnus: [
      { name: "Player1", wins: 10 },
      { name: "Player2", wins: 9 },
      { name: "Player3", wins: 8 },
      { name: "Player4", wins: 7 },
      { name: "Player5", wins: 6 },
      { name: "Player6", wins: 5 },
      { name: "Player7", wins: 4 },
      { name: "Player8", wins: 3 },
      { name: "Player9", wins: 2 },
      { name: "Player10", wins: 1 }
    ]
  };

  const getDifficultyDisplayName = (diff) => {
    const names = {
      easy: "Easy",
      medium: "Medium",
      hard: "Hard",
      magnus: "Magnus Carlsen"
    };
    return names[diff] || diff;
  };

  const navigateDifficulty = (direction) => {
    const currentIndex = difficulties.indexOf(currentDifficulty);
    if (direction === "prev" && currentIndex > 0) {
      setCurrentDifficulty(difficulties[currentIndex - 1]);
    } else if (direction === "next" && currentIndex < difficulties.length - 1) {
      setCurrentDifficulty(difficulties[currentIndex + 1]);
    }
  };

  const pageBgClass = {  
    light: "bg-white text-black",
    dark: "bg-gray-800 text-white",
    game: "bg-[#0f172a] text-green-400",
    sky: "bg-gradient-to-r from-blue-400 to-blue-600 text-blue-100",
    candy: "bg-gradient-to-r from-pink-400 to-purple-400 text-pink-100"
  }[theme];

  const buttonHoverClass = {
    light: "hover:bg-blue-700",
    dark: "hover:bg-blue-700",
    game: "hover:bg-gray-700",
    sky: "hover:bg-blue-500",
    candy: "hover:bg-pink-500"
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

        <div className={`h-screen ${pageBgClass} bg-opacity-80 p-10 rounded-lg shadow-lg`}>
          <h1 className="text-5xl font-bold mt-16 mb-8">Leaderboard</h1>
          
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              onClick={() => navigateDifficulty("prev")}
              disabled={difficulties.indexOf(currentDifficulty) === 0}
              className={`text-3xl font-bold p-2 rounded-lg transition
                ${difficulties.indexOf(currentDifficulty) === 0 
                  ? "opacity-30 cursor-not-allowed" 
                  : buttonHoverClass}`}
            >
              ◀
            </button>
            
            <h2 className="text-2xl font-semibold min-w-[180px] text-center">
              {getDifficultyDisplayName(currentDifficulty)}
            </h2>
            
            <button
              onClick={() => navigateDifficulty("next")}
              disabled={difficulties.indexOf(currentDifficulty) === difficulties.length - 1}
              className={`text-3xl font-bold p-2 rounded-lg transition
                ${difficulties.indexOf(currentDifficulty) === difficulties.length - 1 
                  ? "opacity-30 cursor-not-allowed" 
                  : buttonHoverClass}`}
            >
              ▶
            </button>
          </div>

          {/* Leaderboard content */}
          <div className="text-xl">
            <p>Top Players:</p>
            <ol style={{ marginTop: '20px' }} className="list-decimal list-inside">
              {leaderboardData[currentDifficulty]?.map((player, index) => (
                <p className="mt-2">{index + 1}. {player.name} - {player.wins} wins</p>
              ))}
            </ol>
            {(!leaderboardData[currentDifficulty] || leaderboardData[currentDifficulty].length === 0) && (
              <p className="text-center mt-8 opacity-70">No players yet for this difficulty</p>
            )}
          </div>
        </div>
    </div>
  )
}
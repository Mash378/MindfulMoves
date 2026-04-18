import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom";
import { useSettings } from "./SettingsContext"

const API_URL = import.meta.env.VITE_API_URL; 

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { theme, difficulty } = useSettings();
  
  const [currentDifficulty, setCurrentDifficulty] = useState(difficulty || "medium");
  
  const difficulties = ["easy", "medium", "hard", "magnus"];
  
  const getDifficultyDisplayName = (diff) => {
    const names = {
      easy: "Easy",
      medium: "Medium",
      hard: "Hard",
      magnus: "Magnus Carlsen"
    };
    return names[diff] || diff;
  };

  // Fetch leaderboard data from backend
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch data for all difficulties in parallel
        const fetchPromises = difficulties.map(async (diff) => {
          const response = await fetch(`${API_URL}/api/leaderboard/${diff}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch leaderboard for ${diff}`);
          }
          const data = await response.json();
          return { difficulty: diff, data };
        });
        
        const results = await Promise.all(fetchPromises);
        
        // Transform results into the expected format
        const leaderboardMap = {};
        results.forEach(result => {
          leaderboardMap[result.difficulty] = result.data;
        });
        
        setLeaderboardData(leaderboardMap);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError(err.message);
        // Set empty data as fallback
        const emptyData = {};
        difficulties.forEach(diff => {
          emptyData[diff] = [];
        });
        setLeaderboardData(emptyData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, []);

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

  // Loading state
  if (loading) {
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
        <div className="text-center">
          <div className="text-2xl">Loading leaderboard...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
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
        <div className="text-center">
          <div className="text-2xl text-red-500 mb-4">Error loading leaderboard</div>
          <div className="text-gray-600">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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

        <div className={`h-screen ${pageBgClass} bg-opacity-80 p-10 rounded-lg shadow-lg overflow-y-auto`}>
          <h1 className="text-5xl font-bold mb-7">Leaderboard</h1>
          
          <div className="flex items-center justify-center gap-6 mb-7">
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
            <div className="grid grid-cols-12 gap-4 mb-4 font-bold border-b-2 pb-2">
              <div className="col-span-1">#</div>
              <div className="col-span-7">Player</div>
              <div className="col-span-2 text-center">Wins</div>
              <div className="col-span-2 text-center">Games</div>
            </div>
            
            {leaderboardData[currentDifficulty]?.map((player, index) => (
              <div key={player.id || index} className="grid grid-cols-12 gap-4 py-2 rounded">
                <div className="col-span-1 font-bold">{index + 1}</div>
                <div className="col-span-7">{player.username || player.name}</div>
                <div className="col-span-2 text-center font-bold">{player.games_won || player.wins || 0}</div>
                <div className="col-span-2 text-center">{player.games_played || 0}</div>
              </div>
            ))}
            
            {(!leaderboardData[currentDifficulty] || leaderboardData[currentDifficulty].length === 0) && (
              <p className="text-center mt-8 opacity-70">No players yet for this difficulty</p>
            )}
          </div>
        </div>
    </div>
  )
}
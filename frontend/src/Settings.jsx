import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom";
import { useSettings } from "./SettingsContext";

const API_URL = import.meta.env.VITE_API_URL;

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("user");
  const { theme, setTheme } = useSettings();
  const { difficulty, setDifficulty } = useSettings();
  const { timerEnabled, setTimerEnabled } = useSettings();
  const { timerDuration, setTimerDuration } = useSettings();
  const { historyEnabled, setHistoryEnabled } = useSettings();
  const { changeUsername, setChangeUsername } = useSettings();
  const { changePassword, setChangePassword } = useSettings();
  const { isLoggedIn, setIsLoggedIn, username, setUsername, logout } = useSettings();

  // Add state for user stats
  const [userStats, setUserStats] = useState({
    easy: { games_played: 0, games_won: 0, win_rate: 0 },
    medium: { games_played: 0, games_won: 0, win_rate: 0 },
    hard: { games_played: 0, games_won: 0, win_rate: 0 },
    magnus: { games_played: 0, games_won: 0, win_rate: 0 }
  });
  const [statsLoading, setStatsLoading] = useState(false);
  // Sync with global difficulty - when global changes, this updates too
  const [selectedStatDifficulty, setSelectedStatDifficulty] = useState(difficulty || "medium");
  
  const difficulties = ["easy", "medium", "hard", "magnus"];

  const fromGame = location.state?.from === 'game' || location.state?.fromGame === true;

  // Update selectedStatDifficulty when global difficulty changes
  useEffect(() => {
    setSelectedStatDifficulty(difficulty);
  }, [difficulty]);

  // Fetch user stats using the leaderboard endpoint
  useEffect(() => {
    if (isLoggedIn && activeTab === "user") {
      fetchUserStats();
    }
  }, [isLoggedIn, activeTab, selectedStatDifficulty]); // Re-fetch when difficulty changes

  const fetchUserStats = async () => {
    setStatsLoading(true);
    const token = localStorage.getItem("token");
    const currentUsername = localStorage.getItem("playerName");
    
    try {
      // Fetch leaderboard data for all difficulties
      const statsPromises = difficulties.map(async (diff) => {
        const response = await fetch(`${API_URL}/api/leaderboard/${diff}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const leaderboardData = await response.json();
          // Find the current user in the leaderboard
          const userEntry = leaderboardData.find(
            player => player.username === currentUsername
          );
          return {
            difficulty: diff,
            games_played: userEntry?.games_played || 0,
            games_won: userEntry?.games_won || 0,
            win_rate: userEntry?.games_played > 0 
              ? Math.round((userEntry.games_won / userEntry.games_played) * 100)
              : 0
          };
        }
        return { difficulty: diff, games_played: 0, games_won: 0, win_rate: 0 };
      });
      
      const results = await Promise.all(statsPromises);
      const statsMap = {};
      results.forEach(result => {
        statsMap[result.difficulty] = {
          games_played: result.games_played || 0,
          games_won: result.games_won || 0,
          win_rate: result.win_rate || 0
        };
      });
      
      setUserStats(statsMap);
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const navigateStatDifficulty = (direction) => {
    const currentIndex = difficulties.indexOf(selectedStatDifficulty);
    if (direction === "prev" && currentIndex > 0) {
      const newDifficulty = difficulties[currentIndex - 1];
      setSelectedStatDifficulty(newDifficulty);
      // Also update the global difficulty setting
      setDifficulty(newDifficulty);
    } else if (direction === "next" && currentIndex < difficulties.length - 1) {
      const newDifficulty = difficulties[currentIndex + 1];
      setSelectedStatDifficulty(newDifficulty);
      // Also update the global difficulty setting
      setDifficulty(newDifficulty);
    }
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

  const panelBgClass = {
    light: "bg-white text-black",
    dark: "bg-gray-800 text-white",
    game: "bg-[#0f172a] text-green-400",
    sky: "bg-gradient-to-r from-blue-400 to-blue-600 text-blue-100",
    candy: "bg-gradient-to-r from-pink-400 to-purple-400 text-pink-100"
  }[theme];

  const sidebarBgClass = {
    light: "bg-gray-100",
    dark: "bg-gray-900",
    game: "bg-gray-900",
    sky: "bg-gradient-to-b from-blue-400 to-blue-600",
    candy: "bg-gradient-to-b from-pink-400 to-purple-400"
  }[theme];

  const sidebarActiveClass = {
    light: "bg-gray-300",
    dark: "bg-gray-600",
    game: "bg-gray-600",
    sky: "bg-blue-700",
    candy: "bg-purple-700"
  }[theme];

  const sidebarHoverClass = {
    light: "hover:bg-gray-200",
    dark: "hover:bg-gray-700",
    game: "hover:bg-gray-700",
    sky: "hover:bg-blue-600",
    candy: "hover:bg-purple-500"
  }[theme];

  const buttonBgClass = {
    light: "bg-blue-600 text-white",
    dark: "bg-blue-600 text-white",
    game: "bg-gray-600 text-green-400",
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

  const handleBackNavigation = () => {
    if (fromGame) {
      navigate("/game");
    } else {
      navigate("/");
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/");
  };

  return (
    <div
      className="h-screen w-screen fixed inset-0 flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      <button
        onClick={handleBackNavigation}
        className="absolute top-4 right-4 px-4 py-2 bg-gray-600 text-white 
        rounded-lg hover:bg-gray-700 transition shadow-md
        flex items-center gap-2 z-10"
      >
        <span className="text-lg">←</span>
        {fromGame ? "Back to Game" : "Back to Home"}
      </button>

      <div className="flex flex-col items-center">

        <h1 className="text-5xl text-black font-bold mb-8 text-shadow-lg">
          Settings
        </h1>

        <div className={`h-[65vh] w-[70vw] flex rounded-lg shadow-lg overflow-hidden ${panelBgClass}`}>

          {/* LEFT SIDEBAR */}
          <div className={`w-1/4 border-r flex flex-col ${sidebarBgClass}`}>
            <button
              onClick={() => setActiveTab("user")}
              className={`p-4 text-left ${
                activeTab === "user" ? `${sidebarActiveClass} font-semibold` : `${sidebarHoverClass}`
              }`}
            >
              User Profile
            </button>

            <button
              onClick={() => setActiveTab("difficulty")}
              className={`p-4 text-left ${
                activeTab === "difficulty" ? `${sidebarActiveClass} font-semibold` : `${sidebarHoverClass}`
              }`}
            >
              Difficulty
            </button>

            <button
              onClick={() => setActiveTab("theme")}
              className={`p-4 text-left ${
                activeTab === "theme" ? `${sidebarActiveClass} font-semibold` : `${sidebarHoverClass}`
              }`}
            >
              Theme
            </button>

            <button
              onClick={() => setActiveTab("game display")}
              className={`p-4 text-left ${
                activeTab === "game display" ? `${sidebarActiveClass} font-semibold` : `${sidebarHoverClass}`
              }`}
            >
              Game Display
            </button>

            {isLoggedIn && (
              <button
                onClick={() => setActiveTab("account")}
                className={`p-4 text-left ${
                  activeTab === "account" ? `${sidebarActiveClass} font-semibold` : `${sidebarHoverClass}`
                }`}
              >
                Account Settings
              </button>
            )}
          </div>

          {/* RIGHT CONTENT */}
          <div className={`w-3/4 p-8 overflow-y-auto ${panelBgClass}`}>
            {activeTab === "user" && (
              <div className="space-y-4 text-lg">
                <h2 className="text-2xl font-semibold mb-6">User Profile</h2>
                {isLoggedIn ? (
                  <div className="text-center py-8 px-4 border rounded-lg mt-4">
                    <p className="mb-6">Username: <strong>{username}</strong></p>
                    
                    {/* Difficulty Selector In User Profile */}
                    <div className="flex items-center justify-center gap-6 mb-6">
                      <button
                        onClick={() => navigateStatDifficulty("prev")}
                        disabled={difficulties.indexOf(selectedStatDifficulty) === 0}
                        className={`text-2xl font-bold p-1 rounded-lg transition
                          ${difficulties.indexOf(selectedStatDifficulty) === 0 
                            ? "opacity-30 cursor-not-allowed" 
                            : buttonHoverClass}`}
                      >
                        ‹
                      </button>
                      
                      <div>
                        <p className="text-sm font-medium mb-1">Difficulty:</p>
                        <p className="text-xl font-semibold min-w-[180px]">
                          {getDifficultyDisplayName(selectedStatDifficulty)}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => navigateStatDifficulty("next")}
                        disabled={difficulties.indexOf(selectedStatDifficulty) === difficulties.length - 1}
                        className={`text-2xl font-bold p-1 rounded-lg transition
                          ${difficulties.indexOf(selectedStatDifficulty) === difficulties.length - 1 
                            ? "opacity-30 cursor-not-allowed" 
                            : buttonHoverClass}`}
                      >
                        ›
                      </button>
                    </div>

                    {/* Stats display */}
                    {statsLoading ? (
                      <div className="text-center py-8">
                        <div className="text-xl">Loading stats...</div>
                      </div>
                    ) : (
                      <>
                        <p className="mb-6">Games Played: <strong>{userStats[selectedStatDifficulty]?.games_played || 0}</strong></p>
                        <p className="mb-6">Games Won: <strong>{userStats[selectedStatDifficulty]?.games_won || 0}</strong></p>
                        <p className="mb-6">Win Percentage: <strong>{userStats[selectedStatDifficulty]?.win_rate || 0}%</strong></p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 border rounded-lg mt-8">
                    {/* <p className="text-2xl mb-4">Playing as Guest</p> */}
                    <p className="text-xl mt-6 mb-6">Create an account to save your progress and compete on the leaderboard!</p>
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={() => navigate("/login")}
                        className={`px-6 py-2 mt-4 ${buttonBgClass} rounded-lg ${buttonHoverClass}`}
                      >
                        Log In
                      </button>
                      <button
                        onClick={() => navigate("/signup")}
                        className={`px-6 py-2 mt-4 ${buttonBgClass} rounded-lg ${buttonHoverClass}`}
                      >
                        Sign Up
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "difficulty" && (
              <div className="space-y-4 text-lg">
                <h2 className="text-2xl font-semibold mb-12">Difficulty Settings</h2>

                <h3 className="text-xl font-semibold">General:</h3>
                <p className="text-xs italic mt-2">(General Settings Simulate Chess Matches From Specific ELO Ranges)</p>
                <div className="grid grid-cols-3 gap-4 mt-8">
                  <label className="block">
                    <input 
                    type="radio" 
                    name="difficulty" 
                    value="easy" 
                    checked={difficulty === "easy"} 
                    onChange={() => setDifficulty("easy")} 
                    className="mr-2" 
                    />
                    Easy <text className="text-xs mt-2">(ELO 800-1200)</text>
                  </label>

                  <label className="block">
                    <input 
                    type="radio" 
                    name="difficulty" 
                    value="medium" 
                    checked={difficulty === "medium"} 
                    onChange={() => setDifficulty("medium")} 
                    className="mr-2" 
                    />
                    Medium <text className="text-xs mt-2">(ELO 1200-1600)</text>
                  </label>

                  <label className="block">
                    <input 
                    type="radio" 
                    name="difficulty" 
                    value="hard" 
                    checked={difficulty === "hard"} 
                    onChange={() => setDifficulty("hard")} 
                    className="mr-2" 
                    />
                    Hard <text className="text-xs mt-2">(ELO 1600-2000)</text>
                  </label>
                </div>
                <div className="border-t mt-8">
                  <h3 className="text-xl font-semibold mt-8">Special:</h3>
                  <p className="text-xs italic mt-2">(Special Settings Simulate The Playstyle Of Specific Players)</p>
                  <div className="flex justify-center mt-8">
                    <label className="block">
                      <input 
                      type="radio" 
                      name="difficulty" 
                      value="magnus"
                      checked={difficulty === "magnus"} 
                      onChange={() => setDifficulty("magnus")} 
                      className="mr-2" />
                      Magnus Carlsen
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "theme" && (
              <div className="space-y-4 text-lg">
                <h2 className="text-2xl font-semibold mb-12">Theme Settings</h2>

                <div className="flex flex-col mt-8 gap-6 items-center">
                  {[
                    { label: "Light Mode", value: "light" },
                    { label: "Dark Mode", value: "dark" },
                    { label: "Game Mode", value: "game" },
                    { label: "Sky Mode", value: "sky" },
                    { label: "Candy Mode", value: "candy" }
                  ].map((option) => (
                    <div key={option.value} className="flex items-center mb-4">
                      <input
                        type="radio"
                        name="display"
                        checked={theme === option.value}
                        onChange={() => setTheme(option.value)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 w-32">{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "game display" && (
              <div className="space-y-6 text-lg">
                <h2 className="text-2xl font-semibold mb-16">Game Display Settings</h2>

                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-center">
                    <span className="text-xl w-48 text-left mr-8">Enable Timer:</span>
                    <button
                      onClick={() => setTimerEnabled(prev => !prev)}
                      className={`relative w-16 h-8 rounded-full transition-colors ${
                        timerEnabled ? "bg-green-500" : "bg-gray-400"
                      }`}
                    >
                      <div
                        className={`h-6 w-6 bg-white rounded-full shadow-md transform transition-transform ${
                          timerEnabled ? "translate-x-9" : "translate-x-1"
                        }`}
                      ></div>
                    </button>
                  </div>

                  {timerEnabled && (
                    <div className="flex items-center justify-center mt-4 ml-24 gap-4">
                      <span className="text-xl w-40 text-left mr-8">Timer Duration:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={Math.floor(timerDuration / 60)}
                          onChange={(e) => {
                            let rawValue = e.target.value;
                            
                            if (rawValue.includes('.')) {
                              rawValue = rawValue.split('.')[0];
                            }
                            
                            let minutes = parseInt(rawValue, 10);
                            
                            if (isNaN(minutes) || rawValue === '') {
                              minutes = 1;
                            }
                            
                            minutes = parseInt(minutes.toString(), 10);
                            minutes = Math.max(1, Math.min(60, minutes));
                            setTimerDuration(minutes * 60);
                          }}
                          onFocus={(e) => {
                            e.target.select();
                          }}
                          min="1"
                          max="60"
                          step="1"
                          className={`px-4 py-2 rounded-lg border w-28 text-center ${buttonBgClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                        <span className="text-lg">minutes</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center mt-4">
                    <span className="text-xl w-48 text-left mr-8">Enable Move History:</span>
                    <button
                      onClick={() => setHistoryEnabled(prev => !prev)}
                      className={`relative w-16 h-8 rounded-full transition-colors ${
                        historyEnabled ? "bg-green-500" : "bg-gray-400"
                      }`}
                    >
                      <div
                        className={`h-6 w-6 bg-white rounded-full shadow-md transform transition-transform ${
                          historyEnabled ? "translate-x-9" : "translate-x-1"
                        }`}
                      ></div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "account" && isLoggedIn && (
              <div className="space-y-4 text-lg">
                <h2 className="text-2xl font-semibold mb-12">Account Settings</h2>
                <div className="flex flex-col gap-6">
                  {/* <button
                    onClick={() => {setChangeUsername(true); navigate("/login", { state: { fromGame: fromGame, action: "changeUsername" } })}}
                    className={`px-6 py-3 ${buttonBgClass} rounded-lg 
                              ${buttonHoverClass} transition shadow-md w-64 mx-auto`}
                  >
                    Change Username
                  </button>
                  <button
                    onClick={() => {setChangePassword(true); navigate("/login", { state: { fromGame: fromGame, action: "changePassword" } })}}
                    className={`px-6 py-3 ${buttonBgClass} rounded-lg 
                              ${buttonHoverClass} transition shadow-md w-64 mx-auto`}
                  >
                    Change Password
                  </button> */}
                  <button
                    onClick={handleSignOut}
                    className="px-6 py-3 bg-red-500 text-white rounded-lg 
                              hover:bg-red-600 transition shadow-md w-64 mx-auto mt-24"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
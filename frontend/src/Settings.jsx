import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom";
import { useSettings } from "./SettingsContext";

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("user");
  const { theme, setTheme } = useSettings();
  const { difficulty, setDifficulty } = useSettings();
  const { timerEnabled, setTimerEnabled } = useSettings();
  const { historyEnabled, setHistoryEnabled } = useSettings();

  const fromGame = location.state?.from === 'game';

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
    sky: "hover:bg-blue-700",
    candy: "hover:bg-purple-500"
  }[theme];

  const handleBackNavigation = () => {
    if (fromGame) {
      navigate(-1);
    } else {
      navigate("/");
    }
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
              User
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
              onClick={() => setActiveTab("display")}
              className={`p-4 text-left ${
                activeTab === "display" ? `${sidebarActiveClass} font-semibold` : `${sidebarHoverClass}`
              }`}
            >
              Display
            </button>

            <button
              onClick={() => setActiveTab("gameplay")}
              className={`p-4 text-left ${
                activeTab === "gameplay" ? `${sidebarActiveClass} font-semibold` : `${sidebarHoverClass}`
              }`}
            >
              Gameplay
            </button>

            {fromGame && (
            <button
              onClick={() => setActiveTab("return")}
              className={`p-4 text-left ${
                activeTab === "return"
                  ? `${sidebarActiveClass} font-semibold`
                  : `${sidebarHoverClass}`
              }`}
            >
              Leave Game
            </button>
          )}
          </div>

          {/* RIGHT CONTENT */}
          <div className={`w-3/4 p-8 ${panelBgClass}`}>
             {activeTab === "user" && (
              <div className="space-y-4 text-lg">
                <h2 className="text-2xl font-semibold mb-14">User Profile</h2>
                <p>Username: .....</p>
                <p>Games Played: .....</p>
                <p>Games Won: .....</p>
                <p>Win Percentage: .....</p>
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
                    Easy
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
                    Medium
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
                    Hard
                  </label>
                </div>
                
                <h3 className="text-xl font-semibold mt-12">Special:</h3>
                <p className="text-xs italic mt-2">(Special Settings Simulate The Playstyle Specific Players)</p>
                <div className="grid grid-cols-2 gap-4 pl-73 mt-8">
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
            )}

            {activeTab === "display" && (
              <div className="space-y-4 text-lg">
                <h2 className="text-2xl font-semibold mb-12">Display Settings</h2>

                <div className="flex flex-col mt-8 gap-6 pl-76">
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
                        className="form-radio"
                      />
                      <span className="ml-3 w-32">{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "gameplay" && (
              <div className="space-y-6 text-lg">
                <h2 className="text-2xl font-semibold mb-16">Gameplay Settings</h2>

                <div className="flex flex-col gap-6">
                  <div className="flex items-center">
                    <span className="text-xl w-120 text-left pl-52">Enable Timer:</span>
                    <button
                      onClick={() => setTimerEnabled(prev => !prev)}
                      className={`relative w-15 h-8 rounded-full transition-colors ${
                        timerEnabled ? "bg-green-500" : "bg-gray-400"
                      }`}
                    >
                      <div
                        className={`h-6 w-6 bg-white rounded-full shadow-md transform transition-transform ${
                          timerEnabled ? "translate-x-8" : "translate-x-0"
                        }`}
                      ></div>
                    </button>
                  </div>

                  <div className="flex items-center">
                    <span className="text-xl w-120 text-left pl-52">Enable Move History:</span>
                    <button
                      onClick={() => setHistoryEnabled(prev => !prev)}
                      className={`relative w-15 h-8 rounded-full transition-colors ${
                        historyEnabled ? "bg-green-500" : "bg-gray-400"
                      }`}
                    >
                      <div
                        className={`h-6 w-6 bg-white rounded-full shadow-md transform transition-transform ${
                          historyEnabled ? "translate-x-8" : "translate-x-0"
                        }`}
                      ></div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "return" && fromGame && (
            <div className="space-y-6 text-lg">
              <h2 className="text-2xl font-semibold mb-40">Leave Game</h2>

              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg 
                          hover:bg-gray-700 transition shadow-md"
              >
                Return to Home
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}

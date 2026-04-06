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
  const { changeUsername, setChangeUsername } = useSettings();
  const { changePassword, setChangePassword } = useSettings();
  const { isLoggedIn, setIsLoggedIn, username, setUsername, logout } = useSettings(); // Added username, setUsername, logout

  const fromGame = location.state?.from === 'game' || location.state?.fromGame === true;

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

  // Use the logout function from context to handle sign out, which will clear localStorage and update state
  const handleSignOut = () => {
    logout(); // This handles clearing localStorage and state
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
            {/* User Profile Tab - Always visible */}
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

            {/* Account Settings - Only visible when logged in */}
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
                <h2 className="text-2xl font-semibold mb-8">User Profile</h2>
                {isLoggedIn ? (
                  <div className="text-center py-8 px-4 border rounded-lg mt-8">
                    <p className="mb-6">Username: <strong>{username}</strong></p>
                    <p className="mb-6">Games Played: {localStorage.getItem("gamesPlayed") || "-"}</p>
                    <p className="mb-6">Games Won: {localStorage.getItem("gamesWon") || "-"}</p>
                    <p className="mb-6">Win Percentage: {localStorage.getItem("gamesPlayed") > 0 ? ((localStorage.getItem("gamesWon") || 0) / localStorage.getItem("gamesPlayed") * 100).toFixed(2) : 0}%</p>
                  </div>
                ) : (
                  <>
                    <div className="text-center py-8 px-4 border rounded-lg mt-8">
                      <p className="text-2xl mb-4">Playing as Guest</p>
                      <p className="mb-6">Create an account to save your progress and compete on the leaderboard!</p>
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
                  </>
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

                  <div className="flex items-center justify-center">
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
                  <button
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
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="px-6 py-3 bg-red-500 text-white rounded-lg 
                              hover:bg-red-600 transition shadow-md w-64 mx-auto mt-4"
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
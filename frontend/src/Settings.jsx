import { useState } from "react"
import { useNavigate } from "react-router-dom";
import { useTheme } from "./ThemeContext";

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("difficulty");
  const { theme, setTheme } = useTheme();

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

  return (
    <div
      className="h-screen w-screen fixed inset-0 flex items-center justify-center bg-cover bg-center"
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
          </div>

          {/* RIGHT CONTENT */}
          <div className={`w-3/4 p-8 ${panelBgClass}`}>
             {activeTab === "user" && (
              <div className="space-y-4 text-lg">
                <h2 className="text-2xl font-semibold">User Profile</h2>
                <p>Username: .....</p>
                <p>Games Played: .....</p>
                <p>Games Won: .....</p>
                <p>Win Percentage: .....</p>
                <p>ELO Rating: .....</p>
              </div>
            )}

            {activeTab === "difficulty" && (
              <div className="space-y-4 text-lg">
                <h2 className="text-2xl font-semibold mb-12">Difficulty Settings</h2>

                <h3 className="text-2xl font-semibold">General:</h3>
                <div className="grid grid-cols-3 gap-4 mt-8">
                  <label className="block">
                    <input type="radio" name="difficulty" className="mr-2" />
                    Easy
                  </label>

                  <label className="block">
                    <input type="radio" name="difficulty" className="mr-2" />
                    Medium
                  </label>

                  <label className="block">
                    <input type="radio" name="difficulty" className="mr-2" />
                    Hard
                  </label>
                </div>
                
                <h3 className="text-2xl font-semibold mt-16">Special:</h3>
                <div className="grid grid-cols-2 gap-4 pl-73 mt-8">
                  <label className="block">
                    <input type="radio" name="difficulty" className="mr-2" />
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
                      {/* Radio circle */}
                      <input
                        type="radio"
                        name="display"
                        checked={theme === option.value}
                        onChange={() => setTheme(option.value)}
                        className="form-radio"
                      />
                      
                      {/* Fixed-width text container */}
                      <span className="ml-3 w-32">{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

       </div>
      </div>
    </div>
  )
}
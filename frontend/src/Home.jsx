import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom";
import { useSettings } from "./SettingsContext"

export default function Home() {
  const [count, setCount] = useState(0)
  const navigate = useNavigate();
  const { theme, isLoggedIn, username, logout } = useSettings(); // Use context values
  const scrollContainerRef = useRef(null);

  // Scrolling thresholds
  const HORIZONTAL_SCROLL_THRESHOLD = 1520; // Enable horizontal scroll below 1520px
  const VERTICAL_SCROLL_THRESHOLD = 700; // Enable vertical scroll below 700px

  useEffect(() => {
    const handleResize = () => {
      if (scrollContainerRef.current) {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Reset scroll position when resizing
        scrollContainerRef.current.scrollTop = 0;
        scrollContainerRef.current.scrollLeft = 0;
        
        // Scroll control based on window dimensions
        const shouldHorizontalScroll = windowWidth < HORIZONTAL_SCROLL_THRESHOLD;
        const shouldVerticalScroll = windowHeight < VERTICAL_SCROLL_THRESHOLD;
        
        if (shouldHorizontalScroll) {
          scrollContainerRef.current.style.overflowX = 'auto';
        } else {
          scrollContainerRef.current.style.overflowX = 'hidden';
        }
        
        if (shouldVerticalScroll) {
          scrollContainerRef.current.style.overflowY = 'auto';
        } else {
          scrollContainerRef.current.style.overflowY = 'hidden';
        }
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const topBarBgClass = {
    light: "bg-white/90 backdrop-blur-sm shadow-md",
    dark: "bg-gray-800/90 backdrop-blur-sm shadow-md",
    game: "bg-black/80 backdrop-blur-sm border-b border-green-400",
    sky: "bg-blue-200/90 backdrop-blur-sm shadow-md",
    candy: "bg-pink-200/90 backdrop-blur-sm shadow-md"
  }[theme];

  const topBarTextClass = {
    light: "text-gray-800",
    dark: "text-gray-200",
    game: "text-green-400",
    sky: "text-blue-800",
    candy: "text-pink-800"
  }[theme];

  const handleSignOut = () => {
    logout(); // Use context logout function
    navigate("/");
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <div className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 py-3 ${topBarBgClass}`}>
        <div className={`font-semibold text-lg ${topBarTextClass}`}>
          MindfulMoves
        </div>
        <div className="flex gap-4 items-center">
          {isLoggedIn ? (
            <>
              <span className={`${topBarTextClass}`}>Welcome, {username}!</span>
              <button
                onClick={handleSignOut}
                className={`px-4 py-2 rounded-lg transition ${
                  theme === 'game' 
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/login")}
                className={`px-4 py-2 rounded-lg transition ${
                  theme === 'game' 
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : `${buttonBgClass} ${buttonHoverClass}`
                }`}
              >
                Login
              </button>
              <button
                onClick={() => navigate("/signup")}
                className={`px-4 py-2 rounded-lg transition ${
                  theme === 'game' 
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div 
        ref={scrollContainerRef}
        className="fixed inset-0 pt-16"
        style={{ 
          backgroundImage: "url('/background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflowX: 'hidden',
          overflowY: 'hidden'
        }}
      >
        
        <div className="min-w-[1520px] min-h-[660px] relative flex flex-col items-center justify-center">
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
            className={`w-80 px-8 py-4 text-2xl rounded-lg transition ${buttonBgClass} ${buttonHoverClass}`}
            onClick={() => navigate("/game")}
          >
            Start Game
          </button>
          <div className="flex gap-6 mt-20">
            <button
              className={`w-40 px-6 py-3 rounded-lg transition ${buttonBgClass} ${buttonHoverClass}`}
              onClick={() => navigate("/leaderboard")}
            >
              Leaderboard
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
      </div>
    </>
  )
}
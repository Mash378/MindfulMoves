import { useState } from "react"
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const [count, setCount] = useState(0)
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen fixed inset-0 flex flex-col items-center justify-center bg-cover bg-center"
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

        <div className="h-screen flex flex-col items-center bg-white bg-opacity-80 p-10 rounded-lg shadow-lg">
        <h1 className="text-5xl font-bold mt-16 mb-20">Settings</h1>
            <div className="text-xl">
                <p>Adjust your game settings here:</p>
            </div>
        </div>
  </div>
  )
}

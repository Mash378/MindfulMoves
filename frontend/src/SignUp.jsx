import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function SignUp() {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            alert("Please enter your name");
            return;
        }
        if (!password.trim()) {
            alert("Please enter your password");
            return;
        }
        
        // Register the player
        // TODO: Relpce localStorage.setItem("playerName", name); and add logic to send the name to a backend here
        localStorage.setItem("playerName", name);
        localStorage.setItem("playerPassword", password);
        navigate("/game");
    }
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

      <div className="flex flex-col items-center bg-white bg-opacity-80 p-10 rounded-lg shadow-lg">
        <h2 className="text-5xl font-bold">Sign Up Page</h2>

        <form onSubmit={handleSubmit} className="flex flex-col items-center mt-24">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-2 mb-4 rounded-lg border-2 border-gray-400 text-black w-64 "
          />
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-2 mb-10 rounded-lg border-2 border-gray-400 text-black w-64"
          />

          <button
          onClick={handleSubmit}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Submit
          </button>
        </form>
        <button
          type="button"
          className="mt-4 px-6 py-3 text-2xl text-blue-600 hover:text-blue-800 transition"
          onClick={() => navigate("/login")}
          >
          Login
        </button>
      </div>
    </div>
  )
}
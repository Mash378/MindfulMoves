import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function SignUp() {
    const [name, setName] = useState("");
    const navigate = useNavigate();
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            alert("Please enter your name");
            return;
        }
        if (name.trim === "") return
        // Register the player
        // TODO: Relpce localStorage.setItem("playerName", name); and add logic to send the name to a backend here
        localStorage.setItem("playerName", name);
        navigate("/game");
    }
  return (
    <div className="h-screen">
      <h2 className="text-3xl font-bold mt-20">Sign Up Page</h2>

      <form onSubmit={handleSubmit} className="flex flex-col items-center mt-40">
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-4 py-2 mb-4 rounded-lg border-2 border-gray-400 text-black w-64"
        />
      </form>
    </div>
  )
}
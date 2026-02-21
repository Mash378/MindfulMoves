import './App.css'
import { Routes, Route } from "react-router-dom";
import Home from './Home.jsx'
import SignUp from "./SignUp.jsx";
import Game from "./Game.jsx"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/game" element={<Game />} />
    </Routes>
  )
}

export default App

import "./App.css";
import { Routes, Route } from "react-router-dom";
import Home from "./Home.jsx";
import SignUp from "./SignUp.jsx";
import Login from "./Login.jsx";
import Game from "./Game.jsx";
import Leader_Board from "./Leader_Board.jsx";
import Settings from "./Settings.jsx";
import Credits from "./Credits.jsx";
import { SettingsProvider } from "./SettingsContext.jsx"; 

function App() {
  return (
    <SettingsProvider> {}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/game" element={<Game />} />
        <Route path="/leaderboard" element={<Leader_Board />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/credits" element={<Credits />} />
      </Routes>
    </SettingsProvider>
  );
}

export default App;

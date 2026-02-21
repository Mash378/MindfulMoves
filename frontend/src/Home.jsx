import { useState } from "react"
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [count, setCount] = useState(0)
  const navigate = useNavigate();

  return (
    <>
    <div className="h-screen">
      <h1 className="text-4xl font-bold mt-20">MindfulMoves</h1>
      <button
      className="px-6 py-3 bg-blue-600 mt-60 text-white rounded-lg hover:bg-blue-700 transition"
      onClick={() => navigate("/signup")}
    >
      Start Game
    </button>
    </div>
    </>

    // <>
    //   <div>
    //     <a href="https://vite.dev" target="_blank">
    //       <img src={viteLogo} className="logo" alt="Vite logo" />
    //     </a>
    //     <a href="https://react.dev" target="_blank">
    //       <img src={reactLogo} className="logo react" alt="React logo" />
    //     </a>
    //   </div>
    //   <h1>Vite + React</h1>
    //   <div className="card">
    //     <button onClick={() => setCount((count) => count + 1)}>
    //       count is {count}
    //     </button>
    //     <p>
    //       Edit <code>src/App.jsx</code> and save to test HMR
    //     </p>
    //   </div>
    //   <p className="read-the-docs">
    //     Click on the Vite and React logos to learn more
    //   </p>
    // </>
  )
}

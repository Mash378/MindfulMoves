import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Game() {
  const [playerName, setPlayerName] = useState("");
  const [board, setBoard] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const name = localStorage.getItem("playerName");
    if (!name) {
      navigate("/signup");
    } else {
      setPlayerName(name);
      initializeBoard();
    }
  }, [navigate]);

  const initializeBoard = () => {
    const initialBoard = [
      ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
      ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
      ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
    ];
    setBoard(initialBoard);
  };

  const getPieceStyle = (piece) => {
    const whitePieces = ['♙', '♖', '♘', '♗', '♕', '♔'];
    if (whitePieces.includes(piece)) {
      return 'text-white';
    } else {
      return 'text-black';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="grid grid-cols-8 gap-0">
        {board.map((row, rowIndex) => (
          row.map((piece, colIndex) => {
            const isDarkSquare = (rowIndex + colIndex) % 2 === 1;
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`
                  w-16 h-16 flex items-center justify-center text-4xl
                  ${isDarkSquare ? 'bg-gray-600' : 'bg-gray-300'}
                  ${piece ? getPieceStyle(piece) : ''}
                `}
              >
                {piece}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
}
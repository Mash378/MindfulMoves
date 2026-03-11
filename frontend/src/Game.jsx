import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000";

const FEN_PIECES = {
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
};

function fenToBoard(fen) {
  const rows = fen.split(" ")[0].split("/");
  return rows.map(row => {
    const cells = [];
    for (const ch of row) {
      if (isNaN(ch)) {
        cells.push(FEN_PIECES[ch] || "");
      } else {
        for (let i = 0; i < parseInt(ch); i++) cells.push("");
      }
    }
    return cells;
  });
}

function squareToIndex(square) {
  const files = "abcdefgh";
  const col = files.indexOf(square[0]);
  const row = 8 - parseInt(square[1]);
  return { row, col };
}

function indexToSquare(row, col) {
  const files = "abcdefgh";
  return `${files[col]}${8 - row}`;
}

const WHITE_PIECES = ["♔", "♕", "♖", "♗", "♘", "♙"];
const BLACK_PIECES = ["♚", "♛", "♜", "♝", "♞", "♟"];

//Promotion
function PromotionModal({ playerColor, onSelect }) {
  const pieces = playerColor === "white"
    ? [{ uci: "q", icon: "♕" }, { uci: "r", icon: "♖" },
       { uci: "b", icon: "♗" }, { uci: "n", icon: "♘" }]
    : [{ uci: "q", icon: "♛" }, { uci: "r", icon: "♜" },
       { uci: "b", icon: "♝" }, { uci: "n", icon: "♞" }];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 flex flex-col items-center gap-4 shadow-2xl">
        <p className="text-white text-lg font-semibold">Promote pawn to:</p>
        <div className="flex gap-4">
          {pieces.map(({ uci, icon }) => (
            <button
              key={uci}
              onClick={() => onSelect(uci)}
              className="w-16 h-16 text-5xl flex items-center justify-center
                         bg-gray-600 hover:bg-yellow-500 rounded-lg transition-colors"
            >
              {icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Game() {
  const [playerName, setPlayerName]   = useState("");
  const [board, setBoard]             = useState([]);
  const [sessionId, setSessionId]     = useState(null);
  const [selectedSquare, setSelected] = useState(null);
  const [legalMoves, setLegalMoves]   = useState([]);
  const [lastBotMove, setLastBotMove] = useState(null);
  const [playerColor, setPlayerColor] = useState("white");
  const [turn, setTurn]               = useState("white");
  const [status, setStatus]           = useState("loading");
  const [message, setMessage]         = useState("");
  const [botStyle]                    = useState("Tactical");
  const [targetElo]                   = useState(1600);
  const [pendingPromotion, setPendingPromotion] = useState(null); 

  const navigate = useNavigate();

  useEffect(() => {
    const name = localStorage.getItem("playerName");
    if (!name) { navigate("/signup"); return; }
    setPlayerName(name);
    startGame();
  }, [navigate]);

  const startGame = async () => {
    try {
      setStatus("loading");
      const res  = await fetch(`${API_BASE}/chess/game/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_color: playerColor,
          bot_style:    botStyle,
          target_elo:   targetElo,
        }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
      setBoard(fenToBoard(data.board.fen));
      setTurn(data.board.turn);
      setStatus("playing");
      setPendingPromotion(null);
      console.log("Session ID:", data.session_id);  //Debugging
      if (data.bot_opening_move) {
        const { from, to } = parseBotMove(data.bot_opening_move.move);
        setLastBotMove({ from, to, error_level: data.bot_opening_move.error_level });
        setMessage(`Bot played ${data.bot_opening_move.move} [${data.bot_opening_move.error_level}]`);
      }
    } catch (err) {
      setMessage("Failed to connect to server");
    }
  };

  //Check if a move is a pawn promotion
  const isPromotion = (fromSquare, toSquare) => {
    const piece    = board[squareToIndex(fromSquare).row][squareToIndex(fromSquare).col];
    const toRow    = squareToIndex(toSquare).row;
    const isPawn   = piece === "♙" || piece === "♟";
    const isLastRank = playerColor === "white" ? toRow === 0 : toRow === 7;
    return isPawn && isLastRank;
  };

  // Handle promotion piece selection
  const handlePromotionSelect = async (promotionPiece) => {
    if (!pendingPromotion) return;
    setPendingPromotion(null);
    await sendMove(pendingPromotion.from, pendingPromotion.to, promotionPiece);
  };

  const handleSquareClick = useCallback(async (row, col) => {
    if (status !== "playing") return;
    if (turn !== playerColor) return;

    const clickedSquare = indexToSquare(row, col);
    const piece         = board[row]?.[col];
    const isPlayerPiece = playerColor === "white"
      ? WHITE_PIECES.includes(piece)
      : BLACK_PIECES.includes(piece);

    if (!selectedSquare) {
      if (!isPlayerPiece) return;
      setSelected({ row, col });
      fetchLegalMoves(clickedSquare);
      return;
    }

    if (selectedSquare.row === row && selectedSquare.col === col) {
      setSelected(null);
      setLegalMoves([]);
      return;
    }

    if (isPlayerPiece) {
      setSelected({ row, col });
      fetchLegalMoves(clickedSquare);
      return;
    }

    const fromSquare = indexToSquare(selectedSquare.row, selectedSquare.col);
    const toSquare   = clickedSquare;
    setSelected(null);
    setLegalMoves([]);

    //  Check promotion before sending move
    if (isPromotion(fromSquare, toSquare)) {
      setPendingPromotion({ from: fromSquare, to: toSquare });
      return;  
    }

    await sendMove(fromSquare, toSquare);
  }, [status, turn, playerColor, board, selectedSquare, sessionId, legalMoves]);

  const fetchLegalMoves = async (fromSquare) => {
    if (!sessionId) return;
    try {
      const res  = await fetch(
        `${API_BASE}/chess/game/legal?session_id=${sessionId}&from_square=${fromSquare}`
      );
      const data = await res.json();
      setLegalMoves(data.legal_moves || []);
    } catch (err) {
      console.error("Failed to fetch legal moves", err);
    }
  };

  const sendMove = async (fromSquare, toSquare, promotion = null) => {
    if (!sessionId) return;
    try {
      const body = { session_id: sessionId, from_square: fromSquare, to_square: toSquare };
      if (promotion) body.promotion = promotion;

      const res = await fetch(`${API_BASE}/chess/game/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage(err.detail?.message || "Illegal move");
        return;
      }

      const data = await res.json();
      setBoard(fenToBoard(data.board.fen));
      setTurn(data.board.turn);
// Debugging
      fetch(`${API_BASE}/chess/game/history/flat?session_id=${sessionId}`)
            .then(r => r.json())
            .then(d => console.table(d.moves));

      if (data.bot_move) {
        const { from, to } = parseBotMove(data.bot_move.move);
        setLastBotMove({ from, to, error_level: data.bot_move.error_level });
        // setMessage(`Bot: ${data.bot_move.move} [${data.bot_move.error_level}]`);
      } else {
        setLastBotMove(null);
        setMessage("");
      }
      // For debugging
      if (data.board.is_checkmate) {
        setStatus("game_over");
        fetch(`${API_BASE}/chess/game/history/flat?session_id=${sessionId}`)
        .then(r => r.json())
        .then(d => console.table(d.moves));
        setMessage(`Checkmate! ${data.board.result}`);
      } else if (data.board.is_stalemate) {
        setStatus("game_over");
        setMessage("Stalemate!");
      } else if (data.board.is_check) {
        setMessage(`Check! Bot: ${data.bot_move?.move} [${data.bot_move?.error_level}]`);
      }

    } catch (err) {
      setMessage("Server error");
      console.error(err);
    }
  };

  const parseBotMove = (uci) => {
    const from = squareToIndex(uci.slice(0, 2));
    const to   = squareToIndex(uci.slice(2, 4));
    return { from, to };
  };

  const getSquareStyle = (row, col) => {
    const isDark     = (row + col) % 2 === 1;
    const square     = indexToSquare(row, col);
    const isSelected = selectedSquare?.row === row && selectedSquare?.col === col;
    const isLegal    = legalMoves.some(m => m.slice(2, 4) === square);
    const isBotFrom  = lastBotMove?.from.row === row && lastBotMove?.from.col === col;
    const isBotTo    = lastBotMove?.to.row   === row && lastBotMove?.to.col   === col;

    if (isSelected) return "bg-yellow-400";
    if (isBotTo)    return "bg-red-400";
    if (isBotFrom)  return "bg-red-200";
    if (isLegal)    return isDark ? "bg-green-600" : "bg-green-300";
    return isDark   ? "bg-gray-600" : "bg-gray-300";
  };

  const getPieceStyle = (piece) => WHITE_PIECES.includes(piece) ? "text-white" : "text-black";

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white text-xl">Loading game...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">

      {/* Promotion modal */}
      {pendingPromotion && (
        <PromotionModal
          playerColor={playerColor}
          onSelect={handlePromotionSelect}
        />
      )}

      <div className="text-white text-lg">
        {playerName} — Playing as {playerColor} vs {botStyle} bot ({targetElo} ELO)
      </div>

      {message && (
        <div className="px-4 py-2 rounded bg-gray-800 text-white text-sm">
          {message}
        </div>
      )}

      <div className="text-gray-400 text-sm">
        {status === "game_over"
          ? "Game over"
          : `${turn === playerColor ? "Your" : "Bot's"} turn`}
      </div>

      <div className="grid grid-cols-8 gap-0 border-2 border-gray-700">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              onClick={() => handleSquareClick(rowIndex, colIndex)}
              className={`
                w-16 h-16 flex items-center justify-center text-4xl cursor-pointer
                ${getSquareStyle(rowIndex, colIndex)}
                ${piece ? getPieceStyle(piece) : ""}
                hover:opacity-80 transition-opacity
              `}
            >
              {piece || (
                legalMoves.some(m => m.slice(2, 4) === indexToSquare(rowIndex, colIndex)) &&
                <div className="w-3 h-3 rounded-full bg-green-500 opacity-60" />
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={startGame}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          New Game
        </button>
        <button
          onClick={() => { setPlayerColor(c => c === "white" ? "black" : "white"); startGame(); }}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Flip Color
        </button>
      </div>
    </div>
  );
}
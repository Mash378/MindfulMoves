import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "./SettingsContext.jsx";

const API_BASE = "http://localhost:8000";

// ── FEN → your piece name format ──────────────────────────────────────────────
const FEN_TO_PIECE = {
  K: "LightKing",  Q: "LightQueen",  R: "LightRook",
  B: "LightBishop", N: "LightKnight", P: "LightPawn",
  k: "DarkKing",   q: "DarkQueen",   r: "DarkRook",
  b: "DarkBishop", n: "DarkKnight",  p: "DarkPawn",
};

function fenToBoard(fen) {
  const rows = fen.split(" ")[0].split("/");
  return rows.map(row => {
    const cells = [];
    for (const ch of row) {
      if (isNaN(ch)) cells.push(FEN_TO_PIECE[ch] || "");
      else for (let i = 0; i < parseInt(ch); i++) cells.push("");
    }
    return cells;
  });
}

function indexToSquare(row, col) {
  return `${"abcdefgh"[col]}${8 - row}`;
}

function squareToIndex(square) {
  return { row: 8 - parseInt(square[1]), col: "abcdefgh".indexOf(square[0]) };
}

export default function Game() {
  const [playerName, setPlayerName]       = useState("");
  const [board, setBoard]                 = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState("Light");
  const [validMoves, setValidMoves]       = useState([]);
  const [gameStatus, setGameStatus]       = useState("playing");
  const [moveHistory, setMoveHistory]     = useState([]);
  const [moveFeedback, setMoveFeedback] = useState(null);
  const [showOpponentProfile, setShowOpponentProfile] = useState(false);
  const [timer, setTimer] = useState({ Light: 600, Dark: 600, active: false, startTime: null });

  // ── API state ─────────────────────────────────────────────────────────────
  const [sessionId, setSessionId]       = useState(null);
  const [botStyle]                      = useState("Tactical");
  const [targetElo]                     = useState(1600);
  const [playerColor]                   = useState("white");
  const [pendingPromotion, setPendingPromotion] = useState(null);

  const navigate = useNavigate();
  const { timerEnabled, historyEnabled, theme } = useSettings();

  // ── Save/restore game state (keep existing) ───────────────────────────────
  const saveGameState = () => {
    localStorage.setItem("gameState", JSON.stringify({
      board, currentPlayer, gameStatus, moveHistory, timer, playerName
    }));
  };

  useEffect(() => {
    const savedState = localStorage.getItem("gameState");
    if (savedState) {
      const { board: b, currentPlayer: cp, gameStatus: gs,
              moveHistory: mh, timer: t, playerName: pn } = JSON.parse(savedState);
      setBoard(b); setCurrentPlayer(cp); setGameStatus(gs);
      setMoveHistory(mh); setTimer(t); setPlayerName(pn);
      localStorage.removeItem("gameState");
    }
  }, []);

  // ── Start game via API ────────────────────────────────────────────────────
  useEffect(() => {
    const name = localStorage.getItem("playerName");
    if (!name) { navigate("/signup"); return; }
    setPlayerName(name);
    startGame();
  }, [navigate]);

  const startGame = async () => {
    try {
      const res  = await fetch(`${API_BASE}/chess/game/new`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ player_color: playerColor, bot_style: botStyle, target_elo: targetElo }),
      });
      const data = await res.json();
      console.log("Session ID:", data.session_id);
      setSessionId(data.session_id);
      setBoard(fenToBoard(data.board.fen));
      setCurrentPlayer("Light");
      setSelectedPiece(null);
      setValidMoves([]);
      setMoveHistory([]);
      setGameStatus("playing");
      setTimer({ Light: 600, Dark: 600, active: false, startTime: null });

      if (data.bot_opening_move) {
        addToHistory("Dark", data.bot_opening_move.move, null, null, data.bot_opening_move.error_level);
      }
    } catch (err) {
      console.error("Failed to connect to API, using local board:", err);
      initializeBoard();
    }
  };

  // ── Fallback local board if API unavailable ───────────────────────────────
  const initializeBoard = () => {
    setBoard([
      ["DarkRook","DarkKnight","DarkBishop","DarkQueen","DarkKing","DarkBishop","DarkKnight","DarkRook"],
      ["DarkPawn","DarkPawn","DarkPawn","DarkPawn","DarkPawn","DarkPawn","DarkPawn","DarkPawn"],
      ["","","","","","","",""],["","","","","","","",""],
      ["","","","","","","",""],["","","","","","","",""],
      ["LightPawn","LightPawn","LightPawn","LightPawn","LightPawn","LightPawn","LightPawn","LightPawn"],
      ["LightRook","LightKnight","LightBishop","LightQueen","LightKing","LightBishop","LightKnight","LightRook"],
    ]);
    setCurrentPlayer("Light");
    setSelectedPiece(null);
    setValidMoves([]);
    setMoveHistory([]);
    setGameStatus("playing");
    setTimer({ Light: 600, Dark: 600, active: false, startTime: null });
  };

  // ── Timer (keep existing) ─────────────────────────────────────────────────
  useEffect(() => {
    let interval;
    if (timer.active && gameStatus === "playing" && timerEnabled) {
      interval = setInterval(() => {
        setTimer(prev => {
          const newTime = { ...prev, [currentPlayer]: Math.max(0, prev[currentPlayer] - 1) };
          if (newTime[currentPlayer] === 0) setGameStatus("timeout");
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer.active, currentPlayer, gameStatus, timerEnabled]);

  // ── Fetch legal moves from API ────────────────────────────────────────────
  const fetchLegalMoves = async (row, col) => {
    if (!sessionId) return;
    try {
      const res  = await fetch(
        `${API_BASE}/chess/game/legal?session_id=${sessionId}&from_square=${indexToSquare(row, col)}`
      );
      const data = await res.json();
      setValidMoves((data.legal_moves || []).map(uci => {
        const { row, col } = squareToIndex(uci.slice(2, 4));
        return [row, col];
      }));
    } catch (err) {
      console.error("Failed to fetch legal moves:", err);
    }
  };

  // ── Add to move history ───────────────────────────────────────────────────
  const addToHistory = (player, uci, piece, capturedPiece, quality = null) => {
    if (!historyEnabled) return;
    const notation = uci; // use UCI notation, or convert if you prefer algebraic
    setMoveHistory(prev => [...prev, { player, notation, piece, quality }]);
  };

  // ── Send move to API ──────────────────────────────────────────────────────
  const sendMove = async (startRow, startCol, endRow, endCol) => {
    if (!sessionId) return;

    const fromSquare = indexToSquare(startRow, startCol);
    const toSquare   = indexToSquare(endRow, endCol);
    const piece      = board[startRow][startCol];

    // Check promotion
    const isPawn     = piece?.includes("Pawn");
    const isLastRank = currentPlayer === "Light" ? endRow === 0 : endRow === 7;
    if (isPawn && isLastRank) {
      setPendingPromotion({ fromSquare, toSquare, startRow, startCol, endRow, endCol, piece });
      return;
    }

    await executeMove(fromSquare, toSquare, null, startRow, startCol, endRow, endCol, piece);
  };

  const executeMove = async (fromSquare, toSquare, promotion, startRow, startCol, endRow, endCol, piece) => {
    if (!sessionId) return;
    try {
      if (!timer.active && timerEnabled) {
        setTimer(prev => ({ ...prev, active: true }));
      }

      const res = await fetch(`${API_BASE}/chess/game/move`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          session_id:  sessionId,
          from_square: fromSquare,
          to_square:   toSquare,
          ...(promotion && { promotion }),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.log("Move rejected:", err);
        return;
      }

      const data = await res.json();

      // ── Board + history update immediately ──────────────────────────────────
      setBoard(fenToBoard(data.board.fen));
      setCurrentPlayer(data.board.turn === "white" ? "Light" : "Dark");

      const capturedPiece = board[endRow][endCol];
      const uci = `${fromSquare}${toSquare}${promotion || ""}`;
      addToHistory("Light", uci, piece, capturedPiece, null);

      if (data.bot_move) {
        addToHistory("Dark", data.bot_move.move, null, null, data.bot_move.error_level);
        console.log(`Bot: ${data.bot_move.move} [${data.bot_move.error_level}]`);
      }

      if (data.board.is_checkmate) setGameStatus("checkmate");
      else if (data.board.is_stalemate) setGameStatus("stalemate");
      else if (data.board.is_check) setGameStatus("check");
      else setGameStatus("playing");

      if (data.status === "game_over") {
        fetch(`${API_BASE}/chess/game/history/flat?session_id=${sessionId}`)
          .then(r => r.json())
          .then(d => console.table(d.moves));
      }

      // ── Feedback call — fires after board is already updated ────────────────
      fetch(`${API_BASE}/chess/game/feedback`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id:   sessionId,
          uci:          uci,
          player_color: playerColor,
        }),
      })
        .then(r => r.json())
        .then(fb => {
          setMoveFeedback({ quality: fb.quality, move: uci });
          setTimeout(() => setMoveFeedback(null), 3000);

          // Retroactively stamp quality on the last Light move in history
          setMoveHistory(prev => {
            const updated = [...prev];
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].player === "Light") {
                updated[i] = { ...updated[i], quality: fb.quality };
                break;
              }
            }
            return updated;
          });
        })
        .catch(err => console.warn("Feedback fetch failed (non-fatal):", err));

    } catch (err) {
      console.error("Move error:", err);
    }
  };

  // ── Handle promotion ──────────────────────────────────────────────────────
  const handlePromotionSelect = async (promotionPiece) => {
    if (!pendingPromotion) return;
    const { fromSquare, toSquare, startRow, startCol, endRow, endCol, piece } = pendingPromotion;
    setPendingPromotion(null);
    await executeMove(fromSquare, toSquare, promotionPiece, startRow, startCol, endRow, endCol, piece);
  };

  // ── Square click — replaces old handleSquareClick ─────────────────────────
  const handleSquareClick = async (row, col) => {
    if (gameStatus !== "playing" && gameStatus !== "check") return;
    if (currentPlayer !== "Light") return; // only Light (human) can click

    const piece      = board[row][col];
    const pieceColor = piece?.startsWith("Light") ? "Light" : piece?.startsWith("Dark") ? "Dark" : null;

    // Select piece
    if (!selectedPiece && piece && pieceColor === "Light") {
      setSelectedPiece({ row, col });
      await fetchLegalMoves(row, col);
      return;
    }

    if (selectedPiece) {
      const isValid = validMoves.some(([r, c]) => r === row && c === col);

      if (isValid) {
        await sendMove(selectedPiece.row, selectedPiece.col, row, col);
      } else if (piece && pieceColor === "Light") {
        // Reselect different piece
        setSelectedPiece({ row, col });
        await fetchLegalMoves(row, col);
        return;
      }

      setSelectedPiece(null);
      setValidMoves([]);
    }
  };

  const handleSettingsClick = () => {
    saveGameState();
    navigate("/settings", { state: { from: "game" } });
  };

  // ── Keep all your existing helpers ───────────────────────────────────────
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getPieceImage = (piece) => piece ? `/ChessPieces/${piece}.webp` : null;

  const buttonBgClass = {
    light: "bg-blue-600 text-white", dark: "bg-blue-600 text-white",
    game: "bg-[#0f172a] text-green-400", sky: "bg-blue-400 text-blue-100",
    candy: "bg-pink-400 text-pink-100"
  }[theme];

  const buttonHoverClass = {
    light: "hover:bg-blue-700", dark: "hover:bg-blue-700",
    game: "hover:bg-gray-700", sky: "hover:bg-blue-500",
    candy: "hover:bg-pink-500"
  }[theme];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">

      {/* Promotion modal */}
      {pendingPromotion && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 flex flex-col items-center gap-4">
            <p className="text-white text-lg font-semibold">Promote pawn to:</p>
            <div className="flex gap-4">
              {["Queen", "Rook", "Bishop", "Knight"].map(p => (
                <button
                  key={p}
                  onClick={() => handlePromotionSelect(p[0].toLowerCase())}
                  className="w-16 h-16 flex items-center justify-center bg-gray-600 hover:bg-yellow-500 rounded-lg transition-colors"
                >
                  <img src={`/ChessPieces/Light${p}.webp`} className="w-12 h-12" alt={p} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top bar — keep existing */}
      <div className="mb-4 flex items-center justify-center space-x-4">
        {timerEnabled && (
          <>
            <div className={`px-4 py-2 ${buttonBgClass} rounded`}>Light: {formatTime(timer.Light)}</div>
            <div className={`px-4 py-2 ${buttonBgClass} rounded`}>Dark: {formatTime(timer.Dark)}</div>
          </>
        )}
        <div className={`px-4 py-2 ${buttonBgClass} rounded`}>
          {gameStatus === "check" ? "⚠️ Check!" : `Turn: ${currentPlayer}`}
        </div>
        <button onClick={() => setShowOpponentProfile(true)} className={`px-4 py-2 ${buttonBgClass} rounded ${buttonHoverClass}`}>
          Opponent
        </button>
        <button onClick={handleSettingsClick} className={`px-4 py-2 ${buttonBgClass} rounded ${buttonHoverClass}`}>
          Settings
        </button>
        <button onClick={startGame} className={`px-4 py-2 ${buttonBgClass} rounded ${buttonHoverClass}`}>
          New Game
        </button>
      </div>

      {/* Game over banner */}
      {(gameStatus === "checkmate" || gameStatus === "stalemate" || gameStatus === "timeout") && (
        <div className="mb-4 px-6 py-3 bg-red-700 text-white rounded-lg text-lg font-semibold">
          {gameStatus === "checkmate" && `Checkmate! ${currentPlayer === "Light" ? "Dark" : "Light"} wins!`}
          {gameStatus === "stalemate" && "Stalemate — draw!"}
          {gameStatus === "timeout"   && `${currentPlayer} ran out of time!`}
        </div>
      )}

      {/* Move feedback toast */}
        {moveFeedback && (
          <div className={`
            fixed bottom-8 left-1/2 -translate-x-1/2
            px-5 py-3 rounded-xl shadow-lg text-white font-semibold text-sm
            flex items-center gap-2 transition-all z-50
            ${moveFeedback.quality === "Good"       ? "bg-green-600"  :
              moveFeedback.quality === "Inaccuracy" ? "bg-yellow-500" :
              moveFeedback.quality === "Mistake"    ? "bg-orange-500" :
                                                      "bg-red-600"}
          `}>
            <span>{
              moveFeedback.quality === "Good"       ? "✅" :
              moveFeedback.quality === "Inaccuracy" ? "⚠️" :
              moveFeedback.quality === "Mistake"    ? "❌" : "💀"
            }</span>
            <span>{moveFeedback.move}</span>
            <span className="font-bold">{moveFeedback.quality}</span>
          </div>
        )}

      <div className="flex">
        {/* Board — keep existing render, just remove old isValidMove references */}
        <div className="grid grid-cols-8 gap-0 border-2 border-gray-800">
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const isDarkSquare = (rowIndex + colIndex) % 2 === 1;
              const isValid      = validMoves.some(([r, c]) => r === rowIndex && c === colIndex);
              const isSelected   = selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex;
              const imagePath    = getPieceImage(piece);

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                  className={`
                    w-16 h-16 flex items-center justify-center cursor-pointer relative
                    ${isSelected   ? "bg-yellow-400" :
                      isDarkSquare ? "bg-gray-600"   : "bg-gray-300"}
                    hover:opacity-75 transition-opacity
                  `}
                >
                  {isValid && piece && (
                    <div className="absolute inset-0 border-4 border-red-500 pointer-events-none" />
                  )}
                  {isValid && !piece && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 bg-green-500 bg-opacity-50 rounded-full" />
                    </div>
                  )}
                  {imagePath && (
                    <img src={imagePath} alt={piece} className="w-12 h-12 object-contain z-10" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Move history — keep existing */}
        {historyEnabled && (
          <div className="ml-6 w-64 bg-gray-800 rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-bold mb-3 text-center text-white">Move History</h3>
            <div className="h-96 overflow-y-auto">
              {moveHistory.length === 0 ? (
                <p className="text-gray-400 text-center">No moves yet</p>
              ) : (
                <div className="space-y-1">
                  {moveHistory.map((move, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded ${move.player === "Light" ? "bg-gray-700" : "bg-gray-600"} text-white`}
                    >
                      <span className="font-mono">
                        {Math.floor(index / 2) + 1}.
                        {index % 2 === 0 ? " " : "... "}
                        {move.notation}
                      </span>
                      {move.quality && (
                        <span className={`ml-2 text-xs ${
                          move.quality === "Good"       ? "text-green-400"  :
                          move.quality === "Inaccuracy" ? "text-yellow-400" :
                          move.quality === "Mistake"    ? "text-orange-400" :
                          "text-red-400"
                        }`}>
                          [{move.quality}]
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 text-sm text-gray-400 text-center">
              {moveHistory.length} move{moveHistory.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Opponent profile modal — keep existing exactly */}
      {showOpponentProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Opponent Profile</h2>
              <button onClick={() => setShowOpponentProfile(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-3">
                <span className="text-4xl text-gray-400">?</span>
              </div>
              <h3 className="text-xl font-semibold text-white">MindfulMoves Bot</h3>
              <p className="text-gray-400 text-sm mt-1">{botStyle} • {targetElo} ELO</p>
            </div>
            <div className="space-y-3">
              {[
                ["Style",      botStyle],
                ["ELO Rating", targetElo],
                ["Difficulty", "1600 ELO"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center p-3 bg-gray-700 rounded">
                  <span className="text-gray-300">{label}:</span>
                  <span className="text-white">{value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowOpponentProfile(false)}
              className="mt-6 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
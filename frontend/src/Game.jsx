import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "./SettingsContext.jsx";
import { fenToBoard, boardPositionToUci } from "./chessUtils.js";

const API_URL = import.meta.env.VITE_API_URL;

function apiHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export default function Game() {
  const [playerName, setPlayerName] = useState("");
  const [board, setBoard] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [gameStatus, setGameStatus] = useState("playing");
  const [backendStatus, setBackendStatus] = useState("active");
  const [moveHistory, setMoveHistory] = useState([]);
  const [showOpponentProfile, setShowOpponentProfile] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [gameId, setGameId] = useState("");
  const [currentFen, setCurrentFen] = useState("");
  const [timer, setTimer] = useState({
    Light: 600,
    Dark: 600,
    active: false,
    startTime: null
  });
  const navigate = useNavigate();

  const { timerEnabled, historyEnabled } = useSettings();

  const saveGameState = () => {
    const gameState = {
      board,
      gameStatus,
      backendStatus,
      moveHistory,
      timer,
      playerName,
      gameId,
      currentFen
    };
    localStorage.setItem('gameState', JSON.stringify(gameState));
  };

  useEffect(() => {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      setBoard(parsed.board);
      setGameStatus(parsed.gameStatus);
      setBackendStatus(parsed.backendStatus || "active");
      setMoveHistory(parsed.moveHistory);
      setTimer(parsed.timer);
      setPlayerName(parsed.playerName);
      setGameId(parsed.gameId || "");
      setCurrentFen(parsed.currentFen || "");
      localStorage.removeItem('gameState');
      return;
    }

    const name = localStorage.getItem("playerName");
    if (!name) {
      navigate("/signup");
      return;
    }
    setPlayerName(name);

    const storedGameId = localStorage.getItem("gameId");
    const storedFen = localStorage.getItem("currentFen");
    if (storedGameId && storedFen) {
      setGameId(storedGameId);
      setCurrentFen(storedFen);
      setBoard(fenToBoard(storedFen));
      setGameStatus("playing");
      setBackendStatus("active");
    } else {
      createNewGame();
    }
  }, [navigate]);

  useEffect(() => {
    let interval;
    if (timer.active && gameStatus === 'playing' && timerEnabled) {
      interval = setInterval(() => {
        setTimer(prev => {
          const newTime = {
            ...prev,
            Light: Math.max(0, prev.Light - 1)
          };

          if (newTime.Light === 0) {
            setGameStatus('timeout');
            clearInterval(interval);
          }

          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer.active, gameStatus, timerEnabled]);

  const createNewGame = async () => {
    try {
      const res = await fetch(`${API_URL}/game/new`, {
        method: "POST",
        headers: apiHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) {
          navigate("/signup");
          return;
        }
        return;
      }
      const data = await res.json();
      setGameId(data.game_id);
      setCurrentFen(data.fen);
      setBoard(fenToBoard(data.fen));
      localStorage.setItem("gameId", data.game_id);
      localStorage.setItem("currentFen", data.fen);
      setSelectedPiece(null);
      setValidMoves([]);
      setMoveHistory([]);
      setTimer({ Light: 600, Dark: 600, active: false, startTime: null });
      setGameStatus("playing");
      setBackendStatus("active");
    } catch {
      // Network error — silently fail, user can retry with New Game
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPieceImage = (piece) => {
    if (!piece) return null;
    return `/ChessPieces/${piece}.webp`;
  };

  const getPieceColor = (piece) => {
    if (!piece) return null;
    return piece.startsWith('Light') ? 'Light' : 'Dark';
  };

  const getPieceType = (piece) => {
    if (!piece) return null;
    return piece.replace('Light', '').replace('Dark', '');
  };

  const getChessNotation = (piece, startRow, startCol, endRow, endCol, capturedPiece) => {
    const pieceType = getPieceType(piece);
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    let notation = '';

    if (pieceType !== 'Pawn') {
      const pieceLetters = {
        'King': 'K',
        'Queen': 'Q',
        'Rook': 'R',
        'Bishop': 'B',
        'Knight': 'N'
      };
      notation += pieceLetters[pieceType] || '';
    }

    if (capturedPiece) {
      if (pieceType === 'Pawn') {
        notation += files[startCol];
      }
      notation += 'x';
    }

    notation += files[endCol] + ranks[endRow];

    return notation;
  };

  const isValidMove = (startRow, startCol, endRow, endCol, piece) => {
    const pieceType = getPieceType(piece);
    const pieceColor = getPieceColor(piece);
    const targetPiece = board[endRow][endCol];
    const targetColor = getPieceColor(targetPiece);

    if (targetColor === pieceColor) return false;

    let isValidBasicMove = false;

    switch (pieceType) {
      case 'Pawn':
        isValidBasicMove = isValidPawnMove(startRow, startCol, endRow, endCol, pieceColor, targetPiece);
        break;
      case 'Rook':
        isValidBasicMove = isValidRookMove(startRow, startCol, endRow, endCol);
        break;
      case 'Knight':
        isValidBasicMove = isValidKnightMove(startRow, startCol, endRow, endCol);
        break;
      case 'Bishop':
        isValidBasicMove = isValidBishopMove(startRow, startCol, endRow, endCol);
        break;
      case 'Queen':
        isValidBasicMove = isValidQueenMove(startRow, startCol, endRow, endCol);
        break;
      case 'King':
        isValidBasicMove = isValidKingMove(startRow, startCol, endRow, endCol);
        break;
      default:
        return false;
    }

    if (!isValidBasicMove) return false;

    return !wouldMoveLeaveKingInCheck(startRow, startCol, endRow, endCol, pieceColor);
  };

  const wouldMoveLeaveKingInCheck = (startRow, startCol, endRow, endCol, pieceColor) => {
    const tempBoard = board.map(row => [...row]);

    const movingPiece = tempBoard[startRow][startCol];
    tempBoard[endRow][endCol] = movingPiece;
    tempBoard[startRow][startCol] = '';

    let kingRow, kingCol;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = tempBoard[i][j];
        if (piece === `${pieceColor}King`) {
          kingRow = i;
          kingCol = j;
          break;
        }
      }
    }

    const opponentColor = pieceColor === 'Light' ? 'Dark' : 'Light';
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = tempBoard[i][j];
        if (piece && getPieceColor(piece) === opponentColor) {
          if (canPieceAttackSquare(i, j, kingRow, kingCol, piece, tempBoard)) {
            return true;
          }
        }
      }
    }

    return false;
  };

  const canPieceAttackSquare = (pieceRow, pieceCol, targetRow, targetCol, piece, currentBoard) => {
    const pieceType = getPieceType(piece);
    const pieceColor = getPieceColor(piece);

    if (pieceType === 'Pawn') {
      const direction = pieceColor === 'Light' ? -1 : 1;
      return (Math.abs(targetCol - pieceCol) === 1 && targetRow === pieceRow + direction);
    }

    switch (pieceType) {
      case 'Rook':
        return canRookAttack(pieceRow, pieceCol, targetRow, targetCol, currentBoard);
      case 'Knight':
        return isValidKnightMove(pieceRow, pieceCol, targetRow, targetCol);
      case 'Bishop':
        return canBishopAttack(pieceRow, pieceCol, targetRow, targetCol, currentBoard);
      case 'Queen':
        return canQueenAttack(pieceRow, pieceCol, targetRow, targetCol, currentBoard);
      case 'King':
        return isValidKingMove(pieceRow, pieceCol, targetRow, targetCol);
      default:
        return false;
    }
  };

  const canRookAttack = (startRow, startCol, endRow, endCol, currentBoard) => {
    if (startRow !== endRow && startCol !== endCol) return false;

    if (startRow === endRow) {
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);
      for (let col = minCol + 1; col < maxCol; col++) {
        if (currentBoard[startRow][col]) return false;
      }
    } else {
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      for (let row = minRow + 1; row < maxRow; row++) {
        if (currentBoard[row][startCol]) return false;
      }
    }
    return true;
  };

  const canBishopAttack = (startRow, startCol, endRow, endCol, currentBoard) => {
    if (Math.abs(endRow - startRow) !== Math.abs(endCol - startCol)) return false;

    const rowStep = endRow > startRow ? 1 : -1;
    const colStep = endCol > startCol ? 1 : -1;
    let row = startRow + rowStep;
    let col = startCol + colStep;

    while (row !== endRow && col !== endCol) {
      if (currentBoard[row][col]) return false;
      row += rowStep;
      col += colStep;
    }
    return true;
  };

  const canQueenAttack = (startRow, startCol, endRow, endCol, currentBoard) => {
    return canRookAttack(startRow, startCol, endRow, endCol, currentBoard) ||
           canBishopAttack(startRow, startCol, endRow, endCol, currentBoard);
  };

  const isValidPawnMove = (startRow, startCol, endRow, endCol, color, targetPiece) => {
    const direction = color === 'Light' ? -1 : 1;
    const startRowPawn = color === 'Light' ? 6 : 1;

    if (endCol === startCol && endRow === startRow + direction && !targetPiece) {
      return true;
    }

    if (endCol === startCol && endRow === startRow + (2 * direction) &&
        startRow === startRowPawn && !targetPiece && !board[startRow + direction][startCol]) {
      return true;
    }

    if (Math.abs(endCol - startCol) === 1 && endRow === startRow + direction && targetPiece) {
      return true;
    }

    return false;
  };

  const isValidRookMove = (startRow, startCol, endRow, endCol) => {
    if (startRow !== endRow && startCol !== endCol) return false;

    if (startRow === endRow) {
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);
      for (let col = minCol + 1; col < maxCol; col++) {
        if (board[startRow][col]) return false;
      }
    } else {
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      for (let row = minRow + 1; row < maxRow; row++) {
        if (board[row][startCol]) return false;
      }
    }
    return true;
  };

  const isValidKnightMove = (startRow, startCol, endRow, endCol) => {
    const rowDiff = Math.abs(endRow - startRow);
    const colDiff = Math.abs(endCol - startCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  };

  const isValidBishopMove = (startRow, startCol, endRow, endCol) => {
    if (Math.abs(endRow - startRow) !== Math.abs(endCol - startCol)) return false;

    const rowStep = endRow > startRow ? 1 : -1;
    const colStep = endCol > startCol ? 1 : -1;
    let row = startRow + rowStep;
    let col = startCol + colStep;

    while (row !== endRow && col !== endCol) {
      if (board[row][col]) return false;
      row += rowStep;
      col += colStep;
    }
    return true;
  };

  const isValidQueenMove = (startRow, startCol, endRow, endCol) => {
    return isValidRookMove(startRow, startCol, endRow, endCol) ||
           isValidBishopMove(startRow, startCol, endRow, endCol);
  };

  const isValidKingMove = (startRow, startCol, endRow, endCol) => {
    return Math.abs(endRow - startRow) <= 1 && Math.abs(endCol - startCol) <= 1;
  };

  const getValidMoves = (row, col) => {
    const piece = board[row][col];
    if (!piece) return [];

    const moves = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (isValidMove(row, col, i, j, piece)) {
          moves.push([i, j]);
        }
      }
    }
    return moves;
  };

  const handleSquareClick = (row, col) => {
    // Block interaction when AI is thinking or game is over
    if (isThinking || backendStatus !== "active") return;

    const piece = board[row][col];
    const pieceColor = getPieceColor(piece);

    // Only allow selecting Light (white) pieces — player is always white
    if (!selectedPiece && piece && pieceColor === "Light") {
      setSelectedPiece({ row, col });
      setValidMoves(getValidMoves(row, col));
      return;
    }

    if (selectedPiece) {
      const isValidMoveSelected = validMoves.some(([r, c]) => r === row && c === col);

      if (isValidMoveSelected) {
        movePiece(selectedPiece.row, selectedPiece.col, row, col);
      }

      setSelectedPiece(null);
      setValidMoves([]);
    }
  };

  const movePiece = async (startRow, startCol, endRow, endCol) => {
    if (!timer.active && timerEnabled) {
      setTimer(prev => ({ ...prev, active: true }));
    }

    const movingPiece = board[startRow][startCol];
    const capturedPiece = board[endRow][endCol];

    // Determine promotion: pawn reaching rank 8 (row 0 for Light)
    let promotionPiece = null;
    if (getPieceType(movingPiece) === "Pawn" && endRow === 0) {
      promotionPiece = "q"; // auto-promote to queen
    }

    const uci = boardPositionToUci(startRow, startCol, endRow, endCol, promotionPiece);

    // Record player's move in history
    if (historyEnabled) {
      const notation = getChessNotation(movingPiece, startRow, startCol, endRow, endCol, capturedPiece);
      setMoveHistory(prev => [
        ...prev,
        {
          player: 'Light',
          notation,
          piece: movingPiece,
          from: [startRow, startCol],
          to: [endRow, endCol],
          captured: capturedPiece
        }
      ]);
    }

    // Optimistically update the board with player's move
    const newBoard = board.map(row => [...row]);
    newBoard[endRow][endCol] = promotionPiece ? "LightQueen" : movingPiece;
    newBoard[startRow][startCol] = "";
    setBoard(newBoard);

    // Send move to backend
    setIsThinking(true);
    try {
      const res = await fetch(`${API_URL}/game/${gameId}/move`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ uci, current_fen: currentFen }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          navigate("/signup");
          return;
        }
        // On error (e.g. illegal move, out of sync), resync from backend
        const errData = await res.json().catch(() => null);
        if (res.status === 409 && errData?.detail?.server_fen) {
          // Board out of sync — resync from server FEN
          const serverFen = errData.detail.server_fen;
          setCurrentFen(serverFen);
          setBoard(fenToBoard(serverFen));
        }
        setIsThinking(false);
        return;
      }

      const data = await res.json();

      // Record AI move in history
      if (historyEnabled && data.ai_uci) {
        // Parse AI move from the FEN diff: we get the final board from data.fen
        // For notation, use a simple representation from UCI
        const aiFrom = data.ai_uci.slice(0, 2);
        const aiTo = data.ai_uci.slice(2, 4);
        setMoveHistory(prev => [
          ...prev,
          {
            player: 'Dark',
            notation: `${aiFrom}-${aiTo}`,
            piece: 'AI',
            from: aiFrom,
            to: aiTo,
            captured: null
          }
        ]);
      }

      // Update board from backend FEN (source of truth)
      setCurrentFen(data.fen);
      localStorage.setItem("currentFen", data.fen);
      setBoard(fenToBoard(data.fen));
      setBackendStatus(data.status);

      if (data.game_over) {
        setGameStatus(data.status);
      } else {
        setGameStatus("playing");
      }
    } catch {
      // Network error — revert to previous state
      setBoard(board);
    } finally {
      setIsThinking(false);
    }
  };

  const handleNewGame = async () => {
    await createNewGame();
  };

  const handleSettingsClick = () => {
    saveGameState();
    navigate('/settings', { state: { from: 'game' } });
  };

  const getStatusMessage = () => {
    switch (backendStatus) {
      case "white_wins":
        return "You Win!";
      case "black_wins":
        return "You Lose!";
      case "draw":
        return "Draw!";
      default:
        if (gameStatus === "timeout") return "Time's Up!";
        if (isThinking) return "AI is thinking...";
        return "Your Turn";
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="mb-4 flex items-center justify-center space-x-4">
        {timerEnabled && (
          <>
            <div className="px-4 py-2 bg-blue-500 text-white rounded">
              Light: {formatTime(timer.Light)}
            </div>
            <div className="px-4 py-2 bg-blue-500 text-white rounded">
              Dark: {formatTime(timer.Dark)}
            </div>
          </>
        )}
        <div className={`px-4 py-2 rounded text-white ${
          backendStatus === "white_wins" ? "bg-green-600" :
          backendStatus === "black_wins" ? "bg-red-600" :
          backendStatus === "draw" ? "bg-yellow-600" :
          isThinking ? "bg-orange-500" :
          "bg-blue-500"
        }`}>
          {getStatusMessage()}
        </div>
        <button
          onClick={() => setShowOpponentProfile(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Opponent
        </button>
        <button
          onClick={handleSettingsClick}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Settings
        </button>
        <button
          onClick={handleNewGame}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          New Game
        </button>
      </div>

      <div className="flex">
        <div className={`grid grid-cols-8 gap-0 border-2 border-gray-800 ${isThinking ? 'opacity-75 pointer-events-none' : ''}`}>
          {board.map((row, rowIndex) => (
            row.map((piece, colIndex) => {
              const isDarkSquare = (rowIndex + colIndex) % 2 === 1;
              const isValidMoveSquare = validMoves.some(([r, c]) => r === rowIndex && c === colIndex);
              const imagePath = getPieceImage(piece);

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                  className={`
                    w-16 h-16 flex items-center justify-center cursor-pointer relative
                    ${isDarkSquare ? 'bg-gray-600' : 'bg-gray-300'}
                    hover:opacity-75 transition-opacity
                  `}
                >
                  {isValidMoveSquare && piece && (
                    <div className="absolute inset-0 border-4 border-red-500 pointer-events-none"></div>
                  )}
                  {isValidMoveSquare && !piece && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 bg-green-500 bg-opacity-50 rounded-full"></div>
                    </div>
                  )}
                  {imagePath ? (
                    <img
                      src={imagePath}
                      alt={piece}
                      className="w-12 h-12 object-contain z-10"
                    />
                  ) : null}
                </div>
              );
            })
          ))}
        </div>

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
                      className={`p-2 rounded ${move.player === 'Light' ? 'bg-gray-700' : 'bg-gray-600'} text-white`}
                    >
                      <span className="font-mono">
                        {Math.floor(index / 2) + 1}.
                        {index % 2 === 0 ? ' ' : '... '}
                        {move.notation}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 text-sm text-gray-400 text-center">
              {moveHistory.length} move{moveHistory.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Game Over Overlay */}
      {backendStatus !== "active" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-gray-800 rounded-lg p-8 text-center shadow-xl">
            <h2 className={`text-4xl font-bold mb-4 ${
              backendStatus === "white_wins" ? "text-green-400" :
              backendStatus === "black_wins" ? "text-red-400" :
              "text-yellow-400"
            }`}>
              {getStatusMessage()}
            </h2>
            <p className="text-gray-300 mb-6">
              {backendStatus === "white_wins" && "Checkmate! You defeated the AI."}
              {backendStatus === "black_wins" && "Checkmate! The AI won this time."}
              {backendStatus === "draw" && "The game ended in a draw."}
            </p>
            <button
              onClick={handleNewGame}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-lg"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {showOpponentProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Opponent Profile</h2>
              <button
                onClick={() => setShowOpponentProfile(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-3">
                <span className="text-4xl text-gray-400">?</span>
              </div>
              <h3 className="text-xl font-semibold text-white">MindfulMoves AI</h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                <span className="text-gray-300">Name:</span>
                <span className="text-white">MindfulMoves AI</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                <span className="text-gray-300">Difficulty:</span>
                <span className="text-white">Random</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                <span className="text-gray-300">ELO Rating:</span>
                <span className="text-white">400</span>
              </div>
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

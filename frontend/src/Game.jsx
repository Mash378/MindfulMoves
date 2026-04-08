import { useState, useEffect, useCallback, useRef } from "react";
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

function uciSquareToCoords(square) {
  const col = square.charCodeAt(0) - "a".charCodeAt(0); // 0-7
  const row = 8 - parseInt(square[1], 10);              // 0-7
  return [row, col];
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
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("user");
  const [lastMove, setLastMove] = useState(null);
  const [isCheck, setIsCheck] = useState(false);
  const [checkColor, setCheckColor] = useState(null);
  const [showCheckmatePopup, setShowCheckmatePopup] = useState(false);
  const [checkmateWinner, setCheckmateWinner] = useState(null);
  const [timer, setTimer] = useState({
    Light: 600,
    active: false,
    startTime: null,
  });
  const navigate = useNavigate();

  const {
    timerEnabled,
    timerDuration,
    historyEnabled,
    setTimerEnabled,
    setTimerDuration,
    setHistoryEnabled,
    theme,
    setTheme,
    difficulty,
    setDifficulty,
    isLoggedIn,
    username,
    logout,
  } = useSettings();
  
  const isFirstRender = useRef(true);
  const moveHistoryRef = useRef(null);

  // Check if a player has any legal moves
  const hasAnyLegalMoves = (boardState, playerColor) => {
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = boardState[i][j];
        if (piece && getPieceColor(piece) === playerColor) {
          // Check if this piece has any legal moves
          for (let targetRow = 0; targetRow < 8; targetRow++) {
            for (let targetCol = 0; targetCol < 8; targetCol++) {
              if (isValidMove(i, j, targetRow, targetCol, piece, boardState)) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  };

  // Check for checkmate
  const isCheckmate = (boardState, kingColor) => {
    // First check if the king is in check
    const kingInCheck = isKingInCheck(boardState, kingColor);
    if (!kingInCheck) return false;
    
    // Then check if there are any legal moves
    return !hasAnyLegalMoves(boardState, kingColor);
  };

  // Check detection function (modified to accept boardState parameter)
  const isKingInCheck = (boardState, kingColor) => {
    let kingRow, kingCol;
    
    // Find the king
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = boardState[i][j];
        if (piece === `${kingColor}King`) {
          kingRow = i;
          kingCol = j;
          break;
        }
      }
    }
    
    if (kingRow === undefined) return false;
    
    // Check if any opponent piece can attack the king
    const opponentColor = kingColor === "Light" ? "Dark" : "Light";
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = boardState[i][j];
        if (piece && getPieceColor(piece) === opponentColor) {
          if (canPieceAttackSquare(i, j, kingRow, kingCol, piece, boardState)) {
            return true;
          }
        }
      }
    }
    
    return false;
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    createNewGame();
  }, [difficulty]);

  const createNewGame = useCallback(async () => {
    try {
      const isMagnus = difficulty === "magnus";
      const endpoint = isMagnus ? `${API_URL}/game/new` : `${API_URL}/chess/game/new`;
      
      let body = {};
      if (!isMagnus) {
        const configMap = {
          easy:   { elo: 1500, style: "Balanced" },
          medium: { elo: 1600, style: "Balanced" },
          hard:   { elo: 1700, style: "Aggressive" }
        };
        const config = configMap[difficulty] || configMap.medium;

        body = {
          player_color: "white",
          bot_style: config.style,
          target_elo: config.elo
        };
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: apiHeaders(),
        body: isMagnus ? null : JSON.stringify(body)
      });
      if (!res.ok) {
        if (res.status === 401) {
          navigate("/signup");
          return;
        }
        return;
      }
      const data = await res.json();
      const id = data.game_id || data.session_id;
      const fen = isMagnus ? data.fen : data.board.fen;
      setGameId(id);
      setCurrentFen(fen);
      setBoard(fenToBoard(fen));
      localStorage.setItem("gameId", id);
      localStorage.setItem("currentFen", fen);
      setSelectedPiece(null);
      setValidMoves([]);
      setMoveHistory([]);
      setLastMove(null);
      setTimer({ Light: 600, active: false, startTime: null });
      setGameStatus("playing");
      setBackendStatus("active");
      setIsCheck(false);
      setCheckColor(null);
      setShowCheckmatePopup(false);
      setCheckmateWinner(null);
    } catch (err){
      console.error("Failed to create game", err);
    }
  }, [navigate, difficulty]);

  useEffect(() => {
    const savedState = localStorage.getItem("gameState");
    const name = localStorage.getItem("playerName");

    if (name) {
      setPlayerName(name);
    } else {
      setPlayerName("Guest");
    }

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
      setLastMove(parsed.lastMove || null);
      localStorage.removeItem("gameState");
      return;
    }

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
  }, [createNewGame]);

  useEffect(() => {
    if (board.length > 0) {
      const gameState = {
        board,
        gameStatus,
        backendStatus,
        moveHistory,
        timer,
        playerName,
        gameId,
        currentFen,
        lastMove,
      };
      localStorage.setItem("gameState", JSON.stringify(gameState));
    }
  }, [
    board,
    gameStatus,
    backendStatus,
    moveHistory,
    timer,
    playerName,
    gameId,
    currentFen,
    lastMove,
  ]);

  // Check for check and checkmate whenever board changes
  useEffect(() => {
    if (board.length === 0) return;
    
    // Check if Light (player) is in check
    const lightInCheck = isKingInCheck(board, "Light");
    // Check if Dark (AI) is in check
    const darkInCheck = isKingInCheck(board, "Dark");
    
    // Check for checkmate
    if (isCheckmate(board, "Light")) {
      setShowCheckmatePopup(true);
      setCheckmateWinner("Dark");
      setBackendStatus("black_wins");
      setGameStatus("checkmate");
      return;
    }
    
    if (isCheckmate(board, "Dark")) {
      setShowCheckmatePopup(true);
      setCheckmateWinner("Light");
      setBackendStatus("white_wins");
      setGameStatus("checkmate");
      return;
    }
    
    // Handle check display
    if (lightInCheck) {
      setIsCheck(true);
      setCheckColor("Light");
      const timer = setTimeout(() => {
        setIsCheck(false);
        setCheckColor(null);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (darkInCheck) {
      setIsCheck(true);
      setCheckColor("Dark");
      const timer = setTimeout(() => {
        setIsCheck(false);
        setCheckColor(null);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setIsCheck(false);
      setCheckColor(null);
    }
  }, [board]);

  useEffect(() => {
    let interval;
    if (timer.active && gameStatus === "playing" && timerEnabled) {
      interval = setInterval(() => {
        setTimer((prev) => {
          const newTime = {
            ...prev,
            Light: Math.max(0, prev.Light - 1),
          };

          if (newTime.Light === 0) {
            setGameStatus("timeout");
            clearInterval(interval);
          }

          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer.active, gameStatus, timerEnabled]);

  useEffect(() => {
    if (moveHistoryRef.current && historyEnabled) {
      moveHistoryRef.current.scrollTop = 0;
    }
  }, [moveHistory, historyEnabled]);

  const undoMove = async () => {
    if (moveHistory.length === 0 || isThinking) return;

    try {
       const isMagnus = difficulty === "magnus";
      const endpoint = isMagnus
        ? `${API_URL}/game/${gameId}/undo`
        : `${API_URL}/chess/game/undo?session_id=${gameId}`; 
      const res = await fetch(endpoint, {
        method: "POST",
        headers: apiHeaders(),
      });

      if (!res.ok) {
        if (res.status === 401) {
          navigate("/signup");
        }
        return;
      }

      const data = await res.json();
      const fen = isMagnus ? data.fen : data.board?.fen;

      setCurrentFen(fen);
      localStorage.setItem("currentFen", fen);
      setBoard(fenToBoard(fen));
       setBackendStatus(isMagnus ? data.status : "active");
      setGameStatus("playing");
      setMoveHistory((prev) => {
      const newHistory = prev.slice(0, -2);
      if (newHistory.length >= 1) {
        const lastEntry = newHistory[newHistory.length - 1];
        const from = typeof lastEntry.from === "string"
          ? uciSquareToCoords(lastEntry.from)
          : lastEntry.from;
        const to = typeof lastEntry.to === "string"
          ? uciSquareToCoords(lastEntry.to)
          : lastEntry.to;
        setLastMove({ from, to });
      } else {
        setLastMove(null);
      }
      return newHistory;
    });
    } catch {
      // Network error — do nothing
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getPieceImage = (piece) => {
    if (!piece) return null;
    return `/ChessPieces/${piece}.webp`;
  };

  const getPieceColor = (piece) => {
    if (!piece) return null;
    return piece.startsWith("Light") ? "Light" : "Dark";
  };

  const getPieceType = (piece) => {
    if (!piece) return null;
    return piece.replace("Light", "").replace("Dark", "");
  };

  const getChessNotation = (
    piece,
    startRow,
    startCol,
    endRow,
    endCol,
    capturedPiece,
  ) => {
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
    
    const startSquare = files[startCol] + ranks[startRow];
    const endSquare = files[endCol] + ranks[endRow];
    
    return `${startSquare}-${endSquare}`;
  };

  const isValidMove = (startRow, startCol, endRow, endCol, piece, currentBoard = board) => {
    const pieceType = getPieceType(piece);
    const pieceColor = getPieceColor(piece);
    const targetPiece = currentBoard[endRow][endCol];
    const targetColor = getPieceColor(targetPiece);

    if (targetColor === pieceColor) return false;

    let isValidBasicMove = false;

    switch (pieceType) {
      case "Pawn":
        isValidBasicMove = isValidPawnMove(
          startRow,
          startCol,
          endRow,
          endCol,
          pieceColor,
          targetPiece,
          currentBoard,
        );
        break;
      case "Rook":
        isValidBasicMove = isValidRookMove(startRow, startCol, endRow, endCol, currentBoard);
        break;
      case "Knight":
        isValidBasicMove = isValidKnightMove(
          startRow,
          startCol,
          endRow,
          endCol,
        );
        break;
      case "Bishop":
        isValidBasicMove = isValidBishopMove(startRow, startCol, endRow, endCol, currentBoard);
        break;
      case "Queen":
        isValidBasicMove = isValidQueenMove(startRow, startCol, endRow, endCol, currentBoard);
        break;
      case "King":
        isValidBasicMove = isValidKingMove(startRow, startCol, endRow, endCol);
        break;
      default:
        return false;
    }

    if (!isValidBasicMove) return false;

    return !wouldMoveLeaveKingInCheck(
      startRow,
      startCol,
      endRow,
      endCol,
      pieceColor,
      currentBoard,
    );
  };

  const wouldMoveLeaveKingInCheck = (
    startRow,
    startCol,
    endRow,
    endCol,
    pieceColor,
    currentBoard,
  ) => {
    const tempBoard = currentBoard.map((row) => [...row]);

    const movingPiece = tempBoard[startRow][startCol];
    tempBoard[endRow][endCol] = movingPiece;
    tempBoard[startRow][startCol] = "";

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

    const opponentColor = pieceColor === "Light" ? "Dark" : "Light";
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

  const canPieceAttackSquare = (
    pieceRow,
    pieceCol,
    targetRow,
    targetCol,
    piece,
    currentBoard,
  ) => {
    const pieceType = getPieceType(piece);
    const pieceColor = getPieceColor(piece);

    if (pieceType === "Pawn") {
      const direction = pieceColor === "Light" ? -1 : 1;
      return (
        Math.abs(targetCol - pieceCol) === 1 &&
        targetRow === pieceRow + direction
      );
    }

    switch (pieceType) {
      case "Rook":
        return canRookAttack(
          pieceRow,
          pieceCol,
          targetRow,
          targetCol,
          currentBoard,
        );
      case "Knight":
        return isValidKnightMove(pieceRow, pieceCol, targetRow, targetCol);
      case "Bishop":
        return canBishopAttack(
          pieceRow,
          pieceCol,
          targetRow,
          targetCol,
          currentBoard,
        );
      case "Queen":
        return canQueenAttack(
          pieceRow,
          pieceCol,
          targetRow,
          targetCol,
          currentBoard,
        );
      case "King":
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

  const canBishopAttack = (
    startRow,
    startCol,
    endRow,
    endCol,
    currentBoard,
  ) => {
    if (Math.abs(endRow - startRow) !== Math.abs(endCol - startCol))
      return false;

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
    return (
      canRookAttack(startRow, startCol, endRow, endCol, currentBoard) ||
      canBishopAttack(startRow, startCol, endRow, endCol, currentBoard)
    );
  };

  const isValidPawnMove = (
    startRow,
    startCol,
    endRow,
    endCol,
    color,
    targetPiece,
    currentBoard,
  ) => {
    const direction = color === "Light" ? -1 : 1;
    const startRowPawn = color === "Light" ? 6 : 1;

    if (
      endCol === startCol &&
      endRow === startRow + direction &&
      !targetPiece
    ) {
      return true;
    }

    if (
      endCol === startCol &&
      endRow === startRow + 2 * direction &&
      startRow === startRowPawn &&
      !targetPiece &&
      !currentBoard[startRow + direction][startCol]
    ) {
      return true;
    }

    if (
      Math.abs(endCol - startCol) === 1 &&
      endRow === startRow + direction &&
      targetPiece
    ) {
      return true;
    }

    return false;
  };

  const isValidRookMove = (startRow, startCol, endRow, endCol, currentBoard) => {
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

  const isValidKnightMove = (startRow, startCol, endRow, endCol) => {
    const rowDiff = Math.abs(endRow - startRow);
    const colDiff = Math.abs(endCol - startCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  };

  const isValidBishopMove = (startRow, startCol, endRow, endCol, currentBoard) => {
    if (Math.abs(endRow - startRow) !== Math.abs(endCol - startCol))
      return false;

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

  const isValidQueenMove = (startRow, startCol, endRow, endCol, currentBoard) => {
    return (
      isValidRookMove(startRow, startCol, endRow, endCol, currentBoard) ||
      isValidBishopMove(startRow, startCol, endRow, endCol, currentBoard)
    );
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
        if (isValidMove(row, col, i, j, piece, board)) {
          moves.push([i, j]);
        }
      }
    }
    return moves;
  };

  const handleSquareClick = (row, col) => {
    if (isThinking || backendStatus !== "active" || gameStatus === "checkmate") return;

    const piece = board[row][col];
    const pieceColor = getPieceColor(piece);

    if (!selectedPiece && piece && pieceColor === "Light") {
      setSelectedPiece({ row, col });
      setValidMoves(getValidMoves(row, col));
      return;
    }

    if (selectedPiece) {
      const isValidMoveSelected = validMoves.some(
        ([r, c]) => r === row && c === col,
      );

      if (isValidMoveSelected) {
        movePiece(selectedPiece.row, selectedPiece.col, row, col);
      }

      setSelectedPiece(null);
      setValidMoves([]);
    }
  };

  const movePiece = async (startRow, startCol, endRow, endCol) => {
      if (!timer.active && timerEnabled) {
        setTimer((prev) => ({ ...prev, active: true }));
      }
      console.log("difficulty:", difficulty);
      const movingPiece = board[startRow][startCol];
      const capturedPiece = board[endRow][endCol];
  
      let promotionPiece = null;
      if (getPieceType(movingPiece) === "Pawn" && endRow === 0) {
        promotionPiece = "q";
      }
  
      const uci = boardPositionToUci(
        startRow,
        startCol,
        endRow,
        endCol,
        promotionPiece,
      );
  
      if (historyEnabled) {
        const notation = getChessNotation(
          null,
          startRow,
          startCol,
          endRow,
          endCol,
          null,
        );
        setMoveHistory((prev) => [
          ...prev,
          {
            player: "Light",
            notation,
            piece: movingPiece,
            from: [startRow, startCol],
            to: [endRow, endCol],
            captured: capturedPiece,
          },
        ]);
      }
  
      setLastMove({ from: [startRow, startCol], to: [endRow, endCol] });
  
      const newBoard = board.map((row) => [...row]);
      newBoard[endRow][endCol] = promotionPiece ? "LightQueen" : movingPiece;
      newBoard[startRow][startCol] = "";
      setBoard(newBoard);
      
      setIsThinking(true);
      try {
        const isMagnus = difficulty.toLowerCase().includes("magnus");

        const endpoint = isMagnus 
          ? `${API_URL}/game/${gameId}/move` 
          : `${API_URL}/chess/game/move`;

        const payload = isMagnus 
          ? { uci, current_fen: currentFen } 
          : { session_id: gameId, uci };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: apiHeaders(),
          body: JSON.stringify(payload),
        });
  
        if (!res.ok) {
          if (res.status === 401) {
            navigate("/signup");
            return;
          }
          const errData = await res.json().catch(() => null);
          if (res.status === 409 && errData?.detail?.server_fen) {
            const serverFen = errData.detail.server_fen;
            setCurrentFen(serverFen);
            setBoard(fenToBoard(serverFen));
          }
          setIsThinking(false);
          return;
        }
  
        const data = await res.json();
        const backendFen = isMagnus ? data.fen : data.board?.fen;
        const botMoveUci = isMagnus ? data.ai_uci : data.bot_move?.move;
        const isGameOver = isMagnus 
        ? !!data.game_over 
        : !!data.board?.is_game_over;
        
        if (historyEnabled && botMoveUci) {
          const aiFrom = botMoveUci.slice(0, 2);
          const aiTo = botMoveUci.slice(2, 4);
          const [afr, afc] = uciSquareToCoords(aiFrom);
          const [atr, atc] = uciSquareToCoords(aiTo);
          setLastMove({ from: [afr, afc], to: [atr, atc] });
          setMoveHistory((prev) => [
            ...prev,
            {
              player: "Dark",
              notation: `${aiFrom}-${aiTo}`,
              piece: "AI",
              from: aiFrom,
              to: aiTo,
              captured: null,
            },
          ]);
        }
  
        setCurrentFen(backendFen);
        localStorage.setItem("currentFen", backendFen);
        setBoard(fenToBoard(backendFen));
        const newStatus = isMagnus 
        ? data.status 
        : (isGameOver ? "game_over" : "active"); 

        setBackendStatus(newStatus);
  
        if (isGameOver) {
          setGameStatus(isMagnus ? data.status : "game_over");
        } else {
          setGameStatus("playing");
        }
      } catch {
        setBoard(board);
      } finally {
        setIsThinking(false);
      }
    };
  

  const handleNewGame = async () => {
    setShowCheckmatePopup(false);
    setCheckmateWinner(null);
    await createNewGame();
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
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

  const handleReturnHome = () => {
    localStorage.removeItem("gameState");
    navigate("/");
  };

  const buttonBgClass = {
    light: "bg-blue-600 text-white",
    dark: "bg-blue-600 text-white",
    game: "bg-[#0f172a] text-green-400",
    sky: "bg-blue-400 text-blue-100",
    candy: "bg-pink-400 text-pink-100",
  }[theme];

  const buttonHoverClass = {
    light: "hover:bg-blue-700",
    dark: "hover:bg-blue-700",
    game: "hover:bg-gray-700",
    sky: "hover:bg-blue-500",
    candy: "hover:bg-pink-500",
  }[theme];

  const modalBgClass = {
    light: "bg-white text-black",
    dark: "bg-gray-800 text-white",
    game: "bg-[#0f172a] text-green-400",
    sky: "bg-gradient-to-r from-blue-400 to-blue-600 text-blue-100",
    candy: "bg-gradient-to-r from-pink-400 to-purple-400 text-pink-100",
  }[theme];

  const modalSidebarClass = {
    light: "bg-gray-100",
    dark: "bg-gray-900",
    game: "bg-gray-900",
    sky: "bg-gradient-to-b from-blue-400 to-blue-600",
    candy: "bg-gradient-to-b from-pink-400 to-purple-400",
  }[theme];

  const modalSidebarActiveClass = {
    light: "bg-gray-300",
    dark: "bg-gray-600",
    game: "bg-gray-600",
    sky: "bg-blue-700",
    candy: "bg-purple-700",
  }[theme];

  const modalSidebarHoverClass = {
    light: "hover:bg-gray-200",
    dark: "hover:bg-gray-700",
    game: "hover:bg-gray-700",
    sky: "hover:bg-blue-600",
    candy: "hover:bg-purple-500",
  }[theme];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="mb-4 flex items-center justify-center space-x-4">
        {timerEnabled && (
          <div className={`px-4 py-2 ${buttonBgClass} rounded`}>
            {"User"}: {formatTime(timer.Light)}
          </div>
        )}
        <div
          className={`px-4 py-2 rounded text-white ${
            backendStatus === "white_wins"
              ? "bg-green-600"
              : backendStatus === "black_wins"
                ? "bg-red-600"
                : backendStatus === "draw"
                  ? "bg-yellow-600"
                  : isThinking
                    ? "bg-orange-500"
                    : "bg-blue-500"
          }`}
        >
          {getStatusMessage()}
        </div>
        <button
          onClick={() => setShowOpponentProfile(true)}
          className={`px-4 py-2 ${buttonBgClass} rounded ${buttonHoverClass}`}
        >
          Opponent
        </button>
        <button
          onClick={undoMove}
          disabled={moveHistory.length === 0 || isThinking || backendStatus !== "active"}
          className={`px-4 py-2 rounded ${
            moveHistory.length === 0 || isThinking || backendStatus !== "active"
              ? "bg-gray-400 cursor-not-allowed"
              : `${buttonBgClass} ${buttonHoverClass}`
          }`}
        >
          Undo
        </button>
        <button
          onClick={handleSettingsClick}
          className={`px-4 py-2 ${buttonBgClass} rounded ${buttonHoverClass}`}
        >
          Settings
        </button>
        <button
          onClick={handleReturnHome}
          className={`px-4 py-2 ${buttonBgClass} rounded ${buttonHoverClass}`}
        >
          Return to Home
        </button>
        <button
          onClick={handleNewGame}
          className={`px-4 py-2 ${buttonBgClass} rounded ${buttonHoverClass}`}
        >
          New Game
        </button>
      </div>

      {/* Check Message Display */}
      {isCheck && (
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-pulse
          ${checkColor === "Light" ? "bg-yellow-500" : "bg-red-500"} 
          text-white px-6 py-3 rounded-lg shadow-lg text-xl font-bold`}
        >
          ⚠️ CHECK! {checkColor === "Light" ? "Your king" : "Opponent's king"} is in check! ⚠️
        </div>
      )}

      <div className="flex justify-center items-center w-full">
        <div
          className={`grid grid-cols-8 grid-rows-8 border-2 border-gray-800 w-[min(80vw,80vh)] h-[min(80vw,80vh)] ${isThinking ? "opacity-75 pointer-events-none" : ""}`}
        >
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const isDarkSquare = (rowIndex + colIndex) % 2 === 1;
              const isValidMoveSquare = validMoves.some(
                ([r, c]) => r === rowIndex && c === colIndex,
              );
              const isLastMoveFrom =
                lastMove &&
                lastMove.from[0] === rowIndex &&
                lastMove.from[1] === colIndex;
              const isLastMoveTo =
                lastMove &&
                lastMove.to[0] === rowIndex &&
                lastMove.to[1] === colIndex;
              const isSelected = selectedPiece?.row===rowIndex && selectedPiece?.col===colIndex;
              const isKingInCheckNow = isCheck && 
                ((piece === "LightKing" && checkColor === "Light") || 
                 (piece === "DarkKing" && checkColor === "Dark"));
              const imagePath = getPieceImage(piece);

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                  className={`
                    flex items-center justify-center cursor-pointer relative
                    ${isLastMoveFrom ? "bg-yellow-400 bg-opacity-20" :
                      isLastMoveTo ? "bg-green-400 bg-opacity-20" :
                      isDarkSquare ? "bg-gray-600" : "bg-gray-300"}
                    ${isSelected ? "ring-2 ring-yellow-400 ring-inset" : ""}
                    ${isKingInCheckNow ? "ring-4 ring-red-500 ring-inset animate-pulse" : ""}
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
                      className="w-3/4 h-3/4 object-contain z-10"
                    />
                  ) : null}
                </div>
              );
            }),
          )}
        </div>

        {historyEnabled && (
          <div className="ml-6 w-64 bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col h-[calc(100vh-200px)]">
            <h3 className="text-lg font-bold mb-3 text-center text-white">
              Move History
            </h3>
            <div 
              ref={moveHistoryRef}
              className="flex-1 overflow-y-auto"
            >
              {moveHistory.length === 0 ? (
                <p className="text-gray-400 text-center">No moves yet</p>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    const pairedMoves = [];
                    for (let i = 0; i < moveHistory.length; i += 2) {
                      pairedMoves.push({
                        moveNumber: i / 2 + 1,
                        whiteMove: moveHistory[i],
                        blackMove: moveHistory[i + 1]
                      });
                    }
                    return pairedMoves.slice().reverse().map((pair) => (
                      <div
                        key={pair.moveNumber}
                        className="flex justify-between items-center p-2 bg-gray-700 rounded text-white"
                      >
                        <span className="font-mono w-8 text-gray-400">
                          {pair.moveNumber}.
                        </span>
                        <span className="font-mono flex-1 ml-2">
                          {pair.whiteMove ? pair.whiteMove.notation : ""}
                        </span>
                        <span className="font-mono flex-1 ml-4">
                          {pair.blackMove ? pair.blackMove.notation : ""}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
            <div className="mt-3 text-sm text-gray-400 text-center pt-2 border-t border-gray-700">
              {moveHistory.length} move{moveHistory.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Checkmate Popup */}
      {showCheckmatePopup && checkmateWinner && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-center shadow-2xl max-w-md w-full mx-4 transform animate-bounce-in">
            <div className="mb-6">
              <div className="text-6xl mb-4">
                {checkmateWinner === "Light" ? "🏆" : "💀"}
              </div>
              <h2 className="text-4xl font-bold mb-2 text-white">
                Checkmate!
              </h2>
              <p className="text-xl text-gray-300">
                {checkmateWinner === "Light" 
                  ? "Congratulations! You won!" 
                  : "Game Over! The AI wins!"}
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleNewGame}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all transform hover:scale-105 text-lg font-semibold"
              >
                Play New Game
              </button>
              <button
                onClick={handleReturnHome}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all transform hover:scale-105 text-lg font-semibold"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`rounded-lg shadow-xl w-[70vw] h-[65vh] flex flex-col ${modalBgClass}`}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-600">
              <h2 className="text-2xl font-bold">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-2xl hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div
                className={`w-1/4 border-r flex flex-col ${modalSidebarClass}`}
              >
                <button
                  onClick={() => setSettingsTab("user")}
                  className={`p-4 text-left ${
                    settingsTab === "user"
                      ? `${modalSidebarActiveClass} font-semibold`
                      : `${modalSidebarHoverClass}`
                  }`}
                >
                  User Profile
                </button>
                <button
                  onClick={() => setSettingsTab("difficulty")}
                  className={`p-4 text-left ${
                    settingsTab === "difficulty"
                      ? `${modalSidebarActiveClass} font-semibold`
                      : `${modalSidebarHoverClass}`
                  }`}
                >
                  Difficulty
                </button>
                <button
                  onClick={() => setSettingsTab("theme")}
                  className={`p-4 text-left ${
                    settingsTab === "theme"
                      ? `${modalSidebarActiveClass} font-semibold`
                      : `${modalSidebarHoverClass}`
                  }`}
                >
                  Theme
                </button>
                <button
                  onClick={() => setSettingsTab("game display")}
                  className={`p-4 text-left ${
                    settingsTab === "game display"
                      ? `${modalSidebarActiveClass} font-semibold`
                      : `${modalSidebarHoverClass}`
                  }`}
                >
                  Game Display
                </button>
                {isLoggedIn && (
                  <button
                    onClick={() => setSettingsTab("account")}
                    className={`p-4 text-left ${
                      settingsTab === "account"
                        ? `${modalSidebarActiveClass} font-semibold`
                        : `${modalSidebarHoverClass}`
                    }`}
                  >
                    Account Settings
                  </button>
                )}
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                {settingsTab === "user" && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold mb-8">
                      User Profile
                    </h2>
                    {isLoggedIn ? (
                      <div className="text-center py-8 px-4 border rounded-lg mt-8">
                        <p className="mb-6">
                          Username: <strong>{username}</strong>
                        </p>
                        <p className="mb-6">
                          Games Played:{" "}
                          {localStorage.getItem("gamesPlayed") || "-"}
                        </p>
                        <p className="mb-6">
                          Games Won: {localStorage.getItem("gamesWon") || "-"}
                        </p>
                        <p className="mb-6">
                          Win Percentage:{" "}
                          {localStorage.getItem("gamesPlayed") > 0
                            ? (
                                ((localStorage.getItem("gamesWon") || 0) /
                                  localStorage.getItem("gamesPlayed")) *
                                100
                              ).toFixed(2)
                            : 0}
                          %
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8 px-4 border rounded-lg mt-8">
                        <p className="text-2xl mb-4">Playing as Guest</p>
                        <p className="mb-6">
                          Create an account to save your progress and compete on
                          the leaderboard!
                        </p>
                        <div className="flex gap-4 justify-center">
                          <button
                            onClick={() => navigate("/login")}
                            className={`px-6 py-2 ${buttonBgClass} rounded-lg ${buttonHoverClass}`}
                          >
                            Log In
                          </button>
                          <button
                            onClick={() => navigate("/signup")}
                            className={`px-6 py-2 ${buttonBgClass} rounded-lg ${buttonHoverClass}`}
                          >
                            Sign Up
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {settingsTab === "difficulty" && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold mb-8">
                      Difficulty Settings
                    </h2>

                    <h3 className="text-xl font-semibold">General:</h3>
                    <p className="text-xs italic mt-2">
                      (General Settings Simulate Chess Matches From Specific ELO
                      Ranges)
                    </p>
                    <div className="grid grid-cols-3 gap-4 mt-8">
                      <label className="block">
                        <input
                          type="radio"
                          name="difficulty"
                          value="easy"
                          checked={difficulty === "easy"}
                          onChange={() => {
                          if (moveHistory.length > 0) {
                            if (window.confirm("Changing difficulty will start a new game. Continue?")) {
                              setDifficulty("easy");
                            }
                          } else {
                            setDifficulty("easy");
                          }
                        }}
                          className="mr-2"
                        />
                        Easy <span className="text-xs">(ELO 800-1200)</span>
                      </label>
                      <label className="block">
                        <input
                          type="radio"
                          name="difficulty"
                          value="medium"
                          checked={difficulty === "medium"}
                          onChange={() => {
                          if (moveHistory.length > 0) {
                            if (window.confirm("Changing difficulty will start a new game. Continue?")) {
                              setDifficulty("medium");
                            }
                          } else {
                            setDifficulty("medium");
                          }
                        }}
                          className="mr-2"
                        />
                        Medium <span className="text-xs">(ELO 1200-1600)</span>
                      </label>
                      <label className="block">
                        <input
                          type="radio"
                          name="difficulty"
                          value="hard"
                          checked={difficulty === "hard"}
                          onChange={() => {
                          if (moveHistory.length > 0) {
                            if (window.confirm("Changing difficulty will start a new game. Continue?")) {
                              setDifficulty("hard");
                            }
                          } else {
                            setDifficulty("hard");
                          }
                        }}
                          className="mr-2"
                        />
                        Hard <span className="text-xs">(ELO 1600-2000)</span>
                      </label>
                    </div>

                    <div className="border-t mt-8">
                      <h3 className="text-xl font-semibold mt-8">Special:</h3>
                      <p className="text-xs italic mt-2">
                        (Special Settings Simulate The Playstyle Of Specific
                        Players)
                      </p>
                      <div className="flex justify-center mt-8">
                        <label className="block">
                          <input
                            type="radio"
                            name="difficulty"
                            value="magnus"
                            checked={difficulty === "magnus"}
                            onChange={() => {
                          if (moveHistory.length > 0) {
                            if (window.confirm("Changing difficulty will start a new game. Continue?")) {
                              setDifficulty("magnus");
                            }
                          } else {
                            setDifficulty("magnus");
                          }
                        }}
                            className="mr-2"
                          />
                          Magnus Carlsen
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === "theme" && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold mb-10">
                      Theme Settings
                    </h2>
                    <div className="flex flex-col mt-8 gap-4 items-center">
                      {[
                        { label: "Light Mode", value: "light" },
                        { label: "Dark Mode", value: "dark" },
                        { label: "Game Mode", value: "game" },
                        { label: "Sky Mode", value: "sky" },
                        { label: "Candy Mode", value: "candy" },
                      ].map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center mb-4"
                        >
                          <input
                            type="radio"
                            name="display"
                            checked={theme === option.value}
                            onChange={() => setTheme(option.value)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                          />
                          <span className="ml-3 w-32">{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {settingsTab === "game display" && (
                  <div className="space-y-6 text-lg">
                    <h2 className="text-2xl font-semibold mb-16">
                      Game Display Settings
                    </h2>
                    <div className="flex flex-col gap-6 items-center">
                      <div className="flex items-center justify-Center">
                        <span className="text-xl w-48 text-left mr-8">
                          Enable Timer:
                        </span>
                        <button
                          onClick={() => setTimerEnabled((prev) => !prev)}
                          className={`relative w-16 h-8 rounded-full transition-colors ${
                            timerEnabled ? "bg-green-500" : "bg-gray-400"
                          }`}
                        >
                          <div
                            className={`h-6 w-6 bg-white rounded-full shadow-md transform transition-transform ${
                              timerEnabled ? "translate-x-9" : "translate-x-1"
                            }`}
                          ></div>
                        </button>
                      </div>
                      {timerEnabled && (
                        <div className="flex items-center justify-center mt-4 ml-24 gap-4">
                          <span className="text-xl w-40 text-left mr-8">Timer Duration:</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={Math.floor(timerDuration / 60)}
                              onChange={(e) => {
                                let rawValue = e.target.value;
                                
                                if (rawValue.includes('.')) {
                                  rawValue = rawValue.split('.')[0];
                                }
                                
                                let minutes = parseInt(rawValue, 10);
                                
                                if (isNaN(minutes) || rawValue === '') {
                                  minutes = 1;
                                }
                                
                                minutes = parseInt(minutes.toString(), 10);
                                minutes = Math.max(1, Math.min(999, minutes));
                                setTimerDuration(minutes * 60);
                              }}
                              onFocus={(e) => {
                                e.target.select();
                              }}
                              min="1"
                              max="999"
                              step="1"
                              className={`px-4 py-2 rounded-lg border w-28 text-center ${buttonBgClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                            <span className="text-lg">minutes</span>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-Center mt-4">
                        <span className="text-xl w-48 text-left mr-8">
                          Enable Move History:
                        </span>
                        <button
                          onClick={() => setHistoryEnabled((prev) => !prev)}
                          className={`relative w-16 h-8 rounded-full transition-colors ${
                            historyEnabled ? "bg-green-500" : "bg-gray-400"
                          }`}
                        >
                          <div
                            className={`h-6 w-6 bg-white rounded-full shadow-md transform transition-transform ${
                              historyEnabled ? "translate-x-9" : "translate-x-1"
                            }`}
                          ></div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === "account" && isLoggedIn && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold mb-8">Account</h2>
                    <div className="text-center py-8 px-4 border rounded-lg mt-8">
                      <p className="mb-6 text-lg">
                        Logged in as: <strong>{username}</strong>
                      </p>
                      <p className="mb-8 text-sm">
                        To change your username or password, please visit
                        Settings from the main menu.
                      </p>
                      <button
                        onClick={() => {
                          logout();
                          setShowSettings(false);
                          navigate("/");
                        }}
                        className="px-6 py-3 bg-red-500 text-white rounded-lg
                                  hover:bg-red-600 transition shadow-md w-64 mx-auto"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opponent Profile Modal */}
      {showOpponentProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">
                Opponent Profile
              </h2>
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
              <h3 className="text-xl font-semibold text-white">
                MindfulMoves AI
              </h3>
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

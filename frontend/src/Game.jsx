import { useState, useEffect, useCallback } from "react";
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
  const [timer, setTimer] = useState({
    Light: 600,
    active: false,
    startTime: null,
  });
  const navigate = useNavigate();

  const {
    timerEnabled,
    historyEnabled,
    setTimerEnabled,
    setHistoryEnabled,
    theme,
    setTheme,
    difficulty,
    setDifficulty,
    isLoggedIn,
    username,
    logout,
  } = useSettings();
  const createNewGame = useCallback(async () => {
    try {
      const isMagnus = difficulty === "magnus"; // Note: value in your radio is "magnus"
      const endpoint = isMagnus ? `${API_URL}/game/new` : `${API_URL}/chess/game/new`;
      
      let body = {};
      if (!isMagnus) {
        // Map frontend difficulty to backend expectations
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
      //const id = isMagnus ? data.game_id : data.session_id;
      setGameId(id);
      // setGameId(data.game_id);
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
      setPlayerName("Guest"); // Set a default guest name
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

  const undoMove = async () => {
    if (moveHistory.length === 0 || isThinking) return;

    try {
      const res = await fetch(`${API_URL}/game/${gameId}/undo`, {
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

      setCurrentFen(data.fen);
      localStorage.setItem("currentFen", data.fen);
      setBoard(fenToBoard(data.fen));
      setBackendStatus(data.status);
      setGameStatus("playing");
      setMoveHistory((prev) => {
      const newHistory = prev.slice(0, -2);
      // Highlight the move that is now the last one
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
    const pieceType = getPieceType(piece);
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

    let notation = "";

    if (pieceType !== "Pawn") {
      const pieceLetters = {
        King: "K",
        Queen: "Q",
        Rook: "R",
        Bishop: "B",
        Knight: "N",
      };
      notation += pieceLetters[pieceType] || "";
    }

    if (capturedPiece) {
      if (pieceType === "Pawn") {
        notation += files[startCol];
      }
      notation += "x";
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
      case "Pawn":
        isValidBasicMove = isValidPawnMove(
          startRow,
          startCol,
          endRow,
          endCol,
          pieceColor,
          targetPiece,
        );
        break;
      case "Rook":
        isValidBasicMove = isValidRookMove(startRow, startCol, endRow, endCol);
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
        isValidBasicMove = isValidBishopMove(
          startRow,
          startCol,
          endRow,
          endCol,
        );
        break;
      case "Queen":
        isValidBasicMove = isValidQueenMove(startRow, startCol, endRow, endCol);
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
    );
  };

  const wouldMoveLeaveKingInCheck = (
    startRow,
    startCol,
    endRow,
    endCol,
    pieceColor,
  ) => {
    const tempBoard = board.map((row) => [...row]);

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
      !board[startRow + direction][startCol]
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
    if (Math.abs(endRow - startRow) !== Math.abs(endCol - startCol))
      return false;

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
    return (
      isValidRookMove(startRow, startCol, endRow, endCol) ||
      isValidBishopMove(startRow, startCol, endRow, endCol)
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
        if (isValidMove(row, col, i, j, piece)) {
          moves.push([i, j]);
        }
      }
    }
    return moves;
  };

  // const isKingInCheck = (color, currentBoard) => {
  //   let kingRow, kingCol;
  //
  //   for (let i = 0; i < 8; i++) {
  //     for (let j = 0; j < 8; j++) {
  //       const piece = currentBoard[i][j];
  //       if (piece === `${color}King`) {
  //         kingRow = i;
  //         kingCol = j;
  //         break;
  //       }
  //     }
  //   }
  //
  //   const opponentColor = color === 'Light' ? 'Dark' : 'Light';
  //
  //   for (let i = 0; i < 8; i++) {
  //     for (let j = 0; j < 8; j++) {
  //       const piece = currentBoard[i][j];
  //
  //       if (piece && getPieceColor(piece) === opponentColor) {
  //         if (canPieceAttackSquare(i, j, kingRow, kingCol, piece, currentBoard)) {
  //           return true;
  //         }
  //       }
  //     }
  //   }
  //
  //   return false;
  // };

  // const isKingInCheckmate = (color, currentBoard) => {
  //   if (!isKingInCheck(color, currentBoard)) {
  //     return false;
  //   }
  //
  //   for (let r = 0; r < 8; r++) {
  //     for (let c = 0; c < 8; c++) {
  //       const piece = currentBoard[r][c];
  //
  //       if (piece && getPieceColor(piece) === color) {
  //         for (let r2 = 0; r2 < 8; r2++) {
  //           for (let c2 = 0; c2 < 8; c2++) {
  //             if (isValidMove(r, c, r2, c2, piece)) {
  //               const testBoard = currentBoard.map(row => [...row]);
  //               testBoard[r2][c2] = piece;
  //               testBoard[r][c] = "";
  //
  //               if (!isKingInCheck(color, testBoard)) {
  //                 return false;
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }
  //
  //   return true;
  // };

  // const undoMove = () => {
  //   if (moveHistory.length === 0) return;
  //
  //   const lastMoveData = moveHistory[moveHistory.length - 1];
  //   const newBoard = board.map(row => [...row]);
  //
  //   newBoard[lastMoveData.from[0]][lastMoveData.from[1]] = lastMoveData.piece;
  //   newBoard[lastMoveData.to[0]][lastMoveData.to[1]] = lastMoveData.captured || "";
  //
  //   setBoard(newBoard);
  //   setMoveHistory(prev => prev.slice(0, -1));
  //   setCurrentPlayer(lastMoveData.player);
  //   setLastMove(null);
  //   setGameStatus("playing");
  //
  //   if (timerEnabled) {
  //     setTimer(prev => ({
  //       ...prev,
  //       active: false
  //     }));
  //   }
  // };

  const handleSquareClick = (row, col) => {
    // Block interaction when AI is thinking or game is over
    if (isThinking || backendStatus !== "active") return;

    const piece = board[row][col];
    const pieceColor = getPieceColor(piece);

    // Only allow selecting Light (white) pieces — player is always white
    //Todo: Implement color choosing later
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
  
      const movingPiece = board[startRow][startCol];
      const capturedPiece = board[endRow][endCol];
  
      // Determine promotion: pawn reaching rank 8 (row 0 for Light)
      let promotionPiece = null;
      if (getPieceType(movingPiece) === "Pawn" && endRow === 0) {
        promotionPiece = "q"; // auto-promote to queen
      }
  
      const uci = boardPositionToUci(
        startRow,
        startCol,
        endRow,
        endCol,
        promotionPiece,
      );
  
      // Record player's move in history
      if (historyEnabled) {
        const notation = getChessNotation(
          movingPiece,
          startRow,
          startCol,
          endRow,
          endCol,
          capturedPiece,
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
  
      // Optimistically update the board with player's move
      const newBoard = board.map((row) => [...row]);
      newBoard[endRow][endCol] = promotionPiece ? "LightQueen" : movingPiece;
      newBoard[startRow][startCol] = "";
      setBoard(newBoard);
      
      // Send move to backend
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
        const backendFen = isMagnus ? data.fen : data.board?.fen;
        const botMoveUci = isMagnus ? data.ai_uci : data.bot_move?.move;
        const isGameOver = isMagnus 
        ? !!data.game_over 
        : !!data.board?.is_game_over;
        // Record AI move in history
        if (historyEnabled && botMoveUci) {
          const aiFrom = botMoveUci.slice(0, 2);
          const aiTo = botMoveUci.slice(2, 4);
          const [afr, afc] = uciSquareToCoords(aiFrom);
          const [atr, atc] = uciSquareToCoords(aiTo);
          setLastMove({ from: [afr, afc], to: [atr, atc] });
          //setLastMove({ from: aiFrom, to: aiTo });
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
  
        // Update board from backend FEN (source of truth)
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

      <div className="flex">
        <div
          className={`grid grid-cols-8 gap-0 border-2 border-gray-800 ${isThinking ? "opacity-75 pointer-events-none" : ""}`}
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
              const imagePath = getPieceImage(piece);

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                  className={`
                    w-16 h-16 flex items-center justify-center cursor-pointer relative
                    ${isLastMoveFrom? "bg-yellow-400 bg-opacity-20 border-black-100":
                    isLastMoveTo? "bg-green-400 bg-opacity-20 border-black-100"
                    : isDarkSquare ? "bg-gray-600" : "bg-gray-300"}
                    ${isSelected? "ring-2 ring-yellow-400 ring-inset" : ""}
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
            }),
          )}
        </div>

        {historyEnabled && (
          <div className="ml-6 w-64 bg-gray-800 rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-bold mb-3 text-center text-white">
              Move History
            </h3>
            <div className="h-96 overflow-y-auto">
              {moveHistory.length === 0 ? (
                <p className="text-gray-400 text-center">No moves yet</p>
              ) : (
                <div className="space-y-2">
                  {Array.from({
                    length: Math.ceil(moveHistory.length / 2),
                  }).map((_, moveNumber) => {
                    const whiteMove = moveHistory[moveNumber * 2];
                    const blackMove = moveHistory[moveNumber * 2 + 1];

                    return (
                      <div
                        key={moveNumber}
                        className="flex justify-between items-center p-2 bg-gray-700 rounded text-white"
                      >
                        <span className="font-mono w-8 text-gray-400">
                          {moveNumber + 1}.
                        </span>
                        <span className="font-mono flex-1 ml-2">
                          {whiteMove ? whiteMove.notation : ""}
                        </span>
                        <span className="font-mono flex-1 ml-4">
                          {blackMove ? blackMove.notation : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="mt-3 text-sm text-gray-400 text-center">
              {moveHistory.length} move{moveHistory.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Game Over Overlay */}
      {backendStatus !== "active" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-gray-800 rounded-lg p-8 text-center shadow-xl">
            <h2
              className={`text-4xl font-bold mb-4 ${
                backendStatus === "white_wins"
                  ? "text-green-400"
                  : backendStatus === "black_wins"
                    ? "text-red-400"
                    : "text-yellow-400"
              }`}
            >
              {getStatusMessage()}
            </h2>
            <p className="text-gray-300 mb-6">
              {backendStatus === "white_wins" &&
                "Checkmate! You defeated the AI."}
              {backendStatus === "black_wins" &&
                "Checkmate! The AI won this time."}
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

      {/* Settings Modal - Formatted like main settings screen */}
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
              {/* Settings Sidebar */}
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

              {/* Settings Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {/* User Profile Tab */}
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

                {/* Difficulty Tab */}
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
                          onChange={() => setDifficulty("easy")}
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
                          onChange={() => setDifficulty("medium")}
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
                          onChange={() => setDifficulty("hard")}
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
                            onChange={() => setDifficulty("magnus")}
                            className="mr-2"
                          />
                          Magnus Carlsen
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Theme Tab */}
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

                {/* Game Display Tab */}
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
                      <div className="flex items-center justify-Center">
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

                {/* Account Settings Tab */}
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
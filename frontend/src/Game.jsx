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
  const col = square.charCodeAt(0) - "a".charCodeAt(0);
  const row = 8 - parseInt(square[1], 10);
  return [row, col];
}

// Helper function to convert coordinates to algebraic notation
function coordsToAlgebraic(row, col) {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
  return files[col] + ranks[row];
}

export default function Game() {
  const [playerName, setPlayerName] = useState("");
  const [board, setBoard] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [gameStatus, setGameStatus] = useState("playing");
  const [backendStatus, setBackendStatus] = useState("active");
  const [moveHistory, setMoveHistory] = useState([]);
  const [uciHistory, setUciHistory] = useState([]);
  const [showOpponentProfile, setShowOpponentProfile] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [gameId, setGameId] = useState("");
  const [currentFen, setCurrentFen] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("game actions");
  const [lastMove, setLastMove] = useState(null);
  const [isCheck, setIsCheck] = useState(false);
  const [checkColor, setCheckColor] = useState(null);
  const [checkmateWinner, setCheckmateWinner] = useState(null);
  const [isStalemate, setIsStalemate] = useState(false);
  const [timer, setTimer] = useState({
    Light: 600,
    active: false,
    hasStarted: false,
  });
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [castleRights, setCastleRights] = useState({
    whiteKingMoved: false,
    whiteQueenRookMoved: false,
    whiteKingRookMoved: false,
    blackKingMoved: false,
    blackQueenRookMoved: false,
    blackKingRookMoved: false,
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

  const hasAnyLegalMoves = (boardState, playerColor) => {
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = boardState[i][j];
        if (piece && getPieceColor(piece) === playerColor) {
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

  const isCheckmate = (boardState, kingColor) => {
    const kingInCheck = isKingInCheck(boardState, kingColor);
    if (!kingInCheck) return false;

    return !hasAnyLegalMoves(boardState, kingColor);
  };

  const isStalematePosition = (boardState, currentPlayerColor) => {
    const kingInCheck = isKingInCheck(boardState, currentPlayerColor);
    if (kingInCheck) return false;

    return !hasAnyLegalMoves(boardState, currentPlayerColor);
  };

  const isKingInCheck = (boardState, kingColor) => {
    let kingRow, kingCol;

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

  const canCastle = (color, kingSide, currentBoard, castleState) => {
    const row = color === "Light" ? 7 : 0;
    const kingCol = 4;
    const rookCol = kingSide ? 7 : 0;
    const targetCol = kingSide ? 6 : 2;

    if (color === "Light") {
      if (castleState.whiteKingMoved) return false;
      if (kingSide && castleState.whiteKingRookMoved) return false;
      if (!kingSide && castleState.whiteQueenRookMoved) return false;
    } else {
      if (castleState.blackKingMoved) return false;
      if (kingSide && castleState.blackKingRookMoved) return false;
      if (!kingSide && castleState.blackQueenRookMoved) return false;
    }

    const rookPiece = currentBoard[row][rookCol];
    if (!rookPiece || getPieceType(rookPiece) !== "Rook") return false;

    const step = kingSide ? 1 : -1;
    for (let col = kingCol + step; col !== rookCol; col += step) {
      if (currentBoard[row][col]) return false;
    }

    for (let col = kingCol; col !== targetCol + step; col += step) {
      if (isSquareUnderAttack(row, col, color, currentBoard)) {
        return false;
      }
    }

    return true;
  };

  const isSquareUnderAttack = (row, col, color, currentBoard) => {
    const opponentColor = color === "Light" ? "Dark" : "Light";
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = currentBoard[i][j];
        if (piece && getPieceColor(piece) === opponentColor) {
          if (canPieceAttackSquare(i, j, row, col, piece, currentBoard)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const createNewGame = useCallback(async () => {
  try {
    const res = await fetch(`${API_URL}/game/new`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({
        difficulty: difficulty
      }),
    });
    if (!res.ok) {
      if (res.status === 401) {
        navigate("/signup");
        return;
      }
      return;
    }
    const data = await res.json();
    const id = data.game_id;
    const fen = data.fen;
    setGameId(id);
    setCurrentFen(fen);
    setBoard(fenToBoard(fen));
    localStorage.setItem("gameId", id);
    localStorage.setItem("currentFen", fen);
    setSelectedPiece(null);
    setValidMoves([]);
    setMoveHistory([]);
    setUciHistory([]);
    setUndoStack([]);
    setRedoStack([]);
    setLastMove(null);
    setCastleRights({
      whiteKingMoved: false,
      whiteQueenRookMoved: false,
      whiteKingRookMoved: false,
      blackKingMoved: false,
      blackQueenRookMoved: false,
      blackKingRookMoved: false,
    });
    setTimer({
      Light: timerDuration,
      active: false,
      hasStarted: false,
    });
    setGameStatus("playing");
    setBackendStatus("active");
    setIsCheck(false);
    setCheckColor(null);
    setCheckmateWinner(null);
    setIsStalemate(false);
  } catch (err) {
    console.error("Failed to create game", err);
  }
}, [navigate, difficulty, timerDuration]);

useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    createNewGame();
  }, [difficulty, createNewGame]);

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
      setUciHistory(parsed.uciHistory || []);
      setUndoStack(parsed.undoStack || []);
      setRedoStack(parsed.redoStack || []);
      setTimer(parsed.timer);
      setPlayerName(parsed.playerName);
      setGameId(parsed.gameId || "");
      setCurrentFen(parsed.currentFen || "");
      setLastMove(parsed.lastMove || null);
      setCastleRights(
        parsed.castleRights || {
          whiteKingMoved: false,
          whiteQueenRookMoved: false,
          whiteKingRookMoved: false,
          blackKingMoved: false,
          blackQueenRookMoved: false,
          blackKingRookMoved: false,
        },
      );
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
      setUciHistory([]);
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
        uciHistory,
        undoStack,
        redoStack,
        timer,
        playerName,
        gameId,
        currentFen,
        lastMove,
        castleRights,
      };
      localStorage.setItem("gameState", JSON.stringify(gameState));
    }
  }, [
    board,
    gameStatus,
    backendStatus,
    moveHistory,
    uciHistory,
    undoStack,
    redoStack,
    timer,
    playerName,
    gameId,
    currentFen,
    lastMove,
    castleRights,
  ]);

  useEffect(() => {
    let interval;
    if (
      timer.active &&
      gameStatus === "playing" &&
      timerEnabled &&
      !isThinking &&
      timer.hasStarted
    ) {
      interval = setInterval(() => {
        setTimer((prev) => {
          const newTime = Math.max(0, prev.Light - 1);

          if (newTime === 0) {
            setGameStatus("timeout");
            setBackendStatus("black_wins");
            clearInterval(interval);
          }

          return {
            ...prev,
            Light: newTime,
          };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer.active, gameStatus, timerEnabled, isThinking, timer.hasStarted]);

  useEffect(() => {
    if (
      gameId &&
      timerEnabled &&
      !timer.hasStarted &&
      gameStatus === "playing"
    ) {
      setTimer((prev) => ({
        ...prev,
        Light: timerDuration,
      }));
    }
  }, [timerDuration, timerEnabled, gameId, gameStatus, timer.hasStarted]);

  useEffect(() => {
    if (board.length === 0) return;

    const lightInCheck = isKingInCheck(board, "Light");
    const darkInCheck = isKingInCheck(board, "Dark");

    if (isCheckmate(board, "Light")) {
      setCheckmateWinner("Dark");
      setBackendStatus("black_wins");
      setGameStatus("checkmate");
      setIsCheck(false);
      setCheckColor(null);
      setIsStalemate(false);
      return;
    }

    if (isCheckmate(board, "Dark")) {
      setCheckmateWinner("Light");
      setBackendStatus("white_wins");
      setGameStatus("checkmate");
      setIsCheck(false);
      setCheckColor(null);
      setIsStalemate(false);
      return;
    }

    if (
      isStalematePosition(board, "Light") &&
      gameStatus === "playing" &&
      !lightInCheck
    ) {
      setIsStalemate(true);
      setBackendStatus("draw");
      setGameStatus("stalemate");
      setIsCheck(false);
      setCheckColor(null);
      return;
    }

    if (
      isStalematePosition(board, "Dark") &&
      gameStatus === "playing" &&
      !darkInCheck
    ) {
      setIsStalemate(true);
      setBackendStatus("draw");
      setGameStatus("stalemate");
      setIsCheck(false);
      setCheckColor(null);
      return;
    }

    if (lightInCheck) {
      setIsCheck(true);
      setCheckColor("Light");
    } else if (darkInCheck) {
      setIsCheck(true);
      setCheckColor("Dark");
    } else {
      setIsCheck(false);
      setCheckColor(null);
    }
  }, [board, gameStatus]);

  useEffect(() => {
    if (moveHistoryRef.current && historyEnabled) {
      moveHistoryRef.current.scrollTop = 0;
    }
  }, [moveHistory, historyEnabled]);

  const saveToUndoStack = () => {
    const currentState = {
      board: board.map((row) => [...row]),
      moveHistory: [...moveHistory],
      uciHistory: [...uciHistory],
      lastMove: lastMove,
      currentFen: currentFen,
      backendStatus: backendStatus,
      gameStatus: gameStatus,
      timer: { ...timer },
      castleRights: { ...castleRights },
    };
    setUndoStack((prev) => [...prev, currentState]);
    setRedoStack([]);
  };

  const undoMove = () => {
    if (undoStack.length === 0 || isThinking) return;
    if (timerEnabled && timer.Light <= 0) return;

    const currentState = {
      board: board.map((row) => [...row]),
      moveHistory: [...moveHistory],
      uciHistory: [...uciHistory],
      lastMove: lastMove,
      currentFen: currentFen,
      backendStatus: backendStatus,
      gameStatus: gameStatus,
      timer: { ...timer },
      castleRights: { ...castleRights },
    };
    setRedoStack((prev) => [...prev, currentState]);

    const previousState = undoStack[undoStack.length - 1];
    setBoard(previousState.board);
    setMoveHistory(previousState.moveHistory);
    setUciHistory(previousState.uciHistory || []);
    setLastMove(previousState.lastMove);
    setCurrentFen(previousState.currentFen);
    setBackendStatus(previousState.backendStatus);
    setGameStatus(previousState.gameStatus);
    setTimer(previousState.timer);
    setCastleRights(previousState.castleRights);

    setUndoStack((prev) => prev.slice(0, -1));
  };

  const redoMove = () => {
    if (redoStack.length === 0 || isThinking) return;
    if (timerEnabled && timer.Light <= 0) return;

    const currentState = {
      board: board.map((row) => [...row]),
      moveHistory: [...moveHistory],
      uciHistory: [...uciHistory],
      lastMove: lastMove,
      currentFen: currentFen,
      backendStatus: backendStatus,
      gameStatus: gameStatus,
      timer: { ...timer },
      castleRights: { ...castleRights },
    };
    setUndoStack((prev) => [...prev, currentState]);

    const nextState = redoStack[redoStack.length - 1];
    setBoard(nextState.board);
    setMoveHistory(nextState.moveHistory);
    setUciHistory(nextState.uciHistory || []);
    setLastMove(nextState.lastMove);
    setCurrentFen(nextState.currentFen);
    setBackendStatus(nextState.backendStatus);
    setGameStatus(nextState.gameStatus);
    setTimer(nextState.timer);
    setCastleRights(nextState.castleRights);

    setRedoStack((prev) => prev.slice(0, -1));
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

  // Improved chess notation function that returns proper algebraic notation
  const getChessNotation = (
    piece,
    startRow,
    startCol,
    endRow,
    endCol,
    capturedPiece,
    isPromotion = false,
    promotionPiece = null,
  ) => {
    const pieceType = getPieceType(piece);
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

    const startSquare = files[startCol] + ranks[startRow];
    const endSquare = files[endCol] + ranks[endRow];

    // For pawn moves
    if (pieceType === "Pawn") {
      if (capturedPiece) {
        // Pawn capture: like "exd5"
        const captureNotation = files[startCol] + "x" + endSquare;
        if (isPromotion && promotionPiece) {
          return captureNotation + "=" + promotionPiece.toUpperCase();
        }
        return captureNotation;
      } else {
        // Pawn move: like "e4"
        if (isPromotion && promotionPiece) {
          return endSquare + "=" + promotionPiece.toUpperCase();
        }
        return endSquare;
      }
    }

    // For piece moves
    let pieceLetter = "";
    switch (pieceType) {
      case "Knight":
        pieceLetter = "N";
        break;
      case "Bishop":
        pieceLetter = "B";
        break;
      case "Rook":
        pieceLetter = "R";
        break;
      case "Queen":
        pieceLetter = "Q";
        break;
      case "King":
        pieceLetter = "K";
        break;
      default:
        pieceLetter = "";
    }

    const captureSymbol = capturedPiece ? "x" : "";
    return pieceLetter + captureSymbol + endSquare;
  };

  const isValidMove = (
    startRow,
    startCol,
    endRow,
    endCol,
    piece,
    currentBoard = board,
  ) => {
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
        isValidBasicMove = isValidRookMove(
          startRow,
          startCol,
          endRow,
          endCol,
          currentBoard,
        );
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
          currentBoard,
        );
        break;
      case "Queen":
        isValidBasicMove = isValidQueenMove(
          startRow,
          startCol,
          endRow,
          endCol,
          currentBoard,
        );
        break;
      case "King":
        isValidBasicMove = isValidKingMove(
          startRow,
          startCol,
          endRow,
          endCol,
          pieceColor,
          currentBoard,
        );
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

  const isValidRookMove = (
    startRow,
    startCol,
    endRow,
    endCol,
    currentBoard,
  ) => {
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

  const isValidBishopMove = (
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

  const isValidQueenMove = (
    startRow,
    startCol,
    endRow,
    endCol,
    currentBoard,
  ) => {
    return (
      isValidRookMove(startRow, startCol, endRow, endCol, currentBoard) ||
      isValidBishopMove(startRow, startCol, endRow, endCol, currentBoard)
    );
  };

  const isValidKingMove = (
    startRow,
    startCol,
    endRow,
    endCol,
    pieceColor = null,
    currentBoard = board,
  ) => {
    const rowDiff = Math.abs(endRow - startRow);
    const colDiff = Math.abs(endCol - startCol);

    if (rowDiff <= 1 && colDiff <= 1) {
      return true;
    }

    if (rowDiff === 0 && colDiff === 2 && pieceColor) {
      const isKingSide = endCol > startCol;
      return canCastle(pieceColor, isKingSide, currentBoard, castleRights);
    }

    return false;
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

  const executeCastle = (color, isKingSide) => {
    const row = color === "Light" ? 7 : 0;
    const kingFromCol = 4;
    const kingToCol = isKingSide ? 6 : 2;
    const rookFromCol = isKingSide ? 7 : 0;
    const rookToCol = isKingSide ? 5 : 3;

    const newBoard = board.map((row) => [...row]);
    const king = newBoard[row][kingFromCol];
    const rook = newBoard[row][rookFromCol];

    newBoard[row][kingToCol] = king;
    newBoard[row][kingFromCol] = "";
    newBoard[row][rookToCol] = rook;
    newBoard[row][rookFromCol] = "";

    setBoard(newBoard);

    if (color === "Light") {
      setCastleRights((prev) => ({
        ...prev,
        whiteKingMoved: true,
        whiteKingRookMoved: true,
        whiteQueenRookMoved: true,
      }));
    } else {
      setCastleRights((prev) => ({
        ...prev,
        blackKingMoved: true,
        blackKingRookMoved: true,
        blackQueenRookMoved: true,
      }));
    }

    setLastMove({ from: [row, kingFromCol], to: [row, kingToCol] });

    return newBoard;
  };

  const handleSquareClick = (row, col) => {
    if (timerEnabled && timer.hasStarted && timer.Light <= 0) {
      return;
    }

    if (
      isThinking ||
      backendStatus !== "active" ||
      gameStatus === "checkmate" ||
      gameStatus === "stalemate"
    )
      return;

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
        const movingPiece = board[selectedPiece.row][selectedPiece.col];
        const pieceType = getPieceType(movingPiece);
        const pieceColor = getPieceColor(movingPiece);

        if (pieceType === "King" && Math.abs(col - selectedPiece.col) === 2) {
          const isKingSide = col > selectedPiece.col;
          movePiece(selectedPiece.row, selectedPiece.col, row, col, true);
        } else {
          movePiece(selectedPiece.row, selectedPiece.col, row, col);
        }
      }

      setSelectedPiece(null);
      setValidMoves([]);
    }
  };

  const movePiece = async (
    startRow,
    startCol,
    endRow,
    endCol,
    isCastle = false,
  ) => {
    if (timerEnabled && timer.hasStarted && timer.Light <= 0) {
      return;
    }

    const previousBoard = board.map((row) => [...row]);
    const previousMoveHistory = [...moveHistory];
    const previousLastMove = lastMove;
    const previousCastleRights = { ...castleRights };
    const previousRedoStack = [...redoStack];
    const previousTimer = { ...timer };
    const historyBeforeMove = [...uciHistory];

    saveToUndoStack();

    if (timerEnabled && !timer.hasStarted) {
      setTimer((prev) => ({
        ...prev,
        active: true,
        hasStarted: true,
      }));
    }

    const movingPiece = board[startRow][startCol];
    const capturedPiece = board[endRow][endCol];

    let promotionPiece = null;
    let isPromotion = false;
    if (!isCastle && getPieceType(movingPiece) === "Pawn" && endRow === 0) {
      promotionPiece = "q";
      isPromotion = true;
    }

    const uci = boardPositionToUci(
      startRow,
      startCol,
      endRow,
      endCol,
      promotionPiece,
    );

    if (isCastle) {
      const color = getPieceColor(movingPiece);
      const isKingSide = endCol > startCol;
      executeCastle(color, isKingSide);

      if (historyEnabled) {
        const castleNotation = isKingSide ? "O-O" : "O-O-O";
        setMoveHistory((prev) => [
          ...prev,
          {
            player: "Light",
            notation: castleNotation,
            piece: "King",
            from: [startRow, startCol],
            to: [endRow, endCol],
            captured: null,
          },
        ]);
      }
    } else {
      if (historyEnabled) {
        const notation = getChessNotation(
          movingPiece,
          startRow,
          startCol,
          endRow,
          endCol,
          capturedPiece,
          isPromotion,
          promotionPiece,
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

      if (getPieceType(movingPiece) === "King") {
        if (getPieceColor(movingPiece) === "Light") {
          setCastleRights((prev) => ({ ...prev, whiteKingMoved: true }));
        } else {
          setCastleRights((prev) => ({ ...prev, blackKingMoved: true }));
        }
      }

      if (getPieceType(movingPiece) === "Rook") {
        if (startCol === 0) {
          if (getPieceColor(movingPiece) === "Light") {
            setCastleRights((prev) => ({ ...prev, whiteQueenRookMoved: true }));
          } else {
            setCastleRights((prev) => ({ ...prev, blackQueenRookMoved: true }));
          }
        } else if (startCol === 7) {
          if (getPieceColor(movingPiece) === "Light") {
            setCastleRights((prev) => ({ ...prev, whiteKingRookMoved: true }));
          } else {
            setCastleRights((prev) => ({ ...prev, blackKingRookMoved: true }));
          }
        }
      }
    }

    setIsThinking(true);
    try {
      const configMap = {
        easy: { elo: 1500, style: "Balanced" },
        medium: { elo: 1600, style: "Balanced" },
        hard: { elo: 1700, style: "Aggressive" },
      };
      const eloConfig = configMap[difficulty.toLowerCase()];

      const payload = {
        uci,
        current_fen: currentFen,
        history_uci: historyBeforeMove,
        ...(eloConfig
          ? { bot_style: eloConfig.style, target_elo: eloConfig.elo }
          : {}),
      };

      const res = await fetch(`${API_URL}/game/${gameId}/move`, {
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
          const serverHistory = errData?.detail?.server_history_uci;
          setCurrentFen(serverFen);
          setBoard(fenToBoard(serverFen));
          setMoveHistory([]);
          setUciHistory(Array.isArray(serverHistory) ? serverHistory : []);
          setUndoStack([]);
          setRedoStack([]);
          setLastMove(null);
          setCastleRights({
            whiteKingMoved: false,
            whiteQueenRookMoved: false,
            whiteKingRookMoved: false,
            blackKingMoved: false,
            blackQueenRookMoved: false,
            blackKingRookMoved: false,
          });
        } else {
          setBoard(previousBoard);
          setMoveHistory(previousMoveHistory);
          setLastMove(previousLastMove);
          setCastleRights(previousCastleRights);
          setUndoStack((prev) => prev.slice(0, -1));
          setRedoStack(previousRedoStack);
          setTimer(previousTimer);
        }
        setIsThinking(false);
        return;
      }

      const data = await res.json();
      const backendFen = data.fen;
      const botMoveUci = data.ai_uci;
      const isGameOver = !!data.game_over;
      const newUciHistory = botMoveUci
        ? [...historyBeforeMove, uci, botMoveUci]
        : [...historyBeforeMove, uci];
      setUciHistory(newUciHistory);

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
            notation: aiTo,
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
      setBackendStatus(data.status);

      if (isGameOver) {
        if (data.status === "white_wins") {
          setCheckmateWinner("Light");
          setGameStatus("checkmate");
        } else if (data.status === "black_wins") {
          setCheckmateWinner("Dark");
          setGameStatus("checkmate");
        } else {
          setIsStalemate(true);
          setGameStatus("stalemate");
        }
      } else {
        setGameStatus("playing");
      }
    } catch {
      setBoard(previousBoard);
      setMoveHistory(previousMoveHistory);
      setLastMove(previousLastMove);
      setCastleRights(previousCastleRights);
      setUndoStack((prev) => prev.slice(0, -1));
      setRedoStack(previousRedoStack);
      setTimer(previousTimer);
    } finally {
      setIsThinking(false);
    }
  };

  const handleNewGame = async () => {
    setCheckmateWinner(null);
    setIsStalemate(false);
    setUndoStack([]);
    setRedoStack([]);
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
        if (gameStatus === "timeout") return "Time's Up! You Lose!";
        if (isThinking) return "AI is thinking...";
        return "Your Turn";
    }
  };

  const handleReturnHome = () => {
    localStorage.removeItem("gameState");
    navigate("/");
  };

  
    // Add state for user stats
    const [userStats, setUserStats] = useState({
      easy: { games_played: 0, games_won: 0, win_rate: 0 },
      medium: { games_played: 0, games_won: 0, win_rate: 0 },
      hard: { games_played: 0, games_won: 0, win_rate: 0 },
      magnus: { games_played: 0, games_won: 0, win_rate: 0 }
    });
    const [statsLoading, setStatsLoading] = useState(false);
    // Sync with global difficulty - when global changes, this updates too
    const [selectedStatDifficulty, setSelectedStatDifficulty] = useState(difficulty || "medium");
    
    const difficulties = ["easy", "medium", "hard", "magnus"];
  
    const fromGame = location.state?.from === 'game' || location.state?.fromGame === true;
  
    // Update selectedStatDifficulty when global difficulty changes
    useEffect(() => {
      setSelectedStatDifficulty(difficulty);
    }, [difficulty]);
  
    // Fetch user stats using the leaderboard endpoint
    useEffect(() => {
      if (isLoggedIn && settingsTab === "user") {
        fetchUserStats();
      }
    }, [isLoggedIn, settingsTab, selectedStatDifficulty]); // Re-fetch when difficulty changes
  
    const fetchUserStats = async () => {
      setStatsLoading(true);
      const token = localStorage.getItem("token");
      const currentUsername = localStorage.getItem("playerName");
      
      try {
        // Fetch leaderboard data for all difficulties
        const statsPromises = difficulties.map(async (diff) => {
          const response = await fetch(`${API_URL}/api/leaderboard/${diff}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const leaderboardData = await response.json();
            // Find the current user in the leaderboard
            const userEntry = leaderboardData.find(
              player => player.username === currentUsername
            );
            return {
              difficulty: diff,
              games_played: userEntry?.games_played || 0,
              games_won: userEntry?.games_won || 0,
              win_rate: userEntry?.games_played > 0 
                ? Math.round((userEntry.games_won / userEntry.games_played) * 100)
                : 0
            };
          }
          return { difficulty: diff, games_played: 0, games_won: 0, win_rate: 0 };
        });
        
        const results = await Promise.all(statsPromises);
        const statsMap = {};
        results.forEach(result => {
          statsMap[result.difficulty] = {
            games_played: result.games_played || 0,
            games_won: result.games_won || 0,
            win_rate: result.win_rate || 0
          };
        });
        
        setUserStats(statsMap);
      } catch (error) {
        console.error("Error fetching user stats:", error);
      } finally {
        setStatsLoading(false);
      }
    };
  
    const navigateStatDifficulty = (direction) => {
      const currentIndex = difficulties.indexOf(selectedStatDifficulty);
      if (direction === "prev" && currentIndex > 0) {
        const newDifficulty = difficulties[currentIndex - 1];
        setSelectedStatDifficulty(newDifficulty);
        // Also update the global difficulty setting
        setDifficulty(newDifficulty);
      } else if (direction === "next" && currentIndex < difficulties.length - 1) {
        const newDifficulty = difficulties[currentIndex + 1];
        setSelectedStatDifficulty(newDifficulty);
        // Also update the global difficulty setting
        setDifficulty(newDifficulty);
      }
    };
  
    const getDifficultyDisplayName = (diff) => {
      const names = {
        easy: "Easy",
        medium: "Medium",
        hard: "Hard",
        magnus: "Magnus Carlsen"
      };
      return names[diff] || diff;
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

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  const getLabelStyle = () => {
    switch (theme) {
      case "light":
        return "text-gray-700 font-semibold";
      case "dark":
        return "text-gray-300 font-semibold";
      case "game":
        return "text-green-400 font-semibold";
      case "sky":
        return "text-blue-100 font-semibold";
      case "candy":
        return "text-pink-100 font-semibold";
      default:
        return "text-white font-semibold";
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="mb-4 flex items-center justify-center space-x-4">
        {timerEnabled && (
          <div
            className={`px-4 py-2 ${buttonBgClass} rounded flex items-center justify-center`}
          >
            <span>Time: {formatTime(timer.Light)}</span>
          </div>
        )}

        {/* Check Message - Yellow */}
        {isCheck &&
          checkColor &&
          gameStatus !== "checkmate" &&
          gameStatus !== "stalemate" && (
            <div className="px-4 py-2 rounded bg-yellow-500 text-white font-bold animate-pulse">
              ⚠️ CHECK!{" "}
              {checkColor === "Light" ? "Your king" : "Opponent's king"} is in
              check! ⚠️
            </div>
          )}

        {/* Checkmate Message - Green/Red with action buttons */}
        {checkmateWinner && gameStatus === "checkmate" && (
          <div className="flex items-center space-x-3">
            <div
              className={`px-4 py-2 rounded font-bold ${
                checkmateWinner === "Light"
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
              }`}
            >
              {checkmateWinner === "Light"
                ? "🏆 CHECKMATE! You Win! 🏆"
                : "💀 CHECKMATE! You Lose! 💀"}
            </div>
            <button
              onClick={handleNewGame}
              className={`px-3 py-2 ${buttonBgClass} rounded ${buttonHoverClass} text-sm`}
            >
              New Game
            </button>
            <button
              onClick={handleReturnHome}
              className={`px-3 py-2 ${buttonBgClass} rounded ${buttonHoverClass} text-sm`}
            >
              Home
            </button>
          </div>
        )}

        {/* Stalemate Message - Orange with action buttons */}
        {isStalemate && gameStatus === "stalemate" && (
          <div className="flex items-center space-x-3">
            <div className="px-4 py-2 rounded font-bold bg-orange-600 text-white">
              ♟️ STALEMATE! Game is a Draw! ♟️
            </div>
            <button
              onClick={handleNewGame}
              className={`px-3 py-2 ${buttonBgClass} rounded ${buttonHoverClass} text-sm`}
            >
              New Game
            </button>
            <button
              onClick={handleReturnHome}
              className={`px-3 py-2 ${buttonBgClass} rounded ${buttonHoverClass} text-sm`}
            >
              Home
            </button>
          </div>
        )}

        {/* Status Message - Only show if not checkmate or stalemate */}
        {!checkmateWinner && !isStalemate && (
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
        )}

        <button
          onClick={undoMove}
          disabled={
            undoStack.length === 0 ||
            isThinking ||
            backendStatus !== "active" ||
            checkmateWinner ||
            isStalemate ||
            (timerEnabled && timer.hasStarted && timer.Light <= 0)
          }
          className={`px-4 py-2 rounded ${
            undoStack.length === 0 ||
            isThinking ||
            backendStatus !== "active" ||
            checkmateWinner ||
            isStalemate ||
            (timerEnabled && timer.hasStarted && timer.Light <= 0)
              ? "bg-gray-400 cursor-not-allowed"
              : `${buttonBgClass} ${buttonHoverClass}`
          }`}
        >
          Undo
        </button>
        <button
          onClick={redoMove}
          disabled={
            redoStack.length === 0 ||
            isThinking ||
            backendStatus !== "active" ||
            checkmateWinner ||
            isStalemate ||
            (timerEnabled && timer.hasStarted && timer.Light <= 0)
          }
          className={`px-4 py-2 rounded ${
            redoStack.length === 0 ||
            isThinking ||
            backendStatus !== "active" ||
            checkmateWinner ||
            isStalemate ||
            (timerEnabled && timer.hasStarted && timer.Light <= 0)
              ? "bg-gray-400 cursor-not-allowed"
              : `${buttonBgClass} ${buttonHoverClass}`
          }`}
        >
          Redo
        </button>
        <button
          onClick={handleSettingsClick}
          className={`px-4 py-2 ${buttonBgClass} rounded ${buttonHoverClass}`}
        >
          Settings
        </button>
      </div>

      <div className="flex">
        <div className="relative">
          <div className="flex">
            <div
              className="flex flex-col justify-between mr-2"
              style={{ height: "512px" }}
            >
              {ranks.map((rank, index) => (
                <div
                  key={`rank-${rank}`}
                  className={`${getLabelStyle()} text-sm font-bold flex items-center justify-center`}
                  style={{ width: "24px", height: "64px" }}
                >
                  {rank}
                </div>
              ))}
            </div>

            <div>
              <div
                className={`grid grid-cols-8 gap-0 border-2 border-gray-800 ${isThinking ? "opacity-75 pointer-events-none" : ""}`}
                style={{ width: "512px", height: "512px" }}
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
                    const isSelected =
                      selectedPiece?.row === rowIndex &&
                      selectedPiece?.col === colIndex;
                    const isKingInCheckNow =
                      isCheck &&
                      ((piece === "LightKing" && checkColor === "Light") ||
                        (piece === "DarkKing" && checkColor === "Dark"));
                    const imagePath = getPieceImage(piece);

                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        onClick={() => handleSquareClick(rowIndex, colIndex)}
                        className={`
                          w-16 h-16 flex items-center justify-center cursor-pointer relative
                          ${
                            isLastMoveFrom
                              ? "bg-yellow-400 bg-opacity-20"
                              : isLastMoveTo
                                ? "bg-green-400 bg-opacity-20"
                                : isDarkSquare
                                  ? "bg-gray-600"
                                  : "bg-gray-300"
                          }
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
                            className="w-12 h-12 object-contain z-10"
                          />
                        ) : null}
                      </div>
                    );
                  }),
                )}
              </div>

              <div
                className="mt-1 w-full flex justify-between px-0"
                style={{ width: "512px" }}
              >
                {files.map((file, index) => (
                  <div
                    key={`file-${file}`}
                    className={`${getLabelStyle()} text-sm font-bold flex items-center justify-center`}
                    style={{ width: "64px" }}
                  >
                    {file}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {historyEnabled && (
          <div className="ml-6 w-64 bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col" style={{ height: "512px" }}>
            <h3 className="text-lg font-bold mb-3 text-center text-white">
              Move History
            </h3>
            <div ref={moveHistoryRef} className="flex-1 overflow-y-auto">
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
                        blackMove: moveHistory[i + 1],
                      });
                    }
                    return pairedMoves
                      .slice()
                      .reverse()
                      .map((pair) => (
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
                <button
                  onClick={() => setSettingsTab("game actions")}
                  className={`p-4 text-left ${
                    settingsTab === "game actions"
                      ? `${modalSidebarActiveClass} font-semibold`
                      : `${modalSidebarHoverClass}`
                  }`}
                >
                  Game Actions
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
                    <h2 className="text-2xl font-semibold mb-4">
                      User Profile
                    </h2>
                    {isLoggedIn ? (
                    <div className="text-center py-8 px-4 border rounded-lg mt-2">
                      <p className="mb-6">Username: <strong>{username}</strong></p>
                      
                      {/* Difficulty Selector In User Profile */}
                      <div className="flex items-center justify-center gap-6 mb-6">
                        <button
                          onClick={() => navigateStatDifficulty("prev")}
                          disabled={difficulties.indexOf(selectedStatDifficulty) === 0}
                          className={`text-2xl font-bold p-1 rounded-lg transition
                            ${difficulties.indexOf(selectedStatDifficulty) === 0 
                              ? "opacity-30 cursor-not-allowed" 
                              : buttonHoverClass}`}
                        >
                          ‹
                        </button>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">Difficulty:</p>
                          <p className="text-lg font-semibold min-w-[180px]">
                            {getDifficultyDisplayName(selectedStatDifficulty)}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => navigateStatDifficulty("next")}
                          disabled={difficulties.indexOf(selectedStatDifficulty) === difficulties.length - 1}
                          className={`text-2xl font-bold p-1 rounded-lg transition
                            ${difficulties.indexOf(selectedStatDifficulty) === difficulties.length - 1 
                              ? "opacity-30 cursor-not-allowed" 
                              : buttonHoverClass}`}
                        >
                          ›
                        </button>
                      </div>

                      {/* Stats display */}
                      {statsLoading ? (
                        <div className="text-center py-8">
                          <div className="text-xl">Loading stats...</div>
                        </div>
                      ) : (
                        <>
                          <p className="mb-4">Games Played: <strong>{userStats[selectedStatDifficulty]?.games_played || 0}</strong></p>
                          <p className="mb-4">Games Won: <strong>{userStats[selectedStatDifficulty]?.games_won || 0}</strong></p>
                          <p className="mb-4">Win Percentage: <strong>{userStats[selectedStatDifficulty]?.win_rate || 0}%</strong></p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 border rounded-lg mt-8">
                      <p className="text-2xl mb-4">Playing as Guest</p>
                      <p className="mb-6">Create an account to save your progress and compete on the leaderboard!</p>
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={() => navigate("/login")}
                          className={`px-6 py-2 mt-4 ${buttonBgClass} rounded-lg ${buttonHoverClass}`}
                        >
                          Log In
                        </button>
                        <button
                          onClick={() => navigate("/signup")}
                          className={`px-6 py-2 mt-4 ${buttonBgClass} rounded-lg ${buttonHoverClass}`}
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
                              if (
                                window.confirm(
                                  "Changing difficulty will start a new game. Continue?",
                                )
                              ) {
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
                              if (
                                window.confirm(
                                  "Changing difficulty will start a new game. Continue?",
                                )
                              ) {
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
                              if (
                                window.confirm(
                                  "Changing difficulty will start a new game. Continue?",
                                )
                              ) {
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
                                if (
                                  window.confirm(
                                    "Changing difficulty will start a new game. Continue?",
                                  )
                                ) {
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
                          <span className="text-xl w-40 text-left mr-8">
                            Timer Duration:
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={Math.floor(timerDuration / 60)}
                              onChange={(e) => {
                                let rawValue = e.target.value;

                                if (rawValue.includes(".")) {
                                  rawValue = rawValue.split(".")[0];
                                }

                                let minutes = parseInt(rawValue, 10);

                                if (isNaN(minutes) || rawValue === "") {
                                  minutes = 1;
                                }

                                minutes = parseInt(minutes.toString(), 10);
                                minutes = Math.max(1, Math.min(60, minutes));
                                setTimerDuration(minutes * 60);
                              }}
                              onFocus={(e) => {
                                e.target.select();
                              }}
                              min="1"
                              max="60"
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

                {settingsTab === "game actions" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-semibold mb-8">
                      Game Actions
                    </h2>
                    <div className="flex flex-col gap-6">
                      {/* <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">
                            Opponent Profile
                          </h3>
                          <p className="text-sm opacity-75">
                            View opponent information and stats
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setShowOpponentProfile(true);
                            setShowSettings(false);
                          }}
                          className={`px-4 py-2 ${buttonBgClass} rounded ${buttonHoverClass}`}
                        >
                          View Profile
                        </button>
                      </div> */}

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        
                          <h3 className="text-lg font-semibold mb-1">
                            New Game
                          </h3>
                          <p className="text-sm opacity-75">
                            Start a fresh game with current settings
                          </p>
                        
                        <button
                          onClick={() => {
                            handleNewGame();
                            setShowSettings(false);
                          }}
                          className={`px-6 py-2 ${buttonBgClass} rounded ${buttonHoverClass}`}
                        >
                          New Game
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        
                          <h3 className="text-lg font-semibold mb-1">
                            Return to Home
                          </h3>
                          <p className="text-sm opacity-75">
                            Exit to main menu
                          </p>
                        
                        <button
                          onClick={() => {
                            handleReturnHome();
                            setShowSettings(false);
                          }}
                          className={`px-4 py-2 ${buttonBgClass} rounded ${buttonHoverClass}`}
                        >
                          Return Home
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === "account" && isLoggedIn && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold mb-8">Account</h2>
                    <div className="text-center py-8 px-4 border rounded-lg mt-8">
                      <p className="mb-8 text-lg">
                        Logged in as: <strong>{username}</strong>
                      </p>
                      {/* <p className="mb-8 text-sm">
                        To change your username or password, please visit
                        Settings from the main menu.
                      </p> */}
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

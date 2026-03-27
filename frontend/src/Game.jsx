import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "./SettingsContext.jsx";

export default function Game() {
  const [playerName, setPlayerName] = useState("");
  const [board, setBoard] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState("Light");
  const [validMoves, setValidMoves] = useState([]);
  const [gameStatus, setGameStatus] = useState("playing");
  const [moveHistory, setMoveHistory] = useState([]);
  const [showOpponentProfile, setShowOpponentProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("user");
  const [lastMove, setLastMove] = useState(null);
  const [timer, setTimer] = useState({
    Light: 600,
    active: false,
    startTime: null
  });
  const navigate = useNavigate();
  
  const { timerEnabled, historyEnabled, theme, setTheme, difficulty, setDifficulty } = useSettings();

  useEffect(() => {
    const savedState = localStorage.getItem('gameState');
    const name = localStorage.getItem("playerName");
    
    if (!name) {
      navigate("/signup");
      return;
    }
    
    setPlayerName(name);
    
    if (savedState) {
      const {
        board: savedBoard,
        currentPlayer: savedPlayer,
        gameStatus: savedStatus,
        moveHistory: savedHistory,
        timer: savedTimer,
        playerName: savedName,
        lastMove: savedLastMove
      } = JSON.parse(savedState);
      
      setBoard(savedBoard);
      setCurrentPlayer(savedPlayer);
      setGameStatus(savedStatus);
      setMoveHistory(savedHistory);
      setTimer(savedTimer);
      setPlayerName(savedName);
      setLastMove(savedLastMove);
      
      localStorage.removeItem('gameState');
    } else {
      initializeBoard();
    }
  }, [navigate]);

  useEffect(() => {
    if (board.length > 0) {
      const gameState = {
        board,
        currentPlayer,
        gameStatus,
        moveHistory,
        timer,
        playerName,
        lastMove
      };
      localStorage.setItem('gameState', JSON.stringify(gameState));
    }
  }, [board, currentPlayer, gameStatus, moveHistory, timer, playerName, lastMove]);

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

  const initializeBoard = () => {
    const initialBoard = [
      ['DarkRook', 'DarkKnight', 'DarkBishop', 'DarkQueen', 'DarkKing', 'DarkBishop', 'DarkKnight', 'DarkRook'],
      ['DarkPawn', 'DarkPawn', 'DarkPawn', 'DarkPawn', 'DarkPawn', 'DarkPawn', 'DarkPawn', 'DarkPawn'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['LightPawn', 'LightPawn', 'LightPawn', 'LightPawn', 'LightPawn', 'LightPawn', 'LightPawn', 'LightPawn'],
      ['LightRook', 'LightKnight', 'LightBishop', 'LightQueen', 'LightKing', 'LightBishop', 'LightKnight', 'LightRook']
    ];
    setBoard(initialBoard);
    setCurrentPlayer("Light");
    setSelectedPiece(null);
    setValidMoves([]);
    setMoveHistory([]);
    setLastMove(null);
    setTimer({
      Light: 600,
      active: false,
      startTime: null
    });
    setGameStatus("playing");
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
    const targetPiece = currentBoard[targetRow][targetCol];
    
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

  const isKingInCheck = (color, currentBoard) => {
    let kingRow, kingCol;

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = currentBoard[i][j];
        if (piece === `${color}King`) {
          kingRow = i;
          kingCol = j;
          break;
        }
      }
    }

    const opponentColor = color === 'Light' ? 'Dark' : 'Light';

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = currentBoard[i][j];

        if (piece && getPieceColor(piece) === opponentColor) {
          if (canPieceAttackSquare(i, j, kingRow, kingCol, piece, currentBoard)) {
            return true;
          }
        }
      }
    }

    return false;
  };

  const isKingInCheckmate = (color, currentBoard) => {
    if (!isKingInCheck(color, currentBoard)) {
      return false;
    }

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = currentBoard[r][c];

        if (piece && getPieceColor(piece) === color) {
          for (let r2 = 0; r2 < 8; r2++) {
            for (let c2 = 0; c2 < 8; c2++) {
              if (isValidMove(r, c, r2, c2, piece)) {
                const testBoard = currentBoard.map(row => [...row]);
                testBoard[r2][c2] = piece;
                testBoard[r][c] = "";

                if (!isKingInCheck(color, testBoard)) {
                  return false;
                }
              }
            }
          }
        }
      }
    }

    return true;
  };

  const undoMove = () => {
    if (moveHistory.length === 0) return;
    
    const lastMoveData = moveHistory[moveHistory.length - 1];
    const newBoard = board.map(row => [...row]);
    
    newBoard[lastMoveData.from[0]][lastMoveData.from[1]] = lastMoveData.piece;
    newBoard[lastMoveData.to[0]][lastMoveData.to[1]] = lastMoveData.captured || "";
    
    setBoard(newBoard);
    setMoveHistory(prev => prev.slice(0, -1));
    setCurrentPlayer(lastMoveData.player);
    setLastMove(null);
    setGameStatus("playing");
    
    if (timerEnabled) {
      setTimer(prev => ({
        ...prev,
        active: false
      }));
    }
  };

  const handleSquareClick = (row, col) => {
    const piece = board[row][col];
    const pieceColor = getPieceColor(piece);

    if (!selectedPiece && piece && pieceColor === currentPlayer) {
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

  const movePiece = (startRow, startCol, endRow, endCol) => {
    if (!timer.active && timerEnabled) {
      setTimer(prev => ({ ...prev, active: true }));
    }

    const newBoard = board.map(row => [...row]);

    const movingPiece = newBoard[startRow][startCol];
    const capturedPiece = newBoard[endRow][endCol];

    if (historyEnabled) {
      const notation = getChessNotation(
        movingPiece,
        startRow,
        startCol,
        endRow,
        endCol,
        capturedPiece
      );

      setMoveHistory(prev => [
        ...prev,
        {
          player: currentPlayer,
          notation,
          piece: movingPiece,
          from: [startRow, startCol],
          to: [endRow, endCol],
          captured: capturedPiece
        }
      ]);
    }

    setLastMove({ from: [startRow, startCol], to: [endRow, endCol] });

    newBoard[endRow][endCol] = movingPiece;
    newBoard[startRow][startCol] = "";

    if (getPieceType(movingPiece) === "Pawn") {
      if (
        (currentPlayer === "Light" && endRow === 0) ||
        (currentPlayer === "Dark" && endRow === 7)
      ) {
        newBoard[endRow][endCol] = `${currentPlayer}Queen`;
      }
    }

    setBoard(newBoard);

    const nextPlayer = currentPlayer === "Light" ? "Dark" : "Light";

    if (isKingInCheckmate(nextPlayer, newBoard)) {
      setGameStatus("checkmate");
    } 
    else if (isKingInCheck(nextPlayer, newBoard)) {
      setGameStatus("check");
    } 
    else {
      setGameStatus("playing");
    }

    setCurrentPlayer(nextPlayer);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleReturnHome = () => {
    localStorage.removeItem('gameState');
    navigate('/');
  };

  const handleNewGame = () => {
    localStorage.removeItem('gameState');
    initializeBoard();
    setSelectedPiece(null);
    setValidMoves([]);
    setGameStatus("playing");
  };

  const buttonBgClass = {
    light: "bg-blue-600 text-white",
    dark: "bg-blue-600 text-white",
    game: "bg-[#0f172a] text-green-400",
    sky: "bg-blue-400 text-blue-100",
    candy: "bg-pink-400 text-pink-100"
  }[theme];

  const buttonHoverClass = {
    light: "hover:bg-blue-700",
    dark: "hover:bg-blue-700",
    game: "hover:bg-gray-700",
    sky: "hover:bg-blue-500",
    candy: "hover:bg-pink-500"
  }[theme];

  const modalBgClass = {
    light: "bg-white text-black",
    dark: "bg-gray-800 text-white",
    game: "bg-[#0f172a] text-green-400",
    sky: "bg-gradient-to-r from-blue-400 to-blue-600 text-blue-100",
    candy: "bg-gradient-to-r from-pink-400 to-purple-400 text-pink-100"
  }[theme];

  const modalSidebarClass = {
    light: "bg-gray-100",
    dark: "bg-gray-900",
    game: "bg-gray-900",
    sky: "bg-gradient-to-b from-blue-400 to-blue-600",
    candy: "bg-gradient-to-b from-pink-400 to-purple-400"
  }[theme];

  const modalSidebarActiveClass = {
    light: "bg-gray-300",
    dark: "bg-gray-600",
    game: "bg-gray-600",
    sky: "bg-blue-700",
    candy: "bg-purple-700"
  }[theme];

  const modalSidebarHoverClass = {
    light: "hover:bg-gray-200",
    dark: "hover:bg-gray-700",
    game: "hover:bg-gray-700",
    sky: "hover:bg-blue-700",
    candy: "hover:bg-purple-500"
  }[theme];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="mb-4 flex items-center justify-center space-x-4">
        {timerEnabled && (
          <div className={`px-4 py-2 ${buttonBgClass} rounded`}>
            {"User"}: {formatTime(timer.Light)}
          </div>
        )}
        <button
          onClick={() => setShowOpponentProfile(true)}
          className={`px-4 py-2 ${buttonBgClass} rounded ${buttonHoverClass}`}
        >
          Opponent
        </button>
        <button
          onClick={undoMove}
          disabled={moveHistory.length === 0}
          className={`px-4 py-2 rounded ${
            moveHistory.length === 0 
              ? 'bg-gray-400 cursor-not-allowed' 
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
        <div className="grid grid-cols-8 gap-0 border-2 border-gray-800">
          {board.map((row, rowIndex) => (
            row.map((piece, colIndex) => {
              const isDarkSquare = (rowIndex + colIndex) % 2 === 1;
              const isValidMoveSquare = validMoves.some(([r, c]) => r === rowIndex && c === colIndex);
              const isLastMoveFrom = lastMove && lastMove.from[0] === rowIndex && lastMove.from[1] === colIndex;
              const isLastMoveTo = lastMove && lastMove.to[0] === rowIndex && lastMove.to[1] === colIndex;
              const imagePath = getPieceImage(piece);
              
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                  className={`
                    w-16 h-16 flex items-center justify-center cursor-pointer relative
                    ${isDarkSquare ? 'bg-gray-600' : 'bg-gray-300'}
                    ${(isLastMoveFrom || isLastMoveTo) ? 'ring-2 ring-yellow-400 ring-inset' : ''}
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
                <div className="space-y-2">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, moveNumber) => {
                    const whiteMove = moveHistory[moveNumber * 2];
                    const blackMove = moveHistory[moveNumber * 2 + 1];
                    
                    return (
                      <div key={moveNumber} className="flex justify-between items-center p-2 bg-gray-700 rounded text-white">
                        <span className="font-mono w-8 text-gray-400">{moveNumber + 1}.</span>
                        <span className="font-mono flex-1 ml-2">
                          {whiteMove ? whiteMove.notation : ''}
                        </span>
                        <span className="font-mono flex-1 ml-4">
                          {blackMove ? blackMove.notation : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="mt-3 text-sm text-gray-400 text-center">
              {moveHistory.length} move{moveHistory.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg shadow-xl w-[70vw] h-[65vh] flex flex-col ${modalBgClass}`}>
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
              <div className={`w-1/4 border-r flex flex-col ${modalSidebarClass}`}>
                <button
                  onClick={() => setSettingsTab("user")}
                  className={`p-4 text-left transition ${
                    settingsTab === "user" 
                      ? `${modalSidebarActiveClass} font-semibold` 
                      : `${modalSidebarHoverClass}`
                  }`}
                >
                  User
                </button>
                <button
                  onClick={() => setSettingsTab("difficulty")}
                  className={`p-4 text-left transition ${
                    settingsTab === "difficulty" 
                      ? `${modalSidebarActiveClass} font-semibold` 
                      : `${modalSidebarHoverClass}`
                  }`}
                >
                  Difficulty
                </button>
                <button
                  onClick={() => setSettingsTab("display")}
                  className={`p-4 text-left transition ${
                    settingsTab === "display" 
                      ? `${modalSidebarActiveClass} font-semibold` 
                      : `${modalSidebarHoverClass}`
                  }`}
                >
                  Display
                </button>
                <button
                  onClick={() => setSettingsTab("gameplay")}
                  className={`p-4 text-left transition ${
                    settingsTab === "gameplay" 
                      ? `${modalSidebarActiveClass} font-semibold` 
                      : `${modalSidebarHoverClass}`
                  }`}
                >
                  Gameplay
                </button>
              </div>

              {/* Settings Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {/* User Tab */}
                {settingsTab === "user" && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-semibold mb-6">User Profile</h3>
                    <div className="space-y-3">
                      <p className="text-lg">Username: <span className="font-mono">{playerName}</span></p>
                      <p className="text-lg">Games Played: <span className="font-mono">—</span></p>
                      <p className="text-lg">Games Won: <span className="font-mono">—</span></p>
                      <p className="text-lg">Win Percentage: <span className="font-mono">—</span></p>
                    </div>
                  </div>
                )}

                {/* Difficulty Tab */}
                {settingsTab === "difficulty" && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold mb-6">Difficulty Settings</h3>
                    
                    <div>
                      <h4 className="text-xl font-semibold mb-3">General:</h4>
                      <p className="text-xs italic mb-4">(General Settings Simulate Chess Matches From Specific ELO Ranges)</p>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="difficulty"
                            value="easy"
                            checked={difficulty === "easy"}
                            onChange={() => setDifficulty("easy")}
                            className="mr-3"
                          />
                          Easy
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="difficulty"
                            value="medium"
                            checked={difficulty === "medium"}
                            onChange={() => setDifficulty("medium")}
                            className="mr-3"
                          />
                          Medium
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="difficulty"
                            value="hard"
                            checked={difficulty === "hard"}
                            onChange={() => setDifficulty("hard")}
                            className="mr-3"
                          />
                          Hard
                        </label>
                      </div>
                    </div>
                    
                    <div className="mt-8">
                      <h4 className="text-xl font-semibold mb-3">Special:</h4>
                      <p className="text-xs italic mb-4">(Special Settings Simulate The Playstyle Specific Players)</p>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="difficulty"
                            value="magnus"
                            checked={difficulty === "magnus"}
                            onChange={() => setDifficulty("magnus")}
                            className="mr-3"
                          />
                          Magnus Carlsen
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Display Tab */}
                {settingsTab === "display" && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-semibold mb-6">Display Settings</h3>
                    <div className="space-y-3">
                      {[
                        { label: "Light Mode", value: "light" },
                        { label: "Dark Mode", value: "dark" },
                        { label: "Game Mode", value: "game" },
                        { label: "Sky Mode", value: "sky" },
                        { label: "Candy Mode", value: "candy" }
                      ].map((option) => (
                        <label key={option.value} className="flex items-center">
                          <input
                            type="radio"
                            name="theme"
                            checked={theme === option.value}
                            onChange={() => setTheme(option.value)}
                            className="mr-3"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gameplay Tab */}
                {settingsTab === "gameplay" && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold mb-6">Gameplay Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-lg">Enable Timer:</span>
                        <button
                          onClick={() => setTimerEnabled(prev => !prev)}
                          className={`relative w-14 h-7 rounded-full transition-colors ${
                            timerEnabled ? "bg-green-500" : "bg-gray-400"
                          }`}
                        >
                          <div
                            className={`absolute h-5 w-5 bg-white rounded-full shadow-md transform transition-transform top-1 ${
                              timerEnabled ? "translate-x-8" : "translate-x-1"
                            }`}
                          ></div>
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg">Enable Move History:</span>
                        <button
                          onClick={() => setHistoryEnabled(prev => !prev)}
                          className={`relative w-14 h-7 rounded-full transition-colors ${
                            historyEnabled ? "bg-green-500" : "bg-gray-400"
                          }`}
                        >
                          <div
                            className={`absolute h-5 w-5 bg-white rounded-full shadow-md transform transition-transform top-1 ${
                              historyEnabled ? "translate-x-8" : "translate-x-1"
                            }`}
                          ></div>
                        </button>
                      </div>
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
              <h3 className="text-xl font-semibold text-white">Unknown Opponent</h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                <span className="text-gray-300">Name:</span>
                <span className="text-gray-400">—</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                <span className="text-gray-300">Difficulty:</span>
                <span className="text-gray-400">—</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                <span className="text-gray-300">ELO Rating:</span>
                <span className="text-gray-400">—</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                <span className="text-gray-300">Games Played:</span>
                <span className="text-gray-400">—</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                <span className="text-gray-300">Win Rate:</span>
                <span className="text-gray-400">—</span>
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

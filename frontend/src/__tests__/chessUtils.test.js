import { describe, it, expect } from "vitest";
import { fenToBoard, boardPositionToUci, uciToPositions } from "../chessUtils";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

//Unit Test for chess utils, making sure moves and board state are parsed correctly

describe("fenToBoard", () => {
  it("returns an 8x8 array", () => {
    const board = fenToBoard(STARTING_FEN);
    expect(board).toHaveLength(8);
    board.forEach((row) => expect(row).toHaveLength(8));
  });

  it("places dark rook at top-left (0,0)", () => {
    const board = fenToBoard(STARTING_FEN);
    expect(board[0][0]).toBe("DarkRook");
  });

  it("places light rook at bottom-left (7,0)", () => {
    const board = fenToBoard(STARTING_FEN);
    expect(board[7][0]).toBe("LightRook");
  });

  it("places light pawns on rank 2 (row 6)", () => {
    const board = fenToBoard(STARTING_FEN);
    board[6].forEach((piece) => expect(piece).toBe("LightPawn"));
  });

  it("places dark pawns on rank 7 (row 1)", () => {
    const board = fenToBoard(STARTING_FEN);
    board[1].forEach((piece) => expect(piece).toBe("DarkPawn"));
  });

  it("fills empty ranks with empty strings", () => {
    const board = fenToBoard(STARTING_FEN);
    for (let row = 2; row <= 5; row++) {
      board[row].forEach((cell) => expect(cell).toBe(""));
    }
  });

  it("places dark king at (0,4)", () => {
    const board = fenToBoard(STARTING_FEN);
    expect(board[0][4]).toBe("DarkKing");
  });

  it("places light king at (7,4)", () => {
    const board = fenToBoard(STARTING_FEN);
    expect(board[7][4]).toBe("LightKing");
  });
});

describe("boardPositionToUci", () => {
  it("converts e2e4 correctly (row6,col4 to row4,col4)", () => {
    expect(boardPositionToUci(6, 4, 4, 4, null)).toBe("e2e4");
  });

  it("converts a1a2 correctly", () => {
    expect(boardPositionToUci(7, 0, 6, 0, null)).toBe("a1a2");
  });

  it("appends promotion piece when provided", () => {
    expect(boardPositionToUci(1, 4, 0, 4, "q")).toBe("e7e8q");
  });

  it("omits promotion suffix when null", () => {
    expect(boardPositionToUci(6, 4, 4, 4, null)).not.toContain("null");
  });
});

describe("uciToPositions", () => {
  it("parses e2e4 to correct rows and cols", () => {
    const pos = uciToPositions("e2e4");
    expect(pos).toEqual({ startRow: 6, startCol: 4, endRow: 4, endCol: 4 });
  });

  it("parses a1a2 to correct rows and cols", () => {
    const pos = uciToPositions("a1a2");
    expect(pos).toEqual({ startRow: 7, startCol: 0, endRow: 6, endCol: 0 });
  });
});

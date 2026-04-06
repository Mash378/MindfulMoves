// Maps FEN piece characters to frontend piece names
const FEN_TO_PIECE = {
  r: "DarkRook",
  n: "DarkKnight",
  b: "DarkBishop",
  q: "DarkQueen",
  k: "DarkKing",
  p: "DarkPawn",
  R: "LightRook",
  N: "LightKnight",
  B: "LightBishop",
  Q: "LightQueen",
  K: "LightKing",
  P: "LightPawn",
};

export function fenToBoard(fen) {
  const ranks = fen.split(" ")[0].split("/");
  return ranks.map((rank) => {
    const row = [];
    for (const ch of rank) {
      if (ch >= "1" && ch <= "8") {
        for (let i = 0; i < parseInt(ch, 10); i++) row.push("");
      } else {
        row.push(FEN_TO_PIECE[ch] || "");
      }
    }
    return row;
  });
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

export function boardPositionToUci(
  startRow,
  startCol,
  endRow,
  endCol,
  promotionPiece,
) {
  let uci = FILES[startCol] + RANKS[startRow] + FILES[endCol] + RANKS[endRow];
  if (promotionPiece) uci += promotionPiece;
  return uci;
}

export function uciToPositions(uci) {
  const startCol = FILES.indexOf(uci[0]);
  const startRow = RANKS.indexOf(uci[1]);
  const endCol = FILES.indexOf(uci[2]);
  const endRow = RANKS.indexOf(uci[3]);
  return { startRow, startCol, endRow, endCol };
}

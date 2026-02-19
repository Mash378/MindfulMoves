import chess.pgn
import chess.engine
import json
import os
# Download stockfish from https://stockfishchess.org/
# --- CONFIGURATION ---
STOCKFISH_PATH = "./stockfish/stockfish-windows-x86-64-avx2.exe"
DEPTH_LIMIT = 12  
INPUT_PGN = "filtered.pgn"
OUTPUT_JSONL = "training_data_1.jsonl"
MATE_SCORE = 10000 

# Ensure engine exists
if not os.path.exists(STOCKFISH_PATH):
    print(f"Error: Stockfish not found at {STOCKFISH_PATH}")
    exit()

engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)

def get_eval(board):
    """Helper to get score from White's perspective."""
    info = engine.analyse(board, chess.engine.Limit(depth=DEPTH_LIMIT))
    best_move = info["pv"][0].uci() if "pv" in info and info["pv"] else None
    score = info["score"].white().score(mate_score=MATE_SCORE)
    return score, best_move

print(f"Processing games from {INPUT_PGN}...")

with open(INPUT_PGN, encoding="utf-8", errors="ignore") as inp, \
     open(OUTPUT_JSONL, "w", encoding="utf-8") as out:

    game_count = 0
    position_count = 0

    while True:
        game = chess.pgn.read_game(inp)
        if game is None:
            break
        
        headers = game.headers
        white_elo = int(headers.get("WhiteElo", 1500))
        black_elo = int(headers.get("BlackElo", 1500))
        
        board = game.board()
        move_num = 0
        
        current_eval, best_move = get_eval(board)
        
        for move in game.mainline_moves():
            is_white_move = board.turn == chess.WHITE
            player_elo = white_elo if is_white_move else black_elo
            
            eval_before = current_eval
            suggested_move = best_move
            fen_before = board.fen()
            actual_move_uci = move.uci()
            board.push(move)
            
            # Get evaluation AFTER the move
            eval_after, next_best_move = get_eval(board)
            
            # Calculate CP Loss
            # White wants eval to go UP, Black wants eval to go DOWN
            if is_white_move:
                cp_loss = max(0, eval_before - eval_after)
            else:
                cp_loss = max(0, eval_after - eval_before)
            
            # Construct Data Row
            row = {
                "game_id": game_count,
                "move_number": move_num,
                "is_white": is_white_move,
                "player_elo": player_elo,
                "fen": fen_before, # FEN before move
                "move": actual_move_uci,
                "is_best": actual_move_uci == suggested_move,
                "cp_loss": cp_loss,
                "eval": eval_before,
            }
            
            out.write(json.dumps(row) + "\n")
            
            # Setup for next iteration
            current_eval = eval_after
            best_move = next_best_move
            position_count += 1
            move_num += 1

        game_count += 1
        if game_count % 10 == 0:
            print(f"Processed {game_count} games | Total positions: {position_count}")

engine.quit()
print(f"\n✅ Done! Saved {position_count} positions from {game_count} games.")

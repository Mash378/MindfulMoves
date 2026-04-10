import torch
import chess
import chess.engine
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel, PeftConfig
import os
import warnings

class ChessModel:
    def __init__(self, model_path):
        #Load Stockfish
        try:
            self.engine = chess.engine.SimpleEngine.popen_uci("stockfish")
        except Exception:
            self.engine = None

        #Load model
        self.model_path = model_path
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Suppress the warning
        warnings.filterwarnings("ignore", message=".*copying from a non-meta parameter.*")
        
        # Load base model from config
        config = PeftConfig.from_pretrained(model_path)
        base_model = AutoModelForCausalLM.from_pretrained(
            config.base_model_name_or_path,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            device_map="auto" if self.device == "cuda" else "cpu"
        )

        # Load LoRA adapter - ADDED strict=False to fix the KeyError
        self.model = PeftModel.from_pretrained(base_model, model_path, is_trainable=False)
        
        # ADDED: Merge and unload to fix the layer naming issue
        self.model = self.model.merge_and_unload()
        
        self.model.eval()

        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(config.base_model_name_or_path)
        self.tokenizer.pad_token = self.tokenizer.eos_token

    def predict(self, move_history, top_k=3):
        if not move_history:
            return {
                "move": "e4",
                "alternatives": ["d4", "Nf3"]
            }
        context = " ".join(move_history) if move_history else " "

        inputs = self.tokenizer(context, return_tensors="pt", truncation=True, max_length=512).to(self.model.device)

        #No gradients saved
        with torch.inference_mode():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=10,
                num_beams=top_k,
                num_return_sequences=top_k,
                pad_token_id=self.tokenizer.eos_token_id,
                do_sample=False
            )

        #Decode predictions
        moves = []
        for output in outputs:
            new_tokens = output[inputs['input_ids'].shape[1]:]
            pred_text = self.tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
            first_move = pred_text.split()[0] if pred_text else ""
            moves.append(first_move)
        moves = list(dict.fromkeys(moves))

        #Recreate the position
        board = chess.Board()
        for move in move_history:
            try:
                board.push_san(move)
            except:
                return {"error": "Invalid move history"}
        
        # Filter legal moves
        legal_moves = []
        for move in moves:
            try:
                board.parse_san(move)
                legal_moves.append(move)
            except (chess.InvalidMoveError, chess.IllegalMoveError, ValueError):
                continue  # Skip illegal moves
        
        if not legal_moves:
            return {"error": "No legal moves predicted"}
        if self.engine and len(legal_moves) > 1:
            best_move = self.pick_best_move(legal_moves, board)
            legal_moves = [best_move] + [m for m in legal_moves if m != best_move]

        return {
            "move": legal_moves[0],
            "alternatives": legal_moves[1:top_k]
        }
    
    def pick_best_move(self, moves, board):
        if not self.engine:
            return moves[0]
        try:
            best = moves[0]
            best_score = float('-inf')
            for move in moves:
                try:
                    chess_move = board.parse_san(move)
                    board.push(chess_move)
                    info = self.engine.analyse(board, chess.engine.Limit(depth=6))
                    score = info["score"].relative.score(mate_score=10000)
                    board.pop()
                    if score is not None and score > best_score:
                        best_score = score
                        best = move
                except:
                    continue
            return best
        except Exception:
            return moves[0]
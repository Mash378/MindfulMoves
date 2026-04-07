import torch
import chess
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel, PeftConfig
import os
import warnings

class ChessModel:
    def __init__(self, model_path):
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
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=6,
                num_beams=top_k,
                num_return_sequences=top_k,
                pad_token_id=self.tokenizer.eos_token_id,
                output_scores=True,
                return_dict_in_generate=True
            )

        #Decode predictions
        moves = []
        for i, output in enumerate(outputs.sequences):
            new_tokens = output[inputs['input_ids'].shape[1]:]
            pred_text = self.tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
            predicted_move = pred_text.split()[0] if pred_text else ""
            moves.append(predicted_move)

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
        return {
            "move": legal_moves[0],
            "alternatives": legal_moves[1:top_k]
        }
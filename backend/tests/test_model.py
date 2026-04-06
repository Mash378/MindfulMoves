#Important: Run test from the backend directory

import chess
import pytest
from src.magnusChessGPT.model_wrapper import ChessModel

model_path = "src/magnusChessGPT/modelConfig"

@pytest.fixture
def chess_model():
    return ChessModel(model_path)

class TestChessModel():
    
    #Test that model loads without errors
    def test_model_loads(self, chess_model):
        assert chess_model.model is not None
        assert chess_model.tokenizer is not None

    #Test model predictions from the start
    def test_model_opening(self, chess_model):
        result = chess_model.predict([])

        assert "move" in result
        assert result["move"] in ["e4", "d4", "Nf3", "c4"]      #Common opening moves
    
    #Test model predictions mid game:
    def test_model_midgame(self, chess_model):
        result = chess_model.predict(["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4"])

        assert "move" in result
        assert result["move"] != ""
        assert "alternatives" in result
    
    #Test predicted move is legal
    def test_prediction_legal_move(self, chess_model):
        move_history = ["e4", "c5", "Nf3", "d6"]
        result = chess_model.predict(move_history)

        board = chess.Board()
        for move in move_history:
            board.push_san(move)
        
        try:
            board.parse_san(result["move"])
            is_legal = True
        except:
            is_legal = False
        
        assert is_legal, f"Move {result['move']} is not legal"


print("All tests passed!")
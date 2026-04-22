import chess
import pytest

pytestmark = pytest.mark.unit

from src.features.game.game_controller import _resolve_status_after, _update_user_stats
from src.db.models.game import GameStatus, Difficulty, STARTING_FEN
from src.db.models.user import User

# Unit Test for Game Logic


class TestResolveStatusAfter:
    def test_active_game_stays_active(self):
        board = chess.Board(STARTING_FEN)
        board.push_san("e4")
        result = _resolve_status_after(board, player_won=True)
        assert result == GameStatus.active

    def test_player_checkmate_gives_white_wins(self):
        # Scholar's mate position — Black is in checkmate
        board = chess.Board()
        for move in ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7"]:
            board.push_san(move)
        assert board.is_checkmate()
        result = _resolve_status_after(board, player_won=True)
        assert result == GameStatus.white_wins

    def test_ai_checkmate_gives_black_wins(self):
        board = chess.Board()
        for move in ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7"]:
            board.push_san(move)
        result = _resolve_status_after(board, player_won=False)
        assert result == GameStatus.black_wins

    def test_stalemate_gives_draw(self):
        # FEN where Black is already stalemated (Black to move, no moves, not in check)
        board = chess.Board("5k2/5P2/5K2/8/8/8/8/8 b - - 0 1")
        assert board.is_stalemate()
        result = _resolve_status_after(board, player_won=False)
        assert result == GameStatus.draw


class TestUpdateUserStats:
    def _make_user(self):
        return User(
            id="u1",
            username="tester",
            password_hash="hash",
            games_played=0,
            games_won=0,
            win_rate=0,
            elo_rating=400,
        )

    def test_win_increments_games_played_and_won(self):
        user = self._make_user()
        _update_user_stats(user, GameStatus.white_wins)
        assert user.games_played == 1
        assert user.games_won == 1

    def test_loss_increments_games_played_only(self):
        user = self._make_user()
        _update_user_stats(user, GameStatus.black_wins)
        assert user.games_played == 1
        assert user.games_won == 0

    def test_draw_increments_games_played_only(self):
        user = self._make_user()
        _update_user_stats(user, GameStatus.draw)
        assert user.games_played == 1
        assert user.games_won == 0

    def test_win_rate_calculated_correctly(self):
        user = self._make_user()
        _update_user_stats(user, GameStatus.white_wins)
        assert user.win_rate == 100


class TestDifficultyEnum:
    def test_valid_difficulties_exist(self):
        assert Difficulty.easy == "easy"
        assert Difficulty.medium == "medium"
        assert Difficulty.hard == "hard"
        assert Difficulty.magnus == "magnus"

    def test_invalid_difficulty_raises(self):
        with pytest.raises(ValueError):
            Difficulty("invalid")

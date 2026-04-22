import uuid
import pytest
from tests.e2e.conftest import BASE_URL

# System testing for game flow, checks that game board is rendered, moves can be make, undo redo works, new game can be created.

pytestmark = pytest.mark.system
from tests.e2e.pages.signup_page import SignUpPage
from tests.e2e.pages.game_page import GamePage


def signup_and_go_to_game(page) -> GamePage:
    username = f"user_{uuid.uuid4().hex[:8]}"
    sp = SignUpPage(page, BASE_URL)
    sp.navigate()
    sp.signup(username, "pass123")
    sp.wait_for_url_contains("/game")
    game = GamePage(page, BASE_URL)
    game.wait_for_board()
    return game


class TestGameBoard:
    def test_board_renders_64_squares(self, page):
        game = signup_and_go_to_game(page)
        squares = game.get_board_squares()
        assert len(squares) == 64

    def test_undo_disabled_at_game_start(self, page):
        game = signup_and_go_to_game(page)
        assert not game.is_undo_enabled()

    def test_settings_button_opens_modal(self, page):
        game = signup_and_go_to_game(page)
        game.click_settings()
        game.wait_for_text("Settings")

    def test_new_game_button_in_settings_resets_board(self, page):
        game = signup_and_go_to_game(page)
        game.click_settings()
        game.wait_for_text("Game Actions")
        game.open_settings_tab("Game Actions")
        game.click_new_game()
        game.wait_for_board()
        squares = game.get_board_squares()
        assert len(squares) == 64


class TestGameInteraction:
    def test_clicking_e2_pawn_shows_valid_moves(self, page):
        """Square e2 is index 52 (row 6, col 4)."""
        game = signup_and_go_to_game(page)
        # e2 pawn is at row index 6, col index 4 → flat index 52
        game.click_square(52)
        dots = page.locator(".bg-green-500.bg-opacity-50.rounded-full").all()
        assert len(dots) > 0

    def test_status_shows_your_turn(self, page):
        game = signup_and_go_to_game(page)
        status = game.get_status_text()
        assert "Your Turn" in status or "AI" in status


class TestUndoRedo:
    def test_undo_enabled_after_move(self, page):
        """After the player makes a move, Undo should become enabled."""
        game = signup_and_go_to_game(page)
        # Click e2 pawn (index 52) then e4 square (index 36)
        game.click_square(52)
        game.click_square(36)
        game.wait_for_ai_thinking_done()
        assert game.is_undo_enabled()

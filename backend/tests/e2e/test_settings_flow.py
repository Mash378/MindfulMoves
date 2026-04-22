import uuid
import pytest
from tests.e2e.conftest import BASE_URL

pytestmark = pytest.mark.system
from tests.e2e.pages.signup_page import SignUpPage
from tests.e2e.pages.game_page import GamePage

# System test for settings, make sure that each settings tab can be open, and the toggles work


def signup_and_open_settings(page) -> GamePage:
    username = f"user_{uuid.uuid4().hex[:8]}"
    sp = SignUpPage(page, BASE_URL)
    sp.navigate()
    sp.signup(username, "pass123")
    sp.wait_for_url_contains("/game")
    game = GamePage(page, BASE_URL)
    game.wait_for_board()
    game.click_settings()
    game.wait_for_text("Settings")
    return game


class TestSettingsModal:
    def test_settings_modal_opens(self, page):
        signup_and_open_settings(page)
        assert page.locator("h2:has-text('Settings')").is_visible()

    def test_settings_modal_closes_on_x(self, page):
        signup_and_open_settings(page)
        page.get_by_role("button", name="×").click()
        page.locator("h2:has-text('Settings')").wait_for(state="hidden")
        assert not page.get_by_role("button", name="×").is_visible()

    def test_timer_toggle_changes_state(self, page):
        game = signup_and_open_settings(page)
        game.open_settings_tab("Game Display")
        game.wait_for_text("Enable Timer:")
        game.toggle_timer()
        assert not page.get_by_text("Time:").is_visible()

    def test_history_toggle_hides_move_history(self, page):
        game = signup_and_open_settings(page)
        game.open_settings_tab("Game Display")
        game.wait_for_text("Enable Move History:")
        game.toggle_history()
        page.get_by_role("button", name="×").click()
        page.locator("h3:has-text('Move History')").wait_for(state="hidden")
        assert not page.locator("h3:has-text('Move History')").is_visible()

    def test_difficulty_tab_shows_options(self, page):
        game = signup_and_open_settings(page)
        game.open_settings_tab("Difficulty")
        assert page.get_by_text("Easy").is_visible()
        assert page.get_by_text("Medium").is_visible()
        assert page.get_by_text("Hard").is_visible()
        assert page.get_by_text("Magnus Carlsen").is_visible()


class TestThemeSettings:
    def test_theme_tab_shows_theme_options(self, page):
        game = signup_and_open_settings(page)
        game.open_settings_tab("Theme")
        assert page.get_by_text("Light Mode").is_visible()
        assert page.get_by_text("Dark Mode").is_visible()
        assert page.get_by_text("Game Mode").is_visible()

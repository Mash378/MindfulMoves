import pytest
from tests.e2e.conftest import BASE_URL

pytestmark = pytest.mark.system
from tests.e2e.pages.home_page import HomePage
from tests.e2e.pages.leaderboard_page import LeaderboardPage


# System test to check that all leaderboard page can be load correctly, all difficulty can be navigated to correctly, and empty message is displayed when board is empty. Also check that users can navigate back to home


class TestLeaderboardFlow:
    def test_leaderboard_page_loads(self, page):
        lp = LeaderboardPage(page, BASE_URL)
        lp.navigate()
        lp.wait_for_load()
        assert "leaderboard" in page.url.lower()

    def test_default_difficulty_is_medium(self, page):
        lp = LeaderboardPage(page, BASE_URL)
        lp.navigate()
        lp.wait_for_load()
        assert lp.get_current_difficulty() == "Medium"

    def test_next_button_advances_difficulty(self, page):
        lp = LeaderboardPage(page, BASE_URL)
        lp.navigate()
        lp.wait_for_load()
        lp.click_next_difficulty()
        assert lp.get_current_difficulty() == "Hard"

    def test_prev_button_goes_back(self, page):
        lp = LeaderboardPage(page, BASE_URL)
        lp.navigate()
        lp.wait_for_load()
        lp.click_next_difficulty()
        lp.click_prev_difficulty()
        assert lp.get_current_difficulty() == "Medium"

    def test_empty_leaderboard_shows_message(self, page):
        lp = LeaderboardPage(page, BASE_URL)
        lp.navigate()
        lp.wait_for_load()
        msg = lp.get_empty_message()
        assert "no players yet" in msg.lower()

    def test_back_to_home_navigates_home(self, page):
        lp = LeaderboardPage(page, BASE_URL)
        lp.navigate()
        lp.wait_for_load()
        page.get_by_role("button", name="Back to Home").click()
        lp.wait_for_url_contains("/")
        assert BASE_URL.rstrip("/") in page.url or page.url.endswith("/")

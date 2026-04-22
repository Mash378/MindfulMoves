from .base_page import BasePage

# Page object for the leaderboard page, with methods to interact with leaderboard page


class LeaderboardPage(BasePage):
    def navigate(self):
        self.go_to("/leaderboard")

    def wait_for_load(self):
        self.page.get_by_text("Leaderboard").first.wait_for()

    def get_current_difficulty(self) -> str:
        return self.page.locator("h2.text-2xl.font-semibold").text_content()

    def click_next_difficulty(self):
        self.page.get_by_role("button", name="▶").click()

    def click_prev_difficulty(self):
        self.page.get_by_role("button", name="◀").click()

    def get_player_rows(self) -> list:
        return self.page.locator("div.grid-cols-12:not(.font-bold)").all()

    def get_empty_message(self) -> str:
        return self.page.get_by_text("No players yet").text_content()

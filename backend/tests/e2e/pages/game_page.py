from playwright.sync_api import Page
from .base_page import BasePage

# Page object for the game page, with methods to interact with game page


class GamePage(BasePage):
    def navigate(self):
        self.go_to("/game")

    def wait_for_board(self):
        self.page.locator(".grid.grid-cols-8").wait_for()

    def get_board_squares(self) -> list:
        return self.page.locator(".grid.grid-cols-8 > div").all()

    def click_square(self, index: int):
        self.page.locator(".grid.grid-cols-8 > div").nth(index).click()

    def click_undo(self):
        self.page.get_by_role("button", name="Undo").click()

    def click_redo(self):
        self.page.get_by_role("button", name="Redo").click()

    def click_settings(self):
        self.page.get_by_role("button", name="Settings").click()

    def click_new_game(self):
        self.page.get_by_role("button", name="New Game").click()

    def is_undo_enabled(self) -> bool:
        return self.page.get_by_role("button", name="Undo").is_enabled()

    def get_status_text(self) -> str:
        return self.page.locator(
            ".px-4.py-2.rounded.text-white.bg-blue-500"
        ).text_content()

    def wait_for_ai_thinking_done(self):
        self.page.get_by_text("AI is thinking").wait_for(state="hidden")

    def open_settings_tab(self, tab_name: str):
        self.page.get_by_role("button", name=tab_name).click()

    def toggle_timer(self):
        self.page.get_by_text("Enable Timer:", exact=True).locator(
            "xpath=following::button[1]"
        ).click()

    def toggle_history(self):
        self.page.get_by_text("Enable Move History:", exact=True).locator(
            "xpath=following::button[1]"
        ).click()

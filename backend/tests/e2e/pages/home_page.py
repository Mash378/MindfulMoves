from .base_page import BasePage

# Page object for the home page, with methods to interact with home page


class HomePage(BasePage):
    def navigate(self):
        self.go_to("/")

    def click_start_game(self):
        self.page.get_by_role("button", name="Start Game").click()

    def click_leaderboard(self):
        self.page.get_by_role("button", name="Leaderboard").click()

    def click_settings(self):
        self.page.get_by_role("button", name="Settings").click()

    def click_login(self):
        self.page.get_by_role("button", name="Login").click()

    def click_signup(self):
        self.page.get_by_role("button", name="Sign Up").click()

    def click_sign_out(self):
        self.page.get_by_role("button", name="Sign Out").click()

    def is_logged_in(self) -> bool:
        return self.page.get_by_role("button", name="Sign Out").is_visible()

    def get_welcome_text(self) -> str:
        return self.page.get_by_text("Welcome").first.text_content()

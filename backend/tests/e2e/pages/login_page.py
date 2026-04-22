from .base_page import BasePage

# Page Object Model for the Login Page


class LoginPage(BasePage):
    def navigate(self):
        self.go_to("/login")

    def enter_username(self, username: str):
        self.page.get_by_placeholder("Enter your name").fill(username)

    def enter_password(self, password: str):
        self.page.get_by_placeholder("Enter your password").fill(password)

    def click_submit(self):
        self.page.get_by_role("button", name="Submit").click()

    def login(self, username: str, password: str):
        self.enter_username(username)
        self.enter_password(password)
        self.click_submit()

    def get_error_message(self) -> str:
        return self.page.locator("p.text-red-600").text_content()

    def click_signup_link(self):
        self.page.get_by_role("button", name="Sign Up").click()

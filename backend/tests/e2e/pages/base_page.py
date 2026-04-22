from playwright.sync_api import Page

# Base class with utilities method for all pages


class BasePage:
    def __init__(self, page: Page, base_url: str):
        self.page = page
        self.base_url = base_url

    def go_to(self, path: str = "/"):
        self.page.goto(f"{self.base_url}{path}")

    def wait_for_url_contains(self, partial: str):
        self.page.wait_for_url(f"**{partial}**")

    def wait_for_text(self, text: str):
        self.page.get_by_text(text).first.wait_for()

    def get_local_storage(self, key: str):
        return self.page.evaluate(f"localStorage.getItem('{key}')")

    @property
    def current_url(self) -> str:
        return self.page.url

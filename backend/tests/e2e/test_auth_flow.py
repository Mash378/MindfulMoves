import uuid
import pytest
from tests.e2e.conftest import BASE_URL

pytestmark = pytest.mark.system
from tests.e2e.pages.home_page import HomePage
from tests.e2e.pages.login_page import LoginPage
from tests.e2e.pages.signup_page import SignUpPage

# System testing for authentication flows, including signup, login, logout, test case name are self explanatory


def unique_user() -> str:
    return f"user_{uuid.uuid4().hex[:8]}"


class TestSignupFlow:
    def test_signup_redirects_to_game(self, page):
        p = SignUpPage(page, BASE_URL)
        p.navigate()
        p.signup(unique_user(), "testpass123")
        p.wait_for_url_contains("/game")
        assert "/game" in page.url

    def test_signup_stores_token_in_localstorage(self, page):
        p = SignUpPage(page, BASE_URL)
        p.navigate()
        p.signup(unique_user(), "testpass123")
        p.wait_for_url_contains("/game")
        token = p.get_local_storage("token")
        assert token is not None and len(token) > 0

    def test_signup_duplicate_username_shows_error(self, page):
        username = unique_user()
        p = SignUpPage(page, BASE_URL)
        p.navigate()
        p.signup(username, "pass")
        p.wait_for_url_contains("/game")
        # Attempt second signup with same username
        p.go_to("/signup")
        p.signup(username, "pass")
        error = p.get_error_message()
        assert "already taken" in error.lower()


class TestLoginFlow:
    def _create_user(self, page) -> str:
        username = unique_user()
        p = SignUpPage(page, BASE_URL)
        p.navigate()
        p.signup(username, "testpass123")
        p.wait_for_url_contains("/game")
        page.evaluate("localStorage.clear()")
        return username

    def test_login_redirects_to_game(self, page):
        username = self._create_user(page)
        lp = LoginPage(page, BASE_URL)
        lp.navigate()
        lp.login(username, "testpass123")
        lp.wait_for_url_contains("/game")
        assert "/game" in page.url

    def test_invalid_login_shows_error(self, page):
        lp = LoginPage(page, BASE_URL)
        lp.navigate()
        lp.login("nonexistent_user_xyz", "wrongpass")
        error = lp.get_error_message()
        assert len(error) > 0

    def test_wrong_password_shows_error(self, page):
        username = self._create_user(page)
        lp = LoginPage(page, BASE_URL)
        lp.navigate()
        lp.login(username, "wrongpassword")
        error = lp.get_error_message()
        assert len(error) > 0


class TestLogoutFlow:
    def test_logout_clears_token(self, page):
        username = unique_user()
        sp = SignUpPage(page, BASE_URL)
        sp.navigate()
        sp.signup(username, "pass123")
        sp.wait_for_url_contains("/game")

        home = HomePage(page, BASE_URL)
        home.navigate()
        home.click_sign_out()
        token = home.get_local_storage("token")
        assert token is None

    def test_logout_returns_to_home(self, page):
        username = unique_user()
        sp = SignUpPage(page, BASE_URL)
        sp.navigate()
        sp.signup(username, "pass123")
        sp.wait_for_url_contains("/game")

        home = HomePage(page, BASE_URL)
        home.navigate()
        home.click_sign_out()
        assert "/" in page.url

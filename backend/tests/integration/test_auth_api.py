import pytest

pytestmark = pytest.mark.integration

SIGNUP_URL = "/auth/signup"
LOGIN_URL = "/auth/login"

# Integration tests for authentication api endpoints. Test covers success and failure scenario like duplicate, empty field, wrong password, user does not exist


class TestSignup:
    def test_signup_success_returns_token(self, client):
        resp = client.post(
            SIGNUP_URL, json={"username": "newuser", "password": "pass123"}
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    def test_signup_duplicate_username_returns_400(self, client):
        client.post(SIGNUP_URL, json={"username": "dup", "password": "pass"})
        resp = client.post(SIGNUP_URL, json={"username": "dup", "password": "pass"})
        assert resp.status_code == 400
        assert "already taken" in resp.json()["detail"].lower()

    def test_signup_empty_username_returns_400(self, client):
        resp = client.post(SIGNUP_URL, json={"username": "", "password": "pass"})
        assert resp.status_code == 400

    def test_signup_empty_password_returns_400(self, client):
        resp = client.post(SIGNUP_URL, json={"username": "user", "password": ""})
        assert resp.status_code == 400

    def test_signup_missing_fields_returns_422(self, client):
        resp = client.post(SIGNUP_URL, json={"username": "onlyname"})
        assert resp.status_code == 422


class TestLogin:
    def _signup(self, client, username="loginuser", password="pass123"):
        client.post(SIGNUP_URL, json={"username": username, "password": password})

    def test_login_success_returns_token(self, client):
        self._signup(client)
        resp = client.post(
            LOGIN_URL, json={"username": "loginuser", "password": "pass123"}
        )
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_wrong_password_returns_401(self, client):
        self._signup(client)
        resp = client.post(
            LOGIN_URL, json={"username": "loginuser", "password": "wrong"}
        )
        assert resp.status_code == 401

    def test_login_nonexistent_user_returns_401(self, client):
        resp = client.post(LOGIN_URL, json={"username": "ghost", "password": "pass"})
        assert resp.status_code == 401

    def test_login_missing_fields_returns_422(self, client):
        resp = client.post(LOGIN_URL, json={"username": "only"})
        assert resp.status_code == 422

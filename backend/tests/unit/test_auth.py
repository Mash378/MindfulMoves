import pytest
import jwt

pytestmark = pytest.mark.unit
from datetime import datetime, timezone

from src.features.auth.auth_controller import (
    hash_password,
    verify_password,
    create_access_token,
    TOKEN_EXPIRE_DAYS,
)
from src.data.env import server_env

# UUID4 for testing
TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"


# Unit Test for auth, test name is self explanatory


class TestHashPassword:
    def test_returns_string(self):
        result = hash_password("mypassword")
        assert isinstance(result, str)

    def test_not_plaintext(self):
        result = hash_password("mypassword")
        assert result != "mypassword"

    def test_unique_hashes(self):
        # bcrypt uses random salt, so two hashes of same password differ
        h1 = hash_password("mypassword")
        h2 = hash_password("mypassword")
        assert h1 != h2


class TestVerifyPassword:
    def test_correct_password_passes(self):
        hashed = hash_password("correct")
        assert verify_password("correct", hashed) is True

    def test_wrong_password_fails(self):
        hashed = hash_password("correct")
        assert verify_password("wrong", hashed) is False

    def test_empty_password_fails(self):
        hashed = hash_password("correct")
        assert verify_password("", hashed) is False


class TestCreateAccessToken:
    def test_returns_string(self):
        token = create_access_token(TEST_USER_ID)
        assert isinstance(token, str)

    def test_decodes_to_correct_user_id(self):
        token = create_access_token(TEST_USER_ID)
        payload = jwt.decode(token, server_env.JWT_SECRET_KEY, algorithms=["HS256"])
        assert payload["sub"] == TEST_USER_ID

    def test_token_has_expiry(self):
        token = create_access_token(TEST_USER_ID)
        payload = jwt.decode(token, server_env.JWT_SECRET_KEY, algorithms=["HS256"])
        assert "exp" in payload
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        assert exp > datetime.now(timezone.utc)

import pytest
from src.db.models.game import STARTING_FEN

pytestmark = pytest.mark.integration

# Integration test for game api, covering move generation, game difficulty and game state retrieval

NEW_GAME_URL = "/game/new"


def _make_move(client, game_id, uci="e2e4", fen=STARTING_FEN, history=None, elo=1500):
    return client.post(
        f"/game/{game_id}/move",
        json={
            "uci": uci,
            "current_fen": fen,
            "history_uci": history or [],
            "target_elo": elo,
            "bot_style": "Balanced",
        },
    )


class TestNewGame:
    def test_creates_game_with_starting_fen(self, auth_client):
        resp = auth_client.post(NEW_GAME_URL, json={"difficulty": "medium"})
        assert resp.status_code == 200
        body = resp.json()
        assert "game_id" in body
        assert body["fen"] == STARTING_FEN
        assert body["status"] == "active"

    def test_easy_difficulty_accepted(self, auth_client):
        resp = auth_client.post(NEW_GAME_URL, json={"difficulty": "easy"})
        assert resp.status_code == 200

    def test_hard_difficulty_accepted(self, auth_client):
        resp = auth_client.post(NEW_GAME_URL, json={"difficulty": "hard"})
        assert resp.status_code == 200

    def test_magnus_difficulty_accepted(self, auth_client):
        resp = auth_client.post(NEW_GAME_URL, json={"difficulty": "magnus"})
        assert resp.status_code == 200

    def test_unauthenticated_returns_401(self, client):
        resp = client.post(NEW_GAME_URL, json={"difficulty": "medium"})
        assert resp.status_code == 401


class TestMakeMove:
    def _new_game(self, auth_client):
        resp = auth_client.post(NEW_GAME_URL, json={"difficulty": "medium"})
        return resp.json()["game_id"]

    def test_valid_move_returns_updated_fen(self, auth_client):
        game_id = self._new_game(auth_client)
        resp = _make_move(auth_client, game_id)
        assert resp.status_code == 200
        body = resp.json()
        assert body["player_uci"] == "e2e4"
        assert body["fen"] != STARTING_FEN
        assert body["game_over"] is False

    def test_ai_responds_with_a_move(self, auth_client):
        game_id = self._new_game(auth_client)
        resp = _make_move(auth_client, game_id)
        assert resp.status_code == 200
        # The mock returns "e7e5"
        assert resp.json()["ai_uci"] == "e7e5"

    def test_illegal_move_returns_422(self, auth_client):
        game_id = self._new_game(auth_client)
        resp = _make_move(auth_client, game_id, uci="e2e5")  # not a legal pawn move
        assert resp.status_code == 422

    def test_invalid_uci_format_returns_422(self, auth_client):
        game_id = self._new_game(auth_client)
        resp = _make_move(auth_client, game_id, uci="notauci")
        assert resp.status_code == 422

    def test_wrong_user_returns_403(self, client):
        # Create game with testuser
        client.post(
            "/auth/signup", json={"username": "testuser", "password": "testpass123"}
        )
        token1 = client.post(
            "/auth/login", json={"username": "testuser", "password": "testpass123"}
        ).json()["access_token"]
        client.headers.update({"Authorization": f"Bearer {token1}"})
        game_id = client.post(NEW_GAME_URL, json={"difficulty": "medium"}).json()[
            "game_id"
        ]

        # Switch to other user
        client.post("/auth/signup", json={"username": "other", "password": "pass"})
        token2 = client.post(
            "/auth/login", json={"username": "other", "password": "pass"}
        ).json()["access_token"]
        client.headers.update({"Authorization": f"Bearer {token2}"})

        resp = _make_move(client, game_id)
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client, auth_client):
        game_id = self._new_game(auth_client)
        # Remove auth header
        client.headers.pop("Authorization", None)
        resp = _make_move(client, game_id)
        assert resp.status_code == 401


class TestGetGameState:
    def test_returns_game_state(self, auth_client):
        game_resp = auth_client.post(NEW_GAME_URL, json={"difficulty": "medium"})
        game_id = game_resp.json()["game_id"]
        resp = auth_client.get(f"/game/{game_id}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["game_id"] == game_id
        assert body["fen"] == STARTING_FEN
        assert body["status"] == "active"
        assert body["move_count"] == 0

    def test_wrong_user_returns_403(self, client):
        client.post("/auth/signup", json={"username": "owner", "password": "pass"})
        token_owner = client.post(
            "/auth/login", json={"username": "owner", "password": "pass"}
        ).json()["access_token"]
        client.headers.update({"Authorization": f"Bearer {token_owner}"})
        game_id = client.post(NEW_GAME_URL, json={"difficulty": "medium"}).json()[
            "game_id"
        ]

        client.post("/auth/signup", json={"username": "intruder", "password": "pass"})
        token_intruder = client.post(
            "/auth/login", json={"username": "intruder", "password": "pass"}
        ).json()["access_token"]
        client.headers.update({"Authorization": f"Bearer {token_intruder}"})

        resp = client.get(f"/game/{game_id}")
        assert resp.status_code == 403

    def test_nonexistent_game_returns_404(self, auth_client):
        resp = auth_client.get("/game/nonexistent-id")
        assert resp.status_code == 404

import uuid
import pytest
from src.db.models.user import User

pytestmark = pytest.mark.integration
from src.db.models.game import Game, GameStatus, Difficulty

# Integration test for leaderboard


# Utility to insert user with completed games into db
def _seed_leaderboard(db, difficulty="easy", wins=3, total=5):
    user = User(
        id=str(uuid.uuid4()),
        username=f"player_{uuid.uuid4().hex[:6]}",
        password_hash="h",
    )
    db.add(user)
    db.flush()
    for i in range(total):
        status = GameStatus.white_wins if i < wins else GameStatus.black_wins
        game = Game(
            id=str(uuid.uuid4()),
            user_id=user.id,
            difficulty=Difficulty(difficulty),
            status=status,
        )
        db.add(game)
    db.commit()
    return user


class TestLeaderboard:
    def test_empty_leaderboard_returns_empty_list(self, client):
        resp = client.get("/api/leaderboard/easy")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_correct_fields(self, client, db):
        _seed_leaderboard(db, difficulty="easy", wins=2, total=4)
        resp = client.get("/api/leaderboard/easy")
        assert resp.status_code == 200
        entry = resp.json()[0]
        assert "username" in entry
        assert "games_won" in entry
        assert "games_played" in entry

    def test_wins_counted_correctly(self, client, db):
        # API counts all non-draw completed games as wins (white_wins + black_wins)
        _seed_leaderboard(db, difficulty="medium", wins=5, total=5)
        resp = client.get("/api/leaderboard/medium")
        assert resp.status_code == 200
        entry = resp.json()[0]
        assert entry["games_won"] == 5
        assert entry["games_played"] == 5

    def test_returns_at_most_10_entries(self, client, db):
        for _ in range(15):
            _seed_leaderboard(db, difficulty="hard", wins=1, total=1)
        resp = client.get("/api/leaderboard/hard")
        assert resp.status_code == 200
        assert len(resp.json()) <= 10

    def test_invalid_difficulty_returns_400(self, client):
        resp = client.get("/api/leaderboard/impossible")
        assert resp.status_code == 400

    def test_magnus_difficulty_valid(self, client):
        resp = client.get("/api/leaderboard/magnus")
        assert resp.status_code == 200

    def test_active_games_excluded(self, client, db):
        user = User(id=str(uuid.uuid4()), username="activeplayer", password_hash="h")
        db.add(user)
        db.flush()
        # Only active game — should not appear in leaderboard
        game = Game(
            id=str(uuid.uuid4()),
            user_id=user.id,
            difficulty=Difficulty.easy,
            status=GameStatus.active,
        )
        db.add(game)
        db.commit()
        resp = client.get("/api/leaderboard/easy")
        usernames = [e["username"] for e in resp.json()]
        assert "activeplayer" not in usernames

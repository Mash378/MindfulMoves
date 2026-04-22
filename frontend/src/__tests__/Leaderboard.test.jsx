import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SettingsProvider } from "../SettingsContext";
import Leaderboard from "../Leaderboard";

function mockLeaderboardFetch(data = []) {
  globalThis.fetch.mockResolvedValue({
    ok: true,
    json: async () => data,
  });
}

function renderLeaderboard() {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <Leaderboard />
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe("Leaderboard", () => {
  it("shows loading state initially", () => {
    mockLeaderboardFetch();
    renderLeaderboard();
    expect(screen.getByText(/loading leaderboard/i)).toBeInTheDocument();
  });

  it("shows Leaderboard heading after load", async () => {
    mockLeaderboardFetch();
    renderLeaderboard();
    await waitFor(() => {
      expect(screen.getByText("Leaderboard")).toBeInTheDocument();
    });
  });

  it('shows "No players yet" when leaderboard is empty', async () => {
    mockLeaderboardFetch([]);
    renderLeaderboard();
    await waitFor(() => {
      expect(screen.getByText(/no players yet/i)).toBeInTheDocument();
    });
  });

  it("renders player entries when data is present", async () => {
    mockLeaderboardFetch([
      { id: "1", username: "alice", games_won: 5, games_played: 10 },
    ]);
    renderLeaderboard();
    await waitFor(() => {
      expect(screen.getByText("alice")).toBeInTheDocument();
    });
  });

  it("shows fetch calls for all 4 difficulties on mount", async () => {
    mockLeaderboardFetch();
    renderLeaderboard();
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(4);
    });
  });
});

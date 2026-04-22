import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SettingsProvider } from "../SettingsContext";
import Game from "../Game";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function mockGameFetch({
  gameId = "g1",
  fen = STARTING_FEN,
  status = "active",
} = {}) {
  globalThis.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ game_id: gameId, fen, status }),
  });
}

// Test div for Game Component
function renderGame() {
  window.localStorage.getItem.mockImplementation((key) => {
    if (key === "token") return "fake-token";
    if (key === "playerName") return "testplayer";
    return null;
  });
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <Game />
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe("Game renders", () => {
  it("renders Settings button", async () => {
    mockGameFetch();
    renderGame();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /settings/i }),
      ).toBeInTheDocument();
    });
  });

  it("renders Undo and Redo buttons", async () => {
    mockGameFetch();
    renderGame();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /redo/i })).toBeInTheDocument();
    });
  });

  it("Undo button is disabled initially", async () => {
    mockGameFetch();
    renderGame();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
    });
  });

  it("Redo button is disabled initially", async () => {
    mockGameFetch();
    renderGame();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
    });
  });
});

describe("Game status display", () => {
  it('shows "Your Turn" status initially', async () => {
    mockGameFetch();
    renderGame();
    await waitFor(() => {
      expect(screen.getByText("Your Turn")).toBeInTheDocument();
    });
  });
});

describe("Settings modal", () => {
  it("opens settings modal when Settings button is clicked", async () => {
    mockGameFetch();
    renderGame();
    const settingsBtn = await screen.findByRole("button", {
      name: /settings/i,
    });
    fireEvent.click(settingsBtn);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Settings" }),
      ).toBeInTheDocument();
    });
  });

  it("closes settings modal when × is clicked", async () => {
    mockGameFetch();
    renderGame();
    const settingsBtn = await screen.findByRole("button", {
      name: /settings/i,
    });
    fireEvent.click(settingsBtn);
    await screen.findByRole("heading", { name: "Settings" });
    fireEvent.click(screen.getByText("×"));
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Settings" }),
      ).not.toBeInTheDocument();
    });
  });
});

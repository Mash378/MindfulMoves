import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { SettingsProvider, useSettings } from "../SettingsContext";

function Consumer() {
  const ctx = useSettings();
  return (
    <div>
      <span data-testid="theme">{ctx.theme}</span>
      <span data-testid="difficulty">{ctx.difficulty}</span>
      <span data-testid="logged-in">{String(ctx.isLoggedIn)}</span>
      <span data-testid="username">{ctx.username}</span>
      <button onClick={() => ctx.setTheme("dark")}>Set Dark</button>
      <button onClick={() => ctx.logout()}>Logout</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <SettingsProvider>
      <Consumer />
    </SettingsProvider>,
  );
}

describe("SettingsContext defaults", () => {
  it("default theme is light when localStorage is empty", () => {
    renderWithProvider();
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("default difficulty is medium when localStorage is empty", () => {
    renderWithProvider();
    expect(screen.getByTestId("difficulty").textContent).toBe("medium");
  });

  it("isLoggedIn is false when no token in localStorage", () => {
    renderWithProvider();
    expect(screen.getByTestId("logged-in").textContent).toBe("false");
  });
});

describe("SettingsContext reads localStorage on init", () => {
  it("uses stored theme from localStorage", () => {
    window.localStorage.getItem.mockImplementation((key) =>
      key === "theme" ? "dark" : null,
    );
    renderWithProvider();
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("reflects logged-in state when token exists", () => {
    window.localStorage.getItem.mockImplementation((key) =>
      key === "token" ? "fake-token" : null,
    );
    renderWithProvider();
    expect(screen.getByTestId("logged-in").textContent).toBe("true");
  });
});

describe("SettingsContext mutations", () => {
  it("setTheme updates theme and persists to localStorage", async () => {
    renderWithProvider();
    await act(async () => {
      screen.getByText("Set Dark").click();
    });
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(window.localStorage.setItem).toHaveBeenCalledWith("theme", "dark");
  });

  it("logout clears isLoggedIn and username", async () => {
    window.localStorage.getItem.mockImplementation((key) =>
      key === "token" ? "tok" : key === "playerName" ? "alice" : null,
    );
    renderWithProvider();
    await act(async () => {
      screen.getByText("Logout").click();
    });
    expect(screen.getByTestId("logged-in").textContent).toBe("false");
    expect(screen.getByTestId("username").textContent).toBe("");
  });
});

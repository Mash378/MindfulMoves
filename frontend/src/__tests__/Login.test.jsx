import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SettingsProvider } from "../SettingsContext";
import Login from "../Login";

function renderLogin() {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <Login />
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe("Login renders", () => {
  it("shows the login heading", () => {
    renderLogin();
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("shows username and password inputs", () => {
    renderLogin();
    expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter your password"),
    ).toBeInTheDocument();
  });

  it("shows Submit button", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });
});

describe("Login validation", () => {
  it("shows error when username is empty on submit", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => {
      expect(screen.getByText("Please enter your name")).toBeInTheDocument();
    });
  });

  it("shows error when password is empty on submit", async () => {
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Enter your name"), {
      target: { value: "alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => {
      expect(
        screen.getByText("Please enter your password"),
      ).toBeInTheDocument();
    });
  });
});

describe("Login API interaction", () => {
  it("shows API error when login fails", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Invalid username or password" }),
    });

    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Enter your name"), {
      target: { value: "baduser" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "badpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Invalid username or password"),
      ).toBeInTheDocument();
    });
  });

  it("stores token in localStorage on success", async () => {
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok123", token_type: "bearer" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ game_id: "gid", fen: "startfen" }),
      });

    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Enter your name"), {
      target: { value: "alice" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "token",
        "tok123",
      );
    });
  });
});

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SettingsProvider } from "../SettingsContext";
import SignUp from "../SignUp";

function renderSignUp() {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <SignUp />
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe("SignUp renders", () => {
  it("shows the sign up heading", () => {
    renderSignUp();
    expect(screen.getByText("Sign Up Page")).toBeInTheDocument();
  });

  it("shows username and password inputs", () => {
    renderSignUp();
    expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter your password"),
    ).toBeInTheDocument();
  });
});

describe("SignUp validation", () => {
  it("shows error when name is empty", async () => {
    renderSignUp();
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => {
      expect(screen.getByText("Please enter your name")).toBeInTheDocument();
    });
  });

  it("shows error when password is empty", async () => {
    renderSignUp();
    fireEvent.change(screen.getByPlaceholderText("Enter your name"), {
      target: { value: "newuser" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => {
      expect(
        screen.getByText("Please enter your password"),
      ).toBeInTheDocument();
    });
  });
});

describe("SignUp API interaction", () => {
  it("shows error on duplicate username", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Username already taken" }),
    });
    renderSignUp();
    fireEvent.change(screen.getByPlaceholderText("Enter your name"), {
      target: { value: "dup" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => {
      expect(screen.getByText("Username already taken")).toBeInTheDocument();
    });
  });
});

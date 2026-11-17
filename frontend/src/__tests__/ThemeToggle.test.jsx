import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";

function TestConsumer() {
  const { theme, isDark, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="is-dark">{isDark ? "yes" : "no"}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe("ThemeContext & ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("defaults to light theme and sets attributes properly", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme").textContent).toBe("light");
    expect(screen.getByTestId("is-dark").textContent).toBe("no");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggles theme to dark and persists in localStorage and html class", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    const button = screen.getByText("Toggle");
    fireEvent.click(button);

    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(screen.getByTestId("is-dark").textContent).toBe("yes");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("thalicheck_theme")).toBe("dark");

    // Toggle back to light
    fireEvent.click(button);
    expect(screen.getByTestId("current-theme").textContent).toBe("light");
    expect(screen.getByTestId("is-dark").textContent).toBe("no");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("thalicheck_theme")).toBe("light");
  });

  it("renders ThemeToggle button with accessible labels and responds to clicks", () => {
    render(
      <ThemeProvider>
        <ThemeToggle showLabel={true} />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByRole("button", { name: /switch to dark mode/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(screen.getByText("Dark Mode")).toBeInTheDocument();

    fireEvent.click(toggleBtn);

    expect(screen.getByRole("button", { name: /switch to light mode/i })).toBeInTheDocument();
    expect(screen.getByText("Light Mode")).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

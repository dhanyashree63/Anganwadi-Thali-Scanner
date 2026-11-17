import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import WelcomeHeroMotion from "../components/WelcomeHeroMotion";
import AnganwadiThaliScannerMotion from "../components/AnganwadiThaliScannerMotion";
import { ThemeProvider } from "../context/ThemeContext";

describe("WelcomeHeroMotion & AnganwadiThaliScannerMotion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("renders Anganwadi Thali Scanner with all compartments and scale marker", () => {
    render(
      <ThemeProvider>
        <AnganwadiThaliScannerMotion />
      </ThemeProvider>
    );

    expect(screen.getByText(/3.0 cm/i)).toBeInTheDocument();
    expect(screen.getByText(/Marker/i)).toBeInTheDocument();
    expect(screen.getByText(/Toor Dal \/ Sambar/i)).toBeInTheDocument();
    expect(screen.getByText(/Steamed Rice \/ Khichdi/i)).toBeInTheDocument();
    expect(screen.getByText(/Veg Sabzi/i)).toBeInTheDocument();
    expect(screen.getByText(/Boiled Egg \/ Sprouts/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Nutrition Scanner Active/i)).toBeInTheDocument();
  });

  it("renders Welcome Hero Motion with interactive Click to Enter button", () => {
    const onEnterMock = vi.fn();
    render(
      <ThemeProvider>
        <WelcomeHeroMotion onEnter={onEnterMock} />
      </ThemeProvider>
    );

    expect(
      screen.getByText(/Nurturing Healthy Meals for/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Every Anganwadi Child/i)
    ).toBeInTheDocument();

    const enterBtn = screen.getByRole("button", { name: /Click to Enter ThaliCheck/i });
    expect(enterBtn).toBeInTheDocument();

    fireEvent.click(enterBtn);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onEnterMock).toHaveBeenCalled();
  });

  it("triggers onSelectRole when quick role shortcut button is clicked", () => {
    const onSelectRoleMock = vi.fn();
    render(
      <ThemeProvider>
        <WelcomeHeroMotion onSelectRole={onSelectRoleMock} />
      </ThemeProvider>
    );

    const staffBtn = screen.getByRole("button", { name: /Anganwadi Staff/i });
    fireEvent.click(staffBtn);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onSelectRoleMock).toHaveBeenCalledWith("STAFF");
  });
});

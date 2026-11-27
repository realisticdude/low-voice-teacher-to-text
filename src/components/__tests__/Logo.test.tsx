import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Logo } from "../Logo";

describe("Logo (top-left corner)", () => {
  it("is a real button that responds to taps when given an action", async () => {
    const onPress = jest.fn();
    await render(<Logo onPress={onPress} accessibilityLabel="Leave class" />);

    await fireEvent.press(screen.getByRole("button", { name: "Leave class" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("no longer draws the two-bar mark that looked like a ☰ menu", async () => {
    await render(<Logo />);
    expect(screen.getByText("CC")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

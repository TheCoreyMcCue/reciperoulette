import { describe, expect, it } from "vitest";
import { convertTemperaturesInText, fToC, segmentsToString } from "./temperature";

const metric = (t: string) => segmentsToString(convertTemperaturesInText(t, "metric"));
const us = (t: string) => segmentsToString(convertTemperaturesInText(t, "us"));

describe("temperatures in step text", () => {
  it("rounds °F to the nearest 5 °C", () => {
    expect(fToC(350)).toBe(175);
    expect(fToC(400)).toBe(205);
    expect(fToC(425)).toBe(220);
  });

  it.each([
    ["Preheat the oven to 350°F.", "Preheat the oven to 175°C."],
    ["Bake at 350 F for 30 minutes", "Bake at 175°C for 30 minutes"],
    ["Heat oven to 350F", "Heat oven to 175°C"],
    ["Preheat to 350 degrees.", "Preheat to 175°C."],
    ["Bake at 425 degrees Fahrenheit", "Bake at 220°C"],
    ["Roast at 375–400°F", "Roast at 190–205°C"],
    ["Oven at 350 °F / gas mark 4", "Oven at 175°C / gas mark 4 (180°C)"],
  ])("metric: %s", (input, out) => expect(metric(input)).toBe(out));

  it("leaves Celsius, small numbers and ambiguous text alone in metric mode", () => {
    expect(metric("Bake at 180°C for 20 minutes")).toBe("Bake at 180°C for 20 minutes");
    expect(metric("Bake for 20 minutes, then 200 g flour")).toBe("Bake for 20 minutes, then 200 g flour");
    expect(metric("Heat to 180 degrees")).toBe("Heat to 180 degrees"); // could be either
    expect(metric("Use 2 cups of flour")).toBe("Use 2 cups of flour");
    expect(metric("Add 350 ml of water")).toBe("Add 350 ml of water");
  });

  it("converts Celsius for US mode", () => {
    expect(us("Verwarm de oven voor op 180 graden.")).toBe("Verwarm de oven voor op 350°F.");
    expect(us("Bake at 200°C")).toBe("Bake at 400°F");
    expect(us("Bake at 220 C")).toBe("Bake at 425°F");
    expect(us("Bake at 350°F")).toBe("Bake at 350°F");
  });

  it("keeps the original for display", () => {
    const segs = convertTemperaturesInText("Bake at 350°F until golden.", "metric");
    expect(segs).toEqual([{ text: "Bake at " }, { text: "175°C", original: "350°F" }, { text: " until golden." }]);
  });

  it("does nothing in original mode", () => {
    expect(convertTemperaturesInText("Bake at 350°F", "original")).toEqual([{ text: "Bake at 350°F" }]);
  });
});

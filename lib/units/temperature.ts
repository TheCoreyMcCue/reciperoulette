import type { UnitSystem } from "./constants";

/**
 * Converts oven temperatures inside step text. Returns segments so the UI
 * can style converted parts and show the original on hover/tap.
 *
 * Metric: 350°F / 350 F / 350 degrees F / 350 degrees (> 250, assumed °F) → 175°C; gas mark 4 → "gas mark 4 (180°C)".
 * US:     180°C / 180 C / 180 graden / 180 degrees C → 350°F; gas mark 4 → "gas mark 4 (350°F)".
 * Both:   "moderate oven" → "moderate oven (≈180°C)" / "(≈350°F)"; also slow, moderately hot, hot, very hot.
 */

export type TextSegment = { text: string; original?: string };

export const fToC = (f: number) => Math.round((((f - 32) * 5) / 9) / 5) * 5;
export const cToF = (c: number) => Math.round(((c * 9) / 5 + 32) / 25) * 25;

const GAS_MARK_C: Record<string, number> = { "1/4": 110, "1/2": 120, "1": 140, "2": 150, "3": 170, "4": 180, "5": 190, "6": 200, "7": 220, "8": 230, "9": 240 };

// number, optional range, optional degree sign, optional word, optional scale letter/word
const TEMP_RE =
  /(?<![\d.,/])(\d{2,3})(?:\s*(?:-|–|—|to|tot)\s*(\d{2,3}))?(\s*(?:°|º|˚)\s*|\s*)(degrees?|deg\.?|graden)?(\s*)(fahrenheit|celsius|F|C)?(?![\p{L}\d])/giu;
const GAS_RE = /\bgas(?:\s*mark)?\s*(\d(?:\/\d)?)\b/gi;

/** Old-fashioned oven descriptions (°C, °F). Longer phrases first. */
const OVEN_WORDS: [RegExp, number, number][] = [
  [/\bvery\s+slow\s+oven\b/gi, 120, 250],
  [/\bmoderately\s+slow\s+oven\b/gi, 160, 325],
  [/\bmoderately\s+hot\s+oven\b/gi, 190, 375],
  [/\bmoderately\s+hot\b(?=[^.]*\boven\b)|(?<=\boven\b[^.]*)\bmoderately\s+hot\b/gi, 190, 375],
  [/\bvery\s+hot\s+oven\b/gi, 230, 450],
  [/\bslow\s+oven\b/gi, 150, 300],
  [/\bmoderate\s+oven\b/gi, 180, 350],
  [/\b(?:hot|quick)\s+oven\b/gi, 220, 425],
];

type Scale = "F" | "C";

function detectScale(value: number, sign: string, word: string | undefined, letter: string | undefined): Scale | null {
  const hasSign = /[°º˚]/.test(sign);
  if (letter) {
    const l = letter.toLowerCase();
    // A bare letter needs a degree sign, a degree word, or to be capitalised ("350F", "350 F").
    if (!hasSign && !word && letter.length === 1 && letter !== letter.toUpperCase()) return null;
    return l.startsWith("f") ? "F" : "C";
  }
  if (word && /graden/i.test(word)) return "C";
  if (hasSign || word) {
    // "400 degrees" / "350°": no home oven goes above 250 °C, so higher values are Fahrenheit;
    // 250 or below is ambiguous and left alone.
    return value > 250 ? "F" : null;
  }
  return null;
}

function plausible(scale: Scale, v: number) {
  return scale === "F" ? v >= 150 && v <= 600 : v >= 40 && v <= 320;
}

export function convertTemperaturesInText(text: string, system: UnitSystem): TextSegment[] {
  if (system === "original" || !text) return [{ text }];
  const target: Scale = system === "metric" ? "C" : "F";
  const replacements: { start: number; end: number; text: string }[] = [];

  for (const m of text.matchAll(TEMP_RE)) {
    const [whole, a, b, sign = "", word, , letter] = m;
    const low = Number(a);
    const high = b ? Number(b) : null;
    const scale = detectScale(low, sign, word, letter);
    if (!scale || scale === target || !plausible(scale, low) || (high != null && !plausible(scale, high))) continue;
    const conv = target === "C" ? fToC : cToF;
    const out = `${conv(low)}${high != null ? `–${conv(high)}` : ""}°${target}`;
    replacements.push({ start: m.index!, end: m.index! + whole.trimEnd().length, text: out });
  }

  for (const m of text.matchAll(GAS_RE)) {
    const c = GAS_MARK_C[m[1]!];
    if (!c) continue;
    const temp = target === "C" ? `${c}°C` : `${cToF(c)}°F`;
    replacements.push({ start: m.index!, end: m.index! + m[0].length, text: `${m[0]} (${temp})` });
  }

  for (const [re, c, f] of OVEN_WORDS) {
    for (const m of text.matchAll(re)) {
      const start = m.index!;
      const end = start + m[0].length;
      if (replacements.some((r) => start < r.end && end > r.start)) continue; // a longer phrase already matched
      replacements.push({ start, end, text: `${m[0]} (≈${target === "C" ? `${c}°C` : `${f}°F`})` });
    }
  }

  if (!replacements.length) return [{ text }];
  replacements.sort((x, y) => x.start - y.start);
  const segments: TextSegment[] = [];
  let pos = 0;
  for (const r of replacements) {
    if (r.start < pos) continue; // overlapping match
    if (r.start > pos) segments.push({ text: text.slice(pos, r.start) });
    segments.push({ text: r.text, original: text.slice(r.start, r.end) });
    pos = r.end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos) });
  return segments;
}

export const segmentsToString = (s: TextSegment[]) => s.map((x) => x.text).join("");

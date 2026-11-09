import { describe, expect, it } from "vitest";
import { externalLinks, isSocialHost, looksLikeRecipe, mentionsRecipeElsewhere } from "./caption";
import { parseInstagramOg } from "./instagram";
import { pinterestSourceLink } from "./pinterest";
import { extractYoutubeDescription, youtubeVideoId } from "./youtube";
import { findSocialAdapter } from "./index";

const RECIPE_CAPTION = `Easy one-pot orzo 🍋

Ingredients:
- 250 g orzo
- 1 onion, chopped
- 2 cloves garlic
- 750 ml stock
- 1 lemon

1. Fry onion and garlic.
2. Add orzo and stock, simmer 12 min.
3. Finish with lemon. #dinner #orzo`;

describe("caption heuristics", () => {
  it("recognises a recipe caption", () => {
    expect(looksLikeRecipe(RECIPE_CAPTION)).toBe(true);
    expect(looksLikeRecipe("Ingrediënten:\n• 2 eieren\n• 200 ml melk\nBak in 5 minuten goudbruin. Superlekker voor het ontbijt met wat stroop erbij, echt waar!")).toBe(true);
  });
  it("rejects teasers", () => {
    expect(looksLikeRecipe("Best pasta ever 😍 Recipe in bio! #pasta")).toBe(false);
    expect(looksLikeRecipe("We went to Italy and ate so much pasta. Honestly the best week of the year, can't wait to go back next summer with the whole family! 🇮🇹")).toBe(false);
  });
  it("detects 'recipe in bio'", () => {
    expect(mentionsRecipeElsewhere("Full recipe in my bio 👆")).toBe(true);
    expect(mentionsRecipeElsewhere("Recept op mijn blog, link in bio!")).toBe(true);
    expect(mentionsRecipeElsewhere("So good. Make it tonight.")).toBe(false);
  });
  it("extracts external links only", () => {
    expect(externalLinks("Recipe: https://myblog.example/orzo. Follow https://instagram.com/me and https://linktr.ee/me")).toEqual([
      "https://myblog.example/orzo",
    ]);
    expect(isSocialHost("www.tiktok.com")).toBe(true);
    expect(isSocialHost("pinterest.co.uk")).toBe(true);
    expect(isSocialHost("smittenkitchen.com")).toBe(false);
  });
});

describe("adapters", () => {
  it("routes urls to the right adapter", () => {
    const id = (u: string) => findSocialAdapter(new URL(u))?.id ?? null;
    expect(id("https://www.instagram.com/p/C1abc/")).toBe("instagram");
    expect(id("https://www.instagram.com/reel/C1abc/?igsh=x")).toBe("instagram");
    expect(id("https://vm.tiktok.com/ZGabc/")).toBe("tiktok");
    expect(id("https://youtu.be/dQw4w9WgXcQ")).toBe("youtube");
    expect(id("https://m.youtube.com/shorts/abc123def")).toBe("youtube");
    expect(id("https://www.facebook.com/reel/123")).toBe("facebook");
    expect(id("https://pin.it/abc")).toBe("pinterest");
    expect(id("https://nl.pinterest.com/pin/123/")).toBe("pinterest");
    expect(id("https://www.bbcgoodfood.com/recipes/x")).toBeNull();
  });

  it("parses Instagram OG descriptions", () => {
    expect(parseInstagramOg('1,234 likes, 56 comments - lekkerensimpel on March 3, 2026: "Snelle pasta pesto 🌿\nIngrediënten..."', "")).toEqual({
      author: "@lekkerensimpel",
      caption: "Snelle pasta pesto 🌿\nIngrediënten...",
    });
    expect(parseInstagramOg("", 'Jamie Oliver on Instagram: "Quick fish tacos"')).toEqual({ author: "Jamie Oliver", caption: "Quick fish tacos" });
  });

  it("reads YouTube ids and full descriptions", () => {
    expect(youtubeVideoId(new URL("https://www.youtube.com/watch?v=abc123XYZ_-&t=10"))).toBe("abc123XYZ_-");
    expect(youtubeVideoId(new URL("https://youtu.be/abc123XYZ_-?si=x"))).toBe("abc123XYZ_-");
    expect(youtubeVideoId(new URL("https://www.youtube.com/shorts/abc123XYZ_-"))).toBe("abc123XYZ_-");
    const html = `var ytInitialPlayerResponse = {"videoDetails":{"shortDescription":"Ingredients:\\n- 200g flour\\n- 2 \\"large\\" eggs\\nhttps:\\/\\/blog.example\\/r"}};`;
    expect(extractYoutubeDescription(html)).toBe('Ingredients:\n- 200g flour\n- 2 "large" eggs\nhttps://blog.example/r');
  });

  it("finds a pin's source link", () => {
    expect(pinterestSourceLink('<meta property="og:see_also" content="https://blog.example/soup">', "https://pinterest.com/pin/1")).toBe("https://blog.example/soup");
    expect(pinterestSourceLink('{"link":"https:\\/\\/blog.example\\/cake","x":1}', "https://pinterest.com/pin/1")).toBe("https://blog.example/cake");
    expect(pinterestSourceLink('{"link":"https://www.pinterest.com/other"}', "https://pinterest.com/pin/1")).toBe("");
  });
});

/**
 * Seeds a demo household with two users and a few recipes. Idempotent:
 * existing users/recipes are left alone.
 *
 *   pnpm db:seed
 *   → log in as demo@example.com or partner@example.com, password "letscook123"
 */
import { hashPassword } from "@/lib/auth/password";
import { createRecipe, listRecipes, markCooked, setSkipUntil } from "@/lib/db/recipes";
import { createHouseholdWithOwner, createMember, getUserByEmail, type User } from "@/lib/db/users";
import { nowIso } from "@/lib/ids";
import { RecipeInputSchema, type RecipeInputDraft } from "@/lib/recipes/schema";

const HOUSEHOLD_ID = "demo-household";
const PASSWORD = "letscook123";

const ing = (quantity: string, unit: string, item: string, note = "", group = "") => ({
  quantity,
  quantityValue: Number.isFinite(Number(quantity)) && quantity !== "" ? Number(quantity) : null,
  unit,
  item,
  note,
  group,
});
const step = (text: string, group = "") => ({ text, group });

const RECIPES: (RecipeInputDraft & { rotation: boolean; cookedDaysAgo?: number })[] = [
  {
    title: "Stamppot boerenkool",
    description: "Dutch kale-and-potato mash with smoked sausage. Winter classic.",
    servings: 4,
    prepTime: 15,
    cookTime: 25,
    totalTime: 40,
    cuisine: "Dutch",
    tags: ["comfort", "winter", "weeknight"],
    language: "nl",
    sourceType: "manual",
    ingredients: [
      ing("1.5", "kg", "kruimige aardappelen", "geschild"),
      ing("500", "g", "boerenkool", "gesneden"),
      ing("1", "", "rookworst"),
      ing("150", "ml", "warme melk"),
      ing("30", "g", "boter"),
      ing("", "", "zout en peper"),
    ],
    steps: [
      step("Kook de aardappelen in ruim water met zout in 20 minuten gaar."),
      step("Leg de boerenkool de laatste 10 minuten bovenop de aardappelen."),
      step("Verwarm de rookworst volgens de verpakking."),
      step("Giet af en stamp met melk en boter. Breng op smaak met zout en peper."),
    ],
    rotation: true,
    cookedDaysAgo: 3,
  },
  {
    title: "Spaghetti aglio e olio",
    description: "Ten-minute pantry pasta.",
    servings: 2,
    prepTime: 5,
    cookTime: 10,
    totalTime: 15,
    cuisine: "Italian",
    tags: ["vegetarian", "quick", "pantry"],
    language: "en",
    sourceType: "manual",
    ingredients: [
      ing("200", "g", "spaghetti"),
      ing("4", "cloves", "garlic", "thinly sliced"),
      ing("60", "ml", "olive oil"),
      ing("1", "tsp", "chilli flakes"),
      ing("1", "handful", "parsley", "chopped"),
    ],
    steps: [
      step("Cook the spaghetti in well-salted water until al dente. Save a mug of pasta water."),
      step("Gently fry the garlic and chilli in the oil until just golden."),
      step("Toss the pasta into the pan with a splash of pasta water and the parsley."),
    ],
    rotation: true,
  },
  {
    title: "Chickpea & spinach curry",
    description: "Creamy coconut curry, mostly from the cupboard.",
    servings: 4,
    prepTime: 10,
    cookTime: 25,
    totalTime: 35,
    cuisine: "Indian",
    tags: ["vegetarian", "vegan", "weeknight"],
    language: "en",
    sourceType: "manual",
    ingredients: [
      ing("1", "", "onion", "diced", "Curry base"),
      ing("3", "cloves", "garlic", "", "Curry base"),
      ing("1", "tbsp", "ginger", "grated", "Curry base"),
      ing("2", "tbsp", "curry paste", "", "Curry base"),
      ing("2", "tins", "chickpeas", "drained"),
      ing("400", "ml", "coconut milk"),
      ing("200", "g", "spinach"),
      ing("", "", "rice", "to serve", "To serve"),
    ],
    steps: [
      step("Soften the onion, then add garlic, ginger and curry paste for a minute.", "Curry base"),
      step("Add chickpeas and coconut milk; simmer 15 minutes."),
      step("Stir in the spinach until wilted. Serve with rice."),
    ],
    rotation: true,
  },
  {
    title: "Shakshuka",
    description: "Eggs poached in spiced tomato sauce.",
    servings: 2,
    prepTime: 10,
    cookTime: 20,
    totalTime: 30,
    cuisine: "Middle Eastern",
    tags: ["vegetarian", "brunch"],
    language: "en",
    sourceType: "manual",
    ingredients: [
      ing("1", "", "red pepper", "sliced"),
      ing("1", "", "onion", "sliced"),
      ing("1", "tsp", "cumin"),
      ing("1", "tsp", "smoked paprika"),
      ing("1", "tin", "chopped tomatoes"),
      ing("4", "", "eggs"),
      ing("", "", "feta and herbs", "to finish"),
    ],
    steps: [
      step("Soften pepper and onion, add the spices, then the tomatoes. Simmer 10 minutes."),
      step("Make four wells, crack in the eggs, cover and cook until the whites set."),
      step("Finish with feta and herbs."),
    ],
    rotation: false,
  },
  {
    title: "Oven-baked pannenkoek with apple",
    description: "One big Dutch pancake from the oven.",
    servings: 3,
    prepTime: 10,
    cookTime: 25,
    totalTime: 35,
    cuisine: "Dutch",
    tags: ["sweet", "weekend"],
    language: "en",
    sourceType: "manual",
    ingredients: [
      ing("250", "g", "flour"),
      ing("500", "ml", "milk"),
      ing("3", "", "eggs"),
      ing("2", "", "apples", "thinly sliced"),
      ing("", "", "stroop", "to serve"),
    ],
    steps: [
      step("Heat the oven to 220°C with a buttered tin inside."),
      step("Whisk flour, milk and eggs into a smooth batter."),
      step("Lay the apple in the hot tin, pour over the batter, bake 20–25 minutes until puffed."),
    ],
    rotation: true,
  },
  {
    title: "Sheet-pan harissa chicken",
    description: "Chicken thighs, potatoes and peppers, one tray.",
    servings: 4,
    prepTime: 15,
    cookTime: 40,
    totalTime: 55,
    cuisine: "North African",
    tags: ["one-pan", "weeknight"],
    language: "en",
    sourceType: "manual",
    ingredients: [
      ing("8", "", "chicken thighs", "bone-in"),
      ing("2", "tbsp", "harissa"),
      ing("600", "g", "baby potatoes", "halved"),
      ing("2", "", "peppers", "chunked"),
      ing("1", "", "lemon"),
    ],
    steps: [
      step("Toss everything with harissa, oil and salt on a large tray."),
      step("Roast at 200°C for 40 minutes, until the chicken is crisp."),
      step("Squeeze over the lemon before serving."),
    ],
    rotation: true,
  },
];

async function ensureUser(email: string, name: string, owner: boolean): Promise<User> {
  const existing = await getUserByEmail(email);
  if (existing) {
    console.log(`  ✓ user ${email} exists`);
    return existing;
  }
  const user: User = {
    userId: `demo-${name.toLowerCase()}`,
    name,
    email,
    passwordHash: await hashPassword(PASSWORD),
    householdId: HOUSEHOLD_ID,
    createdAt: nowIso(),
  };
  if (owner) {
    await createHouseholdWithOwner(
      { householdId: HOUSEHOLD_ID, name: "Demo Kitchen", createdBy: user.userId, createdAt: user.createdAt },
      user,
    );
  } else {
    await createMember(user);
  }
  console.log(`  ✓ created user ${email}`);
  return user;
}

export async function seedDemo() {
  console.log("→ Seeding demo household");
  const owner = await ensureUser("demo@example.com", "Sam", true);
  await ensureUser("partner@example.com", "Alex", false);

  const existing = new Set((await listRecipes(HOUSEHOLD_ID)).map((r) => r.title));
  for (const { rotation, cookedDaysAgo, ...draft } of RECIPES) {
    if (existing.has(draft.title)) continue;
    const r = await createRecipe({
      householdId: HOUSEHOLD_ID,
      userId: owner.userId,
      input: RecipeInputSchema.parse(draft),
      inRotation: rotation,
    });
    if (cookedDaysAgo != null) {
      await markCooked(HOUSEHOLD_ID, r.id, new Date(Date.now() - cookedDaysAgo * 86400_000).toISOString());
      await setSkipUntil(HOUSEHOLD_ID, r.id, null);
    }
    console.log(`  ✓ recipe "${r.title}"`);
  }
  console.log(`Done. Log in as demo@example.com / ${PASSWORD}`);
}

// Run when executed directly (pnpm db:seed), not when imported by dev/memory-db.ts.
if (process.argv[1]?.endsWith("db-seed.ts")) {
  seedDemo().catch((err) => {
    console.error("✗ db:seed failed:", err instanceof Error ? `${err.name}: ${err.message}` : err);
    process.exit(1);
  });
}

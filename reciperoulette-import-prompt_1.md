# Task: import legacy recipes into reciperoulette

Below are 17 recipes exported from my old recipe app. Import them into reciperoulette's DynamoDB table, in my household (the account for you@example.com).

First, save the JSON at the bottom of this message to `scripts/data/legacy-recipes.json`, and add `scripts/data/` to `.gitignore` so personal data never gets committed. Then plan, build an import script, run it in dry-run mode, and show me the report before writing anything to the database.

## About the data

- It's already valid JSON. Mongo wrappers have been unwrapped, the duplicate record removed, and invisible characters stripped.
- The first record (Kimchi Udon with Scallions) has `_id: null`. Use a stable fallback ID based on the title.
- Still run every text field through the app's text sanitizer (or trim and strip zero-width characters if that doesn't exist yet). For example, "Salmon orzo with spinach and lemon " has a trailing space.

## Field mapping

- `title` → title
- `description` → description. A value of `*` means empty.
- `cookTime` (minutes, as a string) → totalTime in whatever format our recipe model uses. Leave prepTime empty.
- `image` → imageUrl if non-empty. These are `utfs.io` URLs, so add that host to the Next.js image config (`remotePatterns`) if we use `next/image`. Don't download or re-host images for now.
- `ingredients[]` → our ingredient shape: `amount` → quantity, `unit` → unit (normalized with the unit parser from the unit conversion feature), `name` → item and note.
  - Split preparation notes out of the item name where it's clear: "garlic, smashed" becomes item "garlic", note "smashed"; "salt divided" becomes item "salt", note "divided".
  - Quantities like "to taste" and "splash" are stored with no numeric quantity and the text kept in the note.
  - Keep ranges like "350-450" as ranges.
  - A unit of "whole" means no unit (just a count).
  - Make sure the unit normalizer handles every unit in this data, including "grams", "teaspoons", "tablespoons", "pounds", "ounces", "cups", "cloves", "packages", "packet", and "pinch" with a quantity above 1 ("2 pinch salt"). "packet", "packages", "cloves", and "pinch" are never converted.
- `steps[]` → steps. A single step of `*` means no steps.
- The old app used both `category` and `categories`, sometimes both on the same record. Merge them, lowercase, deduplicate, drop `*`, and store as tags.
- `createdAt` → createdAt (preserve the original date). updatedAt is the import time.
- Set createdBy to my user, sourceType to "import", and store the original `_id` as a `legacyId` field.
- Run each ingredient through the unit conversion classification (category and gramsPerCup) so converted units work on these recipes too.

## Incomplete recipes

Treat a recipe as incomplete if its steps are `*` or empty, it has 2 or fewer ingredients, or it has only 1 step. That should catch: Orzo with broccoli and cheddar, Pasta with tuna, Mustard chicken with green beans, Salmon orzo with spinach and lemon, Risotto miso mushroom, Greek Baked Orzo, and Thai Chicken Meatballs in Peanut Sauce.

Import them anyway, tag them "needs-details", and keep them out of the rotation. The tuna pasta's description is actually an ingredient list (partly in Dutch, "rode ui" means red onion). Leave it in the description, don't try to turn it into ingredients.

All other recipes go in the rotation by default, except anything flagged as having unfinished steps (see below).

## Temperatures

Greek Baked Orzo says "Preheat the oven to 400 degrees" with no F or C. In the temperature converter, treat a bare "degrees" value above 250 as Fahrenheit (no home oven setting in Celsius goes that high) and leave values of 250 or below alone, since they're ambiguous.

## Data problems to flag, not fix

Some records have obvious data entry errors. Don't guess at corrections. Import them as written and list them in the dry-run report so I can decide. Ones I already know about:

- Stir-Fried Udon with Pork and Cabbage: "14 ounces toasted sesame oil" (the 14 oz probably belonged to the udon packages), and a garbled scallion line ("coarsely chopperk-green parts thinly slicedd, da").
- Broccoli Bolognese with Orecchiette: the olive oil item repeats "tablespoons" in the name, and the broccoli line has a lot of prep detail stuffed into the name.
- Mexican Beef and Rice Casserole: "1 pinch baby spinach" is almost certainly wrong.
- Jeff's Spice Rub: the steps and description mention cloves, but there's no cloves ingredient.
- Street Tacos: the ingredient list is complete but the steps stop partway through (the last one is "dice half an onion and set aside. in a small serving bowl"). Flag as "steps look unfinished" and keep it out of the rotation, but don't tag it "needs-details".

Also flag anything else that looks off: quantities that seem implausible for the ingredient, units that didn't parse, or items that still look like they contain multiple things.

## Possible duplicates

"Kimchi Udon with Scallions" and "Kimchi Udon Noodles" are different records but very similar. Import both, and add a "possible duplicates" section to the report for any recipes with near-identical titles or heavily overlapping ingredient lists.

## The script

- `pnpm db:import-legacy --email you@example.com` with dry run as the default behavior. Writing to the database requires an explicit `--commit` flag.
- The dry run prints a per-recipe summary (title, ingredient count, step count, tags, in rotation yes/no, needs-details yes/no), followed by the flagged issues and possible duplicates.
- Make it idempotent: on `--commit`, skip any recipe whose `legacyId` already exists in the household, so running it twice doesn't create duplicates. Add an `--overwrite` flag to replace existing imported copies instead.
- Use the existing repository layer in `lib/db/`, not raw DynamoDB calls, and validate every recipe against the same Zod schema the app uses.
- Don't call the AI for anything except the ingredient unit classification, and only for ingredients not covered by the density lookup table.

When it's done, show me the dry-run output and wait for me to say go before running with `--commit`.

## The recipes

```json
[
  {
    "_id": null,
    "title": "Kimchi Udon with Scallions",
    "description": "This kimchi udon is a quick and easy meal that's packed with flavor and spice.",
    "cookTime": "30",
    "image": "",
    "ingredients": [
      { "amount": "8", "unit": "oz", "name": "udon noodles" },
      { "amount": "1", "unit": "tbsp", "name": "vegetable oil" },
      { "amount": "1", "unit": "cup", "name": "kimchi" },
      { "amount": "2", "unit": "tbsp", "name": "soy sauce" },
      { "amount": "1", "unit": "tbsp", "name": "sesame oil" },
      { "amount": "2", "unit": "tsp", "name": "sugar" },
      { "amount": "2", "unit": "tsp", "name": "rice vinegar" },
      { "amount": "2", "unit": "tsp", "name": "toasted sesame seeds" },
      { "amount": "2", "unit": "tbsp", "name": "scallions" }
    ],
    "steps": [
      "Cook udon noodles according to package instructions.",
      "Heat vegetable oil in a large skillet over medium heat.",
      "Add kimchi and cook for about 5 minutes.",
      "Stir in soy sauce, sesame oil, sugar, and rice vinegar.",
      "Add cooked udon noodles and toss to combine.",
      "Top with sesame seeds and scallions before serving."
    ],
    "category": [],
    "createdAt": "2025-03-27T19:35:17.752Z"
  },
  {
    "_id": "692831942d095c93ce73e6dd",
    "title": "Quick Pan Gravy",
    "description": "A simple pan gravy made using chicken roasting pan drippings, butter, flour, and chicken stock, seasoned with salt, pepper, and optional white wine, thyme, or soy sauce.",
    "cookTime": "10",
    "image": "",
    "ingredients": [
      { "amount": "1", "unit": "tbsp", "name": "butter" },
      { "amount": "1", "unit": "tbsp", "name": "flour" },
      { "amount": "350-450", "unit": "ml", "name": "chicken stock" },
      { "amount": "to taste", "unit": "", "name": "salt" },
      { "amount": "to taste", "unit": "", "name": "pepper" },
      { "amount": "splash", "unit": "", "name": "white wine" },
      { "amount": "1", "unit": "pinch", "name": "thyme" },
      { "amount": "to taste", "unit": "", "name": "soy sauce" }
    ],
    "steps": [
      "Remove the chicken from the roasting pan and place the pan on the stovetop.",
      "Add butter and sprinkle in flour.",
      "Cook, stirring, for 1 minute to make a roux.",
      "Slowly whisk in chicken stock until smooth.",
      "Simmer until thickened.",
      "Season with salt, pepper, and optional thyme or wine."
    ],
    "categories": ["sauce", "stovetop", "chicken", "holiday", "thanksgiving"],
    "createdAt": "2025-11-27T11:10:12.302Z"
  },
  {
    "_id": "66bbae8b45ac37add6fed0a4",
    "title": "Broccoli Bolognese with Orecchiette",
    "description": "Broccoli and sausage pair up for an indulgent veg-heavy pasta dinner. We generally use sweet Italian sausage, but like any legit weeknight meal, the recipe is flexible, so play around with your favorite style.",
    "cookTime": "30",
    "image": "https://utfs.io/f/1e18606d-c856-4935-b913-3eb95df93610-sdbvmt.webp",
    "ingredients": [
      { "amount": "1", "unit": "whole", "name": "large head of broccoli (1¼–1½ pounds), cut into florets, stalk peeled and chopped into ½\" pieces" },
      { "amount": "2", "unit": "teaspoons", "name": "salt" },
      { "amount": "2", "unit": "tablespoons", "name": "tablespoons extra-virgin olive oil, plus more for drizzling" },
      { "amount": "4", "unit": "cloves", "name": "garlic, smashed" },
      { "amount": "12", "unit": "ounces", "name": "fresh Italian sausage (about 3 links), casings removed" },
      { "amount": "2", "unit": "teaspoons", "name": "crushed red pepper flakes" },
      { "amount": "12", "unit": "ounces", "name": "orecchiette pasta" },
      { "amount": "3", "unit": "tablespoons", "name": "unsalted butter" },
      { "amount": "1.5", "unit": "ounces", "name": "finely grated Parmesan cheese, (about ½ cup), plus more for serving" }
    ],
    "steps": [
      "Cook broccoli in a large pot of salted boiling water until crisp-tender, about 3 minutes. Using a slotted spoon, transfer broccoli to a colander and let cool (save pot of water for cooking pasta). Chop broccoli into small pieces; set aside.",
      "Heat 2 Tbsp. oil in a large skillet over medium. Cook garlic, shaking skillet occasionally, until it starts to turn golden, about 2 minutes. Transfer garlic to a small bowl. Cook sausage and a generous pinch of red pepper flakes, breaking up meat into smaller pieces with a wooden spoon and stirring occasionally, until browned and cooked through, 6–8 minutes.",
      "Bring reserved pot of water to a boil and cook pasta until barely al dente, about 9 minutes (set a timer for 3 minutes less than the package instructions; it will cook more in the skillet).",
      "Meanwhile, ladle about ½ cup pasta cooking liquid from pot into skillet with sausage and add garlic and blanched broccoli. Keep mixture at a low simmer, stirring often and mashing with a potato masher to break up sausage even more, until pasta is finished cooking.",
      "Using a spider or slotted spoon, transfer pasta to skillet, then ladle in ½ cup pasta water. Cook, stirring, until pasta absorbs most of the liquid and is just al dente, about 4 minutes. Add butter and stir until melted, then transfer pasta to a large bowl. Gradually add 1½ oz. Parmesan, tossing constantly until you have a glossy, emulsified sauce.",
      "Serve pasta topped with more Parmesan and red pepper flakes and a drizzle of oil."
    ],
    "category": ["quick", "healthy"],
    "createdAt": "2024-08-13T19:05:47.783Z"
  },
  {
    "_id": "69177e3504e5c0fac82b81fb",
    "title": "Stir-Fried Udon with Pork and Cabbage",
    "description": "This recipe features stir-fried udon noodles with pork, cabbage, and a savory sauce, garnished with sesame seeds and scallions.",
    "cookTime": "20",
    "image": "https://utfs.io/f/db71b879-4626-41a7-b097-50e0288e5f67-1kery.webp",
    "ingredients": [
      { "amount": "2", "unit": "tbsp", "name": "vegetable oil, divided" },
      { "amount": "4", "unit": "cups", "name": "green cabbage, very coarsely chopped" },
      { "amount": "2", "unit": "packages", "name": "instant udon noodles, flavor packets discarded" },
      { "amount": "14", "unit": "ounces", "name": "toasted sesame oil" },
      { "amount": "8", "unit": "ounces", "name": "ground pork" },
      { "amount": "5", "unit": "whole", "name": "Scallions coarsely chopperk-green parts thinly slicedd, da" },
      { "amount": "2", "unit": "teaspoons", "name": "fresh ginger, finely grated" },
      { "amount": "1", "unit": "teaspoons", "name": "crushed red pepper flakes" },
      { "amount": "1/3", "unit": "cup", "name": "mirin" },
      { "amount": "1/3", "unit": "cup", "name": "soy sauce" },
      { "amount": "1", "unit": "tablespoons", "name": "toasted sesame seeds, plus more for serving" }
    ],
    "steps": [
      "Heat 1 Tbsp. vegetable oil in a large skillet over medium-high. Add cabbage and cook, tossing often, until edges are browned, about 4 minutes. Reduce heat to low and continue to cook, tossing often, until thickest parts of cabbage leaves are tender, about 4 minutes longer. Remove from heat and set skillet aside.",
      "Place udon in a large heatproof bowl and cover with 6 cups boiling water. Let sit 1 minute, stirring to break up noodles, then drain. Toss noodles with sesame oil and transfer cabbage to bowl with noodles. Wipe out skillet.",
      "Heat remaining 1 Tbsp. vegetable oil in the same skillet over medium-high and add pork. Cook pork, undisturbed, until underside is brown, about 3 minutes. Break up meat into small bits. Cook, tossing, just until there's no more pink, about 1 minute. Add chopped scallions, ginger, and red pepper. Continue to cook, tossing often, until scallions are softened, about 1 minute. Add udon mixture, mirin, and soy sauce and cook, tossing constantly, until noodles are coated in sauce, about 45 seconds. Remove from heat and fold in 1 Tbsp. sesame seeds and dark-green parts of scallions. Top with more sesame seeds before serving."
    ],
    "category": [],
    "categories": [],
    "createdAt": "2025-11-14T19:08:37.097Z"
  },
  {
    "_id": "66bbb1d645ac37add6fed0de",
    "title": "Lebanese Baked Chicken with Potatoes",
    "description": "Lebanese baked chicken with potatoes. This sheet pan dinner is a flavorful way to enjoy Middle Eastern flavors at home. Beyond delicious, easy and so quick to put together. Juicy chicken thighs marinated in yogurt, then roasted with carrots, potatoes and a perfect medley of Lebanese inspired spices. Serve with a side of pita bread and a big leafy salad!",
    "cookTime": "75",
    "image": "https://utfs.io/f/b5dd95f6-6e99-4fef-af18-1732eb79f134-q8gq4z.jpg",
    "ingredients": [
      { "amount": "2", "unit": "pounds", "name": "chicken thighs" },
      { "amount": "3", "unit": "tablespoons", "name": "yogurt full fat" },
      { "amount": "2", "unit": "teaspoons", "name": "salt divided" },
      { "amount": "2", "unit": "teaspoons", "name": "black pepper divided" },
      { "amount": "1", "unit": "teaspoons", "name": "sweet paprika" },
      { "amount": "1", "unit": "teaspoons", "name": "garlic powder" },
      { "amount": "1", "unit": "teaspoons", "name": "za’atar" },
      { "amount": "6", "unit": "whole", "name": "medium potatoes" },
      { "amount": "3", "unit": "whole", "name": "large carrots" },
      { "amount": "1", "unit": "teaspoons", "name": "dried oregano" },
      { "amount": "2", "unit": "tablespoons", "name": "chopped parsley" },
      { "amount": "2", "unit": "tablespoons", "name": "unsalted butter" },
      { "amount": "1", "unit": "whole", "name": "yellow onion" },
      { "amount": "1", "unit": "whole", "name": "garlic head" },
      { "amount": "3", "unit": "tablespoons", "name": "lemon juice" },
      { "amount": "2", "unit": "tablespoons", "name": "olive oil" }
    ],
    "steps": [
      "Preheat the oven to 350°F/180°C.",
      "In a large bowl, combine yogurt with za'atar, paprika, garlic powder, and 1 teaspoon salt and pepper. Add chicken thighs and massage well with the yogurt mixture. Set aside to marinate.",
      "In the meantime, peel and chop the carrots, wash and cut the potatoes into ¼ inch/0,5 cm slices. Chop the parsley and cut the onion into wedges. Cut off the top of the garlic head.",
      "To a large bowl, add potatoes, carrots, oregano, parsley and the remaining salt and pepper. Melt the butter and add to the potato mixture. Mix until combined.",
      "Place the potato mixture on a baking sheet layered with parchment paper. Nestle the chicken between the potatoes. Add onion and the garlic head cut-side-down.",
      "Sprinkle with lemon juice and drizzle with olive oil. Transfer to the oven and bake for 60 minutes, until the potatoes are tender and the edges are crispy, and the chicken is cooked through.",
      "Let it rest for 5 minutes before serving. Squeeze out some roasted garlic cloves, smash with a fork and swirl all that goodness into the potatoes. Enjoy!"
    ],
    "category": ["Vegetables", "tray bake", "short prep"],
    "createdAt": "2024-08-13T19:19:50.487Z"
  },
  {
    "_id": "66c0e13651046e865dd63930",
    "title": "Orzo with broccoli and cheddar",
    "description": "*",
    "cookTime": "31",
    "image": "https://utfs.io/f/73af4f0c-1dac-4d1a-b80c-bcfade7c59c4-81eca8.webp",
    "ingredients": [
      { "amount": "1", "unit": "whole", "name": "Head of broccoli" }
    ],
    "steps": ["*"],
    "category": ["*"],
    "createdAt": "2024-08-17T17:43:18.545Z"
  },
  {
    "_id": "6921982064a93f9ed190dfd1",
    "title": "Sweet Carolina BBQ Rub",
    "description": "Carolina BBQ rub",
    "cookTime": "5",
    "image": "",
    "ingredients": [
      { "amount": "1/3", "unit": "cup", "name": "smoked paprika" },
      { "amount": "1/3", "unit": "cup", "name": "dark brown sugar" },
      { "amount": "1", "unit": "tbsp", "name": "granulated garlic powder" },
      { "amount": "1", "unit": "tbsp", "name": "granulated onion powder" },
      { "amount": "1", "unit": "tbsp", "name": "chili powder" },
      { "amount": "4", "unit": "tsp", "name": "ground mustard" },
      { "amount": "2", "unit": "teaspoons", "name": "cracked black pepper" },
      { "amount": "2", "unit": "tsp", "name": "cumin" },
      { "amount": "1", "unit": "tsp", "name": "cayenne pepper (optional)" }
    ],
    "steps": ["Mix together"],
    "categories": ["rub"],
    "createdAt": "2025-11-22T11:01:52.706Z"
  },
  {
    "_id": "69220e7170770e337127dcbc",
    "title": "Jeff’s Spice Rub",
    "description": "A versatile spice rub combining sugar, salt, paprika, garlic, onion powder, cumin, and a blend of other spices with optional cinnamon, allspice, and cloves.",
    "cookTime": "5",
    "image": "",
    "ingredients": [
      { "amount": "6", "unit": "cup", "name": "sugar (brown and turbinado 50/50)" },
      { "amount": "1.25", "unit": "cup", "name": "salt" },
      { "amount": "1", "unit": "cup", "name": "paprika" },
      { "amount": "0.5", "unit": "cup", "name": "granulated garlic" },
      { "amount": "0.5", "unit": "cup", "name": "onion powder" },
      { "amount": "0.5", "unit": "cup", "name": "ground cumin" },
      { "amount": "0.25", "unit": "cup", "name": "black pepper" },
      { "amount": "0.25", "unit": "cup", "name": "cayenne pepper" },
      { "amount": "0.25", "unit": "cup", "name": "oregano" },
      { "amount": "0.25", "unit": "cup", "name": "pepper flakes" },
      { "amount": "0.25", "unit": "cup", "name": "mustard" },
      { "amount": "1", "unit": "pinch", "name": "cinnamon (optional)" },
      { "amount": "1", "unit": "pinch", "name": "allspice (optional)" }
    ],
    "steps": [
      "Mix brown and turbinado sugar 50/50 to make 6 cups.",
      "Combine sugar mixture with salt, paprika, granulated garlic, onion powder, ground cumin, black pepper, cayenne pepper, oregano, pepper flakes, and mustard.",
      "Optionally add cinnamon, allspice, and cloves to taste."
    ],
    "categories": ["rub", "seasoning"],
    "createdAt": "2025-11-22T19:26:41.028Z"
  },
  {
    "_id": "66c0c95dfb44edb382f5f464",
    "title": "Pasta with tuna",
    "description": "tomatoes, rode ui, garlic, tuna, cooking cream, cilantro, avocado, pine nuts, feta or goat cheese",
    "cookTime": "35",
    "image": "https://utfs.io/f/ea0cc24f-e5d8-4cae-98f0-eebae083c839-1x9zqc.png",
    "ingredients": [
      { "amount": "2", "unit": "whole", "name": "Cans of tuna" }
    ],
    "steps": ["*"],
    "category": ["*"],
    "createdAt": "2024-08-17T16:01:33.434Z"
  },
  {
    "_id": "66aa5d954414d3ffc6a1d3c6",
    "title": "Mexican Beef and Rice Casserole",
    "description": "Get ready to be transported straight to a cozy Mexican kitchen with this hearty Mexican Beef and Rice Casserole. Packed with robust flavors from the beef, fire-roasted tomatoes, and a cheesy topping, this one-dish wonder is your ticket to a quick, satisfying, and flavor-packed meal!",
    "cookTime": "71",
    "image": "https://utfs.io/f/33be6d52-96c2-4077-9cc5-c92153e0fbd6-htg5p9.jpg",
    "ingredients": [
      { "amount": "1", "unit": "pounds", "name": "Ground Beef" },
      { "amount": "1", "unit": "tablespoons", "name": "Taco Seasoning" },
      { "amount": "1", "unit": "pinch", "name": "Baby Spinach" },
      { "amount": "1", "unit": "cups", "name": "Corn" },
      { "amount": "2", "unit": "whole", "name": "Bell Peppers" },
      { "amount": "2", "unit": "cups", "name": "Mexican Cheese Blend" },
      { "amount": "1", "unit": "cups", "name": "Long grain rice" },
      { "amount": "2", "unit": "cups", "name": "Chicken Broth" },
      { "amount": "0.5", "unit": "cups", "name": "Salsa" },
      { "amount": "2", "unit": "teaspoons", "name": "Fresh Cilantro (Chopped)" },
      { "amount": "14", "unit": "ounces", "name": "Fire roasted diced tomatoes" }
    ],
    "steps": [
      "Preheat the oven to 375℉ (191°C) and spray a 9 x 13-inch casserole dish with cooking spray; set aside.",
      "In a large skillet, cook the ground beef for about 5 minutes, breaking it into crumbles, over medium-high heat. Stir in taco seasoning and continue to cook until the beef starts to brown and is no longer pink.",
      "Add the spinach, corn, roasted tomatoes, salsa, and ½ of the shredded cheese to the skillet and stir. Finally, add the rice and broth, and stir until ingredients are well incorporated.",
      "Spoon the contents of the skillet into the prepared casserole dish, cover with aluminum foil. Place the casserole dish into the oven and bake for 45 minutes, or until the rice is cooked. When finished, remove the foil and top with remaining cheese. Bake for another 5 minutes or until cheese has melted",
      "Once removed from the oven, garnish with cilantro and serve hot."
    ],
    "category": ["Casserole", "Quick Prep", "Dinner"],
    "createdAt": "2024-07-31T15:51:49.232Z"
  },
  {
    "_id": "66c0ca7afb44edb382f5f48c",
    "title": "Mustard chicken with green beans",
    "description": "*",
    "cookTime": "45",
    "image": "https://utfs.io/f/ea91e345-17c6-4540-8e6a-559b2ec0c2f1-1x9zqe.jpeg",
    "ingredients": [
      { "amount": "600", "unit": "grams", "name": "Chicken breast" }
    ],
    "steps": ["*"],
    "category": ["*"],
    "createdAt": "2024-08-17T16:06:18.681Z"
  },
  {
    "_id": "66c0e46051046e865dd63940",
    "title": "Greek Baked Orzo",
    "description": "Lightly tomato-sauced orzo baked in a skillet with red peppers, kale, chicken – or chickpeas – and a topping of feta, lemon juice, and fresh dill.",
    "cookTime": "50",
    "image": "https://utfs.io/f/dc3fc5f4-656f-48f4-a919-171da1c73f2f-1x9zr6.png",
    "ingredients": [
      { "amount": "2", "unit": "tablespoons", "name": "Olive oil" }
    ],
    "steps": ["Preheat the oven to 400 degrees"],
    "category": ["Dinner", "Healthy"],
    "createdAt": "2024-08-17T17:56:48.251Z"
  },
  {
    "_id": "66c0dda351046e865dd63926",
    "title": "Thai Chicken Meatballs in Peanut Sauce",
    "description": "Thai chicken meatballs in peanut sauce. Tender, juicy meatballs simmered in a rich, ultra creamy peanut butter sauce enlivened with ginger, garlic and red curry paste. This easy weeknight dinner is loaded with sautéed bok choy and served over creamy coconut rice. Top with fresh cilantro and toasted peanuts for a crowd-pleasing dinner.",
    "cookTime": "40",
    "image": "https://utfs.io/f/c0648a77-e379-4316-8fa4-f22204f094a6-1x9zqg.jpeg",
    "ingredients": [
      { "amount": "600", "unit": "grams", "name": "Ground Chicken" }
    ],
    "steps": [
      "Get all the prep done before you start cooking. Chop the cilantro and bok choy. Grate the garlic cloves and ginger"
    ],
    "category": ["Chicken", "Dinner"],
    "createdAt": "2024-08-17T17:28:03.334Z"
  },
  {
    "_id": "66c0c89d4e3efa211eaedd85",
    "title": "Salmon orzo with spinach and lemon ",
    "description": "*",
    "cookTime": "30",
    "image": "https://utfs.io/f/fcd73aae-73a4-4f77-bf54-878075be0adf-1x9zqb.png",
    "ingredients": [
      { "amount": "600", "unit": "grams", "name": "Salmon" }
    ],
    "steps": ["*"],
    "category": ["*"],
    "createdAt": "2024-08-17T15:58:21.105Z"
  },
  {
    "_id": "66c0e38651046e865dd6393b",
    "title": "Risotto miso mushroom",
    "description": "*",
    "cookTime": "35",
    "image": "https://utfs.io/f/176f4223-c71b-426d-bbca-3350b9eb50d3-1x9zr5.jpeg",
    "ingredients": [
      { "amount": "300", "unit": "grams", "name": "Mushrooms" }
    ],
    "steps": ["*"],
    "category": ["Dinner"],
    "createdAt": "2024-08-17T17:53:10.713Z"
  },
  {
    "_id": "691aff0d9222ef096ada0218",
    "title": "Kimchi Udon Noodles",
    "description": "A spicy and savory dish combining udon noodles with flavorful kimchi, perfect for a quick and satisfying meal.",
    "cookTime": "15",
    "image": "",
    "ingredients": [
      { "amount": "200", "unit": "g", "name": "udon noodles" },
      { "amount": "1", "unit": "cup", "name": "kimchi, chopped" },
      { "amount": "2", "unit": "tbsp", "name": "kimchi juice" },
      { "amount": "1", "unit": "tbsp", "name": "soy sauce" },
      { "amount": "1", "unit": "tbsp", "name": "sesame oil" },
      { "amount": "1", "unit": "tsp", "name": "sugar" },
      { "amount": "2", "unit": "tbsp", "name": "green onions, chopped" },
      { "amount": "1", "unit": "tsp", "name": "sesame seeds" }
    ],
    "steps": [
      "Cook udon noodles according to package instructions and drain.",
      "In a pan, heat sesame oil over medium heat.",
      "Add chopped kimchi and stir-fry for 2 minutes.",
      "Add cooked noodles, kimchi juice, soy sauce, and sugar to the pan. Mix well and cook for another 2-3 minutes until everything is heated through.",
      "Serve hot, garnished with green onions and sesame seeds."
    ],
    "category": [],
    "categories": ["vegetarian", "stovetop", "asian"],
    "createdAt": "2025-11-17T10:55:09.777Z"
  },
  {
    "_id": "66a7b5a16a1b0539186e6294",
    "title": "Street Tacos",
    "description": "Authentic Mexican street tacos on corn tortillas",
    "cookTime": "45",
    "image": "https://utfs.io/f/0965b994-e2ed-421b-a3b0-b2a46ea1c727-1x9zqd.jpeg",
    "ingredients": [
      { "amount": "600", "unit": "grams", "name": "chicken" },
      { "amount": "3", "unit": "whole", "name": "limes" },
      { "amount": "3", "unit": "whole", "name": "avocados" },
      { "amount": "15", "unit": "grams", "name": "cilantro (corriander)" },
      { "amount": "1", "unit": "whole", "name": "yellow onion" },
      { "amount": "3", "unit": "cloves", "name": "garlic" },
      { "amount": "2", "unit": "tablespoons", "name": "olive oil" },
      { "amount": "1/2", "unit": "packet", "name": "taco seasoning (or make your own)" },
      { "amount": "7", "unit": "whole", "name": "corn tortillas (street taco size)" },
      { "amount": "2", "unit": "pinch", "name": "salt" },
      { "amount": "1", "unit": "pinch", "name": "pepper" }
    ],
    "steps": [
      "Cube the chicken into about 1\" x 1\"",
      "Add the chicken to a mixing bowl, and squeeze in a lime, half of the olive oil, 2 cloves garlic, the taco seasoning, and a pinch of cilantro. Ideally let this marinade for at least an hour (or as long as you can)",
      "dice half an onion and set aside. in a small serving bowl"
    ],
    "category": ["dinner"],
    "createdAt": "2024-07-29T15:30:41.979Z"
  }
]

```

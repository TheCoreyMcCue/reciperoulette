import type { IngredientCategory } from "@/lib/recipes/schema";

/**
 * Curated ingredient classifications. Values are grams per US cup (240 ml),
 * mostly from the King Arthur ingredient weight chart and USDA FoodData,
 * rounded. `uncertain` marks entries that vary a lot by brand, grind or prep.
 *
 * Matching (see classify.ts): longest alias wins, then the one that ends
 * last ("rice vinegar" → vinegar). Plurals are handled by stemming, so list
 * singulars; add Dutch names where they're common on Dutch recipe sites.
 * Table values always override AI estimates.
 */

export type DensityEntry = {
  names: string[];
  category: IngredientCategory;
  gramsPerCup?: number;
  uncertain?: string;
};

export const DENSITIES: DensityEntry[] = [
  // ── Flours & starches ──────────────────────────────────────────────────────
  { names: ["flour", "all-purpose flour", "all purpose flour", "plain flour", "ap flour", "bloem", "tarwebloem", "patentbloem"], category: "dry", gramsPerCup: 120 },
  { names: ["bread flour", "strong flour", "strong white flour", "broodmeel"], category: "dry", gramsPerCup: 127 },
  { names: ["whole wheat flour", "wholemeal flour", "whole-wheat flour", "volkorenmeel", "volkoren tarwemeel", "tarwemeel"], category: "dry", gramsPerCup: 113 },
  { names: ["cake flour"], category: "dry", gramsPerCup: 113 },
  { names: ["self-rising flour", "self-raising flour", "self rising flour", "zelfrijzend bakmeel"], category: "dry", gramsPerCup: 113 },
  { names: ["spelt flour", "speltmeel", "speltbloem"], category: "dry", gramsPerCup: 112, uncertain: "white vs whole spelt differ" },
  { names: ["rye flour", "roggemeel"], category: "dry", gramsPerCup: 106, uncertain: "light vs dark rye differ" },
  { names: ["almond flour", "almond meal", "ground almonds", "amandelmeel", "gemalen amandelen"], category: "dry", gramsPerCup: 96 },
  { names: ["coconut flour", "kokosmeel"], category: "dry", gramsPerCup: 112, uncertain: "brands vary 110–128 g" },
  { names: ["cornstarch", "corn starch", "cornflour", "maizena", "maïzena", "maiszetmeel"], category: "dry", gramsPerCup: 120, uncertain: "sources range 112–128 g" },
  { names: ["cornmeal", "polenta", "maismeel"], category: "dry", gramsPerCup: 150, uncertain: "fine vs coarse grind 120–170 g" },
  { names: ["semolina", "griesmeel"], category: "dry", gramsPerCup: 167 },
  { names: ["potato starch", "aardappelzetmeel"], category: "dry", gramsPerCup: 150, uncertain: "few reliable sources" },

  // ── Sugars & sweeteners ────────────────────────────────────────────────────
  { names: ["sugar", "granulated sugar", "white sugar", "caster sugar", "superfine sugar", "cane sugar", "suiker", "kristalsuiker", "witte suiker", "fijne kristalsuiker", "rietsuiker"], category: "dry", gramsPerCup: 200 },
  { names: ["brown sugar", "light brown sugar", "dark brown sugar", "packed brown sugar", "bruine suiker", "basterdsuiker", "lichtbruine basterdsuiker", "donkerbruine basterdsuiker"], category: "dry", gramsPerCup: 220, uncertain: "assumes packed; Dutch basterdsuiker spooned loosely is closer to 180 g" },
  { names: ["powdered sugar", "icing sugar", "confectioners sugar", "confectioners' sugar", "confectioner's sugar", "poedersuiker"], category: "dry", gramsPerCup: 120, uncertain: "sifted vs unsifted 100–130 g" },
  { names: ["coconut sugar", "kokosbloesemsuiker"], category: "dry", gramsPerCup: 160, uncertain: "brands vary" },
  { names: ["honey", "honing"], category: "liquid", gramsPerCup: 340 },
  { names: ["maple syrup", "ahornsiroop"], category: "liquid", gramsPerCup: 315 },
  { names: ["golden syrup", "light corn syrup", "corn syrup", "glucosestroop"], category: "liquid", gramsPerCup: 330 },
  { names: ["molasses", "treacle", "black treacle", "melasse"], category: "liquid", gramsPerCup: 337 },
  { names: ["agave syrup", "agave nectar", "agavesiroop"], category: "liquid", gramsPerCup: 330 },
  { names: ["stroop", "appelstroop", "keukenstroop"], category: "liquid", gramsPerCup: 340, uncertain: "Dutch syrups; appelstroop is very thick" },

  // ── Fats ───────────────────────────────────────────────────────────────────
  { names: ["butter", "unsalted butter", "salted butter", "boter", "roomboter", "ongezouten boter", "gezouten boter"], category: "fat", gramsPerCup: 227 },
  { names: ["margarine", "plantaardige boter"], category: "fat", gramsPerCup: 227 },
  { names: ["shortening", "vegetable shortening", "crisco"], category: "fat", gramsPerCup: 190, uncertain: "sources range 185–205 g" },
  { names: ["lard", "reuzel"], category: "fat", gramsPerCup: 205 },
  { names: ["coconut oil", "kokosolie"], category: "fat", gramsPerCup: 218, uncertain: "solid vs melted; treated as solid fat (weighed in metric)" },
  { names: ["peanut butter", "pindakaas"], category: "fat", gramsPerCup: 258 },
  { names: ["almond butter", "amandelpasta", "nut butter", "notenpasta", "tahini", "tahin"], category: "fat", gramsPerCup: 256, uncertain: "nut butters vary with oil content" },
  { names: ["cream cheese", "roomkaas", "philadelphia"], category: "fat", gramsPerCup: 232 },
  { names: ["mascarpone"], category: "fat", gramsPerCup: 240, uncertain: "few reliable sources" },
  { names: ["mayonnaise", "mayo"], category: "fat", gramsPerCup: 220 },

  // ── Dairy & thick liquids ──────────────────────────────────────────────────
  { names: ["yogurt", "yoghurt", "plain yogurt", "natural yogurt", "yoghurt naturel"], category: "liquid", gramsPerCup: 245 },
  { names: ["greek yogurt", "greek yoghurt", "griekse yoghurt", "turkse yoghurt", "kwark", "skyr"], category: "liquid", gramsPerCup: 280, uncertain: "strained yogurt/quark vary 250–290 g" },
  { names: ["sour cream", "zure room", "creme fraiche", "crème fraîche"], category: "liquid", gramsPerCup: 230 },
  { names: ["ricotta"], category: "dry", gramsPerCup: 246 },
  { names: ["cottage cheese", "huttenkase", "hüttenkäse"], category: "dry", gramsPerCup: 225 },

  // ── Cheese ─────────────────────────────────────────────────────────────────
  { names: ["grated parmesan", "parmesan", "parmesan cheese", "parmigiano", "parmigiano reggiano", "parmezaan", "geraspte parmezaan", "pecorino", "grana padano"], category: "dry", gramsPerCup: 100, uncertain: "finely grated ~100 g; shredded/shaved is lighter (~80 g)" },
  { names: ["cheese", "shredded cheese", "grated cheese", "cheddar", "shredded cheddar", "mozzarella", "shredded mozzarella", "gruyere", "gruyère", "geraspte kaas", "kaas", "goudse kaas", "jong belegen kaas", "belegen kaas", "emmentaler"], category: "dry", gramsPerCup: 113, uncertain: "loosely vs firmly packed shredded cheese" },
  { names: ["feta", "crumbled feta", "fetakaas"], category: "dry", gramsPerCup: 150 },
  { names: ["goat cheese", "geitenkaas", "blue cheese", "gorgonzola"], category: "dry", gramsPerCup: 135, uncertain: "crumbled soft cheeses vary" },

  // ── Grains, pasta, legumes ─────────────────────────────────────────────────
  { names: ["rice", "white rice", "long grain rice", "basmati rice", "jasmine rice", "rijst", "witte rijst", "basmatirijst", "pandanrijst", "zilvervliesrijst", "brown rice"], category: "dry", gramsPerCup: 190, uncertain: "uncooked; long-grain ~185 g, short/medium grain ~200 g; cooked rice is ~160 g" },
  { names: ["arborio rice", "risotto rice", "risottorijst", "sushi rice", "sushirijst"], category: "dry", gramsPerCup: 200 },
  { names: ["rolled oats", "oats", "old-fashioned oats", "oatmeal", "porridge oats", "havermout", "havervlokken"], category: "dry", gramsPerCup: 90 },
  { names: ["quick oats", "instant oats"], category: "dry", gramsPerCup: 80 },
  { names: ["quinoa"], category: "dry", gramsPerCup: 170 },
  { names: ["couscous"], category: "dry", gramsPerCup: 180 },
  { names: ["bulgur", "bulgur wheat"], category: "dry", gramsPerCup: 140 },
  { names: ["lentils", "red lentils", "green lentils", "linzen", "rode linzen"], category: "dry", gramsPerCup: 190, uncertain: "dry lentils; cooked are ~200 g" },
  { names: ["split peas", "spliterwten"], category: "dry", gramsPerCup: 195 },
  { names: ["dried beans", "gedroogde bonen"], category: "dry", gramsPerCup: 185, uncertain: "varies by bean" },
  { names: ["pasta", "dry pasta", "penne", "macaroni", "fusilli", "elbow macaroni", "orzo"], category: "dry", gramsPerCup: 100, uncertain: "shape matters: macaroni ~105 g, penne ~90 g, orzo ~170 g" },
  { names: ["breadcrumbs", "bread crumbs", "dry breadcrumbs", "paneermeel"], category: "dry", gramsPerCup: 110 },
  { names: ["panko", "panko breadcrumbs"], category: "dry", gramsPerCup: 50, uncertain: "very light; brands vary 45–60 g" },
  { names: ["fresh breadcrumbs"], category: "dry", gramsPerCup: 50, uncertain: "depends on bread" },
  { names: ["granola"], category: "dry", gramsPerCup: 120, uncertain: "varies a lot" },

  // ── Baking extras ──────────────────────────────────────────────────────────
  { names: ["cocoa", "cocoa powder", "unsweetened cocoa", "unsweetened cocoa powder", "dutch-process cocoa", "cacao", "cacaopoeder"], category: "dry", gramsPerCup: 85 },
  { names: ["chocolate chips", "chocolate chunks", "chocoladestukjes", "chocoladedruppels", "chocolade druppels", "chocolate chip"], category: "dry", gramsPerCup: 170 },
  { names: ["chopped chocolate", "gehakte chocolade"], category: "dry", gramsPerCup: 150, uncertain: "depends on chop" },
  { names: ["baking powder", "bakpoeder"], category: "dry", gramsPerCup: 192 },
  { names: ["baking soda", "bicarbonate of soda", "bicarbonate", "zuiveringszout"], category: "dry", gramsPerCup: 288 },
  { names: ["salt", "table salt", "fine salt", "zout", "fijn zout"], category: "dry", gramsPerCup: 288, uncertain: "fine table salt; flaky/coarse salt is much lighter" },
  { names: ["kosher salt"], category: "dry", gramsPerCup: 150, uncertain: "Diamond Crystal ~135 g, Morton ~240 g per cup" },
  { names: ["sea salt flakes", "flaky salt", "maldon", "zeezoutvlokken"], category: "dry", gramsPerCup: 120, uncertain: "very variable" },
  { names: ["instant yeast", "active dry yeast", "dry yeast", "yeast", "gist", "droge gist", "instantgist"], category: "dry", gramsPerCup: 150, uncertain: "dry yeast only; fresh yeast is weighed anyway" },
  { names: ["shredded coconut", "desiccated coconut", "coconut flakes", "kokosrasp"], category: "dry", gramsPerCup: 85, uncertain: "desiccated (~85 g) vs sweetened flaked (~75 g)" },
  { names: ["raisins", "rozijnen", "sultanas", "krenten", "currants"], category: "dry", gramsPerCup: 150 },
  { names: ["dried cranberries", "gedroogde cranberries"], category: "dry", gramsPerCup: 120 },
  { names: ["chia seeds", "chiazaad"], category: "dry", gramsPerCup: 160 },
  { names: ["flaxseed", "ground flaxseed", "lijnzaad", "gemalen lijnzaad"], category: "dry", gramsPerCup: 150, uncertain: "whole ~170 g, ground ~110 g" },
  { names: ["sesame seeds", "sesamzaad"], category: "dry", gramsPerCup: 145 },
  { names: ["sunflower seeds", "zonnebloempitten", "pumpkin seeds", "pompoenpitten", "pepitas"], category: "dry", gramsPerCup: 140 },
  { names: ["poppy seeds", "maanzaad"], category: "dry", gramsPerCup: 140 },
  { names: ["ground cinnamon", "cinnamon", "kaneel", "ground spice", "paprika powder", "paprikapoeder", "smoked paprika", "gerookt paprikapoeder", "chili powder", "chili flakes", "red pepper flakes", "chilivlokken", "cumin", "ground cumin", "komijn", "ground ginger", "curry powder", "kerriepoeder", "garlic powder", "knoflookpoeder", "onion powder", "uienpoeder"], category: "dry", gramsPerCup: 125, uncertain: "ground spices vary 100–135 g; normally stay as spoons anyway" },

  // ── Nuts ───────────────────────────────────────────────────────────────────
  { names: ["chopped nuts", "nuts", "noten", "gehakte noten", "mixed nuts"], category: "dry", gramsPerCup: 120, uncertain: "depends on nut and chop size" },
  { names: ["walnuts", "chopped walnuts", "walnoten"], category: "dry", gramsPerCup: 115 },
  { names: ["pecans", "chopped pecans", "pecannoten"], category: "dry", gramsPerCup: 110 },
  { names: ["almonds", "whole almonds", "amandelen"], category: "dry", gramsPerCup: 145 },
  { names: ["sliced almonds", "flaked almonds", "amandelschaafsel"], category: "dry", gramsPerCup: 90 },
  { names: ["hazelnuts", "hazelnoten"], category: "dry", gramsPerCup: 135 },
  { names: ["peanuts", "pinda", "pindas", "pinda's", "cashews", "cashewnoten"], category: "dry", gramsPerCup: 145 },
  { names: ["pine nuts", "pijnboompitten"], category: "dry", gramsPerCup: 135 },
  { names: ["pistachios", "pistachenoten"], category: "dry", gramsPerCup: 125 },

  // ── Vegetables & fruit, when measured by the cup ──────────────────────────
  { names: ["onion", "chopped onion", "diced onion", "red onion", "yellow onion", "ui", "uien", "rode ui"], category: "dry", gramsPerCup: 160, uncertain: "chopped; only used when measured in cups" },
  { names: ["shallot", "sjalot", "sjalotten"], category: "dry", gramsPerCup: 160, uncertain: "chopped" },
  { names: ["carrot", "chopped carrot", "diced carrot", "grated carrot", "shredded carrot", "wortel", "wortelen", "winterpeen"], category: "dry", gramsPerCup: 128, uncertain: "chopped ~128 g, grated ~110 g" },
  { names: ["celery", "selderij", "bleekselderij"], category: "dry", gramsPerCup: 100 },
  { names: ["bell pepper", "red pepper", "green pepper", "paprika pepper"], category: "dry", gramsPerCup: 150, uncertain: "chopped" },
  { names: ["tomatoes", "chopped tomatoes", "diced tomatoes", "cherry tomatoes", "tomaat", "tomaten", "cherrytomaatjes"], category: "dry", gramsPerCup: 180, uncertain: "fresh chopped; canned diced with juice ~240 g" },
  { names: ["spinach", "baby spinach", "spinazie"], category: "dry", gramsPerCup: 30, uncertain: "raw, loosely packed; 25–40 g" },
  { names: ["kale", "boerenkool"], category: "dry", gramsPerCup: 20, uncertain: "raw chopped, very airy" },
  { names: ["mushrooms", "sliced mushrooms", "champignons", "paddenstoelen"], category: "dry", gramsPerCup: 70 },
  { names: ["peas", "frozen peas", "doperwten", "erwten", "doperwtjes"], category: "dry", gramsPerCup: 140 },
  { names: ["corn", "corn kernels", "sweet corn", "frozen corn", "mais", "maiskorrels"], category: "dry", gramsPerCup: 150 },
  { names: ["broccoli", "broccoli florets", "broccoliroosjes"], category: "dry", gramsPerCup: 90 },
  { names: ["cauliflower", "cauliflower florets", "bloemkool"], category: "dry", gramsPerCup: 105 },
  { names: ["zucchini", "courgette", "chopped zucchini", "grated zucchini"], category: "dry", gramsPerCup: 125, uncertain: "chopped; grated and squeezed is heavier" },
  { names: ["cabbage", "shredded cabbage", "kool", "witte kool", "rode kool", "spitskool"], category: "dry", gramsPerCup: 70 },
  { names: ["potatoes", "diced potatoes", "aardappel", "aardappelen", "aardappels"], category: "dry", gramsPerCup: 150, uncertain: "diced raw" },
  { names: ["sweet potato", "zoete aardappel"], category: "dry", gramsPerCup: 135, uncertain: "diced raw" },
  { names: ["fresh herbs", "parsley", "chopped parsley", "peterselie", "cilantro", "coriander leaves", "koriander", "basil", "basilicum", "mint", "munt", "dill", "dille"], category: "dry", gramsPerCup: 30, uncertain: "fresh chopped herbs vary 15–60 g; normally stay as spoons" },
  { names: ["blueberries", "blauwe bessen", "raspberries", "frambozen", "berries", "bessen"], category: "dry", gramsPerCup: 145, uncertain: "fresh; raspberries are lighter (~125 g)" },
  { names: ["strawberries", "aardbeien"], category: "dry", gramsPerCup: 150, uncertain: "sliced" },
  { names: ["banana", "mashed banana", "banaan", "bananen"], category: "dry", gramsPerCup: 225, uncertain: "mashed" },
  { names: ["apple", "chopped apple", "appel", "appels"], category: "dry", gramsPerCup: 125, uncertain: "chopped" },
  { names: ["chickpeas", "kikkererwten", "black beans", "zwarte bonen", "kidney beans", "kidneybonen", "white beans", "witte bonen", "cannellini beans", "butter beans", "beans"], category: "dry", gramsPerCup: 165, uncertain: "cooked/canned, drained" },
  { names: ["ground beef", "minced beef", "gehakt", "rundergehakt", "ground meat", "ground turkey", "ground pork"], category: "dry", gramsPerCup: 225, uncertain: "raw mince; usually sold by weight anyway" },
  { names: ["shredded chicken", "cooked chicken", "chopped chicken"], category: "dry", gramsPerCup: 140, uncertain: "cooked, shredded" },

  // ── Liquids (volume ↔ volume; no density) ─────────────────────────────────
  { names: ["water", "warm water", "cold water", "boiling water", "lukewarm water", "lauw water", "kokend water", "koud water"], category: "liquid" },
  { names: ["milk", "whole milk", "skim milk", "semi-skimmed milk", "melk", "volle melk", "halfvolle melk", "magere melk", "almond milk", "oat milk", "soy milk", "havermelk", "amandelmelk", "sojamelk", "plant milk"], category: "liquid" },
  { names: ["buttermilk", "karnemelk"], category: "liquid" },
  { names: ["cream", "heavy cream", "whipping cream", "double cream", "single cream", "light cream", "half-and-half", "half and half", "slagroom", "room", "kookroom", "verse room"], category: "liquid" },
  { names: ["coconut milk", "kokosmelk", "coconut cream", "kokosroom"], category: "liquid" },
  { names: ["stock", "broth", "chicken stock", "chicken broth", "beef stock", "beef broth", "vegetable stock", "vegetable broth", "bouillon", "kippenbouillon", "runderbouillon", "groentebouillon", "fond"], category: "liquid" },
  { names: ["oil", "olive oil", "extra virgin olive oil", "vegetable oil", "canola oil", "rapeseed oil", "sunflower oil", "neutral oil", "sesame oil", "peanut oil", "olie", "olijfolie", "zonnebloemolie", "arachideolie", "sesamolie", "koolzaadolie"], category: "liquid" },
  { names: ["wine", "white wine", "red wine", "dry white wine", "wijn", "witte wijn", "rode wijn", "port", "sherry", "marsala"], category: "liquid" },
  { names: ["beer", "bier", "lager", "stout"], category: "liquid" },
  { names: ["juice", "lemon juice", "lime juice", "orange juice", "apple juice", "sap", "citroensap", "limoensap", "sinaasappelsap", "appelsap"], category: "liquid" },
  { names: ["vinegar", "white vinegar", "apple cider vinegar", "cider vinegar", "red wine vinegar", "white wine vinegar", "balsamic vinegar", "rice vinegar", "azijn", "appelazijn", "wijnazijn", "balsamicoazijn", "rijstazijn"], category: "liquid" },
  { names: ["soy sauce", "sojasaus", "tamari", "ketjap", "ketjap manis", "fish sauce", "vissaus", "worcestershire sauce", "hot sauce"], category: "liquid" },
  { names: ["coffee", "espresso", "koffie", "tea", "thee"], category: "liquid" },
  { names: ["vanilla extract", "vanilla", "vanille-extract", "vanillearoma", "almond extract"], category: "liquid" },
  { names: ["tomato sauce", "tomato paste", "pasta sauce", "passata", "tomato puree", "tomatenpuree", "tomatensaus", "marinara"], category: "liquid", uncertain: "tomato paste is thick; treated as liquid (ml)" },
  { names: ["custard", "vla"], category: "liquid" },

  // ── Counted things ─────────────────────────────────────────────────────────
  { names: ["egg", "eggs", "large egg", "egg yolk", "egg white", "ei", "eieren", "eidooier", "eigeel", "eiwit"], category: "count" },
  { names: ["garlic", "garlic clove", "clove garlic", "knoflook", "teentje knoflook", "knoflookteen"], category: "count" },
  { names: ["lemon", "lime", "orange", "citroen", "limoen", "sinaasappel"], category: "count" },
  { names: ["bay leaf", "laurierblad", "laurierblaadje"], category: "count" },
  { names: ["chicken breast", "chicken thigh", "kipfilet", "kippendij"], category: "count" },
  { names: ["avocado"], category: "count" },
  { names: ["tortilla", "wrap", "tortilla's", "wraps"], category: "count" },
];

// Calorie per 100g (o 100ml per liquidi)
const CALORIE_DB = {
  // Cereali e derivati
  pasta: 357, spaghetti: 357, penne: 357, rigatoni: 357, fusilli: 357,
  tagliatelle: 357, lasagna: 357, lasagne: 357, gnocchi: 130,
  riso: 358, risotto: 130,
  pane: 265, pangrattato: 395, grissini: 431, crackers: 430,
  farina: 364, 'farina 00': 364, 'farina integrale': 340,
  polenta: 362, 'farina di mais': 362,
  'cous cous': 376, couscous: 376, orzo: 354, avena: 389, farro: 340,
  patate: 77, patata: 77,

  // Carni
  pollo: 165, 'petto di pollo': 165, 'cosce di pollo': 215,
  manzo: 250, 'carne macinata': 250, bistecca: 271,
  maiale: 242, pancetta: 458, guanciale: 655, speck: 374, lonza: 187,
  vitello: 172, agnello: 294, coniglio: 136, tacchino: 157,
  salsiccia: 339, wurstel: 290, würstel: 290,
  mortadella: 311, 'prosciutto cotto': 215, 'prosciutto crudo': 258,
  bresaola: 151, coppa: 380,

  // Pesce e frutti di mare
  salmone: 208, tonno: 116, 'tonno in scatola': 116,
  merluzzo: 82, branzino: 97, orata: 121, spigola: 97,
  gamberetti: 99, gamberi: 99, sarde: 208, acciughe: 131,
  baccala: 105, polpo: 82, calamari: 92, cozze: 86, vongole: 70,
  'pesce spada': 109, sgombro: 189, trota: 119,

  // Uova e latticini
  uova: 155, uovo: 155,
  latte: 61, 'latte intero': 61, 'latte scremato': 35,
  panna: 345, 'panna fresca': 345, 'panna da cucina': 193,
  burro: 717, margarina: 718,
  yogurt: 59, 'yogurt greco': 115,
  parmigiano: 431, 'grana padano': 384, pecorino: 387,
  mozzarella: 280, scamorza: 334, provola: 334,
  ricotta: 174, mascarpone: 429, robiola: 295,
  gorgonzola: 326, fontina: 343, emmental: 380,
  crescenza: 231, stracchino: 231, brie: 334, caciotta: 318,

  // Verdure e ortaggi
  pomodori: 18, pomodoro: 18, pomodorini: 18,
  'pomodori pelati': 24, passata: 27, 'passata di pomodoro': 27,
  'concentrato di pomodoro': 82, concentrato: 82,
  carote: 41, carota: 41,
  cipolle: 40, cipolla: 40, scalogno: 72, porro: 31,
  aglio: 149,
  spinaci: 23, bietola: 19,
  zucchine: 17, zucchina: 17,
  melanzane: 25, melanzana: 25,
  peperoni: 31, peperone: 31,
  broccoli: 34, cavolfiore: 25, cavolo: 25, 'cavolo nero': 35,
  funghi: 22, champignon: 22, porcini: 22,
  sedano: 16, finocchio: 31, cetriolo: 16,
  lattuga: 15, rucola: 25, radicchio: 23, insalata: 15,
  asparagi: 20, carciofi: 53,
  piselli: 81, fagioli: 337, lenticchie: 353, ceci: 364, fave: 341,
  mais: 86, granoturco: 86,

  // Frutta
  limone: 29, limoni: 29, arancia: 45, arance: 45,
  mela: 52, mele: 52, pera: 57, pere: 57,
  banana: 89, fragole: 32, lamponi: 52, mirtilli: 57, uva: 69,

  // Oli e condimenti
  olio: 884, 'olio di oliva': 884, "olio d'oliva": 884,
  'olio extravergine': 884, 'olio evo': 884, 'olio di semi': 900,
  aceto: 22, 'aceto balsamico': 88,
  'vino bianco': 66, 'vino rosso': 85, birra: 43,
  brodo: 15, 'brodo di carne': 15, 'brodo vegetale': 10,
  'salsa di soia': 53, maionese: 680, ketchup: 101,
  olive: 145, 'olive nere': 145, 'olive verdi': 145,

  // Spezie e aromi
  sale: 0, pepe: 251, paprika: 282,
  origano: 306, basilico: 23, prezzemolo: 36,
  rosmarino: 131, timo: 101, salvia: 315,
  cannella: 261, 'noce moscata': 525,
  zafferano: 310, curcuma: 354, menta: 70, alloro: 313,

  // Dolci e lievitazione
  zucchero: 387, 'zucchero di canna': 380, miele: 304,
  marmellata: 260, cioccolato: 546, 'cioccolato fondente': 546,
  cacao: 228, nutella: 539, fecola: 346, amido: 346,
  lievito: 105, vaniglia: 288, 'farina di mandorle': 575,

  // Frutta secca
  noci: 654, mandorle: 575, nocciole: 628, pinoli: 673,
  uvetta: 299, datteri: 277, pistacchi: 562,
};

function norm(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

const NORM_DB = Object.fromEntries(
  Object.entries(CALORIE_DB).map(([k, v]) => [norm(k), v])
);

function findCaloriesPer100g(nome) {
  if (!nome) return null;
  const key = norm(nome);
  if (NORM_DB[key] !== undefined) return NORM_DB[key];

  // Strips common adjectives and retries
  const stripped = key
    .replace(/\b(fresc[oa]|surgelat[oa]|cott[oa]|crud[oa]|secch[oa]|in scatola)\b/g, '')
    .trim();
  if (stripped !== key && NORM_DB[stripped] !== undefined) return NORM_DB[stripped];

  // Longest DB key contained in the ingredient name
  let best = null, bestLen = 0;
  for (const [dbKey, cal] of Object.entries(NORM_DB)) {
    if (key.includes(dbKey) && dbKey.length > bestLen) { best = cal; bestLen = dbKey.length; }
  }
  if (best !== null) return best;

  // Ingredient name contained in a DB key
  for (const [dbKey, cal] of Object.entries(NORM_DB)) {
    if (dbKey.includes(key) && key.length > bestLen) { best = cal; bestLen = key.length; }
  }
  return best;
}

function parseGrams(quantita, nomeLower) {
  if (!quantita) return null;
  const q = quantita.toLowerCase().trim();

  if (/q\.?b|a piacere|a gusto|a volonta/.test(q)) return null;

  let m;
  if ((m = q.match(/(\d+(?:[.,]\d+)?)\s*kg/))) return +m[1].replace(',', '.') * 1000;
  if ((m = q.match(/(\d+(?:[.,]\d+)?)\s*g(?:r(?:amm[io])?)?(?!\w)/))) return +m[1].replace(',', '.');
  if ((m = q.match(/(\d+(?:[.,]\d+)?)\s*(?:litri?|l(?!\w))/))) return +m[1].replace(',', '.') * 1000;
  if ((m = q.match(/(\d+(?:[.,]\d+)?)\s*dl/))) return +m[1].replace(',', '.') * 100;
  if ((m = q.match(/(\d+(?:[.,]\d+)?)\s*ml/))) return +m[1].replace(',', '.');
  if ((m = q.match(/(\d+(?:[.,]\d+)?)\s*cucchiaini?/))) return +m[1].replace(',', '.') * 5;
  if ((m = q.match(/(\d+(?:[.,]\d+)?)\s*cucchiai?o?/))) return +m[1].replace(',', '.') * 15;
  if ((m = q.match(/(\d+(?:[.,]\d+)?)\s*tazz[ae]/))) return +m[1].replace(',', '.') * 240;

  // Uova: ogni unità ~60g
  if (nomeLower?.match(/uov[ao]/)) {
    if ((m = q.match(/(\d+)/))) return parseInt(m[1]) * 60;
  }

  // Numero puro → grammi
  if ((m = q.match(/^(\d+(?:[.,]\d+)?)/))) return +m[1].replace(',', '.');

  return null;
}

export function calculateRecipeCalories(ingredients, portions = 4) {
  if (!ingredients || ingredients.length === 0) return null;
  const p = Math.max(1, Number(portions) || 4);

  let total = 0, found = 0;
  for (const ing of ingredients) {
    const cal100 = findCaloriesPer100g(ing.nome);
    if (cal100 === null) continue;
    const g = parseGrams(ing.quantita, ing.nome?.toLowerCase());
    if (!g || g <= 0) continue;
    total += (g / 100) * cal100;
    found++;
  }

  if (found === 0) return null;
  return {
    total: Math.round(total),
    perPortion: Math.round(total / p),
    portions: p,
  };
}

export function calorieBadgeClass(kcal) {
  if (kcal < 300) return 'cal-low';
  if (kcal < 500) return 'cal-med';
  return 'cal-high';
}

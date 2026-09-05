import { Product, CustomerTab, CartItem } from '../types';

export interface ParsedVoiceCommand {
  rawTranscript: string;
  quantity: number;
  drinkQuery: string;
  target: 'POS' | 'TAB';
  targetTabId?: string;
  targetTabName?: string;
  matchedProduct?: Product;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  couple: 2,
  pair: 2,
  dozen: 12,
};

// Common pub drink spoken aliases
const DRINK_ALIASES: Record<string, string> = {
  lager: 'Tusker Lager 500ml',
  lagers: 'Tusker Lager 500ml',
  tusker: 'Tusker Lager 500ml',
  'tusker lager': 'Tusker Lager 500ml',
  'kenya lager': 'Tusker Lager 500ml',
  malt: 'Tusker Malt 330ml',
  'tusker malt': 'Tusker Malt 330ml',
  cider: 'Tusker Cider 500ml',
  ciders: 'Tusker Cider 500ml',
  'tusker cider': 'Tusker Cider 500ml',
  'apple cider': 'Tusker Cider 500ml',
  'white cap': 'White Cap Crisp 500ml',
  whitecap: 'White Cap Crisp 500ml',
  'white cap crisp': 'White Cap Crisp 500ml',
  guinness: 'Guinness Foreign Extra Stout 500ml',
  stout: 'Guinness Foreign Extra Stout 500ml',
  heineken: 'Heineken Lager 500ml',
  'heineken lager': 'Heineken Lager 500ml',
  jameson: 'Jameson Irish Whiskey 750ml',
  whiskey: 'Jameson Irish Whiskey 750ml',
  whisky: 'Jameson Irish Whiskey 750ml',
  'black label': 'Johnnie Walker Black Label 750ml',
  'johnnie walker': 'Johnnie Walker Black Label 750ml',
  'captain morgan': 'Captain Morgan Spiced Gold 750ml',
  rum: 'Captain Morgan Spiced Gold 750ml',
  smirnoff: 'Smirnoff Red Vodka 750ml',
  vodka: 'Smirnoff Red Vodka 750ml',
  gin: "Gordon's London Dry Gin 750ml",
  gordon: "Gordon's London Dry Gin 750ml",
  gordons: "Gordon's London Dry Gin 750ml",
  dawa: 'Dawa Cocktail',
  'dawa cocktail': 'Dawa Cocktail',
  mojito: 'Mojito Highball',
  'red bull': 'Red Bull Energy Drink 250ml',
  coke: 'Coca-Cola 300ml Glass',
  'coca cola': 'Coca-Cola 300ml Glass',
  soda: 'Coca-Cola 300ml Glass',
  water: 'Still Mineral Water 500ml',
  'mineral water': 'Still Mineral Water 500ml',
};

/**
 * Parse a natural language voice string such as:
 * - "Add two lagers to tab"
 * - "Add 2 lagers to tab"
 * - "Add two lagers to pos"
 * - "Add three tuskers to tab Tyrion"
 * - "Put 2 ciders on tab"
 */
export function parseVoiceOrder(
  transcript: string,
  products: Product[],
  tabs: CustomerTab[],
  fallbackTarget: 'POS' | 'TAB' = 'TAB',
  selectedTabId?: string | null
): ParsedVoiceCommand | null {
  if (!transcript || !transcript.trim()) return null;

  let text = transcript.toLowerCase().trim();
  // Strip trailing punctuation
  text = text.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');

  // 1. Determine Target (TAB vs POS)
  let target: 'POS' | 'TAB' = fallbackTarget;
  let tabNameHint: string | undefined;

  const tabRegex = /\b(?:to|on|onto|for)\s+(?:the\s+)?tab(?:\s+(?:for|of|to)?\s*([a-z0-9\s]+))?\b/i;
  const posRegex = /\b(?:to|in|into|on)\s+(?:the\s+)?(?:pos|cart|register|order|bill)\b/i;

  const tabMatch = text.match(tabRegex);
  const posMatch = text.match(posRegex);

  if (tabMatch) {
    target = 'TAB';
    if (tabMatch[1] && tabMatch[1].trim()) {
      tabNameHint = tabMatch[1].trim();
    }
  } else if (posMatch) {
    target = 'POS';
  }

  // 2. Extract Quantity
  let quantity = 1;

  // Look for number words e.g. "two lagers", "a couple of lagers"
  const coupleMatch = text.match(/\b(?:a\s+)?couple(?:\s+of)?\b/i);
  if (coupleMatch) {
    quantity = 2;
    text = text.replace(coupleMatch[0], ' ');
  } else {
    // Check digits
    const digitMatch = text.match(/\b(\d+)\b/);
    if (digitMatch) {
      quantity = Math.max(1, parseInt(digitMatch[1], 10));
      text = text.replace(digitMatch[0], ' ');
    } else {
      // Check number words
      for (const [word, val] of Object.entries(NUMBER_WORDS)) {
        const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
        if (wordRegex.test(text)) {
          // Avoid matching "a" if it's inside another word
          if (word === 'a' || word === 'an') {
            // Only if followed by product query
            quantity = 1;
          } else {
            quantity = val;
          }
          text = text.replace(wordRegex, ' ');
          break;
        }
      }
    }
  }

  // 3. Clean up command keywords to isolate drink query
  let cleaned = text
    .replace(/\b(?:add|please add|can you add|put|pour|ring up|give me|order|charge|enter)\b/gi, ' ')
    .replace(/\b(?:bottles?|cans?|glasses?|pints?|shots?|drinks?)\s+(?:of\s+)?/gi, ' ')
    .replace(tabRegex, ' ')
    .replace(posRegex, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If there was a tab customer name captured, strip it from query
  if (tabNameHint && cleaned.includes(tabNameHint)) {
    cleaned = cleaned.replace(tabNameHint, '').trim();
  }

  const drinkQuery = cleaned;

  // 4. Match to product
  let matchedProduct: Product | undefined;

  // Check alias dictionary
  if (DRINK_ALIASES[drinkQuery]) {
    const targetName = DRINK_ALIASES[drinkQuery].toLowerCase();
    matchedProduct = products.find((p) => p.name.toLowerCase() === targetName);
  }

  // If not matched, try token matches in aliases
  if (!matchedProduct) {
    for (const [alias, canonicalName] of Object.entries(DRINK_ALIASES)) {
      if (drinkQuery.includes(alias) || alias.includes(drinkQuery)) {
        matchedProduct = products.find(
          (p) => p.name.toLowerCase() === canonicalName.toLowerCase()
        );
        if (matchedProduct) break;
      }
    }
  }

  // If not matched, match against products list directly
  if (!matchedProduct) {
    matchedProduct = products.find((p) => {
      const pName = p.name.toLowerCase();
      const pCategory = p.category.toLowerCase();
      return (
        pName.includes(drinkQuery) ||
        drinkQuery.includes(pName) ||
        (drinkQuery.length > 2 && pName.startsWith(drinkQuery)) ||
        (drinkQuery === 'beer' && pCategory === 'beer')
      );
    });
  }

  // Fallback default: if user said "lagers" or "lager" or "beer", default to Tusker Lager
  if (!matchedProduct && (drinkQuery.includes('lager') || drinkQuery.includes('beer'))) {
    matchedProduct =
      products.find((p) => p.name.toLowerCase().includes('tusker lager')) ||
      products.find((p) => p.category === 'BEER');
  }

  // 5. Match Target Tab if Target is 'TAB'
  let targetTabId: string | undefined;
  let targetTabName: string | undefined;

  if (target === 'TAB') {
    const openTabs = tabs.filter((t) => t.status === 'OPEN');
    if (tabNameHint) {
      const matchedTab = openTabs.find((t) =>
        t.customerName.toLowerCase().includes(tabNameHint!.toLowerCase())
      );
      if (matchedTab) {
        targetTabId = matchedTab.id;
        targetTabName = matchedTab.customerName;
      }
    }

    if (!targetTabId) {
      // Use currently selected tab if valid and open
      if (selectedTabId) {
        const found = openTabs.find((t) => t.id === selectedTabId);
        if (found) {
          targetTabId = found.id;
          targetTabName = found.customerName;
        }
      }

      // Or pick the most active/first open tab
      if (!targetTabId && openTabs.length > 0) {
        targetTabId = openTabs[0].id;
        targetTabName = openTabs[0].customerName;
      }
    }
  }

  return {
    rawTranscript: transcript,
    quantity,
    drinkQuery,
    target,
    targetTabId,
    targetTabName,
    matchedProduct,
  };
}

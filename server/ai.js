import OpenAI from 'openai';

const categories = ['escalator_lift', 'safety', 'crowding', 'ticketing', 'cleanliness', 'other'];
const patterns = {
  escalator_lift: /escalator|lift|elevator|jinna|सरकता जिना|जिना|लिफ्ट/i,
  safety: /railing|fire|smoke|shock|wire|fight|theft|chor|aag|आग/i,
  crowding: /crowd|rush|bheed|gardi|dhakka|गर्दी|भीड़/i,
  ticketing: /ticket|upi|card|qr|machine|recharge|टिकट|तिकिट/i,
  cleanliness: /dirty|garbage|kachra|ganda|smell|spill|toilet|कचरा/i,
};

const contains = (text, words) => words.some((word) => new RegExp(word, 'i').test(text));

export function keywordFallback(text) {
  let category = 'other';
  for (const [name, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) { category = name; break; }
  }
  return {
    category,
    danger: contains(text, ['stuck', 'trapped', 'adakle', 'fell', 'padla', 'injury', 'blood', 'fire', 'smoke', 'wet', 'slippery', 'broken', 'अडकले']),
    vulnerable: contains(text, ['elderly', 'old', 'mhatare', 'buzurg', 'child', 'baby', 'bacha', 'wheelchair', 'pregnant', 'म्हातारे']),
    crowded: contains(text, ['crowd', 'rush', 'bheed', 'gardi', 'packed', 'गर्दी', 'भीड़']),
    emergency: contains(text, ['stuck', 'trapped', 'adakle', 'fire', 'smoke', 'aag', 'injury', 'blood', 'fell']),
    summary: text.slice(0, 80),
  };
}

function validateAnalysis(value, originalText) {
  if (!value || !categories.includes(value.category)) throw new Error('Invalid AI category');
  return {
    category: value.category,
    danger: value.danger === true,
    vulnerable: value.vulnerable === true,
    crowded: value.crowded === true,
    emergency: value.emergency === true,
    summary: typeof value.summary === 'string' ? value.summary.slice(0, 160) : originalText.slice(0, 80),
  };
}

let client;
export async function classifyReport(text) {
  if (!process.env.OPENAI_API_KEY) return keywordFallback(text);
  try {
    client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 8000, maxRetries: 0 });
    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      instructions: 'Understand a Pune Metro commuter complaint. Return only a JSON object with category (one of escalator_lift, safety, crowding, ticketing, cleanliness, other), danger, vulnerable, crowded, emergency (booleans), and a concise English summary. Do not return priority or any extra fields. Mark emergency only for immediate danger such as someone trapped, fire, smoke, injury, blood, or a fall.',
      input: text,
      text: { format: { type: 'json_object' } },
    }, { signal: AbortSignal.timeout(8000) });
    return validateAnalysis(JSON.parse(response.output_text), text);
  } catch {
    return keywordFallback(text);
  }
}

const patterns = {
  escalator_lift: /escalator|lift|elevator|jinna|जिना|लिफ्ट/i,
  safety: /railing|fire|smoke|shock|wire|fight|theft|chor|aag|आग/i,
  crowding: /crowd|rush|bheed|gardi|dhakka|गर्दी|भीड़/i,
  ticketing: /ticket|upi|card|qr|machine|recharge|तिकिट/i,
  cleanliness: /dirty|garbage|kachra|ganda|smell|spill|toilet|कचरा/i,
};

const contains = (text, words) => words.some((word) => new RegExp(word, 'i').test(text));

export function classifyReport(text) {
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

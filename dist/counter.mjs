/** Normalize CRLF and CR so every explicit line break counts once. */
export function normalizeText(text = '') {
  return String(text ?? '').replace(/\r\n?/g, '\n');
}

/** Count Unicode code points, rather than UTF-16 code units. */
export function countCharacters(text = '') {
  let count = 0;
  for (const character of normalizeText(text)) count += 1;
  return count;
}

const whiteSpace = /\p{White_Space}/u;
const hiragana = /\p{Script=Hiragana}/u;
const katakana = /\p{Script=Katakana}|[\u30fc\uff70\uff9e\uff9f]/u;
const kanji = /\p{Script=Han}/u;
const latin = /\p{Script=Latin}/u;
const digits = /\p{Decimal_Number}/u;
const englishAlphanumeric = /[\p{Script=Latin}0-9\uff10-\uff19]/u;
const variationSelector = /[\ufe00-\ufe0f\u{e0100}-\u{e01ef}]/u;

/**
 * All metrics use CRLF/CR-normalized text and count Unicode code points.
 * A combined emoji can therefore contain several counted characters.
 *
 * English words: whitespace-delimited tokens containing at least one Latin
 * letter or ASCII/fullwidth digit. Punctuation alone does not create a word;
 * a hyphenated token stays one word. Numeric tokens count as words.
 * Character types exclude Unicode whitespace and form a disjoint partition of
 * withoutSpacesAndBreaks. Prolonged kana marks count as katakana.
 * Paragraphs are nonempty blocks separated by one or more blank lines.
 * Manuscript pages are a simple 400-character estimate, excluding LF only.
 * UTF-8 byte length uses normalized line endings, with no byte-order mark.
 * UTF-16 byte length counts code units, with normalized LF and no BOM.
 * Reading/speaking estimates count kana and Han characters at 600/300 per
 * minute, plus English words at 200/150 per minute, rounded up to seconds.
 */
export function analyzeText(text = '') {
  const normalized = normalizeText(text);
  const characterTypes = {
    hiragana: 0,
    katakana: 0,
    kanji: 0,
    latin: 0,
    digits: 0,
    other: 0,
  };
  let characters = 0;
  let spaces = 0;
  let breaks = 0;
  let variationSelectors = 0;

  for (const character of normalized) {
    characters += 1;
    if (variationSelector.test(character)) variationSelectors += 1;
    if (character === '\n') {
      breaks += 1;
      continue;
    }
    if (whiteSpace.test(character)) {
      spaces += 1;
      continue;
    }
    if (hiragana.test(character)) characterTypes.hiragana += 1;
    else if (katakana.test(character)) characterTypes.katakana += 1;
    else if (kanji.test(character)) characterTypes.kanji += 1;
    else if (latin.test(character)) characterTypes.latin += 1;
    else if (digits.test(character)) characterTypes.digits += 1;
    else characterTypes.other += 1;
  }

  let paragraphs = 0;
  let inParagraph = false;
  for (const line of normalized.split('\n')) {
    if (/[^\p{White_Space}]/u.test(line)) {
      if (!inParagraph) paragraphs += 1;
      inParagraph = true;
    } else {
      inParagraph = false;
    }
  }

  const withoutBreaks = characters - breaks;
  const words = normalized.split(/\p{White_Space}+/u).filter(token => englishAlphanumeric.test(token)).length;
  const japaneseCharacters = characterTypes.hiragana + characterTypes.katakana + characterTypes.kanji;
  return {
    characters,
    withoutSpaces: characters - spaces,
    withoutBreaks,
    withoutSpacesAndBreaks: characters - spaces - breaks,
    lines: normalized.length ? breaks + 1 : 0,
    words,
    paragraphs,
    utf8Bytes: new TextEncoder().encode(normalized).length,
    utf16Bytes: normalized.length * 2,
    manuscriptPages: Math.ceil(withoutBreaks / 400),
    variationSelectors,
    readingSeconds: Math.ceil(japaneseCharacters / 10 + words * 0.3),
    speakingSeconds: Math.ceil(japaneseCharacters / 5 + words * 0.4),
    characterTypes,
  };
}

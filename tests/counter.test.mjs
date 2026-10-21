import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeText, countCharacters, normalizeText } from '../dist/counter.mjs';

test('empty input reports zero for every metric', () => {
  assert.deepEqual(analyzeText(''), {
    characters: 0, withoutSpaces: 0, withoutBreaks: 0,
    withoutSpacesAndBreaks: 0, lines: 0, words: 0, paragraphs: 0,
    utf8Bytes: 0, utf16Bytes: 0, manuscriptPages: 0, variationSelectors: 0,
    readingSeconds: 0, speakingSeconds: 0,
    characterTypes: { hiragana: 0, katakana: 0, kanji: 0, latin: 0, digits: 0, other: 0 },
  });
});

test('CRLF and CR normalize to a single LF', () => {
  const windows = 'あ\r\nい\rう\n';
  assert.equal(normalizeText(windows), 'あ\nい\nう\n');
  const result = analyzeText(windows);
  assert.equal(result.characters, 6);
  assert.equal(result.withoutSpaces, 6);
  assert.equal(result.withoutBreaks, 3);
  assert.equal(result.withoutSpacesAndBreaks, 3);
  assert.equal(result.lines, 4);
  assert.equal(result.utf8Bytes, 12);
});

test('counts astral characters once and combined emoji by code point', () => {
  const result = analyzeText('𠮷😊👩‍💻');
  assert.equal(result.characters, 5);
  assert.equal(result.characterTypes.kanji, 1);
  assert.equal(result.characterTypes.other, 4);
  assert.equal(result.utf8Bytes, 19);
  assert.equal(countCharacters('𠮷\r\n😊'), 3);
});

test('removes halfwidth/fullwidth spaces, tabs, and Unicode whitespace independently of LF', () => {
  const result = analyzeText('a b\t　\u00a0\u2009\u2028\nあ');
  assert.equal(result.characters, 10);
  assert.equal(result.withoutSpaces, 4);
  assert.equal(result.withoutBreaks, 9);
  assert.equal(result.withoutSpacesAndBreaks, 3);
  assert.equal(result.lines, 2);
  assert.equal(result.characterTypes.latin, 2);
  assert.equal(result.characterTypes.hiragana, 1);
});

test('classifies Japanese, fullwidth Latin/digits, and Unicode Latin letters', () => {
  const result = analyzeText('あアーｶﾞ漢𠮷AＡé1１！');
  assert.deepEqual(result.characterTypes, {
    hiragana: 1, katakana: 4, kanji: 2, latin: 3, digits: 2, other: 1,
  });
  assert.equal(result.characters, 13);
  assert.equal(Object.values(result.characterTypes).reduce((sum, count) => sum + count, 0), result.withoutSpacesAndBreaks);
});

test('English word count uses whitespace tokens containing Latin letters or English digits', () => {
  const result = analyzeText("Hello, world! don't re-enter 123 日本語 ＡＢＣ\n café ...");
  assert.equal(result.words, 7);
  assert.equal(analyzeText('日本語だけです。').words, 0);
  assert.equal(analyzeText('123 ... ！').words, 1);
  assert.equal(analyzeText('１２３ ... ！').words, 1);
});

test('paragraphs are blocks separated by blank lines and ignore whitespace-only blocks', () => {
  const result = analyzeText('\n first\nsecond\n　\nthird\n\n\nfourth\n');
  assert.equal(result.paragraphs, 3);
  assert.equal(result.lines, 9);
  assert.equal(analyzeText(' \t\n　\n').paragraphs, 0);
});

test('400-character pages exclude LF but preserve spaces and use code points', () => {
  assert.equal(analyzeText('😊'.repeat(400) + '\n').manuscriptPages, 1);
  assert.equal(analyzeText('😊'.repeat(400) + '\n ').manuscriptPages, 2);
  assert.equal(analyzeText('\n\n').manuscriptPages, 0);
});

test('UTF-8 length reflects actual encoded Japanese, ASCII, and emoji bytes', () => {
  assert.equal(analyzeText('aあ😊').utf8Bytes, 8);
  assert.equal(analyzeText('é').utf8Bytes, 2);
});

test('UTF-16 length includes surrogate pairs, normalizes CRLF, and adds no BOM', () => {
  assert.equal(analyzeText('aあ😊\r\n').utf16Bytes, 10);
});

test('counts both BMP and supplementary variation selectors independently', () => {
  const result = analyzeText('✈️葛\u{e0100}');
  assert.equal(result.variationSelectors, 2);
  assert.equal(result.characters, 4);
  assert.equal(result.utf16Bytes, 10);
});

test('reading and speaking times combine Japanese and English rates', () => {
  const result = analyzeText('あ'.repeat(600) + '\n' + 'hello '.repeat(200));
  assert.equal(result.readingSeconds, 120);
  assert.equal(result.speakingSeconds, 200);
  assert.equal(analyzeText('あ').readingSeconds, 1);
  assert.equal(analyzeText('...😊').readingSeconds, 0);
});

test('all-whitespace input keeps line/character counts but has no words or character types', () => {
  const result = analyzeText(' \n\t　');
  assert.equal(result.characters, 4);
  assert.equal(result.lines, 2);
  assert.equal(result.withoutSpaces, 1);
  assert.equal(result.withoutBreaks, 3);
  assert.equal(result.withoutSpacesAndBreaks, 0);
  assert.equal(result.words, 0);
  assert.equal(result.paragraphs, 0);
  assert.equal(Object.values(result.characterTypes).reduce((sum, count) => sum + count, 0), 0);
});

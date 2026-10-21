import Encoding from './vendor/encoding.mjs';

/** Legacy encodings use LF line endings; unsupported characters become '?'. */
export function encodingBytes(text = '') {
  const normalized = String(text ?? '').replace(/\r\n?/g, '\n');
  const source = Encoding.stringToCode(normalized);
  let unrepresentable = false;
  function byteLength(to) {
    try {
      return Encoding.convert(source, {to, from:'UNICODE', type:'array', fallback:'error'}).length;
    } catch {
      unrepresentable = true;
      return Encoding.convert(source, {to, from:'UNICODE', type:'array'}).length;
    }
  }
  const shiftJis = byteLength('SJIS');
  const eucJp = byteLength('EUCJP');
  const jis = byteLength('JIS');
  return {shiftJis, eucJp, jis, unrepresentable};
}

/** Convert only the requested scripts/width; unrelated text stays unchanged. */
export function transformText(text = '', type) {
  const value = String(text ?? '');
  // Canonically compose kana dakuten without normalizing unrelated symbols.
  const composeKana = input => input.replace(/[\u3041-\u3096\u30a1-\u30fa][\u3099\u309a]/g, match => match.normalize('NFC'));
  switch (type) {
    case 'halfwidth':
      return Encoding.toHankakuSpace(Encoding.toHankakuCase(Encoding.toHankanaCase(composeKana(value))));
    case 'fullwidth':
      return Encoding.toZenkakuSpace(Encoding.toZenkakuCase(Encoding.toZenkanaCase(composeKana(value))));
    case 'hiragana':
      return Encoding.toHiraganaCase(Encoding.toZenkanaCase(composeKana(value)));
    case 'katakana':
      return Encoding.toKatakanaCase(Encoding.toZenkanaCase(composeKana(value)));
    default:
      return value;
  }
}

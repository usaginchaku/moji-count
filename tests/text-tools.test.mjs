import assert from 'node:assert/strict';
import test from 'node:test';
import {encodingBytes, transformText} from '../dist/text-tools.mjs';

test('empty and ASCII byte counts', () => {
  assert.deepEqual(encodingBytes(''), {shiftJis:0,eucJp:0,jis:0,unrepresentable:false});
  assert.deepEqual(encodingBytes('ABC 123'), {shiftJis:7,eucJp:7,jis:7,unrepresentable:false});
});
test('Japanese byte counts include JIS escape sequences', () => {
  assert.deepEqual(encodingBytes('あいう'), {shiftJis:6,eucJp:6,jis:12,unrepresentable:false});
});
test('line endings normalize to LF', () => {
  assert.deepEqual(encodingBytes('A\r\nB\rC'), encodingBytes('A\nB\nC'));
  assert.deepEqual(encodingBytes('A\r\nB\rC'), {shiftJis:5,eucJp:5,jis:5,unrepresentable:false});
});
test('halfwidth kana encode differently', () => {
  const bytes = encodingBytes('ｱｲｳ');
  assert.equal(bytes.shiftJis, 3);
  assert.equal(bytes.eucJp, 6);
  assert.equal(bytes.jis, 9);
  assert.equal(bytes.unrepresentable, false);
});
test('unsupported supplementary emoji is replaced once and flagged', () => {
  assert.deepEqual(encodingBytes('A🍣B'), {shiftJis:3,eucJp:3,jis:3,unrepresentable:true});
  assert.deepEqual(encodingBytes('A𠮷B'), {shiftJis:3,eucJp:3,jis:3,unrepresentable:true});
});
test('literal question mark is representable', () => {
  assert.equal(encodingBytes('?').unrepresentable, false);
});
test('fullwidth conversion includes ASCII, spaces, voiced kana', () => {
  assert.equal(transformText('ABC 123 ｶﾞｯﾂﾎﾟｰｽﾞ!\n漢字🍣','fullwidth'), 'ＡＢＣ　１２３　ガッツポーズ！\n漢字🍣');
});
test('halfwidth conversion preserves hiragana and unrelated Unicode', () => {
  assert.equal(transformText('ＡＢＣ　１２３　ガッツポーズ！\nひらがな漢字🍣','halfwidth'), 'ABC 123 ｶﾞｯﾂﾎﾟｰｽﾞ!\nひらがな漢字🍣');
});
test('hiragana conversion supports halfwidth voiced kana', () => {
  assert.equal(transformText('ｳﾞｨｵﾘﾝ ガギグゲゴ パピプペポ ABC🍣','hiragana'), 'ゔぃおりん がぎぐげご ぱぴぷぺぽ ABC🍣');
});
test('katakana conversion supports voiced hiragana and halfwidth kana', () => {
  assert.equal(transformText('ゔぃおりん ぱぴぷぺぽ ｶﾞ ABC🍣','katakana'), 'ヴィオリン パピプペポ ガ ABC🍣');
});
test('decomposed dakuten is composed during kana conversion', () => {
  assert.equal(transformText('カ\u3099 ハ\u309a','halfwidth'), 'ｶﾞ ﾊﾟ');
  assert.equal(transformText('か\u3099 は\u309a','katakana'), 'ガ パ');
});
test('unknown transform is a no-op and null is safe', () => {
  assert.equal(transformText('abc','unknown'), 'abc');
  assert.equal(transformText(null,'fullwidth'), '');
});

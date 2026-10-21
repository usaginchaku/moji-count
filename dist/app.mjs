import { analyzeText, countCharacters } from './counter.mjs';
import { encodingBytes, transformText } from './text-tools.mjs';
import './mobile.mjs';

const $ = id => document.getElementById(id);
const text = $('text');
const formatter = new Intl.NumberFormat('ja-JP');
const storageKey = 'moji-draft-v1';
let mode = 'characters';
let metrics = analyzeText('');
let countedText = '';
let timer;
let undoText = null;
let toastTimer;
let composing = false;
let replacing = false;

function toast(message, undo = false) {
  clearTimeout(toastTimer);
  $('toast-message').textContent = message;
  $('undo').hidden = !undo;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, undo ? 12000 : 4200);
}

function saveDraft() {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({text:text.value, mode, goal:$('goal').value, realtime:$('realtime').checked}));
  } catch { /* Counting remains available if storage is disabled or full. */ }
}

function updateActions() {
  const empty = !text.value.length;
  for (const id of ['copy','download','clear']) $(id).disabled = empty;
  document.querySelectorAll('[data-transform]').forEach(button => { button.disabled = empty; });
}

function showDuration(prefix, seconds) {
  if (seconds < 60) {
    $(prefix + '-time').textContent = formatter.format(seconds);
    $(prefix + '-unit').textContent = '秒';
  } else {
    const minutes = Math.ceil(seconds / 60);
    $(prefix + '-time').textContent = formatter.format(minutes);
    $(prefix + '-unit').textContent = '分';
  }
}

function updateGoal() {
  const goal = Number($('goal').value);
  const active = Number.isInteger(goal) && goal > 0 && goal <= 9999999;
  const count = metrics[mode];
  const percent = active ? count / goal * 100 : 0;
  const progress = $('goal-progress');
  progress.firstElementChild.style.width = `${Math.min(percent, 100)}%`;
  progress.setAttribute('aria-valuenow', String(Math.min(100, Math.round(percent))));
  progress.setAttribute('aria-valuetext', active ? `${formatter.format(count)} / ${formatter.format(goal)}文字` : '目標未設定');
  const difference = goal - count;
  $('goal-remaining').textContent = !active ? '—' : difference === 0 ? '目標達成' : difference > 0 ? `あと ${formatter.format(difference)} 文字` : `${formatter.format(-difference)} 文字オーバー`;
  $('goal-percent').textContent = `${formatter.format(Math.round(percent))}%`;
  document.querySelector('.goal-panel').classList.toggle('over-goal', active && difference < 0);
}

function updateLegacyBytes() {
  if (!$('advanced').open) return;
  const bytes = encodingBytes(countedText);
  $('shift-jis').textContent = formatter.format(bytes.shiftJis);
  $('euc-jp').textContent = formatter.format(bytes.eucJp);
  $('jis').textContent = formatter.format(bytes.jis);
  $('encoding-note').hidden = !bytes.unrepresentable;
}

function render() {
  $('main-count').textContent = formatter.format(metrics[mode]);
  const digits = String(metrics[mode]).length;
  $('main-count').style.fontSize = digits > 6 ? '30px' : digits > 4 ? '48px' : '';
  document.querySelectorAll('[data-stat]').forEach(element => { element.textContent = formatter.format(metrics[element.dataset.stat]); });
  document.querySelectorAll('[data-type]').forEach(element => { element.textContent = formatter.format(metrics.characterTypes[element.dataset.type]); });
  document.querySelectorAll('[data-mode]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.mode === mode)); });
  showDuration('reading', metrics.readingSeconds);
  showDuration('speaking', metrics.speakingSeconds);
  updateGoal();
}

function count() {
  clearTimeout(timer);
  countedText = text.value;
  metrics = analyzeText(countedText);
  render();
  updateLegacyBytes();
}

function onInput() {
  if (!replacing) {
    undoText = null;
    if (!$('undo').hidden) $('toast').hidden = true;
  }
  updateActions();
  updateSelection();
  clearTimeout(timer);
  if ($('realtime').checked && !composing) {
    timer = setTimeout(count, text.value.length > 50000 ? 220 : 50);
  }
  saveDraft();
}

function replaceText(value) {
  undoText = text.value;
  text.value = value;
  replacing = true;
  text.dispatchEvent(new Event('input', {bubbles:true}));
  replacing = false;
  count();
  text.focus();
  updateSelection();
}

function updateSelection() {
  const selected = text.value.slice(text.selectionStart, text.selectionEnd);
  $('selection-count').textContent = selected ? `選択中 ${formatter.format(countCharacters(selected))} 文字` : '';
}

try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey));
  if (saved && typeof saved.text === 'string') {
    text.value = saved.text;
    if (['characters','withoutBreaks','withoutSpacesAndBreaks'].includes(saved.mode)) mode = saved.mode;
    if (typeof saved.goal === 'string') $('goal').value = saved.goal;
    if (typeof saved.realtime === 'boolean') $('realtime').checked = saved.realtime;
  }
} catch { /* A fresh editor is safe when a saved draft cannot be read. */ }

text.addEventListener('input', onInput);
text.addEventListener('compositionstart', () => { composing = true; });
text.addEventListener('compositionend', () => { composing = false; onInput(); });
text.addEventListener('select', updateSelection);
text.addEventListener('keyup', updateSelection);
text.addEventListener('pointerup', updateSelection);
document.addEventListener('selectionchange', () => { if (document.activeElement === text) updateSelection(); });

$('realtime').addEventListener('change', () => {
  clearTimeout(timer);
  $('count-now').hidden = $('realtime').checked;
  if ($('realtime').checked) count();
  saveDraft();
});
$('count-now').addEventListener('click', count);
$('count-now').hidden = $('realtime').checked;

document.querySelectorAll('[data-mode]').forEach(button => {
  button.addEventListener('click', () => { mode = button.dataset.mode; render(); saveDraft(); });
});
$('goal').addEventListener('input', () => { updateGoal(); saveDraft(); });
$('goal').addEventListener('change', () => {
  if ($('goal').value && (!$('goal').checkValidity() || Number($('goal').value) < 1)) $('goal').value = '';
  updateGoal(); saveDraft();
});
$('advanced').addEventListener('toggle', () => { if ($('advanced').open) { if ($('realtime').checked) count(); else updateLegacyBytes(); } });

$('clear').addEventListener('click', () => {
  replaceText('');
  toast('テキストをクリアしました', true);
});
$('undo').addEventListener('click', () => {
  if (undoText !== null) {
    const restored = undoText;
    replaceText(restored);
    undoText = null;
    toast('元に戻しました');
  }
});

$('paste').addEventListener('click', async () => {
  try {
    if (!navigator.clipboard?.readText) throw new Error('unavailable');
    const value = await navigator.clipboard.readText();
    if (!value) { toast('クリップボードが空です'); return; }
    const start = text.selectionStart;
    const end = text.selectionEnd;
    replaceText(text.value.slice(0, start) + value + text.value.slice(end));
    text.setSelectionRange(start + value.length, start + value.length);
    toast('貼り付けました', true);
  } catch {
    text.focus();
    toast('入力欄から貼り付けてください');
  }
});

$('copy').addEventListener('click', async () => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text.value);
    } else {
      const start = text.selectionStart;
      const end = text.selectionEnd;
      text.select();
      const copied = document.execCommand('copy');
      text.setSelectionRange(start, end);
      if (!copied) throw new Error('unavailable');
    }
    toast('コピーしました');
  } catch {
    text.select();
    toast('テキストを選択しました。端末のコピー操作を使ってください');
  }
});

$('download').addEventListener('click', () => {
  const blob = new Blob([text.value], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'moji.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('テキストをダウンロードしました');
});

function closeTransform() {
  $('transform-menu').hidden = true;
  $('transform-toggle').setAttribute('aria-expanded', 'false');
}
$('transform-toggle').addEventListener('click', () => {
  const opening = $('transform-menu').hidden;
  $('transform-menu').hidden = !opening;
  $('transform-toggle').setAttribute('aria-expanded', String(opening));
  if (opening) $('transform-menu').querySelector('button:not(:disabled)')?.focus();
});
document.addEventListener('click', event => { if (!event.target.closest('.transform-wrap')) closeTransform(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('transform-menu').hidden) { closeTransform(); $('transform-toggle').focus(); }
});
document.querySelectorAll('[data-transform]').forEach(button => {
  button.addEventListener('click', () => {
    closeTransform();
    const converted = transformText(text.value, button.dataset.transform);
    if (converted === text.value) { toast('変換する文字がありません'); return; }
    replaceText(converted);
    toast('変換しました', true);
  });
});

window.addEventListener('pagehide', saveDraft);
updateActions();
count();

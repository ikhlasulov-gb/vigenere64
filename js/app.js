(function (global, document) {
  'use strict';

  var A_CODE = 97;
  var ALPHABET_SIZE = 26;
  var KEY = 'islam';
  var ROT_OFFSET = 1;
  var TARGET_LENGTH = 10;

  var EM_DASH = '\u2014';
  var COPY_RESET_MS = 1500;
  var COPY_LABEL_OK = 'Скопировано';
  var DEBOUNCE_MS = 80;
  var HIDDEN_OFFSET = '-9999px';

  var TAB_NAMES = ['vigenere', 'base64'];
  var PLACEHOLDER_STEPS = '<span class="stepline muted">Введите фразу, чтобы увидеть шаги</span>';

  var lastResults = {
    'pre-vig': '',
    'cipher-vig': '',
    'b64-out': ''
  };
  var copyTimers = {};
  var debounceTimers = {};

  var FIELD_CONFIGS = {
    vig: {
      inputId: 'input-vig',
      errId: 'err-vig',
      outputs: [
        { id: 'pre-vig', kind: 'pre' },
        { id: 'cipher-vig', kind: 'cipher' }
      ],
      stepsId: 'steps-vig'
    }
  };

  var INPUT_HANDLERS = {
    'input-vig': null,
    'input-b64': null
  };

  function isLetter(ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
  }

  function isSpecial(ch) {
    return !isLetter(ch);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function vigenereRot1(plaintext, key) {
    var out = '';
    var keyIdx = 0;
    for (var i = 0; i < plaintext.length; i++) {
      var ch = plaintext.charAt(i);
      if (ch >= 'a' && ch <= 'z') {
        var p = ch.charCodeAt(0) - A_CODE;
        var k = key.charCodeAt(keyIdx % key.length) - A_CODE;
        out += String.fromCharCode(A_CODE + (p + k + ROT_OFFSET) % ALPHABET_SIZE);
        keyIdx++;
      } else {
        out += ch;
      }
    }
    return out;
  }

  function toBase64(str) {
    try {
      return global.btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      return '';
    }
  }

  function validateVig(input) {
    var trimmed = String(input).trim();
    if (!trimmed) return { error: 'Введите фразу.' };
    if (/\s/.test(trimmed)) {
      return { error: 'Пробелы запрещены. Используйте только строчные a-z, цифры и спецзнаки.' };
    }
    if (/[^\x20-\x7E]/.test(trimmed)) {
      return { error: 'Разрешён только латинский алфавит. Кириллица, умлауты и другие не-ASCII символы не допускаются.' };
    }
    if (/[A-Z]/.test(trimmed)) {
      return { error: 'Заглавные буквы запрещены. Используйте только строчные a-z.' };
    }
    return { value: trimmed };
  }

  function shiftToLength(word) {
    var initialLen = word.length;
    var original = word;
    var removed = 0;
    while (word.length > TARGET_LENGTH) {
      var specialIdx = -1;
      for (var i = 0; i < word.length; i++) {
        if (isSpecial(word.charAt(i))) { specialIdx = i; break; }
      }
      if (specialIdx > 0) {
        word = word.slice(0, specialIdx - 1) + word.slice(specialIdx);
      } else if (specialIdx === 0) {
        word = word.slice(0, -1);
      } else {
        word = word.slice(1);
      }
      removed++;
    }
    return {
      word: word,
      step: {
        type: 'shift',
        label: 'Сдвиг ' + initialLen + ' > ' + TARGET_LENGTH + ' (удалено ' + removed + ')',
        from: original,
        to: word
      }
    };
  }

  function replaceSpecials(word) {
    var before = word;
    var result = '';
    var replacements = [];
    for (var i = 0; i < word.length; i++) {
      var ch = word.charAt(i);
      if (isLetter(ch)) {
        result += ch;
      } else {
        var pos = i + 1;
        var letter = String.fromCharCode(A_CODE + pos - 1);
        result += letter;
        replacements.push({ pos: pos, from: ch, to: letter });
      }
    }
    return {
      word: result,
      step: {
        type: 'replace',
        label: 'Замена спецзнаков: ' + before + ' > ' + result,
        replacements: replacements
      }
    };
  }

  function padToLength(word) {
    var added = '';
    for (var i = word.length + 1; i <= TARGET_LENGTH; i++) {
      var letter = String.fromCharCode(A_CODE + i - 1);
      word += letter;
      added += letter;
    }
    return {
      word: word,
      step: {
        type: 'pad',
        label: 'Дополнение: +' + added + ' > ' + word,
        added: added
      }
    };
  }

  function preprocess(input) {
    var v = validateVig(input);
    if (v.error) return { error: v.error };
    var word = v.value;
    var originalHadSpecial = /[^a-z]/.test(word);
    var steps = [];

    if (word.length > TARGET_LENGTH) {
      var shifted = shiftToLength(word);
      word = shifted.word;
      steps.push(shifted.step);
    }
    if (originalHadSpecial) {
      var replaced = replaceSpecials(word);
      word = replaced.word;
      steps.push(replaced.step);
    }
    if (word.length < TARGET_LENGTH) {
      var padded = padToLength(word);
      word = padded.word;
      steps.push(padded.step);
    }
    return { result: word, steps: steps, original: v.value };
  }

  function getById(id) {
    return document.getElementById(id);
  }

  function setResult(id, text) {
    var el = getById(id);
    if (!el) return;
    el.textContent = text;
    el.className = text ? 'resultbox' : 'resultbox resultbox-empty';
  }

  function resetResult(id) {
    var el = getById(id);
    if (el) {
      el.textContent = EM_DASH;
      el.className = 'resultbox resultbox-empty';
    }
    setCopyEnabled(id, false);
    lastResults[id] = '';
  }

  function setCopyEnabled(targetId, enabled) {
    var btn = document.querySelector('[data-copy="' + targetId + '"]');
    if (btn) btn.disabled = !enabled;
  }

  function setClearEnabled(inputId, enabled) {
    var btn = document.querySelector('[data-clear="' + inputId + '"]');
    if (btn) btn.disabled = !enabled;
  }

  function clearError(inputId, errId) {
    var inputEl = getById(inputId);
    var errEl = getById(errId);
    if (inputEl) inputEl.className = 'inputbox';
    if (errEl) {
      errEl.textContent = '';
      errEl.className = 'errmsg';
      errEl.setAttribute('aria-hidden', 'true');
    }
  }

  function showError(inputId, errId, message) {
    var inputEl = getById(inputId);
    var errEl = getById(errId);
    if (inputEl) inputEl.className = 'inputbox inputbox-error';
    if (errEl) {
      errEl.textContent = message;
      errEl.className = 'errmsg errmsg-show';
      errEl.setAttribute('aria-hidden', 'false');
    }
  }

  function renderSteps(stepsEl, steps, original) {
    if (!steps || steps.length === 0) {
      stepsEl.innerHTML = '<span class="stepline"><span class="head">Без изменений</span> (длина уже равна ' + TARGET_LENGTH + ')</span>';
      return;
    }
    var html = '<span class="stepline"><span class="head">Исходная фраза:</span> <span class="added">' + escapeHtml(original) + '</span></span>';
    for (var i = 0; i < steps.length; i++) {
      var s = steps[i];
      if (s.type === 'shift') {
        var traceHtml = escapeHtml(s.from) + '<span class="arrow"> &gt; </span>' + escapeHtml(s.to);
        html += '<span class="stepline"><span class="head">' + escapeHtml(s.label) + '</span>: ' + traceHtml + '</span>';
      } else if (s.type === 'replace') {
        var replHtml = '';
        for (var k = 0; k < s.replacements.length; k++) {
          if (k > 0) replHtml += ', ';
          var r = s.replacements[k];
          replHtml += '&laquo;' + escapeHtml(r.from) + '&raquo; на позиции ' + r.pos + ' &gt; ' + escapeHtml(r.to);
        }
        html += '<span class="stepline"><span class="head">' + escapeHtml(s.label) + '</span></span>';
        html += '<span class="stepline">Замены: ' + replHtml + '</span>';
      } else if (s.type === 'pad') {
        html += '<span class="stepline"><span class="head">' + escapeHtml(s.label) + '</span></span>';
        html += '<span class="stepline">Добавлены: <span class="added">' + escapeHtml(s.added) + '</span></span>';
      }
    }
    stepsEl.innerHTML = html;
  }

  function renderField(config, raw) {
    clearError(config.inputId, config.errId);
    var stepsEl = config.stepsId ? getById(config.stepsId) : null;
    var hasInput = !!raw && !!raw.trim();
    setClearEnabled(config.inputId, hasInput);

    if (!hasInput) {
      for (var i = 0; i < config.outputs.length; i++) {
        resetResult(config.outputs[i].id);
      }
      if (stepsEl) stepsEl.innerHTML = PLACEHOLDER_STEPS;
      return;
    }

    var pp = preprocess(raw);
    if (pp.error) {
      showError(config.inputId, config.errId, pp.error);
      for (var e = 0; e < config.outputs.length; e++) {
        resetResult(config.outputs[e].id);
      }
      if (stepsEl) stepsEl.innerHTML = PLACEHOLDER_STEPS;
      return;
    }

    var cipherText = vigenereRot1(pp.result, KEY);
    for (var o = 0; o < config.outputs.length; o++) {
      var out = config.outputs[o];
      var value = out.kind === 'pre' ? pp.result : cipherText;
      lastResults[out.id] = value;
      setResult(out.id, value);
      setCopyEnabled(out.id, !!value);
    }
    if (stepsEl) renderSteps(stepsEl, pp.steps, pp.original);
  }

  function renderVig() {
    renderField(FIELD_CONFIGS.vig, getById('input-vig').value);
  }

  function renderB64() {
    clearError('input-b64', 'err-b64');
    var inputEl = getById('input-b64');
    var raw = inputEl ? inputEl.value : '';
    setClearEnabled('input-b64', !!raw);
    if (!raw) {
      resetResult('b64-out');
      return;
    }
    var value = toBase64(raw);
    lastResults['b64-out'] = value;
    setResult('b64-out', value);
    setCopyEnabled('b64-out', !!value);
  }

  INPUT_HANDLERS['input-vig'] = renderVig;
  INPUT_HANDLERS['input-b64'] = renderB64;

  function debounce(key, fn) {
    return function () {
      if (debounceTimers[key]) {
        clearTimeout(debounceTimers[key]);
        debounceTimers[key] = null;
      }
      debounceTimers[key] = setTimeout(function () {
        debounceTimers[key] = null;
        fn();
      }, DEBOUNCE_MS);
    };
  }

  function showTab(name) {
    for (var i = 0; i < TAB_NAMES.length; i++) {
      var t = TAB_NAMES[i];
      var panel = getById('tab-' + t);
      var btn = getById('btn-' + t);
      var isActive = (t === name);
      if (panel) panel.className = isActive ? 'tabpanel tabpanel-active' : 'tabpanel';
      if (btn) {
        btn.className = isActive ? 'tabbtn tabbtn-active' : 'tabbtn';
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.tabIndex = isActive ? 0 : -1;
      }
    }
  }

  function focusTab(name) {
    var btn = getById('btn-' + name);
    if (btn) btn.focus();
  }

  function copyResult(id, btn) {
    var text = lastResults[id];
    if (!text) return;
    var done = false;
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = HIDDEN_OFFSET;
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      done = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (e) {}

    if (copyTimers[id]) {
      clearTimeout(copyTimers[id]);
      copyTimers[id] = null;
    }

    if (!done) {
      global.prompt('Скопируйте текст вручную (Ctrl+C):', text);
      return;
    }

    var original = btn.getAttribute('data-original-label');
    if (!original) {
      original = btn.textContent;
      btn.setAttribute('data-original-label', original);
    }
    btn.textContent = COPY_LABEL_OK;
    btn.classList.add('btn-copied');
    copyTimers[id] = setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove('btn-copied');
      copyTimers[id] = null;
    }, COPY_RESET_MS);
  }

  function clearInput(id) {
    var el = getById(id);
    if (!el) return;
    el.value = '';
    var handler = INPUT_HANDLERS[id];
    if (handler) handler();
    el.focus();
  }

  function onTabKeydown(event) {
    var current = this.getAttribute('data-tab');
    var idx = TAB_NAMES.indexOf(current);
    var nextIdx = -1;
    var key = event.key;
    var keyCode = event.keyCode;
    if (key === 'ArrowRight' || key === 'Right' || keyCode === 39) {
      nextIdx = (idx + 1) % TAB_NAMES.length;
    } else if (key === 'ArrowLeft' || key === 'Left' || keyCode === 37) {
      nextIdx = (idx - 1 + TAB_NAMES.length) % TAB_NAMES.length;
    } else if (key === 'Home' || keyCode === 36) {
      nextIdx = 0;
    } else if (key === 'End' || keyCode === 35) {
      nextIdx = TAB_NAMES.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    var nextName = TAB_NAMES[nextIdx];
    showTab(nextName);
    focusTab(nextName);
  }

  function initEventHandlers() {
    var tabLinks = document.querySelectorAll('[data-tab]');
    for (var i = 0; i < tabLinks.length; i++) {
      tabLinks[i].addEventListener('click', function (event) {
        event.preventDefault();
        showTab(this.getAttribute('data-tab'));
      });
      tabLinks[i].addEventListener('keydown', onTabKeydown);
    }
    getById('input-vig').addEventListener('input', debounce('vig', renderVig));
    getById('input-b64').addEventListener('input', debounce('b64', renderB64));

    var clearButtons = document.querySelectorAll('[data-clear]');
    for (var c = 0; c < clearButtons.length; c++) {
      clearButtons[c].addEventListener('click', function () {
        clearInput(this.getAttribute('data-clear'));
      });
    }

    var copyButtons = document.querySelectorAll('[data-copy]');
    for (var k = 0; k < copyButtons.length; k++) {
      copyButtons[k].addEventListener('click', function () {
        copyResult(this.getAttribute('data-copy'), this);
      });
    }
  }

  function init() {
    initEventHandlers();
    renderVig();
    renderB64();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);

'use strict';

var obsidian = require('obsidian');

function formatBinaryWithSpaces(binary, groupSize) {
  if (!binary) return '';
  var clean = binary.toString().replace(/\s+/g, '');
  if (!clean) return '';
  if (!groupSize) groupSize = 4;
  var len = clean.length;
  var rem = len % groupSize;
  var result = [];
  if (rem > 0) {
    result.push(clean.slice(0, rem));
  }
  for (var i = rem; i < len; i += groupSize) {
    result.push(clean.slice(i, i + groupSize));
  }
  return result.join(' ');
}

function binaryToHex(binary) {
  if (!binary || binary === 'Overflow') return 'N/A';
  var clean = binary.toString().replace(/\s+/g, '');
  if (!clean || !/^[01]+$/.test(clean)) return 'N/A';
  var padLen = Math.ceil(clean.length / 4) * 4;
  var padded = clean.padStart(padLen, '0');
  var hex = '';
  for (var i = 0; i < padded.length; i += 4) {
    var chunk = padded.substring(i, i + 4);
    hex += parseInt(chunk, 2).toString(16).toUpperCase();
  }
  return hex;
}

var COPY_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>';
var CHECK_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

function createCopyButton(container, textToCopy, tooltip) {
  var btn = container.createEl('button', {
    cls: 'num-copy-btn'
  });
  btn.innerHTML = COPY_ICON_SVG;
  btn.setAttribute('title', tooltip || 'Copy');
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(textToCopy).then(function() {
      new obsidian.Notice('Copied: ' + textToCopy);
      btn.innerHTML = CHECK_ICON_SVG;
      btn.classList.add('copied');
      setTimeout(function() {
        btn.innerHTML = COPY_ICON_SVG;
        btn.classList.remove('copied');
      }, 1500);
    });
  });
  return btn;
}

var VIEW_TYPE_NUM_CONVERT = 'number-conversions-studio-view';

class NumberConversionsView extends obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_NUM_CONVERT;
  }

  getDisplayText() {
    return 'Number Conversions Studio';
  }

  getIcon() {
    return 'calculator';
  }

  async onOpen() {
    var container = this.containerEl.children[1] || this.containerEl;
    container.empty();
    this.plugin.renderStudioUI(container);
  }

  applyState(state) {
    var container = this.containerEl.children[1] || this.containerEl;
    container.empty();
    this.plugin.renderStudioUI(container, state);
  }

  async onClose() {
    // Cleanup
  }
}

class NumberConversionModal extends obsidian.Modal {
  constructor(app, plugin, initialState) {
    super(app);
    this.plugin = plugin;
    this.initialState = initialState;
  }

  onOpen() {
    var contentEl = this.contentEl;
    contentEl.empty();
    this.plugin.renderStudioUI(contentEl, this.initialState);
  }

  onClose() {
    this.contentEl.empty();
  }
}

class NumberConversionsPlugin extends obsidian.Plugin {
  async onload() {
    console.log('Loading Number Conversions Plugin & Studio...');

    var self = this;
    var B3 = String.fromCharCode(96, 96, 96);

    // 1. Register Studio View
    this.registerView(
      VIEW_TYPE_NUM_CONVERT,
      function(leaf) {
        return new NumberConversionsView(leaf, self);
      }
    );

    // 2. Register Code Block Processor for 'numconvert' (Integers)
    this.registerMarkdownCodeBlockProcessor('numconvert', function(source, el, ctx) {
      self.renderIntegerBlock(source, el);
    });

    // 3. Register Code Block Processor for 'ieee754' (Floating-Point)
    this.registerMarkdownCodeBlockProcessor('ieee754', function(source, el, ctx) {
      self.renderFloatBlock(source, el);
    });

    // 4. Add Ribbon Icon to open Studio
    try {
      this.addRibbonIcon('calculator', 'Number Conversions Studio', function() {
        self.activateStudioView();
      });
    } catch (err) {
      console.warn('Ribbon icon registration warning:', err);
    }

    // 5. Command to Open Studio View
    this.addCommand({
      id: 'open-number-conversions-studio',
      name: 'Open Number Conversions Studio',
      callback: function() {
        self.activateStudioView();
      }
    });

    // 6. Command to Open Studio in Modal Dialog
    this.addCommand({
      id: 'open-number-conversions-modal',
      name: 'Open Number Conversions Studio (Modal Dialog)',
      callback: function() {
        new NumberConversionModal(self.app, self).open();
      }
    });

    // 7. Snippet Commands
    this.addCommand({
      id: 'insert-twos-complement-snippet',
      name: "Insert 8-Bit Two's Complement Snippet",
      editorCallback: function(editor) {
        editor.replaceSelection(B3 + "numconvert\nnumber: -42\nbits: 8\n" + B3 + "\n");
      }
    });

    this.addCommand({
      id: 'insert-ieee754-snippet',
      name: "Insert IEEE 754 Floating-Point Snippet",
      editorCallback: function(editor) {
        editor.replaceSelection(B3 + "ieee754\nnumber: -13.625\nprecision: single\n" + B3 + "\n");
      }
    });
  }

  onunload() {
    console.log('Unloading Number Conversions Plugin...');
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_NUM_CONVERT);
  }

  async activateStudioView(initialState) {
    var workspace = this.app.workspace;
    var leaf = workspace.getLeavesOfType(VIEW_TYPE_NUM_CONVERT)[0];

    if (!leaf) {
      var rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({
          type: VIEW_TYPE_NUM_CONVERT,
          active: true
        });
        leaf = rightLeaf;
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
      if (initialState && leaf.view && leaf.view.applyState) {
        leaf.view.applyState(initialState);
      }
    } else {
      new NumberConversionModal(this.app, this, initialState).open();
    }
  }

  insertSnippetIntoOpenNote(snippet) {
    var workspace = this.app.workspace;
    var editor = null;

    // 1. Try currently focused active MarkdownView
    var activeView = workspace.getActiveViewOfType(obsidian.MarkdownView);
    if (activeView && activeView.editor) {
      editor = activeView.editor;
    }

    // 2. If focus is on Studio sidebar or modal, search all open workspace leaves for an open MarkdownView
    if (!editor) {
      var mdLeaves = workspace.getLeavesOfType('markdown');
      if (mdLeaves && mdLeaves.length > 0) {
        for (var i = 0; i < mdLeaves.length; i++) {
          var view = mdLeaves[i].view;
          if (view && view instanceof obsidian.MarkdownView && view.editor) {
            editor = view.editor;
            workspace.setActiveLeaf(mdLeaves[i], { focus: true });
            break;
          }
        }
      }
    }

    // 3. If editor is found, insert snippet right at cursor
    if (editor) {
      editor.replaceSelection(snippet);
      new obsidian.Notice('✓ Inserted snippet into note!');
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(snippet);
      }
      return true;
    }

    // 4. Fail-safe fallback: copy to clipboard and notify user
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(snippet);
      new obsidian.Notice('📋 Snippet copied to clipboard! Open any note and press Ctrl+V / Cmd+V to paste.', 5000);
    } else {
      new obsidian.Notice('No open note found. Open a note to insert snippet.', 4000);
    }
    return false;
  }

  renderStudioUI(container, initialState) {
    var self = this;
    var root = container.createDiv({ cls: 'num-studio-container' });

    // Studio Header
    var header = root.createDiv({ cls: 'num-studio-header' });
    var titleEl = header.createEl('div', {
      cls: 'num-studio-title'
    });
    try {
      var iconSpan = titleEl.createSpan({ cls: 'num-studio-icon' });
      obsidian.setIcon(iconSpan, 'calculator');
    } catch (err) {}
    titleEl.createSpan({ text: 'Number Conversions Studio' });

    // Studio Section Tabs
    var tabRow = root.createDiv({ cls: 'num-studio-tabs' });
    var intTabBtn = tabRow.createEl('button', {
      text: 'Section 1: Integers (SM, 1s, 2s, Excess-k)',
      cls: 'num-studio-tab-btn active'
    });
    var floatTabBtn = tabRow.createEl('button', {
      text: 'Section 2: IEEE 754 Floating-Point',
      cls: 'num-studio-tab-btn'
    });

    var bodyContainer = root.createDiv();

    var activeTab = (initialState && initialState.section) ? initialState.section : 'integers';

    function renderActiveTab() {
      bodyContainer.empty();
      if (activeTab === 'integers') {
        intTabBtn.addClass('active');
        floatTabBtn.removeClass('active');
        self.buildIntegerStudioUI(bodyContainer, initialState);
      } else {
        floatTabBtn.addClass('active');
        intTabBtn.removeClass('active');
        self.buildFloatStudioUI(bodyContainer, initialState);
      }
    }

    intTabBtn.addEventListener('click', function() {
      activeTab = 'integers';
      renderActiveTab();
    });

    floatTabBtn.addEventListener('click', function() {
      activeTab = 'floats';
      renderActiveTab();
    });

    renderActiveTab();
  }

  buildIntegerStudioUI(container, initialState) {
    var self = this;
    var state = {
      value: (initialState && initialState.value !== undefined) ? initialState.value : -42,
      bits: (initialState && initialState.bits) ? initialState.bits : 8,
      customK: (initialState && initialState.customK !== undefined) ? initialState.customK : undefined
    };

    var panel = container.createDiv({ cls: 'num-studio-card-panel' });

    // Input row
    var grpInput = panel.createDiv({ cls: 'num-control-group' });
    grpInput.createEl('label', { text: 'Decimal Value (Positive or Negative):', cls: 'num-control-label' });
    var inputEl = grpInput.createEl('input', {
      type: 'number',
      value: state.value.toString(),
      cls: 'num-input-field'
    });

    // Bit Width Row
    var grpBits = panel.createDiv({ cls: 'num-control-group' });
    grpBits.createEl('label', { text: 'Bit Width (n bits):', cls: 'num-control-label' });
    var bitBtnRow = grpBits.createDiv({ cls: 'num-btn-row' });
    var bitOptions = [4, 8, 10, 12, 14, 16, 24, 32];
    var bitBtns = [];

    bitOptions.forEach(function(b) {
      var btn = bitBtnRow.createEl('button', {
        text: b + '-bit',
        cls: 'num-chip-btn' + (state.bits === b ? ' active' : '')
      });
      btn.addEventListener('click', function() {
        state.bits = b;
        bitBtns.forEach(function(btnItem) { btnItem.removeClass('active'); });
        btn.addClass('active');
        if (state.customK === undefined) {
          kInputEl.value = (Math.pow(2, state.bits - 1) - 1).toString();
        }
        updateUI();
      });
      bitBtns.push(btn);
    });

    // Excess-k Bias Input (identical structure to Decimal Floating-Point Number)
    var grpK = panel.createDiv({ cls: 'num-control-group' });
    var kLabel = grpK.createEl('label', { cls: 'num-control-label' });
    kLabel.createSpan({ text: 'Excess-k Bias (k) — Editable: ' });
    var kValIndicator = kLabel.createSpan({
      text: 'k = ' + (state.customK !== undefined ? state.customK : (Math.pow(2, state.bits - 1) - 1)),
      cls: 'num-convert-card-sub'
    });

    var kInputEl = grpK.createEl('input', {
      type: 'number',
      value: (state.customK !== undefined ? state.customK : (Math.pow(2, state.bits - 1) - 1)).toString(),
      cls: 'num-input-field'
    });

    // Preset chips (identical structure to Decimal Floating-Point Number presetRow)
    var kPresetRow = panel.createDiv({ cls: 'num-btn-row num-preset-row-k' });
    kPresetRow.style.marginBottom = '10px';

    var kPreset1 = kPresetRow.createEl('button', {
      text: 'k = 2^(n-1)-1',
      cls: 'num-chip-btn'
    });
    kPreset1.addEventListener('click', function() {
      state.customK = Math.pow(2, state.bits - 1) - 1;
      kInputEl.value = state.customK.toString();
      updateUI();
    });

    var kPreset2 = kPresetRow.createEl('button', {
      text: 'k = 2^(n-1)',
      cls: 'num-chip-btn'
    });
    kPreset2.addEventListener('click', function() {
      state.customK = Math.pow(2, state.bits - 1);
      kInputEl.value = state.customK.toString();
      updateUI();
    });

    var kPreset0 = kPresetRow.createEl('button', {
      text: 'k = 0',
      cls: 'num-chip-btn'
    });
    kPreset0.addEventListener('click', function() {
      state.customK = 0;
      kInputEl.value = '0';
      updateUI();
    });

    kInputEl.addEventListener('input', function() {
      var parsedK = parseInt(kInputEl.value, 10);
      state.customK = isNaN(parsedK) ? (Math.pow(2, state.bits - 1) - 1) : parsedK;
      updateUI();
    });

    // Interactive Bit Clicker Strip (with well-proportioned spacing from k-preset buttons)
    var grpClicker = panel.createDiv({
      cls: 'num-control-group num-clicker-group'
    });
    grpClicker.style.marginTop = '12px';
    grpClicker.style.paddingTop = '10px';
    grpClicker.style.borderTop = '1px solid var(--background-modifier-border, #3f4148)';

    var clickerLabel = grpClicker.createEl('label', {
      text: 'Interactive Bit Clicker (Click any bit to toggle):',
      cls: 'num-control-label num-clicker-label'
    });
    clickerLabel.style.marginBottom = '6px';

    var bitStripEl = grpClicker.createDiv({ cls: 'num-bit-strip' });

    // 4 Output Cards Grid
    var gridEl = panel.createDiv({ cls: 'num-convert-grid' });

    // Insert to Note Button
    var insertBtn = panel.createEl('button', {
      text: '➕ Insert numconvert Snippet into Note',
      cls: 'num-insert-btn'
    });
    insertBtn.addEventListener('click', function() {
      var B3 = String.fromCharCode(96, 96, 96);
      var k = state.customK !== undefined ? state.customK : (Math.pow(2, state.bits - 1) - 1);
      var snippet = B3 + 'numconvert\nnumber: ' + state.value + '\nbits: ' + state.bits + '\nk: ' + k + '\n' + B3 + '\n';
      self.insertSnippetIntoOpenNote(snippet);
    });

    function updateUI() {
      // Recompute values
      var half = Math.pow(2, state.bits - 1);
      var k = state.customK !== undefined ? state.customK : (half - 1);
      kValIndicator.innerText = 'k = ' + k;
      var absVal = Math.abs(state.value);

      // Sign-Mag
      var smSign = state.value < 0 ? '1' : '0';
      var smMag = absVal.toString(2).padStart(state.bits - 1, '0').slice(-(state.bits - 1));
      var smBin = smSign + smMag;

      // 1's Comp
      var ocBin = '';
      if (state.value >= 0) {
        ocBin = absVal.toString(2).padStart(state.bits, '0').slice(-state.bits);
      } else {
        var pos = absVal.toString(2).padStart(state.bits, '0').slice(-state.bits);
        ocBin = pos.split('').map(function(b) { return b === '0' ? '1' : '0'; }).join('');
      }

      // 2's Comp
      var tcBin = '';
      if (state.value >= 0) {
        tcBin = absVal.toString(2).padStart(state.bits, '0').slice(-state.bits);
      } else {
        var twoPow = Math.pow(2, state.bits);
        tcBin = (twoPow + state.value).toString(2).padStart(state.bits, '0').slice(-state.bits);
      }

      // Excess-k
      var excessVal = state.value + k;
      var excessBin = excessVal >= 0 ? excessVal.toString(2).padStart(state.bits, '0').slice(-state.bits) : 'Overflow';

      // Refresh Interactive Bit Strip based on 2's complement
      bitStripEl.empty();
      var bitsArr = tcBin.split('');
      bitsArr.forEach(function(b, idx) {
        var isMsb = idx === 0;
        var bitBtn = bitStripEl.createEl('button', {
          cls: 'num-bit-btn' + (b === '1' ? ' active-1' : '')
        });
        bitBtn.createEl('div', { text: b, cls: 'num-bit-val' });
        bitBtn.createEl('div', { text: isMsb ? 'MSB' : 'b' + (state.bits - 1 - idx), cls: 'num-bit-label' });

        bitBtn.addEventListener('click', function() {
          bitsArr[idx] = bitsArr[idx] === '0' ? '1' : '0';
          var newBin = bitsArr.join('');
          var isNeg = newBin[0] === '1';
          var decoded = 0;
          if (!isNeg) {
            decoded = parseInt(newBin, 2);
          } else {
            decoded = parseInt(newBin, 2) - Math.pow(2, state.bits);
          }
          state.value = decoded;
          inputEl.value = decoded.toString();
          updateUI();
        });
      });

      // Refresh Grid Cards
      gridEl.empty();

      // Ranges & Hex values
      var minValSM = -(half - 1);
      var maxValSM = half - 1;
      var rangeSM = '[' + minValSM + ', +' + maxValSM + ']';
      var hexSM = binaryToHex(smBin);

      var minValOC = -(half - 1);
      var maxValOC = half - 1;
      var rangeOC = '[' + minValOC + ', +' + maxValOC + ']';
      var hexOC = binaryToHex(ocBin);

      var minValTC = -half;
      var maxValTC = half - 1;
      var rangeTC = '[' + minValTC + ', +' + maxValTC + ']';
      var hexTC = binaryToHex(tcBin);

      var minValEK = -k;
      var maxValEK = Math.pow(2, state.bits) - 1 - k;
      var rangeEK = '[' + minValEK + ', +' + maxValEK + ']';
      var hexEK = binaryToHex(excessBin);

      // Card 1: Sign-Mag
      var c1 = gridEl.createDiv({ cls: 'num-convert-card' });
      var c1Hdr = c1.createDiv({ cls: 'num-convert-card-header' });
      c1Hdr.createEl('div', { text: 'Sign-and-Magnitude', cls: 'num-convert-card-title' });
      c1Hdr.createEl('span', { text: rangeSM, cls: 'num-card-range' });

      var c1Row = c1.createDiv({ cls: 'num-card-bits-row' });
      c1Row.createEl('div', { text: formatBinaryWithSpaces(smBin), cls: 'num-convert-card-bits' });
      if (smBin !== 'Overflow') {
        createCopyButton(c1Row, smBin, 'Copy binary');
      }

      var c1Ftr = c1.createDiv({ cls: 'num-card-footer' });
      c1Ftr.createEl('div', { text: smBin !== 'Overflow' ? ('Sign: ' + smSign + ' | Mag: ' + formatBinaryWithSpaces(smMag)) : 'Overflow', cls: 'num-convert-card-sub' });
      if (smBin !== 'Overflow') {
        var hx1 = c1Ftr.createDiv({ cls: 'num-card-hex' });
        hx1.createSpan({ text: 'Hex: 0x' + hexSM });
        createCopyButton(hx1, '0x' + hexSM, 'Copy hex');
      }

      // Card 2: 1's Comp
      var c2 = gridEl.createDiv({ cls: 'num-convert-card' });
      var c2Hdr = c2.createDiv({ cls: 'num-convert-card-header' });
      c2Hdr.createEl('div', { text: "One's Complement", cls: 'num-convert-card-title' });
      c2Hdr.createEl('span', { text: rangeOC, cls: 'num-card-range' });

      var c2Row = c2.createDiv({ cls: 'num-card-bits-row' });
      c2Row.createEl('div', { text: formatBinaryWithSpaces(ocBin), cls: 'num-convert-card-bits' });
      if (ocBin !== 'Overflow') {
        createCopyButton(c2Row, ocBin, 'Copy binary');
      }

      var c2Ftr = c2.createDiv({ cls: 'num-card-footer' });
      c2Ftr.createEl('div', { text: ocBin !== 'Overflow' ? (state.value < 0 ? 'Bitwise NOT (~x)' : 'Direct binary') : 'Overflow', cls: 'num-convert-card-sub' });
      if (ocBin !== 'Overflow') {
        var hx2 = c2Ftr.createDiv({ cls: 'num-card-hex' });
        hx2.createSpan({ text: 'Hex: 0x' + hexOC });
        createCopyButton(hx2, '0x' + hexOC, 'Copy hex');
      }

      // Card 3: 2's Comp
      var c3 = gridEl.createDiv({ cls: 'num-convert-card' });
      var c3Hdr = c3.createDiv({ cls: 'num-convert-card-header' });
      c3Hdr.createEl('div', { text: "Two's Complement", cls: 'num-convert-card-title' });
      c3Hdr.createEl('span', { text: rangeTC, cls: 'num-card-range' });

      var c3Row = c3.createDiv({ cls: 'num-card-bits-row' });
      c3Row.createEl('div', { text: formatBinaryWithSpaces(tcBin), cls: 'num-convert-card-bits' });
      if (tcBin !== 'Overflow') {
        createCopyButton(c3Row, tcBin, 'Copy binary');
      }

      var c3Ftr = c3.createDiv({ cls: 'num-card-footer' });
      c3Ftr.createEl('div', { text: tcBin !== 'Overflow' ? ('MSB weight = -' + half) : 'Overflow', cls: 'num-convert-card-sub' });
      if (tcBin !== 'Overflow') {
        var hx3 = c3Ftr.createDiv({ cls: 'num-card-hex' });
        hx3.createSpan({ text: 'Hex: 0x' + hexTC });
        createCopyButton(hx3, '0x' + hexTC, 'Copy hex');
      }

      // Card 4: Excess-k
      var c4 = gridEl.createDiv({ cls: 'num-convert-card' });
      var c4Hdr = c4.createDiv({ cls: 'num-convert-card-header' });
      c4Hdr.createEl('div', { text: 'Excess-' + k + ' (Biased)', cls: 'num-convert-card-title' });
      c4Hdr.createEl('span', { text: rangeEK, cls: 'num-card-range' });

      var c4Row = c4.createDiv({ cls: 'num-card-bits-row' });
      c4Row.createEl('div', { text: formatBinaryWithSpaces(excessBin), cls: 'num-convert-card-bits' });
      if (excessBin !== 'Overflow') {
        createCopyButton(c4Row, excessBin, 'Copy binary');
      }

      var c4Ftr = c4.createDiv({ cls: 'num-card-footer' });
      c4Ftr.createEl('div', { text: excessBin !== 'Overflow' ? ('Stored: ' + excessVal + ' (k = ' + k + ')') : 'Overflow', cls: 'num-convert-card-sub' });
      if (excessBin !== 'Overflow') {
        var hx4 = c4Ftr.createDiv({ cls: 'num-card-hex' });
        hx4.createSpan({ text: 'Hex: 0x' + hexEK });
        createCopyButton(hx4, '0x' + hexEK, 'Copy hex');
      }
    }

    inputEl.addEventListener('input', function() {
      state.value = parseInt(inputEl.value, 10) || 0;
      updateUI();
    });

    updateUI();
  }

  buildFloatStudioUI(container, initialState) {
    var self = this;
    var FORMATS = {
      single: {
        id: 'single',
        name: 'Single Precision (IEEE 754)',
        totalBits: 32,
        signBits: 1,
        expBits: 8,
        mantissaBits: 23,
        bias: 127,
        desc: 'Standard 32-bit float: 1 sign bit, 8 exponent bits (bias 127), 23 fraction bits.'
      }
    };

    var state = {
      precision: 'single',
      inputMode: 'decimal',
      decimalVal: (initialState && initialState.val !== undefined) ? initialState.val.toString() : '-13.625',
      hexVal: '',
      binaryVal: '',
      rawBits: ''
    };

    function encodeToBits(valStr) {
      var trimmed = valStr.trim();
      var num = parseFloat(trimmed);
      var f32 = new Float32Array(1);
      f32[0] = num;
      var u32 = new Uint32Array(f32.buffer);
      var b = u32[0].toString(2).padStart(32, '0');
      if (trimmed === '-0' || (num === 0 && 1 / num === -Infinity)) {
        b = '1' + b.slice(1);
      }
      return b;
    }

    function decodeBits(bits) {
      var fmt = FORMATS.single;
      if (bits.length < 32) bits = bits.padEnd(32, '0');
      if (bits.length > 32) bits = bits.slice(0, 32);

      var signBit = bits[0];
      var expBits = bits.slice(1, 9);
      var mantBits = bits.slice(9);

      var isNeg = signBit === '1';
      var signVal = isNeg ? -1 : 1;
      var rawExp = parseInt(expBits, 2);
      var maxExp = 255;

      var mantSum = 0;
      var mantDetails = [];
      for (var i = 0; i < mantBits.length; i++) {
        var bit = mantBits[i];
        var fracVal = Math.pow(2, -(i + 1));
        var active = bit === '1';
        if (active) mantSum += fracVal;
        mantDetails.push({ index: i + 1, bit: bit, power: -(i + 1), fracVal: fracVal, active: active });
      }

      var classification = 'normal';
      var unbiasedExp = 0;
      var effectiveMant = 0;
      var realVal = 0;
      var formattedOutput = '';

      if (rawExp === 0) {
        if (mantSum === 0) {
          classification = 'zero';
          realVal = isNeg ? -0 : 0;
          formattedOutput = isNeg ? '-0.0' : '+0.0';
        } else {
          classification = 'subnormal';
          unbiasedExp = 1 - 127;
          effectiveMant = mantSum;
          realVal = signVal * effectiveMant * Math.pow(2, unbiasedExp);
          formattedOutput = realVal.toString();
        }
      } else if (rawExp === maxExp) {
        if (mantSum === 0) {
          classification = 'infinity';
          realVal = isNeg ? -Infinity : Infinity;
          formattedOutput = isNeg ? '-Infinity' : '+Infinity';
        } else {
          classification = 'nan';
          realVal = NaN;
          formattedOutput = 'NaN';
        }
      } else {
        classification = 'normal';
        unbiasedExp = rawExp - 127;
        effectiveMant = 1 + mantSum;
        realVal = signVal * effectiveMant * Math.pow(2, unbiasedExp);
        formattedOutput = realVal.toString();
      }

      var hex = '';
      for (var j = 0; j < bits.length; j += 4) {
        var nib = bits.slice(j, j + 4);
        if (nib.length < 4) nib = nib.padEnd(4, '0');
        hex += parseInt(nib, 2).toString(16).toUpperCase();
      }

      var expHex = '0x' + rawExp.toString(16).toUpperCase().padStart(2, '0');
      var mantPadded = mantBits.padStart(24, '0');
      var mantHexVal = '';
      for (var k = 0; k < 24; k += 4) {
        mantHexVal += parseInt(mantPadded.slice(k, k + 4), 2).toString(16).toUpperCase();
      }
      var mantHex = '0x' + mantHexVal;

      return {
        bits: bits,
        signBit: signBit,
        expBits: expBits,
        mantBits: mantBits,
        isNeg: isNeg,
        signVal: signVal,
        rawExp: rawExp,
        unbiasedExp: unbiasedExp,
        effectiveMant: effectiveMant,
        mantSum: mantSum,
        mantDetails: mantDetails,
        classification: classification,
        realVal: realVal,
        formattedOutput: formattedOutput,
        hex: hex,
        expHex: expHex,
        mantHex: mantHex
      };
    }

    state.rawBits = encodeToBits(state.decimalVal);

    var panel = container.createDiv({ cls: 'num-studio-card-panel' });

    // 1. IEEE 754 Format Standard (Single Precision 32-bit)
    var grpFormat = panel.createDiv({ cls: 'num-control-group' });
    grpFormat.createEl('label', { text: 'IEEE 754 Format Standard:', cls: 'num-control-label' });
    var fmtBox = grpFormat.createDiv({
      cls: 'num-card-bits-row',
      style: 'background: var(--background-primary, #18181b); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--background-modifier-border, #3f4148); margin-bottom: 4px;'
    });
    fmtBox.createSpan({ text: 'Single Precision (IEEE 754, 32-bit)', style: 'font-weight: 600; font-size: 0.9em; color: var(--text-normal, #fff);' });
    grpFormat.createDiv({
      text: FORMATS.single.desc,
      cls: 'num-convert-card-sub',
      style: 'margin-top: 4px;'
    });

    // 2. Input Mode (Decimal, Hex, Binary) & Value Field
    var grpInput = panel.createDiv({ cls: 'num-control-group', style: 'margin-top: 18px;' });
    grpInput.createEl('label', { text: 'Input Value:', cls: 'num-control-label' });

    var inputRow = grpInput.createDiv({ cls: 'num-float-input-line-row' });
    var modeBtnRow = inputRow.createDiv({ cls: 'num-float-mode-group' });
    var modeBtns = {};
    ['decimal', 'hex', 'binary'].forEach(function(m) {
      var mBtn = modeBtnRow.createEl('button', {
        text: m.charAt(0).toUpperCase() + m.slice(1),
        cls: 'num-float-mode-btn' + (state.inputMode === m ? ' active' : '')
      });
      mBtn.addEventListener('click', function() {
        state.inputMode = m;
        Object.keys(modeBtns).forEach(function(k) { modeBtns[k].removeClass('active'); });
        mBtn.addClass('active');
        syncInputs();
      });
      modeBtns[m] = mBtn;
    });

    var inputEl = inputRow.createEl('input', {
      type: 'text',
      value: state.decimalVal,
      cls: 'num-float-input-field'
    });

    // Preset Chips
    var presetRow = panel.createDiv({ cls: 'num-btn-row', style: 'margin-bottom: 16px; margin-top: 8px;' });
    [
      { label: '-13.625', val: '-13.625' },
      { label: '0.1 (Periodic)', val: '0.1' },
      { label: '3.14159', val: '3.14159' },
      { label: '+1.0', val: '1.0' },
      { label: '+0.0', val: '0' },
      { label: '-0.0', val: '-0' },
      { label: '+Infinity', val: 'Infinity' },
      { label: 'NaN', val: 'NaN' },
      { label: 'Subnormal (1e-40)', val: '1e-40' }
    ].forEach(function(p) {
      var pBtn = presetRow.createEl('button', { text: p.label, cls: 'num-chip-btn' });
      pBtn.addEventListener('click', function() {
        state.inputMode = 'decimal';
        Object.keys(modeBtns).forEach(function(k) { modeBtns[k].removeClass('active'); });
        modeBtns['decimal'].addClass('active');
        state.decimalVal = p.val;
        inputEl.value = p.val;
        state.rawBits = encodeToBits(state.decimalVal);
        renderAll();
      });
    });

    // 3. Horizontal Divider & Interactive Ribbon Container
    panel.createEl('hr', { cls: 'num-studio-divider' });
    var ribbonContainer = panel.createDiv();

    // 4. Breakdown Cards (Sign, Exponent, Mantissa)
    var cardsContainer = panel.createDiv({ cls: 'num-convert-grid', style: 'margin-top: 16px;' });

    // 5. Evaluated Mathematical Reconstruction Box
    var reconContainer = panel.createDiv({ cls: 'num-recon-box' });

    // 6. Mantissa Bit Fractional Weights Table
    var weightsContainer = panel.createDiv({ cls: 'num-weights-card' });

    // 7. Insert Snippet Button
    var insertBtn = panel.createEl('button', {
      text: '➕ Insert ieee754 Snippet into Note',
      cls: 'num-insert-btn',
      style: 'margin-top: 18px;'
    });
    insertBtn.addEventListener('click', function() {
      var B3 = String.fromCharCode(96, 96, 96);
      var snippet = B3 + 'ieee754\nnumber: ' + state.decimalVal + '\nprecision: ' + state.precision + '\n' + B3 + '\n';
      self.insertSnippetIntoOpenNote(snippet);
    });

    function syncInputs() {
      var curDecoded = decodeBits(state.rawBits);
      if (state.inputMode === 'decimal') {
        inputEl.value = state.decimalVal;
        inputEl.placeholder = 'e.g. -13.625 or 0.1';
      } else if (state.inputMode === 'hex') {
        inputEl.value = curDecoded.hex;
        inputEl.placeholder = 'Hex digits e.g. C15A0000';
      } else {
        inputEl.value = state.rawBits;
        inputEl.placeholder = 'Binary bits e.g. 1100000101011...';
      }
    }

    inputEl.addEventListener('input', function() {
      var val = inputEl.value.trim();
      var fmt = FORMATS.single;
      if (state.inputMode === 'decimal') {
        state.decimalVal = val;
        state.rawBits = encodeToBits(val);
      } else if (state.inputMode === 'hex') {
        var cleanHex = val.replace(/[^0-9a-fA-F]/g, '');
        var b = '';
        for (var i = 0; i < cleanHex.length; i++) {
          b += parseInt(cleanHex[i], 16).toString(2).padStart(4, '0');
        }
        if (b.length < fmt.totalBits) b = b.padEnd(fmt.totalBits, '0');
        state.rawBits = b.slice(0, fmt.totalBits);
        var dec = decodeBits(state.rawBits);
        state.decimalVal = dec.formattedOutput;
      } else {
        var cleanBits = val.replace(/[^01]/g, '');
        if (cleanBits.length < fmt.totalBits) cleanBits = cleanBits.padEnd(fmt.totalBits, '0');
        state.rawBits = cleanBits.slice(0, fmt.totalBits);
        var dec = decodeBits(state.rawBits);
        state.decimalVal = dec.formattedOutput;
      }
      renderAll(true);
    });

    function renderAll(skipInputUpdate) {
      var fmt = FORMATS.single;
      var dec = decodeBits(state.rawBits);

      if (!skipInputUpdate) {
        syncInputs();
      }

      // --- Render Interactive Ribbon ---
      ribbonContainer.empty();
      var ribbonHeader = ribbonContainer.createDiv({ style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;' });
      var ribbonTitle = ribbonHeader.createDiv({ style: 'display: flex; align-items: center; gap: 8px;' });
      ribbonTitle.createSpan({ text: 'Interactive ' + fmt.totalBits + '-Bit Ribbon (Click any bit to toggle):', style: 'font-size: 0.85em; font-weight: 600;' });

      var badgeCls = 'num-badge ';
      var badgeText = '';
      if (dec.classification === 'zero') { badgeCls += 'num-badge-zero'; badgeText = 'Signed Zero (±0)'; }
      else if (dec.classification === 'subnormal') { badgeCls += 'num-badge-subnormal'; badgeText = 'Subnormal (Gradual Underflow)'; }
      else if (dec.classification === 'infinity') { badgeCls += 'num-badge-inf'; badgeText = 'Infinity (±∞)'; }
      else if (dec.classification === 'nan') { badgeCls += 'num-badge-nan'; badgeText = 'Not a Number (NaN)'; }

      if (badgeText) {
        ribbonTitle.createSpan({ text: badgeText, cls: badgeCls });
      }
      ribbonHeader.createSpan({ text: 'Hex: 0x' + dec.hex, cls: 'num-convert-card-sub' });

      // Color-coded Bar Labels
      var barRow = ribbonContainer.createDiv({ cls: 'num-float-ribbon-bar' });
      barRow.createDiv({ text: 'Sign (1b)', cls: 'num-float-ribbon-bar-sign' });
      barRow.createDiv({ text: 'Exponent (' + fmt.expBits + 'b, Excess-' + fmt.bias + ')', cls: 'num-float-ribbon-bar-exp' });
      barRow.createDiv({ text: 'Mantissa / Fraction (' + fmt.mantissaBits + 'b)', cls: 'num-float-ribbon-bar-mant' });

      // Interactive Clickable Bit Strip
      var strip = ribbonContainer.createDiv({ cls: 'num-float-interactive-strip' });

      // Sign Bit Button
      var signBtn = strip.createEl('button', {
        cls: 'num-float-bit sign' + (dec.signBit === '1' ? ' active' : '')
      });
      signBtn.createSpan({ text: dec.signBit, cls: 'num-bit-val' });
      signBtn.createSpan({ text: 'S', cls: 'num-bit-label' });
      signBtn.addEventListener('click', function() {
        var rawArr = state.rawBits.split('');
        rawArr[0] = rawArr[0] === '1' ? '0' : '1';
        state.rawBits = rawArr.join('');
        var updated = decodeBits(state.rawBits);
        state.decimalVal = updated.formattedOutput;
        renderAll();
      });

      // Exponent Bit Buttons
      for (var e = 0; e < fmt.expBits; e++) {
        (function(idx) {
          var bVal = dec.expBits[idx];
          var eBtn = strip.createEl('button', {
            cls: 'num-float-bit exp ' + (bVal === '1' ? 'active' : 'inactive')
          });
          eBtn.createSpan({ text: bVal, cls: 'num-bit-val' });
          eBtn.createSpan({ text: 'e' + (fmt.expBits - 1 - idx), cls: 'num-bit-label' });
          eBtn.addEventListener('click', function() {
            var rawArr = state.rawBits.split('');
            rawArr[1 + idx] = rawArr[1 + idx] === '1' ? '0' : '1';
            state.rawBits = rawArr.join('');
            var updated = decodeBits(state.rawBits);
            state.decimalVal = updated.formattedOutput;
            renderAll();
          });
        })(e);
      }

      // Separator
      strip.createDiv({ style: 'width: 1px; background: var(--background-modifier-border, #444); margin: 2px 4px;' });

      // Mantissa Bit Buttons (up to 32 bits clickable)
      var maxMantDisplay = Math.min(dec.mantBits.length, 32);
      for (var m = 0; m < maxMantDisplay; m++) {
        (function(idx) {
          var bVal = dec.mantBits[idx];
          var mBtn = strip.createEl('button', {
            cls: 'num-float-bit mant ' + (bVal === '1' ? 'active' : 'inactive')
          });
          mBtn.createSpan({ text: bVal, cls: 'num-bit-val' });
          mBtn.createSpan({ text: '2^-' + (idx + 1), cls: 'num-bit-label' });
          mBtn.addEventListener('click', function() {
            var rawArr = state.rawBits.split('');
            rawArr[1 + fmt.expBits + idx] = rawArr[1 + fmt.expBits + idx] === '1' ? '0' : '1';
            state.rawBits = rawArr.join('');
            var updated = decodeBits(state.rawBits);
            state.decimalVal = updated.formattedOutput;
            renderAll();
          });
        })(m);
      }

      // --- Render Breakdown Cards (Sign, Exponent, Mantissa) ---
      cardsContainer.empty();

      // Card 1: Sign (S)
      var cardSign = cardsContainer.createDiv({ cls: 'num-convert-card' });
      var signHdr = cardSign.createDiv({ cls: 'num-float-card-header' });
      signHdr.createSpan({ text: 'Sign (S)', cls: 'num-float-card-title', style: 'color: #f87171;' });
      var signValRow = cardSign.createDiv({ cls: 'num-card-bits-row' });
      signValRow.createSpan({ text: dec.signBit, cls: 'num-convert-card-bits', style: 'font-size: 1.4em;' });
      signValRow.createSpan({ text: '(-1)^' + dec.signBit + ' = ' + dec.signVal, cls: 'num-convert-card-sub' });
      var signFooter = cardSign.createDiv({ cls: 'num-card-footer' });
      signFooter.createSpan({ text: dec.isNeg ? 'Negative number (-)' : 'Positive number (+)', cls: 'num-convert-card-sub' });

      // Card 2: Biased Exponent (E)
      var cardExp = cardsContainer.createDiv({ cls: 'num-convert-card' });
      var expHdr = cardExp.createDiv({ cls: 'num-float-card-header' });
      expHdr.createSpan({ text: 'Biased Exponent (E)', cls: 'num-float-card-title', style: 'color: #7dd3fc;' });
      expHdr.createSpan({ text: 'Hex: 0x' + dec.expHex.replace(/^0x/, ''), cls: 'num-float-card-hex', style: 'color: #7dd3fc;' });

      var expValRow = cardExp.createDiv({ cls: 'num-card-bits-row' });
      expValRow.createSpan({ text: dec.rawExp.toString(), cls: 'num-convert-card-bits', style: 'font-size: 1.4em;' });
      expValRow.createSpan({ text: 'e = E - ' + fmt.bias + ' = ' + dec.unbiasedExp, cls: 'num-convert-card-sub' });
      var expFooter = cardExp.createDiv({ cls: 'num-card-footer', style: 'display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;' });
      expFooter.createSpan({ text: 'Pattern: ' + formatBinaryWithSpaces(dec.expBits), cls: 'num-convert-card-sub', style: 'flex: 1;' });
      var expCopyBtn = createCopyButton(expFooter, dec.expBits, 'Copy binary exponent');
      expCopyBtn.style.marginLeft = 'auto';
      expCopyBtn.style.flexShrink = '0';

      // Card 3: Mantissa / Fraction (M)
      var cardMant = cardsContainer.createDiv({ cls: 'num-convert-card' });
      var mantHdr = cardMant.createDiv({ cls: 'num-float-card-header' });
      mantHdr.createSpan({ text: 'Mantissa / Fraction (M)', cls: 'num-float-card-title', style: 'color: #6ee7b7;' });
      mantHdr.createSpan({ text: 'Hex: 0x' + dec.mantHex.replace(/^0x/, ''), cls: 'num-float-card-hex', style: 'color: #6ee7b7;' });

      var mantValRow = cardMant.createDiv({ cls: 'num-card-bits-row' });
      mantValRow.createSpan({ text: dec.mantSum.toString(), cls: 'num-convert-card-bits', style: 'font-size: 1.25em; word-break: break-all;' });
      mantValRow.createSpan({ text: dec.classification === 'subnormal' ? 'Implicit bit: 0' : 'Implicit bit: 1', cls: 'num-convert-card-sub' });
      var mantFooter = cardMant.createDiv({ cls: 'num-card-footer', style: 'display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;' });
      mantFooter.createSpan({ text: 'M: ' + formatBinaryWithSpaces(dec.mantBits), cls: 'num-convert-card-sub', style: 'font-family: var(--font-monospace, monospace); color: #6ee7b7; font-size: 0.85em; word-break: break-all; flex: 1;' });
      var mantCopyBtn = createCopyButton(mantFooter, dec.mantBits, 'Copy binary mantissa');
      mantCopyBtn.style.marginLeft = 'auto';
      mantCopyBtn.style.flexShrink = '0';

      // --- Render Evaluated Mathematical Reconstruction ---
      reconContainer.empty();
      var reconTitle = reconContainer.createDiv({ cls: 'num-recon-header' });
      reconTitle.createSpan({ text: 'Evaluated Mathematical Reconstruction', style: 'font-weight: 700; color: #fff; font-size: 1em; flex: 1 1 auto;' });

      var copyBtn = reconTitle.createEl('button', {
        cls: 'num-recon-copy-btn'
      });
      copyBtn.setAttribute('title', 'Copy decimal value');
      function setStudioCopyBtnNormal() {
        copyBtn.innerHTML = '<span class="num-btn-icon" style="display: inline-flex; align-items: center; color: var(--interactive-accent, #60a5fa);">' + COPY_ICON_SVG + '</span><span>Copy Decimal</span>';
      }
      setStudioCopyBtnNormal();
      copyBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        navigator.clipboard.writeText(dec.formattedOutput).then(function() {
          if (window.obsidian && obsidian.Notice) {
            new obsidian.Notice('Copied: ' + dec.formattedOutput);
          }
          copyBtn.innerHTML = '<span class="num-btn-icon" style="display: inline-flex; align-items: center; color: #10b981;">' + CHECK_ICON_SVG + '</span><span style="color: #10b981;">Copied!</span>';
          setTimeout(setStudioCopyBtnNormal, 1500);
        });
      });

      var reconBox = reconContainer.createDiv({ style: 'line-height: 1.6; font-size: 0.9em;' });
      reconBox.createDiv({ text: 'General IEEE 754 Formula:', style: 'color: var(--text-muted, #888); font-size: 0.8em;' });
      reconBox.createDiv({
        text: 'Value = (-1)^S × (' + (dec.classification === 'subnormal' ? '0' : '1') + ' + Fraction) × 2^(Exponent - Bias)',
        style: 'color: #93c5fd; margin-bottom: 6px;'
      });

      reconBox.createDiv({ text: 'Substituted Equation:', style: 'color: var(--text-muted, #888); font-size: 0.8em; border-top: 1px solid var(--background-modifier-border, #333); padding-top: 6px;' });
      reconBox.createDiv({
        text: '= (' + dec.signVal + ') × (' + dec.effectiveMant.toFixed(8) + ') × 2^(' + dec.unbiasedExp + ')',
        style: 'color: #6ee7b7; font-weight: 700;'
      });

      var finalRow = reconBox.createDiv({
        style: 'display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--background-modifier-border, #333); margin-top: 8px; padding-top: 8px; font-size: 1.1em; font-weight: 700;'
      });
      finalRow.createSpan({ text: 'Final Real Value:', style: 'color: #fff;' });
      finalRow.createSpan({ text: dec.formattedOutput, style: 'color: #c084fc;' });

      if (state.decimalVal.trim() === '0.1') {
        var warnBox = reconContainer.createDiv({
          text: '⚠️ Precision Limit Warning: 0.1 decimal is an infinite recurring binary fraction (0.0001100110011...). Stored value is actually ' + dec.realVal + '.',
          style: 'margin-top: 8px; padding: 6px 10px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 4px; color: #fbbf24; font-size: 0.8em;'
        });
      }

      // --- Render Mantissa Bit Fractional Weights Table ---
      weightsContainer.empty();
      var weightsHeader = weightsContainer.createDiv({ cls: 'num-weights-header' });
      weightsHeader.createSpan({ text: 'Mantissa Bit Fractional Weights', cls: 'num-weights-title' });
      weightsHeader.createSpan({ text: 'Terms b_i × 2^-i', cls: 'num-weights-subtitle' });

      weightsContainer.createDiv({ text: 'Contribution of each bit weighted by 2^-i:', cls: 'num-weights-desc' });

      var weightsList = weightsContainer.createDiv({ cls: 'num-weights-list' });

      var maxWeightsDisplay = dec.mantDetails.length;
      for (var w = 0; w < maxWeightsDisplay; w++) {
        var item = dec.mantDetails[w];
        var row = weightsList.createDiv({ cls: 'num-weight-row ' + (item.active ? 'active' : 'inactive') });
        var left = row.createDiv({ style: 'display: flex; align-items: center; gap: 10px;' });
        left.createSpan({ text: 'b_' + item.index, cls: 'num-weight-badge' });
        left.createSpan({
          text: item.bit,
          cls: 'num-weight-bit ' + (item.active ? 'active' : 'inactive')
        });
        left.createSpan({ text: '× 2^' + item.power, cls: 'num-weight-power' });
        row.createSpan({
          text: item.active ? ('+' + (item.fracVal < 0.0001 ? item.fracVal.toExponential(4) : item.fracVal.toFixed(6))) : '0.000000',
          cls: item.active ? 'num-weight-val-active' : 'num-weight-val-inactive'
        });
      }

      var weightsFooter = weightsContainer.createDiv({ cls: 'num-weights-footer' });
      weightsFooter.createSpan({ text: 'Total Fraction Sum:', cls: 'num-weights-footer-label' });
      weightsFooter.createSpan({ text: dec.mantSum.toFixed(8), cls: 'num-weights-footer-sum' });
    }

    renderAll();
  }

  renderIntegerBlock(source, el) {
    var self = this;
    var lines = source.split('\n');
    var value = -42;
    var bits = 8;
    var customK = undefined;

    lines.forEach(function(l) {
      var parts = l.split(':');
      if (parts.length >= 2) {
        var key = parts[0].trim().toLowerCase();
        var val = parts[1].trim();
        if (key === 'value' || key === 'number' || key === 'num' || key === 'val' || key === 'n') {
          value = parseInt(val, 10) || 0;
        }
        if (key === 'bits' || key === 'bit' || key === 'width' || key === 'w') {
          bits = parseInt(val, 10) || 8;
        }
        if (key === 'k' || key === 'bias' || key === 'offset') {
          customK = parseInt(val, 10);
        }
      } else {
        var trimmed = l.trim();
        if (/^-?\d+$/.test(trimmed)) {
          value = parseInt(trimmed, 10);
        }
      }
    });

    if (bits < 4) bits = 4;
    if (bits > 32) bits = 32;

    var half = Math.pow(2, bits - 1);
    var k = customK !== undefined ? customK : (half - 1);
    var absVal = Math.abs(value);

    // 1. Sign-Magnitude
    var smSign = value < 0 ? '1' : '0';
    var smMag = absVal.toString(2).padStart(bits - 1, '0').slice(-(bits - 1));
    var smBin = smSign + smMag;

    // 2. One's Complement
    var ocBin = '';
    if (value >= 0) {
      ocBin = absVal.toString(2).padStart(bits, '0').slice(-bits);
    } else {
      var pos = absVal.toString(2).padStart(bits, '0').slice(-bits);
      ocBin = pos.split('').map(function(b) { return b === '0' ? '1' : '0'; }).join('');
    }

    // 3. Two's Complement
    var tcBin = '';
    if (value >= 0) {
      tcBin = absVal.toString(2).padStart(bits, '0').slice(-bits);
    } else {
      var twoPow = Math.pow(2, bits);
      tcBin = (twoPow + value).toString(2).padStart(bits, '0').slice(-bits);
    }

    // 4. Excess-k
    var excessVal = value + k;
    var excessBin = excessVal >= 0 ? excessVal.toString(2).padStart(bits, '0').slice(-bits) : 'Overflow';

    var container = el.createDiv({ cls: 'num-convert-container' });
    var header = container.createDiv({ cls: 'num-convert-header' });

    var titleEl = header.createDiv({ cls: 'num-convert-title' });
    try {
      var iconSpan = titleEl.createSpan({ cls: 'num-studio-icon' });
      obsidian.setIcon(iconSpan, 'calculator');
    } catch (err) {}
    titleEl.createSpan({ text: 'Integer Encodings for ' + value + ' (' + bits + '-bit)' });

    // Link to Studio
    var studioLink = header.createEl('button', {
      cls: 'num-studio-link'
    });
    try {
      var btnIconSpan = studioLink.createSpan({ cls: 'num-studio-icon', style: 'margin-right: 4px;' });
      obsidian.setIcon(btnIconSpan, 'calculator');
    } catch (err) {}
    studioLink.createSpan({ text: 'Open in Studio ↗' });
    studioLink.addEventListener('click', function(e) {
      e.preventDefault();
      self.activateStudioView({ section: 'integers', value: value, bits: bits, customK: customK });
    });

    var grid = container.createDiv({ cls: 'num-convert-grid' });

    // Ranges & Hex values
    var minValSM = -(half - 1);
    var maxValSM = half - 1;
    var rangeSM = '[' + minValSM + ', +' + maxValSM + ']';
    var hexSM = binaryToHex(smBin);

    var minValOC = -(half - 1);
    var maxValOC = half - 1;
    var rangeOC = '[' + minValOC + ', +' + maxValOC + ']';
    var hexOC = binaryToHex(ocBin);

    var minValTC = -half;
    var maxValTC = half - 1;
    var rangeTC = '[' + minValTC + ', +' + maxValTC + ']';
    var hexTC = binaryToHex(tcBin);

    var minValEK = -k;
    var maxValEK = Math.pow(2, bits) - 1 - k;
    var rangeEK = '[' + minValEK + ', +' + maxValEK + ']';
    var hexEK = binaryToHex(excessBin);

    // Card: Sign & Magnitude
    var c1 = grid.createDiv({ cls: 'num-convert-card' });
    var c1Hdr = c1.createDiv({ cls: 'num-convert-card-header' });
    c1Hdr.createEl('div', { text: 'Sign-and-Magnitude', cls: 'num-convert-card-title' });
    c1Hdr.createEl('span', { text: rangeSM, cls: 'num-card-range' });

    var c1Row = c1.createDiv({ cls: 'num-card-bits-row' });
    c1Row.createEl('div', { text: formatBinaryWithSpaces(smBin), cls: 'num-convert-card-bits' });
    if (smBin !== 'Overflow') {
      createCopyButton(c1Row, smBin, 'Copy binary');
    }

    var c1Ftr = c1.createDiv({ cls: 'num-card-footer' });
    c1Ftr.createEl('div', { text: smBin !== 'Overflow' ? ('Sign: ' + smSign + ' | Mag: ' + formatBinaryWithSpaces(smMag)) : 'Overflow', cls: 'num-convert-card-sub' });
    if (smBin !== 'Overflow') {
      var hx1 = c1Ftr.createDiv({ cls: 'num-card-hex' });
      hx1.createSpan({ text: 'Hex: 0x' + hexSM });
      createCopyButton(hx1, '0x' + hexSM, 'Copy hex');
    }

    // Card: 1's Complement
    var c2 = grid.createDiv({ cls: 'num-convert-card' });
    var c2Hdr = c2.createDiv({ cls: 'num-convert-card-header' });
    c2Hdr.createEl('div', { text: "One's Complement", cls: 'num-convert-card-title' });
    c2Hdr.createEl('span', { text: rangeOC, cls: 'num-card-range' });

    var c2Row = c2.createDiv({ cls: 'num-card-bits-row' });
    c2Row.createEl('div', { text: formatBinaryWithSpaces(ocBin), cls: 'num-convert-card-bits' });
    if (ocBin !== 'Overflow') {
      createCopyButton(c2Row, ocBin, 'Copy binary');
    }

    var c2Ftr = c2.createDiv({ cls: 'num-card-footer' });
    c2Ftr.createEl('div', { text: ocBin !== 'Overflow' ? (value < 0 ? 'Bitwise NOT (~x)' : 'Direct binary') : 'Overflow', cls: 'num-convert-card-sub' });
    if (ocBin !== 'Overflow') {
      var hx2 = c2Ftr.createDiv({ cls: 'num-card-hex' });
      hx2.createSpan({ text: 'Hex: 0x' + hexOC });
      createCopyButton(hx2, '0x' + hexOC, 'Copy hex');
    }

    // Card: 2's Complement
    var c3 = grid.createDiv({ cls: 'num-convert-card' });
    var c3Hdr = c3.createDiv({ cls: 'num-convert-card-header' });
    c3Hdr.createEl('div', { text: "Two's Complement", cls: 'num-convert-card-title' });
    c3Hdr.createEl('span', { text: rangeTC, cls: 'num-card-range' });

    var c3Row = c3.createDiv({ cls: 'num-card-bits-row' });
    c3Row.createEl('div', { text: formatBinaryWithSpaces(tcBin), cls: 'num-convert-card-bits' });
    if (tcBin !== 'Overflow') {
      createCopyButton(c3Row, tcBin, 'Copy binary');
    }

    var c3Ftr = c3.createDiv({ cls: 'num-card-footer' });
    c3Ftr.createEl('div', { text: tcBin !== 'Overflow' ? ('MSB weight = -' + half) : 'Overflow', cls: 'num-convert-card-sub' });
    if (tcBin !== 'Overflow') {
      var hx3 = c3Ftr.createDiv({ cls: 'num-card-hex' });
      hx3.createSpan({ text: 'Hex: 0x' + hexTC });
      createCopyButton(hx3, '0x' + hexTC, 'Copy hex');
    }

    // Card: Excess-k
    var c4 = grid.createDiv({ cls: 'num-convert-card' });
    var c4Hdr = c4.createDiv({ cls: 'num-convert-card-header' });
    c4Hdr.createEl('div', { text: 'Excess-' + k + ' (Biased)', cls: 'num-convert-card-title' });
    c4Hdr.createEl('span', { text: rangeEK, cls: 'num-card-range' });

    var c4Row = c4.createDiv({ cls: 'num-card-bits-row' });
    c4Row.createEl('div', { text: formatBinaryWithSpaces(excessBin), cls: 'num-convert-card-bits' });
    if (excessBin !== 'Overflow') {
      createCopyButton(c4Row, excessBin, 'Copy binary');
    }

    var c4Ftr = c4.createDiv({ cls: 'num-card-footer' });
    c4Ftr.createEl('div', { text: excessBin !== 'Overflow' ? ('Stored: ' + excessVal + ' (k = ' + k + ')') : 'Overflow', cls: 'num-convert-card-sub' });
    if (excessBin !== 'Overflow') {
      var hx4 = c4Ftr.createDiv({ cls: 'num-card-hex' });
      hx4.createSpan({ text: 'Hex: 0x' + hexEK });
      createCopyButton(hx4, '0x' + hexEK, 'Copy hex');
    }
  }

  renderFloatBlock(source, el) {
    var self = this;
    var lines = source.split('\n');
    var val = -13.625;
    var precision = 'single';

    lines.forEach(function(l) {
      var parts = l.split(':');
      if (parts.length >= 2) {
        var key = parts[0].trim().toLowerCase();
        var v = parts[1].trim();
        if (key === 'value' || key === 'number' || key === 'val' || key === 'num' || key === 'n' || key === 'float') {
          val = parseFloat(v) || 0;
        }
        if (key === 'precision' || key === 'format' || key === 'type') {
          precision = v.toLowerCase();
        }
      } else {
        var trimmed = l.trim();
        if (/^-?\d+(\.\d+)?([eE]-?\d+)?$/.test(trimmed)) {
          val = parseFloat(trimmed) || 0;
        }
      }
    });

    var f32 = new Float32Array(1);
    f32[0] = val;
    var u32 = new Uint32Array(f32.buffer);
    var bits = u32[0].toString(2).padStart(32, '0');
    var sign = bits[0];
    var exp = bits.slice(1, 9);
    var mant = bits.slice(9);
    var rawExp = parseInt(exp, 2);
    var unbiased = rawExp - 127;
    var signVal = sign === '1' ? -1 : 1;
    var mantSum = 0;
    for (var mIdx = 0; mIdx < mant.length; mIdx++) {
      if (mant[mIdx] === '1') {
        mantSum += Math.pow(2, -(mIdx + 1));
      }
    }
    var effectiveMant = 1 + mantSum;
    var expHex = '0x' + rawExp.toString(16).toUpperCase().padStart(2, '0');
    var mantPadded = mant.padStart(24, '0');
    var mantHexVal = '';
    for (var k = 0; k < 24; k += 4) {
      mantHexVal += parseInt(mantPadded.slice(k, k + 4), 2).toString(16).toUpperCase();
    }
    var mantHex = '0x' + mantHexVal;
    var fullHex = binaryToHex(bits);

    var container = el.createDiv({ cls: 'num-convert-container' });
    var header = container.createDiv({ cls: 'num-convert-header' });
    var titleEl = header.createDiv({ cls: 'num-convert-title' });
    try {
      var iconSpan = titleEl.createSpan({ cls: 'num-studio-icon' });
      obsidian.setIcon(iconSpan, 'calculator');
    } catch (err) {}
    titleEl.createSpan({ text: 'IEEE 754 Single Precision (32-bit): ' + val });

    // Link to Studio
    var studioLink = header.createEl('button', {
      cls: 'num-studio-link'
    });
    try {
      var btnIconSpan = studioLink.createSpan({ cls: 'num-studio-icon', style: 'margin-right: 4px;' });
      obsidian.setIcon(btnIconSpan, 'calculator');
    } catch (err) {}
    studioLink.createSpan({ text: 'Open in Studio ↗' });
    studioLink.addEventListener('click', function(e) {
      e.preventDefault();
      self.activateStudioView({ section: 'floats', val: val, precision: precision });
    });

    // Divider & Ribbon
    container.createEl('hr', { cls: 'num-studio-divider' });
    var ribbonHdr = container.createDiv({ style: 'display: flex; justify-content: space-between; align-items: center; font-size: 0.85em; font-family: var(--font-monospace, monospace); margin-bottom: 6px;' });
    ribbonHdr.createSpan({ text: 'IEEE 754 Bit Ribbon (32-Bit):', style: 'font-weight: 600;' });
    ribbonHdr.createSpan({ text: 'Hex: 0x' + fullHex, style: 'color: var(--text-muted, #aaa);' });

    var ribbon = container.createDiv({ cls: 'num-float-ribbon' });
    ribbon.createEl('div', { text: 'Sign (1b): ' + sign, cls: 'num-float-sign' });
    ribbon.createEl('div', { text: 'Exp (8b, Excess-127): ' + formatBinaryWithSpaces(exp) + ' (e = ' + unbiased + ')', cls: 'num-float-exp' });
    ribbon.createEl('div', { text: 'Mantissa (23b): ' + formatBinaryWithSpaces(mant), cls: 'num-float-mantissa' });

    // Breakdown Cards
    var grid = container.createDiv({ cls: 'num-convert-grid', style: 'margin-top: 12px;' });

    // Sign Card
    var cardSign = grid.createDiv({ cls: 'num-convert-card' });
    var sHdr = cardSign.createDiv({ cls: 'num-float-card-header' });
    sHdr.createSpan({ text: 'Sign (S)', cls: 'num-float-card-title', style: 'color: #f87171;' });
    var sRow = cardSign.createDiv({ cls: 'num-card-bits-row' });
    sRow.createSpan({ text: sign, cls: 'num-convert-card-bits', style: 'font-size: 1.3em;' });
    sRow.createSpan({ text: '(-1)^' + sign + ' = ' + signVal, cls: 'num-convert-card-sub' });
    var sFtr = cardSign.createDiv({ cls: 'num-card-footer' });
    sFtr.createSpan({ text: sign === '1' ? 'Negative (-)' : 'Positive (+)', cls: 'num-convert-card-sub' });

    // Exponent Card
    var cardExp = grid.createDiv({ cls: 'num-convert-card' });
    var expHdr = cardExp.createDiv({ cls: 'num-float-card-header' });
    expHdr.createSpan({ text: 'Biased Exponent (E)', cls: 'num-float-card-title', style: 'color: #7dd3fc;' });
    expHdr.createSpan({ text: 'Hex: 0x' + rawExp.toString(16).toUpperCase().padStart(2, '0'), cls: 'num-float-card-hex', style: 'color: #7dd3fc;' });
    var eRow = cardExp.createDiv({ cls: 'num-card-bits-row' });
    eRow.createSpan({ text: rawExp.toString(), cls: 'num-convert-card-bits', style: 'font-size: 1.3em;' });
    eRow.createSpan({ text: 'e = ' + rawExp + ' - 127 = ' + unbiased, cls: 'num-convert-card-sub' });
    var eFtr = cardExp.createDiv({ cls: 'num-card-footer', style: 'display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;' });
    eFtr.createSpan({ text: 'Pattern: ' + formatBinaryWithSpaces(exp), cls: 'num-convert-card-sub', style: 'flex: 1;' });
    var eCopyBtn = createCopyButton(eFtr, exp, 'Copy binary exponent');
    eCopyBtn.style.marginLeft = 'auto';
    eCopyBtn.style.flexShrink = '0';

    // Mantissa Card
    var cardMant = grid.createDiv({ cls: 'num-convert-card' });
    var mantHdr = cardMant.createDiv({ cls: 'num-float-card-header' });
    mantHdr.createSpan({ text: 'Mantissa / Fraction (M)', cls: 'num-float-card-title', style: 'color: #6ee7b7;' });
    mantHdr.createSpan({ text: 'Hex: 0x' + mantHexVal, cls: 'num-float-card-hex', style: 'color: #6ee7b7;' });
    var mRow = cardMant.createDiv({ cls: 'num-card-bits-row' });
    mRow.createSpan({ text: mantSum.toString(), cls: 'num-convert-card-bits', style: 'font-size: 1.2em; word-break: break-all;' });
    mRow.createSpan({ text: 'Implicit leading bit: 1', cls: 'num-convert-card-sub' });
    var mFtr = cardMant.createDiv({ cls: 'num-card-footer', style: 'display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;' });
    mFtr.createSpan({ text: 'M: ' + formatBinaryWithSpaces(mant), cls: 'num-convert-card-sub', style: 'font-family: var(--font-monospace, monospace); color: #6ee7b7; font-size: 0.85em; word-break: break-all; flex: 1;' });
    var mCopyBtn = createCopyButton(mFtr, mant, 'Copy binary mantissa');
    mCopyBtn.style.marginLeft = 'auto';
    mCopyBtn.style.flexShrink = '0';

    // Reconstruction Box
    var reconContainer = container.createDiv({ cls: 'num-recon-box', style: 'margin-top: 14px;' });
    var reconTitle = reconContainer.createDiv({ cls: 'num-recon-header' });
    reconTitle.createSpan({ text: 'Evaluated Mathematical Reconstruction', style: 'font-weight: 700; color: #fff; font-size: 0.95em; flex: 1 1 auto;' });
    var copyBtn = reconTitle.createEl('button', {
      cls: 'num-recon-copy-btn'
    });
    copyBtn.setAttribute('title', 'Copy decimal value');
    function setBlockCopyBtnNormal() {
      copyBtn.innerHTML = '<span class="num-btn-icon" style="display: inline-flex; align-items: center; color: var(--interactive-accent, #60a5fa);">' + COPY_ICON_SVG + '</span><span>Copy Decimal</span>';
    }
    setBlockCopyBtnNormal();
    copyBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      navigator.clipboard.writeText(val.toString()).then(function() {
        if (window.obsidian && obsidian.Notice) {
          new obsidian.Notice('Copied: ' + val.toString());
        }
        copyBtn.innerHTML = '<span class="num-btn-icon" style="display: inline-flex; align-items: center; color: #10b981;">' + CHECK_ICON_SVG + '</span><span style="color: #10b981;">Copied!</span>';
        setTimeout(setBlockCopyBtnNormal, 1500);
      });
    });

    var reconBox = reconContainer.createDiv({ style: 'line-height: 1.6; font-size: 0.85em; font-family: var(--font-monospace, monospace);' });
    reconBox.createDiv({ text: 'Value = (-1)^S × (1 + Fraction) × 2^(Exponent - 127)', style: 'color: #93c5fd; margin-bottom: 4px;' });
    reconBox.createDiv({ text: '= (' + signVal + ') × (' + effectiveMant.toFixed(8) + ') × 2^(' + unbiased + ')', style: 'color: #6ee7b7; font-weight: 700;' });
    var finalRow = reconBox.createDiv({ style: 'display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--background-modifier-border, #333); margin-top: 6px; padding-top: 6px; font-size: 1.05em; font-weight: 700;' });
    finalRow.createSpan({ text: 'Final Real Value:', style: 'color: #fff;' });
    finalRow.createSpan({ text: val.toString(), style: 'color: #c084fc;' });
  }
}

module.exports = NumberConversionsPlugin;

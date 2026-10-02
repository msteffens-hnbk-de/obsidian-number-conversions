# Obsidian Number Conversions Plugin & Studio

An interactive Obsidian plugin to explore, analyze, and encode numbers directly inside your vault:

- **Interactive Number Conversions Studio**:
  - Open via the Calculator Ribbon Icon or Command Palette (`Open Number Conversions Studio`).
  - Open directly from any code block using the **"Open in Studio ↗"** button.
  - Works as an active workspace leaf/tab, right sidebar panel, or modal dialog.
  - Interactive bit clicker: flip individual bits in real-time to observe immediate recalculations.
  - One-click snippet insertion directly into your active note.

- **Section 1: Signed Integer Encodings**:
  - **Sign-and-Magnitude**: Sign bit + magnitude representation with positive/negative zero analysis.
  - **One's Complement**: Diminished radix complement with bit inversion step-by-step.
  - **Two's Complement**: Radix complement with MSB weight $-2^{n-1}$, range boundaries, and overflow detection.
  - **Excess-k / Biased Encoding**: Offset binary with standard bias ($2^{n-1} - 1$) or custom user-specified bias.
  - Configurable bit widths (4 to 32 bits), interactive bit ribbon, and mathematical breakdown cards.

- **Section 2: IEEE 754 Floating-Point Laboratory (Single Precision 32-bit)**:
  - **Standard**: Single Precision 32-bit (1 sign bit, 8 biased exponent bits with bias 127, 23 fraction/mantissa bits).
  - **Input Modes**: Decimal, Hexadecimal, and Binary synchronized inputs with quick presets (`-13.625`, `0.1`, `3.14159`, `±0`, `±Infinity`, `NaN`, `Subnormal`).
  - **Interactive Ribbon**: Color-coded bit strip with live clickable bit toggles for Sign, Exponent, and Mantissa bits.
  - **Breakdown Cards**: Dedicated structured cards for **Sign (S)**, **Biased Exponent (E)**, and **Mantissa / Fraction (M)**.
  - **Mantissa Bit Fractional Weights**: Detailed table of binary fractional weights ($b_i \times 2^{-i}$) showing active terms and total fraction sum.
  - **Evaluated Mathematical Reconstruction**: Complete mathematical derivation showing general formula, substituted parameters, final evaluated decimal value, and periodic binary fraction warnings.

## Installation Instructions

1. In your Obsidian vault folder, open the hidden plugins directory:
   `<VaultFolder>/.obsidian/plugins/`
2. Create a folder named exactly:
   `obsidian-number-conversions`
3. Put these files into that folder:
   - `manifest.json`
   - `main.js`
   - `styles.css`
4. In Obsidian:
   - Go to **Settings -> Community plugins**
   - Click **Reload plugins**
   - Toggle **Number Conversions & Representations** to **ON**.

## Usage in Any Note

Both `number:` and `value:` syntax are supported:

### 1. Integer Conversions Block
```numconvert
number: -42
bits: 8
```

With custom bias (Excess-k):
```numconvert
number: -15
bits: 8
bias: 127
```

### 2. IEEE 754 Floating-Point Block
```ieee754
number: -13.625
```

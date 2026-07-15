<p align="center">
  <img src="img/favicon.svg" alt="Favicon" width="128"/>
</p>

# Vigenère64

A lightweight, browser-based tool implementing a custom Vigenère cipher (ROT1, key "islam") with preprocessing rules, plus Base64 encoding.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=white)](https://www.javascript.com/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)

## Overview

**Vigenère64** is a client-side web application that transforms a phrase through a fixed set of preprocessing rules and then encrypts it with a custom Vigenère cipher (key `islam`, ROT1 shift). It also includes a standalone Base64 tab for encoding arbitrary text, including Cyrillic and emoji. Built with vanilla JavaScript, HTML5, and CSS3, it runs entirely in the browser with no external dependencies and no data transmitted anywhere.

## Features

- **Vigenère Cipher Engine**: Encrypts a 10-character normalized word using the key `islam` with a ROT1 shift: `C[i] = (P[i] + K[i] + 1) mod 26`.
- **Deterministic Preprocessing**: Three ordered rules — trimming to length 10, replacing special characters with position-based letters, and padding shorter words — guarantee a consistent 10-letter input for the cipher.
- **Step-by-Step Breakdown**: Displays each preprocessing step live as the phrase is typed, so the transformation is fully transparent.
- **Base64 Tab**: Encodes any text (including Cyrillic and emoji) to Base64 using `btoa()`/`encodeURIComponent()`, independent of the Vigenère preprocessing rules.
- **Privacy Focused**: Executes entirely in the browser. No data is transmitted to external servers.
- **Legacy Browser Support**: Written in plain ES5 (no frameworks, no arrow functions or template literals), with classic UTF-8/Base64 conversion and clipboard fallbacks — works down to IE11.
- **Russian-Only Interface**: All labels, hints, and error messages are in Russian (`lang="ru"`); there is no language switcher or localization layer.

## Algorithm Details

The Vigenère phrase is first normalized to exactly 10 characters through three rules:

- **A — Shift** (if longer than 10): characters are removed one at a time depending on the position of a special character (non `a`–`z`), until the length is 10.
- **B — Special-character substitution**: each special character is replaced by a letter corresponding to its position in the word (position 1 → `a`, position 2 → `b`, …).
- **C — Padding** (if shorter than 10): letters are appended starting from the letter at index (length + 1) until the word reaches 10 characters.

The normalized 10-letter word is then encrypted with the Vigenère cipher using the cyclic key `islam` and a ROT1 shift, so each ciphertext letter is `(plaintext letter + key letter + 1) mod 26`.

The Base64 tab is independent of these rules: input text is converted to UTF-8 and encoded directly with the browser's built-in `btoa()`.

## License

This project is licensed under the **GNU General Public License v3.0 or later**. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome.

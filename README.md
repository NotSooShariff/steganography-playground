# 🖼️ Steganography Tool

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

This web-based steganography tool allows you to hide text within images (embed text) or extract hidden text from images (decrypt text). It utilizes image pixel manipulation and binary encoding for embedding and extraction. Built using React, this tool simplifies the process of text steganography.

## Features

- **Embed Text in Image**: Hide a secret message inside an image by encoding it into the pixel data.
- **Decrypt Text from Image**: Extract the hidden message from an image.
- **Download & Copy**: Download the modified image or the decrypted text, or copy them to your clipboard.

## Technologies Used

- **React**: Frontend framework for building the user interface.
- **Canvas API**: Used for manipulating the image's pixel data.
- **Lucide-react**: Provides icons for the user interface (Lock, Unlock, Download, Image).

## Usage

1. **Embedding Text**:
   - Click the **Embed Text** tab.
   - Select an image and enter the message you want to hide.
   - Click **Embed** to encode the text in the image.
   - After processing, download the modified image or copy it to your clipboard.

2. **Decrypting Text**:
   - Click the **Decrypt Text** tab.
   - Upload an image with embedded text.
   - The tool will extract and display the hidden message.
   - Download or copy the decrypted text.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

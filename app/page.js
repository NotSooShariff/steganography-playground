"use client"
import React, { useState, useCallback, useRef } from 'react';
import { Download, Image as ImageIcon, Lock, Unlock } from 'lucide-react';

export default function SteganographyTool() {
  const [tab, setTab] = useState('embed');
  const [image, setImage] = useState(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [hiddenText, setHiddenText] = useState(null);
  const fileInputRef = useRef(null);
  const resultImageRef = useRef(null);

  const textToBinary = useCallback((text) => {
    try {
      const lengthBinary = text.length.toString(2).padStart(16, '0');
      let binary = lengthBinary;
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        binary += charCode.toString(2).padStart(16, '0');
      }
      return binary;
    } catch (err) {
      setError('Failed to convert text to binary');
      return null;
    }
  }, []);

  const binaryToText = useCallback((binary) => {
    try {
      const textLength = parseInt(binary.slice(0, 16), 2);
      let text = '';
      for (let i = 16; i < 16 * (textLength + 1); i += 16) {
        const char = binary.slice(i, i + 16);
        text += String.fromCharCode(parseInt(char, 2));
      }
      return text;
    } catch (err) {
      setError('Failed to convert binary to text');
      return null;
    }
  }, []);

  const calculateEmbeddingCapacity = (imageData) => {
    return Math.floor((imageData.width * imageData.height) / 8);
  };

  const encodeText = useCallback((text, imgData) => {
    return new Promise((resolve, reject) => {
      const binaryText = textToBinary(text);
      if (!binaryText) {
        reject(new Error('Failed to encode text'));
        return;
      }

      const imageData = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      imageData.onload = () => {
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        ctx.drawImage(imageData, 0, 0);

        const pixels = ctx.getImageData(0, 0, imageData.width, imageData.height);
        const pixelData = pixels.data;

        const capacity = calculateEmbeddingCapacity(pixels);
        const requiredBits = binaryText.length;
        if (requiredBits > capacity) {
          reject(new Error(`Text is too long. Max capacity: ${capacity} bits, Required: ${requiredBits} bits`));
          return;
        }

        let bitIndex = 0;
        for (let i = 2; i < pixelData.length && bitIndex < binaryText.length; i += 4) {
          const bit = parseInt(binaryText[bitIndex], 2);
          pixelData[i] = (pixelData[i] & 0xFE) | bit;
          bitIndex++;
        }

        ctx.putImageData(pixels, 0, 0);
        const newImage = canvas.toDataURL('image/png');

        const metadataCanvas = document.createElement('canvas');
        const metadataCtx = metadataCanvas.getContext('2d');
        metadataCanvas.width = 1;
        metadataCanvas.height = 1;

        const base64Text = btoa(text);
        metadataCtx.fillStyle = `#${base64Text.slice(0, 6)}`;
        metadataCtx.fillRect(0, 0, 1, 1);

        resolve({
          image: newImage,
          metadata: metadataCanvas.toDataURL()
        });
      };

      imageData.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      imageData.src = imgData;
    });
  }, [textToBinary]);

  const decodeText = useCallback((imgData) => {
    return new Promise((resolve, reject) => {
      const imageData = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      imageData.onload = () => {
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        ctx.drawImage(imageData, 0, 0);

        const pixels = ctx.getImageData(0, 0, imageData.width, imageData.height);
        const pixelData = pixels.data;

        let binaryData = '';
        for (let i = 2; i < pixelData.length; i += 4) {
          binaryData += (pixelData[i] & 0x01).toString();
        }

        const decodedText = binaryToText(binaryData);

        if (decodedText) {
          resolve(decodedText);
          return;
        }

        const metadataCanvas = document.createElement('canvas');
        const metadataCtx = metadataCanvas.getContext('2d');
        metadataCanvas.width = 1;
        metadataCanvas.height = 1;

        const tempImg = new Image();
        tempImg.onload = () => {
          metadataCtx.drawImage(tempImg, 0, 0, 1, 1);
          const pixel = metadataCtx.getImageData(0, 0, 1, 1).data;

          const colorHex = rgbToHex(pixel[0], pixel[1], pixel[2]);
          try {
            const base64Text = colorHex + imageData.src.split('#')[1];
            const decodedTextFromMetadata = atob(base64Text);
            resolve(decodedTextFromMetadata);
          } catch (err) {
            reject(new Error('No hidden text found'));
          }
        };
        tempImg.src = imgData;
      };

      imageData.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      imageData.src = imgData;
    });
  }, [binaryToText]);

  const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setResult(null);
      setError(null);
      setHiddenText(null);
    }
  };

  const handleEmbed = () => {
    if (!image || !text) {
      setError('Please select an image and enter text to embed');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const embeddedResult = await encodeText(text, e.target.result);
        setResult(embeddedResult.image);
        setHiddenText(text);
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsDataURL(image);
  };

  const handleDecrypt = () => {
    if (!image) {
      setError('Please select an image to decrypt');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const hiddenText = await decodeText(e.target.result);
        setResult(hiddenText);
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsDataURL(image);
  };
  const handleDownload = () => {
    if (result) {
      const link = document.createElement('a');
      link.href = result;
      link.download = tab === 'embed' 
        ? 'steganography-embedded-image.png' 
        : 'steganography-decrypted-text.txt';
      link.click();
    }
  };

  const copyToClipboard = () => {
    if (result) {
      if (tab === 'embed') {
        navigator.clipboard.writeText('Embedded image saved to your downloads');
      } else {
        navigator.clipboard.writeText(result);
      }
      alert('Copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
      {/* Dot pattern background */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </div>

      <main className="container mx-auto px-4 py-12 max-w-xl relative z-10">
        <div className="bg-slate-800/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          {/* Header with gradient and subtle glow */}
          <div className="bg-slate-800/90 p-6 text-center relative overflow-hidden">
            <div className="absolute -inset-px bg-gradient-to-r from-transparent via-blue-500/10 to-transparent blur-3xl"></div>
            <h1 className="text-5xl font-bold text-blue-400 relative z-10">
              Steganography Tool
            </h1>
            <p className="text-slate-400 mt-2 relative z-10">Hide messages within images</p>
          </div>

          {/* Tab Navigation with more refined styling */}
          <div className="flex border-b border-slate-700/50">
            <button
              className={`flex-1 p-4 flex items-center justify-center space-x-2 transition-all ${tab === 'embed' 
                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500' 
                : 'text-slate-400 hover:bg-slate-700/50'}`}
              onClick={() => setTab('embed')}
            >
              <Lock className="w-5 h-5" />
              <span>Embed Text</span>
            </button>
            <button
              className={`flex-1 p-4 flex items-center justify-center space-x-2 transition-all ${tab === 'decrypt' 
                ? 'bg-green-600/20 text-green-400 border-b-2 border-green-500' 
                : 'text-slate-400 hover:bg-slate-700/50'}`}
              onClick={() => setTab('decrypt')}
            >
              <Unlock className="w-5 h-5" />
              <span>Decrypt Text</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="p-8">
            {/* Image Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">Select Image</label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="flex items-center space-x-2 bg-slate-700 text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <ImageIcon className="w-5 h-5" />
                  <span>{image ? image.name : 'Choose Image'}</span>
                </button>
                {image && <span className="text-sm text-slate-400">{image.name}</span>}
              </div>
            </div>

            {/* Text Input for Embedding */}
            {tab === 'embed' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Enter Message</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows="4"
                  placeholder="Type your secret message here..."
                  className="block w-full text-sm text-slate-300 bg-slate-700/50 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500/50 transition-all"
                ></textarea>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 mb-6">
              {tab === 'embed' && (
                <button
                  onClick={handleEmbed}
                  disabled={!image || !text}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md transition duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lock className="w-5 h-5" />
                  <span>Embed Text</span>
                </button>
              )}
              {tab === 'decrypt' && (
                <button
                  onClick={handleDecrypt}
                  disabled={!image}
                  className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-lg shadow-md transition duration-200 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Unlock className="w-5 h-5" />
                  <span>Decrypt Text</span>
                </button>
              )}
            </div>

            {/* Error Handling */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-center mb-4">
                {error}
              </div>
            )}

            {/* Result Display */}
            {result && (
              <div className="mt-6 bg-slate-700/50 rounded-lg p-6 text-center">
                {tab === 'embed' ? (
                  <>
                    <h2 className="text-lg font-semibold text-blue-400 mb-4">Embedded Image</h2>
                    <img 
                      ref={resultImageRef}
                      src={result} 
                      alt="Embedded result" 
                      className="mx-auto mt-4 w-full max-h-96 object-contain rounded-lg shadow-lg" 
                    />
                    <div className="flex justify-center space-x-4 mt-4">
                      <button
                        onClick={handleDownload}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        <span>Download Image</span>
                      </button>
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center space-x-2 bg-slate-700 text-slate-300 px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  </>
                ) : (
                  <div>
                    <h2 className="text-lg font-semibold text-green-400 mb-4">Hidden Message</h2>
                    <p className="text-slate-300 bg-slate-800 p-4 rounded-lg break-words">{result}</p>
                    <div className="flex justify-center space-x-4 mt-4">
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Copy Message
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Subtle Footer */}
        <footer className="text-center text-slate-500 mt-6 text-sm">
          Like this project? <a className='underline' href="http://github.com">Contribute to it!</a>
        </footer>
      </main>
    </div>
  );
}
# Compression Algorithm Comparison Demo

A browser-based demo that compares the performance of three popular compression
algorithms:

- **Gzip** (using [fflate](https://github.com/101arrowz/fflate))
- **Brotli** (using [brotli-wasm](https://github.com/httptoolkit/brotli-wasm))
- **Zlib** (using [pako](https://github.com/nodeca/pako))

## Features

- 📁 **File Selection**: Upload multiple files of any type for compression
  testing
- ⏱️ **Performance Metrics**: Measures compression time and compression ratio
  for each algorithm
- 📊 **Visual Comparison**: Side-by-side comparison with highlighted best
  performers
- 🏆 **Smart Analysis**: Automatically identifies the fastest algorithm and best
  compression ratio
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Beautiful, intuitive interface with smooth animations

## How It Works

1. **Select Files**: Click the file input area and select one or more files to
   compress
2. **Compare**: Click "Compare Compression" to run all three algorithms
3. **Analyze Results**: View detailed metrics including:
   - Compression time (milliseconds)
   - Compression ratio (original:compressed)
   - Original and compressed file sizes
   - Percentage size reduction

## Metrics Explained

- **Compression Time**: How long each algorithm takes to compress your data
- **Compression Ratio**: How much the data is compressed (higher is better)
- **Size Reduction**: Percentage reduction in file size

## Installation & Usage

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Dependencies

- `fflate` - Fast and lightweight gzip compression
- `brotli-wasm` - WebAssembly-based Brotli compression for high performance
- `pako` - High-speed zlib port to JavaScript
- `vite` - Fast development server and build tool

## Browser Compatibility

- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 16+

WebAssembly support is required for Brotli compression

## Performance Considerations

- **Gzip (fflate)**: Generally fast with good compression ratios, widely
  supported
- **Brotli**: Often achieves the best compression ratios but may be slower
- **Zlib (pako)**: Fast compression with moderate compression ratios

Results may vary significantly based on:

- File type and content
- File size
- Browser and device performance

## Use Cases

This demo is useful for:

- Comparing compression algorithms for your specific data
- Understanding trade-offs between compression speed and ratio
- Choosing the right algorithm for web applications
- Educational purposes and performance testing

## Technical Details

- Uses ES6 modules and modern JavaScript features
- Implements async/await for better performance
- Combines multiple files into a single buffer for fair comparison
- Measures performance using `performance.now()` for high precision
- Gracefully handles compression errors

## License

This project is open source and available under the ISC License.

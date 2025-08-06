import { gzip as fflateGzip, gunzip as fflateGunzip } from 'fflate';
import init, * as brotli from "./node_modules/brotli-wasm/pkg.web/brotli_wasm";
import wasmUrl from "./node_modules/brotli-wasm/pkg.web/brotli_wasm_bg.wasm?url";

import * as pako from 'pako';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

class CompressionDemo {
    constructor() {
        this.files = [];
        this.brotliWasm = null;
        this.initializeElements();
        this.bindEvents();
        this.initializeBrotli();
    }

    async initializeBrotli() {
        try {
            this.brotliWasm = await init(wasmUrl).then(() => brotli);
            console.log('Brotli WASM initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Brotli WASM:', error);
        }
    }

    initializeElements() {
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.compareBtn = document.getElementById('compareBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.loading = document.getElementById('loading');
        this.results = document.getElementById('results');
    }

    bindEvents() {
        this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        this.compareBtn.addEventListener('click', () => this.compareCompression());
        this.clearBtn.addEventListener('click', () => this.clearResults());
    }

    handleFileSelection(event) {
        this.files = Array.from(event.target.files);
        this.updateFileInfo();
        this.compareBtn.disabled = this.files.length === 0;
    }

    updateFileInfo() {
        if (this.files.length === 0) {
            this.fileInfo.innerHTML = '';
            this.fileInfo.classList.add('hidden');
            return;
        }

        const totalSize = this.files.reduce((sum, file) => sum + file.size, 0);
        
        const fileList = this.files.map(file => 
            `<div><strong>${file.name}</strong> - ${this.formatBytes(file.size)}</div>`
        ).join('');

        let sizeWarning = '';
        if (totalSize > MAX_FILE_SIZE) {
            sizeWarning = `<div style="margin-top: 10px; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; color: #856404;">
                <strong>⚠️ Large File Warning:</strong> Files larger than 15MB may cause performance issues. Only the first 15MB will be tested.
            </div>`;
        } else if (totalSize > 2 * 1024 * 1024) { // 2MB
            sizeWarning = `<div style="margin-top: 10px; padding: 10px; background: #e3f2fd; border: 1px solid #bbdefb; border-radius: 4px; color: #1565c0;">
                <strong>💡 Performance Note:</strong> For files above 2MB, Brotli compression can take up to 20 seconds and may cause the browser to freeze temporarily during processing.
            </div>`;
        }

        this.fileInfo.innerHTML = `
            <div><strong>Selected Files (${this.files.length}):</strong></div>
            ${fileList}
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                <strong>Total Size: ${this.formatBytes(totalSize)}</strong>
            </div>
            ${sizeWarning}
        `;
        this.fileInfo.classList.remove('hidden');
    }

    async compareCompression() {
        this.loading.style.display = 'block';
        this.results.style.display = 'none';

        try {
            // Ensure Brotli is initialized
            if (!this.brotliWasm) {
                console.log('Waiting for Brotli WASM to initialize...');
                await new Promise(resolve => {
                    const checkInit = () => {
                        if (this.brotliWasm) {
                            resolve();
                        } else {
                            setTimeout(checkInit, 100);
                        }
                    };
                    checkInit();
                });
            }

            // Combine all files into a single buffer for comparison
            const combinedData = await this.combineFiles();
            
            // Limit data size to prevent freezing (max 5MB)
            const testData = combinedData.length > MAX_FILE_SIZE 
                ? combinedData.slice(0, MAX_FILE_SIZE) 
                : combinedData;
            
            if (combinedData.length > MAX_FILE_SIZE) {
                console.warn(`File size too large (${this.formatBytes(combinedData.length)}). Testing with first ${this.formatBytes(MAX_FILE_SIZE)} only.`);
            }
            
            console.log(`Testing compression with ${this.formatBytes(testData.length)} of data`);
            
            // Run tests sequentially to avoid overwhelming the browser
            const results = [];
            
            console.log('Testing Gzip...');
            results.push(await this.testGzip(testData));
            
            console.log('Testing Brotli...');
            results.push(await this.testBrotli(testData));
            
            console.log('Testing Zlib...');
            results.push(await this.testZlib(testData));

            this.displayResults(results, testData.length);
        } catch (error) {
            console.error('Error during compression:', error);
            alert('An error occurred during compression. Please check the console for details.');
        } finally {
            this.loading.style.display = 'none';
        }
    }

    async combineFiles() {
        const buffers = await Promise.all(
            this.files.map(file => file.arrayBuffer())
        );
        
        const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
        const combined = new Uint8Array(totalLength);
        
        let offset = 0;
        buffers.forEach(buffer => {
            combined.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
        });
        
        return combined;
    }

    async testGzip(data) {
        const compressionStart = performance.now();
        
        return new Promise((resolve, reject) => {
            // Add a timeout to prevent infinite hanging
            const timeout = setTimeout(() => {
                reject(new Error('Gzip compression timed out'));
            }, 30000); // 30 second timeout
            
            try {
                fflateGzip(data, (err, compressed) => {
                    if (err) {
                        clearTimeout(timeout);
                        reject(err);
                        return;
                    }
                    
                    const compressionEnd = performance.now();
                    const compressionTime = compressionEnd - compressionStart;
                    
                    // Test decompression
                    const decompressionStart = performance.now();
                    fflateGunzip(compressed, (err, decompressed) => {
                        clearTimeout(timeout);
                        const decompressionEnd = performance.now();
                        const decompressionTime = decompressionEnd - decompressionStart;
                        
                        if (err) {
                            reject(new Error('Gzip decompression failed: ' + err.message));
                        } else {
                            // Verify data integrity
                            const isValid = decompressed.length === data.length;
                            
                            resolve({
                                algorithm: 'gzip',
                                compressionTime: compressionTime,
                                decompressionTime: decompressionTime,
                                totalTime: compressionTime + decompressionTime,
                                originalSize: data.length,
                                compressedSize: compressed.length,
                                ratio: data.length / compressed.length,
                                isValid: isValid
                            });
                        }
                    });
                });
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        }).catch(error => {
            console.error('Gzip test failed:', error);
            return {
                algorithm: 'gzip',
                compressionTime: 0,
                decompressionTime: 0,
                totalTime: 0,
                originalSize: data.length,
                compressedSize: data.length,
                ratio: 1,
                isValid: false,
                error: 'Test failed: ' + error.message
            };
        });
    }

    async testBrotli(data) {
        const compressionStart = performance.now();
        
        try {
            if (!this.brotliWasm) {
                throw new Error('Brotli WASM not initialized');
            }
            
            // Add timeout for brotli compression
            const compressionPromise = Promise.race([
                Promise.resolve(this.brotliWasm.compress(data)),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Brotli compression timed out')), 30000)
                )
            ]);
            
            const compressed = await compressionPromise;
            const compressionEnd = performance.now();
            const compressionTime = compressionEnd - compressionStart;
            
            // Test decompression
            const decompressionStart = performance.now();
            const decompressionPromise = Promise.race([
                Promise.resolve(this.brotliWasm.decompress(compressed)),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Brotli decompression timed out')), 30000)
                )
            ]);
            
            const decompressed = await decompressionPromise;
            const decompressionEnd = performance.now();
            const decompressionTime = decompressionEnd - decompressionStart;
            
            // Verify data integrity
            const isValid = decompressed.length === data.length;
            
            return {
                algorithm: 'brotli',
                compressionTime: compressionTime,
                decompressionTime: decompressionTime,
                totalTime: compressionTime + decompressionTime,
                originalSize: data.length,
                compressedSize: compressed.length,
                ratio: data.length / compressed.length,
                isValid: isValid
            };
        } catch (error) {
            console.error('Brotli test failed:', error);
            return {
                algorithm: 'brotli',
                compressionTime: 0,
                decompressionTime: 0,
                totalTime: 0,
                originalSize: data.length,
                compressedSize: data.length,
                ratio: 1,
                isValid: false,
                error: 'Test failed: ' + error.message
            };
        }
    }

    async testZlib(data) {
        const compressionStart = performance.now();
        
        try {
            // Add timeout wrapper for zlib compression
            const compressionPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Zlib compression timed out'));
                }, 30000);
                
                try {
                    const compressed = pako.deflate(data);
                    clearTimeout(timeout);
                    resolve(compressed);
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            });
            
            const compressed = await compressionPromise;
            const compressionEnd = performance.now();
            const compressionTime = compressionEnd - compressionStart;
            
            // Test decompression
            const decompressionStart = performance.now();
            const decompressionPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Zlib decompression timed out'));
                }, 30000);
                
                try {
                    const decompressed = pako.inflate(compressed);
                    clearTimeout(timeout);
                    resolve(decompressed);
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            });
            
            const decompressed = await decompressionPromise;
            const decompressionEnd = performance.now();
            const decompressionTime = decompressionEnd - decompressionStart;
            
            // Verify data integrity
            const isValid = decompressed.length === data.length;
            
            return {
                algorithm: 'zlib',
                compressionTime: compressionTime,
                decompressionTime: decompressionTime,
                totalTime: compressionTime + decompressionTime,
                originalSize: data.length,
                compressedSize: compressed.length,
                ratio: data.length / compressed.length,
                isValid: isValid
            };
        } catch (error) {
            console.error('Zlib test failed:', error);
            return {
                algorithm: 'zlib',
                compressionTime: 0,
                decompressionTime: 0,
                totalTime: 0,
                originalSize: data.length,
                compressedSize: data.length,
                ratio: 1,
                isValid: false,
                error: 'Test failed: ' + error.message
            };
        }
    }

    displayResults(results, originalSize) {
        // Update individual algorithm results
        results.forEach(result => {
            this.updateAlgorithmResult(result);
        });

        // Find best performing algorithms
        const validResults = results.filter(r => !r.error);
        const fastestAlgorithm = validResults.reduce((fastest, current) => 
            current.totalTime < fastest.totalTime ? current : fastest
        );
        const bestRatioAlgorithm = validResults.reduce((best, current) => 
            current.ratio > best.ratio ? current : best
        );

        // Highlight best performers
        this.highlightBestPerformers(fastestAlgorithm, bestRatioAlgorithm);

        // Generate summary
        this.generateSummary(results, fastestAlgorithm, bestRatioAlgorithm);

        this.results.style.display = 'block';
    }

    updateAlgorithmResult(result) {
        const prefix = result.algorithm === 'gzip' ? 'gzip' : 
                      result.algorithm === 'brotli' ? 'brotli' : 'zlib';

        document.getElementById(`${prefix}CompressionTime`).textContent = 
            result.error ? 'Error' : `${result.compressionTime.toFixed(2)}ms`;
        document.getElementById(`${prefix}DecompressionTime`).textContent = 
            result.error ? 'Error' : `${result.decompressionTime.toFixed(2)}ms`;
        document.getElementById(`${prefix}TotalTime`).textContent = 
            result.error ? 'Error' : `${result.totalTime.toFixed(2)}ms`;
        document.getElementById(`${prefix}Ratio`).textContent = 
            result.error ? 'Error' : `${result.ratio.toFixed(2)}:1`;
        document.getElementById(`${prefix}Original`).textContent = 
            this.formatBytes(result.originalSize);
        document.getElementById(`${prefix}Compressed`).textContent = 
            result.error ? 'Error' : this.formatBytes(result.compressedSize);
        document.getElementById(`${prefix}Validity`).textContent = 
            result.error ? 'Error' : (result.isValid ? '✅ Valid' : '❌ Invalid');
    }

    highlightBestPerformers(fastest, bestRatio) {
        // Clear previous highlights
        document.querySelectorAll('.algorithm-result').forEach(el => {
            el.classList.remove('best-time', 'best-ratio', 'winner');
        });

        // Highlight fastest
        const fastestElement = document.getElementById(`${fastest.algorithm}Result`);
        if (fastestElement) {
            fastestElement.classList.add('best-time');
        }

        // Highlight best ratio
        const bestRatioElement = document.getElementById(`${bestRatio.algorithm}Result`);
        if (bestRatioElement) {
            bestRatioElement.classList.add('best-ratio');
        }

        // If same algorithm is best in both categories, mark as overall winner
        if (fastest.algorithm === bestRatio.algorithm) {
            const winnerElement = document.getElementById(`${fastest.algorithm}Result`);
            if (winnerElement) {
                winnerElement.classList.remove('best-time', 'best-ratio');
                winnerElement.classList.add('winner');
            }
        }
    }

    generateSummary(results, fastest, bestRatio) {
        const summaryContent = document.getElementById('summaryContent');
        
        let summary = `<div style="display: grid; gap: 15px;">`;
        
        // Performance summary
        summary += `<div>`;
        summary += `<strong>🚀 Fastest Total Time:</strong> ${fastest.algorithm.toUpperCase()} `;
        summary += `(${fastest.totalTime.toFixed(2)}ms total - ${fastest.compressionTime.toFixed(2)}ms compression + ${fastest.decompressionTime.toFixed(2)}ms decompression)`;
        summary += `</div>`;
        
        summary += `<div>`;
        summary += `<strong>🎯 Best Compression Ratio:</strong> ${bestRatio.algorithm.toUpperCase()} `;
        summary += `(${bestRatio.ratio.toFixed(2)}:1 - ${(((bestRatio.originalSize - bestRatio.compressedSize) / bestRatio.originalSize) * 100).toFixed(1)}% reduction)`;
        summary += `</div>`;

        // Data integrity check
        const invalidResults = results.filter(r => !r.error && !r.isValid);
        if (invalidResults.length > 0) {
            summary += `<div style="color: #d32f2f;">`;
            summary += `<strong>⚠️ Data Integrity Issues:</strong> ${invalidResults.map(r => r.algorithm.toUpperCase()).join(', ')} failed data integrity checks`;
            summary += `</div>`;
        } else {
            summary += `<div style="color: #4caf50;">`;
            summary += `<strong>✅ Data Integrity:</strong> All algorithms passed data integrity checks`;
            summary += `</div>`;
        }

        // Detailed comparison
        summary += `<div style="margin-top: 20px;">`;
        summary += `<strong>📊 Detailed Analysis:</strong>`;
        summary += `<ul style="margin-left: 20px; margin-top: 10px;">`;
        
        results.forEach(result => {
            if (!result.error) {
                const reduction = (((result.originalSize - result.compressedSize) / result.originalSize) * 100).toFixed(1);
                summary += `<li><strong>${result.algorithm.toUpperCase()}:</strong> ${result.totalTime.toFixed(2)}ms total (${result.compressionTime.toFixed(2)}ms + ${result.decompressionTime.toFixed(2)}ms), ${result.ratio.toFixed(2)}:1 ratio, ${reduction}% size reduction</li>`;
            } else {
                summary += `<li><strong>${result.algorithm.toUpperCase()}:</strong> ❌ ${result.error}</li>`;
            }
        });
        
        summary += `</ul>`;
        summary += `</div>`;

        // Recommendations
        summary += `<div style="margin-top: 20px; padding: 15px; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #2196F3;">`;
        summary += `<strong>💡 Recommendations:</strong><br>`;
        
        if (fastest.algorithm === bestRatio.algorithm) {
            summary += `<strong>${fastest.algorithm.toUpperCase()}</strong> is the clear winner, offering both the fastest total time (compression + decompression) and best compression ratio for your data.`;
        } else {
            summary += `Choose <strong>${fastest.algorithm.toUpperCase()}</strong> for speed-critical applications where both compression and decompression speed matter, `;
            summary += `or <strong>${bestRatio.algorithm.toUpperCase()}</strong> when file size is more important than processing speed.`;
        }
        
        summary += `</div>`;
        summary += `</div>`;
        
        summaryContent.innerHTML = summary;
    }

    clearResults() {
        this.results.style.display = 'none';
        this.fileInput.value = '';
        this.files = [];
        this.updateFileInfo();
        this.compareBtn.disabled = true;
        
        // Clear result highlights
        document.querySelectorAll('.algorithm-result').forEach(el => {
            el.classList.remove('best-time', 'best-ratio', 'winner');
        });
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CompressionDemo();
});

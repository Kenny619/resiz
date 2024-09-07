# Resiz 
Sharp based image resizing wrapper.

## Features

- Resize single images or entire directories
- Support for multiple image formats (jpg, png, webp, gif, etc.)
- Customizable output dimensions, quality, and format
- Automatic destination directory creation


## Usage
Download dist folder and run the following lines.
```javascript
import resiz from './dist/index.js';
await resiz.run({option: OptionInputs});
```

### Options

- `source` (required): Path to the source image or directory
- `destination` (optional): Path to the output directory. If not specified, a timestamped directory will be created at the same level as the source directory.
- `width` (optional): Desired width of the output image(s)
- `height` (optional): Desired height of the output image(s)
- `quality` (optional): Output image quality (1-100, default: 100)
- `format` (optional): Output image format (e.g., 'jpg', 'png', 'webp', default: 'jpg')

## Supported Formats

Resiz supports the following image formats:
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)
- JPEG 2000 (.jp2)
- TIFF (.tiff)
- AVIF (.avif)
- HEIF (.heif)
- JPEG XL (.jxl)
- RAW (.raw)
- TILE (.tile)

## Dependencies

- [sharp](https://sharp.pixelplumbing.com/): High performance Node.js image processing
- Node.js built-in modules: path, fs, worker_threads, url
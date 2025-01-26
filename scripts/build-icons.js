const fs = require('fs').promises;
const path = require('path');

// Function to create a simple PNG buffer for an icon
function createIconBuffer(size) {
  // PNG header (simplified for demonstration)
  const header = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  // PNG signature
    0x00, 0x00, 0x00, 0x0D,                          // IHDR chunk length
    0x49, 0x48, 0x44, 0x52,                          // "IHDR"
    0x00, 0x00, 0x00, size,                          // width
    0x00, 0x00, 0x00, size,                          // height
    0x08,                                            // bit depth
    0x06,                                            // color type (RGBA)
    0x00,                                            // compression method
    0x00,                                            // filter method
    0x00                                             // interlace method
  ]);

  // Create a simple colored square
  const dataSize = size * size * 4;  // 4 bytes per pixel (RGBA)
  const imageData = Buffer.alloc(dataSize);
  
  for (let i = 0; i < dataSize; i += 4) {
    // Green color (matching the extension theme)
    imageData[i] = 76;     // R (4C in hex)
    imageData[i + 1] = 175; // G (AF in hex)
    imageData[i + 2] = 80;  // B (50 in hex)
    imageData[i + 3] = 255; // A (fully opaque)
  }

  return Buffer.concat([header, imageData]);
}

async function generateIcons() {
  const sizes = [16, 48, 128];
  const iconsDir = path.join(__dirname, '../icons');

  try {
    // Ensure icons directory exists
    await fs.mkdir(iconsDir, { recursive: true });

    // Generate icons for each size
    for (const size of sizes) {
      const iconBuffer = createIconBuffer(size);
      await fs.writeFile(
        path.join(iconsDir, `icon${size}.png`),
        iconBuffer
      );
    }

    console.log('Basic placeholder icons generated successfully!');
    console.log('Note: These are simple placeholder icons. For production,');
    console.log('please replace them with properly designed icons.');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons().catch(console.error);
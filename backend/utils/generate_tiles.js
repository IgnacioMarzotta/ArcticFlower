const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const tileSize = 256;
const inputImagePath = 'frontend/src/assets/img/globe/earth_8K.png';

const outputDir = 'tiles';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

(async () => {
  try {

    const metadata = await sharp(inputImagePath).metadata();
    const { width, height } = metadata;
    console.log(`Dimensiones de la imagen: ${width} x ${height}`);

    const cols = Math.ceil(width / tileSize);
    const rows = Math.ceil(height / tileSize);
    console.log(`Dividiendo en ${cols} columnas y ${rows} filas de tiles`);

    let tilePromises = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const left = col * tileSize;
        const top = row * tileSize;
    
        const tileWidth = (left + tileSize > width) ? (width - left) : tileSize;
        const tileHeight = (top + tileSize > height) ? (height - top) : tileSize;

        const outputTilePath = path.join(outputDir, `tile_${row}_${col}.jpg`);
        tilePromises.push(
          sharp(inputImagePath)
            .extract({ left, top, width: tileWidth, height: tileHeight })
            .toFile(outputTilePath)
        );
      }
    }


    await Promise.all(tilePromises);
    console.log('¡Tiles generados exitosamente!');
  } catch (error) {
    console.error('Error generando tiles:', error);
  }
})();

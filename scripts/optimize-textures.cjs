// optimize-textures.cjs — Redimensiona texturas de un GLB y re-empaca con meshopt.
const path = require('path');
const sharp = require('sharp');
const { NodeIO } = require('@gltf-transform/core');
const { KHRONOS_EXTENSIONS } = require('@gltf-transform/extensions');

const SRC = process.argv[2];
const DST = process.argv[3];
const MAX_SIZE = parseInt(process.argv[4] || '2048', 10);

(async () => {
  const io = new NodeIO();
  io.registerExtensions(KHRONOS_EXTENSIONS);
  const doc = await io.read(SRC);
  const texs = doc.getRoot().listTextures();
  console.log(`Texturas encontradas: ${texs.length}`);

  for (const tex of texs) {
    const img = tex.getImage();
    const mime = tex.getMimeType();
    if (!img) continue;
    const meta = await sharp(img).metadata();
    console.log(`  - ${meta.width}x${meta.height} ${mime} (${(img.length / 1024 / 1024).toFixed(2)} MB)`);
    if ((meta.width || 0) <= MAX_SIZE && (meta.height || 0) <= MAX_SIZE) continue;

    const next = await sharp(img)
      .resize(MAX_SIZE, MAX_SIZE, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    tex.setImage(next);
    tex.setMimeType('image/png');
    console.log(`    → ${(next.length / 1024 / 1024).toFixed(2)} MB`);
  }

  await io.write(DST, doc);
  console.log(`OK → ${DST}`);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
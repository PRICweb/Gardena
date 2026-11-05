export async function optimizeImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
  } catch {
    throw new Error('No se pudo abrir la imagen. Usá JPG, PNG, WebP o un formato compatible con tu navegador.');
  }
  try {
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('El navegador no pudo preparar la imagen.');
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let image = canvas.toDataURL('image/webp', 0.85);
    if (image.length > 2800000) image = canvas.toDataURL('image/webp', 0.7);
    if (!image.startsWith('data:image/') || image.length > 6500000) {
      throw new Error('No se pudo optimizar esta imagen. Probá exportarla como JPG o WebP.');
    }
    return image;
  } finally {
    bitmap.close();
  }
}

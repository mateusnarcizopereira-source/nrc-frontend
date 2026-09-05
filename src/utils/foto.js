// Processa a foto de perfil no CLIENTE antes de enviar: recorta em quadrado
// (centralizado), redimensiona pra 200x200 e comprime iterando a qualidade
// JPEG até caber no teto. O backend guarda em base64 dentro do próprio doc
// do usuário no Firestore (sem Firebase Storage configurado no projeto) —
// arquivo grande quebra de verdade, por isso a compressão é obrigatória,
// não só estética.
const TAMANHO = 200;
const TETO_BYTES = 100 * 1024; // 100KB — mesmo teto validado de novo no backend

export async function processarFotoPerfil(file) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('Use uma imagem JPG ou PNG.');
  }

  const bitmap = await createImageBitmap(file);
  const lado = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - lado) / 2;
  const sy = (bitmap.height - lado) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = TAMANHO;
  canvas.height = TAMANHO;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, sx, sy, lado, lado, 0, 0, TAMANHO, TAMANHO);

  let qualidade = 0.9;
  let blob = await canvasParaBlob(canvas, qualidade);
  while (blob.size > TETO_BYTES && qualidade > 0.2) {
    qualidade -= 0.1;
    blob = await canvasParaBlob(canvas, qualidade);
  }

  if (blob.size > TETO_BYTES) {
    throw new Error(
      `Imagem muito grande mesmo após compressão (${Math.round(blob.size / 1024)}KB, limite ${TETO_BYTES / 1024}KB). Tente uma foto mais simples.`
    );
  }

  const base64 = await blobParaBase64(blob);
  return { base64, tipo: 'image/jpeg' };
}

function canvasParaBlob(canvas, qualidade) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualidade));
}

function blobParaBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

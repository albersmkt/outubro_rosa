// Compose the campaign identity into the JPEG itself, not just its preview.
export async function createCampaignPhoto(video) {
  // Freeze the frame at the end of the countdown before loading the artwork.
  const snapshot = document.createElement('canvas');
  snapshot.width = video.videoWidth;
  snapshot.height = video.videoHeight;
  snapshot.getContext('2d').drawImage(video, 0, 0);
  const background = new Image();
  background.src = '/assets/perguntas.png';
  await background.decode();
  await document.fonts.load('700 64px Poppins');
  await document.fonts.load('400 32px Poppins');

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  const frame = { x: 70, y: 520, width: 940, height: 1000 };
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(frame.x, frame.y, frame.width, frame.height, 36);
  ctx.fillStyle = '#51172f';
  ctx.fill();
  ctx.clip();
  const scale = Math.min(frame.width / snapshot.width, frame.height / snapshot.height);
  const width = snapshot.width * scale;
  const height = snapshot.height * scale;
  const x = frame.x + (frame.width - width) / 2;
  const y = frame.y + (frame.height - height) / 2;
  ctx.translate(x + width, y);
  ctx.scale(-1, 1);
  ctx.drawImage(snapshot, 0, 0, width, height);
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(frame.x, frame.y, frame.width, frame.height, 36);
  ctx.strokeStyle = '#ffe5ed';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 68px Poppins';
  ctx.fillText('Se toca, mulher!', 540, 1660);
  ctx.font = '400 32px Poppins';
  ctx.fillText('INFORMAÇÃO TAMBÉM É PREVENÇÃO.', 540, 1750);
  ctx.font = '400 26px Poppins';
  ctx.fillStyle = '#ffe5ed';
  ctx.fillText('Um momento de carinho com você.', 540, 1810);
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('Não foi possível preparar a foto.'));
  }, 'image/jpeg', .9));
}

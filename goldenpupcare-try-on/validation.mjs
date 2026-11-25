export function decodePhoto(value) {
  if (typeof value !== 'string') throw new Error('Choose a dog photo.');
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw new Error('Use a JPG, PNG or WebP image.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length < 12 || bytes.length > 5 * 1024 * 1024) throw new Error('Photo must be under 5 MB.');
  const valid = match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : match[1] === 'png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP';
  if (!valid) throw new Error('Invalid image file.');
  return {bytes, type:'image/'+match[1], extension:match[1]};
}

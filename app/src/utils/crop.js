export function coverCrop(srcW, srcH, dstW, dstH) {
  const sRatio = srcW / srcH, dRatio = dstW / dstH;
  if (sRatio > dRatio) {
    const sHeight = srcH, sWidth = Math.round(dRatio * sHeight);
    const sx = Math.floor((srcW - sWidth) / 2);
    return { sx, sy: 0, sWidth, sHeight };
  } else {
    const sWidth = srcW, sHeight = Math.round(sWidth / dRatio);
    const sy = Math.floor((srcH - sHeight) / 2);
    return { sx: 0, sy, sWidth, sHeight };
  }
}

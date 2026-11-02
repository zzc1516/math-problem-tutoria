/* 46-image.js —— 题目图片：压缩后随消息直接交给视觉模型（不做中间转写） */
(function () {
  const MT = (window.MT = window.MT || {});
  const MAX_EDGE = 1400;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('这张图片浏览器打不开（可能是 HEIC 格式），请换成 JPG / PNG'));
      img.src = src;
    });
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error('读取图片失败'));
      fr.readAsDataURL(file);
    });
  }

  /** 压到长边 1400px 的 JPEG：省流量，也省 token */
  async function shrink(file) {
    const raw = await readAsDataUrl(file);
    const img = await loadImage(raw);
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    return { dataUrl, w, h, kb: Math.round((dataUrl.length * 0.75) / 1024) };
  }

  MT.image = { shrink };
})();

<script>
// ================= materials: texture layers over the game's clean masks =================
// The engine draws every tile as a clean picture (body, slip, green). This turns that
// picture into three images of real material, using the texture pack the harness makes:
//   sharp   fired clay and slip, each tile from its own part of the texture, with a bevel
//   worn    slip worn through by feet, stains, crazing, chips, faded and dulled
//   glaze   a transparent lead glaze: amber tint, a sheen, crazing in the glaze
// The game logic never sees any of this: seams are still read from the clean picture.
window.MATERIAL = (() => {
  const P = window.TEXPACK; if (!P) return null;
  const load = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  const maps = {}; let designs = [];
  const ready = Promise.all([
    ...Object.entries(P.maps).map(async ([k, list]) => { maps[k] = (await Promise.all(list.map(load))).filter(Boolean); }),
    Promise.all((P.designs || []).map(d => load(d.img))).then(ims => { designs = ims.filter(Boolean); }),
  ]);
  const rngOf = seed => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const scratch = document.createElement("canvas"), sx = scratch.getContext("2d", { willReadFrequently: true });

  // a part of a texture, turned and flipped, scaled so the tile shows about 40% of it
  function sample(list, S, r, share = .4) {
    scratch.width = scratch.height = S;
    const im = list[Math.floor(r() * list.length)]; if (!im) return null;
    const w = im.width * share, x0 = r() * (im.width - w), y0 = r() * (im.height - w);
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.translate(S / 2, S / 2); sx.rotate(Math.floor(r() * 4) * Math.PI / 2); if (r() < .5) sx.scale(-1, 1);
    sx.drawImage(im, x0, y0, w, w, -S / 2, -S / 2, S, S);
    return sx.getImageData(0, 0, S, S).data;
  }
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const canvasOf = (S, data) => { const c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d"); const im = x.createImageData(S, S); im.data.set(data); x.putImageData(im, 0, 0); return c; };

  function compose(clean, _S, seed) {
    const S = clean.width;
    const r = rngOf(seed ^ 0x5bd1e995);
    const src = clean.getContext("2d").getImageData(0, 0, S, S).data;
    const clay = sample(maps.clay, S, r), slip = sample(maps.slip, S, r), wear = sample(maps.wear, S, r, .6),
          stain = sample(maps.stain, S, r, .7), craze = sample(maps.craze, S, r, .35);
    const kiln = .9 + r() * .18, kilnWarm = (r() - .5) * 14;          // every tile fired a little differently
    const wearAmt = .45 + r() * .5, stainAmt = .25 + r() * .5;
    const ta = r() * 2 * Math.PI, tx = Math.cos(ta), ty = Math.sin(ta);  // the direction feet came from
    const sharp = new Uint8ClampedArray(S * S * 4), worn = new Uint8ClampedArray(S * S * 4), glaze = new Uint8ClampedArray(S * S * 4);
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i += 4) {
      const R = src[i], G = src[i + 1], B = src[i + 2];
      const green = G > R + 12 ? 1 : 0;
      const lum = R * .3 + G * .59 + B * .11, a = green ? 0 : sm(95, 205, lum);   // slip share, soft at the edges
      const cr = clay[i] * kiln + kilnWarm, cg = clay[i + 1] * kiln, cb = clay[i + 2] * kiln - kilnWarm * .5;
      let r0, g0, b0;
      if (green) { const l = (clay[i] + clay[i + 1] + clay[i + 2]) / 600; r0 = 62 + 40 * l; g0 = 98 + 52 * l; b0 = 44 + 26 * l; }
      else { r0 = cr + (slip[i] - cr) * a; g0 = cg + (slip[i + 1] - cg) * a; b0 = cb + (slip[i + 2] - cb) * a; }
      // bevel: light from the top left, the tile's edges rounded off
      const u = x / S, v = y / S, d = Math.min(u, v, 1 - u, 1 - v);
      const edge = sm(.07, 0, d), lit = ((1 - u) + (1 - v) - 1) * edge * .16, shade = 1 + lit - edge * .08;
      const grout = d < .012;
      sharp[i] = grout ? 42 : r0 * shade; sharp[i + 1] = grout ? 29 : g0 * shade; sharp[i + 2] = grout ? 20 : b0 * shade; sharp[i + 3] = 255;
      // worn: feet take the slip off first, more on the side they came from
      const w = (wear[i] / 255) * wearAmt + ((u - .5) * tx + (v - .5) * ty) * .3 + .05;
      const loss = sm(.3, .62, w) * a, rub = sm(.2, .9, w) * .14;
      let wr = r0 + (cr * 1.08 + 26 - r0) * loss, wg = g0 + (cg * 1.08 + 20 - g0) * loss, wb = b0 + (cb * 1.08 + 14 - b0) * loss;
      wr += (200 - wr) * rub * (1 - a); wg += (180 - wg) * rub * (1 - a); wb += (160 - wb) * rub * (1 - a);
      const s = stain[i] / 255 * stainAmt, c = craze[i] / 255 * (.25 + .5 * a);
      wr *= (1 - s * .42) * (1 - c * .55); wg *= (1 - s * .48) * (1 - c * .6); wb *= (1 - s * .55) * (1 - c * .6);
      const grey = (wr + wg + wb) / 3;                                    // centuries of dirt: duller and darker
      wr = (wr + (grey - wr) * .38) * .86 * shade; wg = (wg + (grey - wg) * .38) * .82 * shade; wb = (wb + (grey - wb) * .38) * .78 * shade;
      worn[i] = grout ? 34 : wr; worn[i + 1] = grout ? 25 : wg; worn[i + 2] = grout ? 18 : wb; worn[i + 3] = 255;
      // glaze: amber over the clay, little over green (already glazed), a diagonal sheen, fine crazing
      const sheen = Math.exp(-(((u + v) - .8) ** 2) / .12) * .07, cz = craze[i] / 255 * .3;
      const ga = grout ? 0 : (green ? .05 : .2) + sheen;
      glaze[i] = 255 * (sheen / ga || 0) + 225 * (1 - (sheen / ga || 0)) - cz * 120; glaze[i + 1] = 235 * (sheen / ga || 0) + 168 * (1 - (sheen / ga || 0)) - cz * 120; glaze[i + 2] = 200 * (sheen / ga || 0) + 70 * (1 - (sheen / ga || 0)) - cz * 100;
      glaze[i + 3] = Math.min(255, (ga + cz * .4) * 255);
    }
    const wc = canvasOf(S, worn), wx = wc.getContext("2d");
    // chips off the edges, and a crack or two
    wx.scale(S, S);
    for (let k = 0, n = Math.floor(r() * 3); k < n; k++) {
      const side = Math.floor(r() * 4), p = r(), dp = .03 + r() * .06, sp = .06 + r() * .14;
      const pts = [[p - sp / 2, 0], [p - sp / 4, dp], [p + sp / 5, dp * .9], [p + sp / 2, 0]].map(([a, b]) => side === 0 ? [a, b] : side === 1 ? [1 - b, a] : side === 2 ? [a, 1 - b] : [b, a]);
      wx.beginPath(); pts.forEach(([x, y], j) => j ? wx.lineTo(x, y) : wx.moveTo(x, y)); wx.closePath(); wx.fillStyle = r() < .5 ? "#6d6157" : "#857364"; wx.fill();
    }
    wx.strokeStyle = "rgba(14,9,6,.8)";
    for (let k = 0, n = r() < .55 ? 1 : 0; k < n; k++) { let px = r(), py = r() < .5 ? 0 : 1; if (r() < .5) [px, py] = [py, px]; wx.lineWidth = .006 + r() * .006;
      wx.beginPath(); wx.moveTo(px, py); for (let j = 0; j < 7; j++) { px = Math.max(0, Math.min(1, px + (r() - .5) * .26)); py = Math.max(0, Math.min(1, py + (r() - .5) * .26)); wx.lineTo(px, py); } wx.stroke(); }
    return { sharp: canvasOf(S, sharp), worn: wc, glaze: canvasOf(S, glaze) };
  }
  return { ready, compose, get designs() { return designs; }, on: true };
})();
</script>

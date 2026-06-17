// 배추 단면 모티프 PNG 아이콘 생성 (의존성 없음, zlib만 사용)
import zlib from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function hex(h) {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

// 동심원 (배추 단면)
const RINGS = [
  { r: 1.0, c: "#3f6b2a" },
  { r: 0.86, c: "#5b8c3e" },
  { r: 0.66, c: "#8ab560" },
  { r: 0.46, c: "#b9d68f" },
  { r: 0.26, c: "#e9f1da" },
].map((x) => ({ r: x.r, c: hex(x.c) }));

function makePNG(size) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.46;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      let color = [250, 247, 239];
      let alpha = 0;
      if (d <= maxR + 1) {
        const frac = d / maxR;
        let chosen = RINGS[0].c;
        for (let i = RINGS.length - 1; i >= 0; i--) {
          if (frac <= RINGS[i].r) chosen = RINGS[i].c;
        }
        color = chosen;
        alpha = 255;
        // 잎맥 (방사형 라인) 살짝
        const ang = Math.atan2(y - cy, x - cx);
        const veins = Math.abs(Math.sin(ang * 6));
        if (veins > 0.97 && frac > 0.3) color = RINGS[1].c;
      }
      raw[p++] = color[0];
      raw[p++] = color[1];
      raw[p++] = color[2];
      raw[p++] = alpha;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public", { recursive: true });
for (const s of [192, 512]) {
  writeFileSync(`public/icon-${s}.png`, makePNG(s));
  console.log(`public/icon-${s}.png 생성`);
}
// apple-touch-icon
writeFileSync("public/apple-icon.png", makePNG(180));
console.log("public/apple-icon.png 생성");

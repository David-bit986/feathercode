const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_SVG = "C:\\Users\\tanas\\Desktop\\New folder\\inkFeatherLogo.svg";
const OUT_DIR = path.join(ROOT, "src-tauri", "icons");
const SIZE = 1024;
const ZOOM = 1.0; // full size, clip-path handles edges

async function main() {
  const featherBuf = await sharp(SRC_SVG)
    .resize(Math.round(SIZE * ZOOM), Math.round(SIZE * ZOOM), { fit: "inside" })
    .png()
    .toBuffer();

  const featherMeta = await sharp(featherBuf).metadata();

  // Clean dark charcoal background — no orange
  const bgSvg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="c"><rect width="${SIZE}" height="${SIZE}" rx="120"/></clipPath></defs>
  <g clip-path="url(#c)">
    <rect width="${SIZE}" height="${SIZE}" fill="#1b1917"/>
    <rect x="28" y="28" width="${SIZE-56}" height="${SIZE-56}" rx="92"
          fill="none" stroke="#faf6f0" stroke-width="5" opacity="0.20"/>
    <rect x="40" y="40" width="${SIZE-80}" height="${SIZE-80}" rx="80"
          fill="none" stroke="#faf6f0" stroke-width="1.5" opacity="0.12"/>
  </g>
</svg>`;

  const offsetX = Math.round((SIZE - featherMeta.width) / 2);
  const offsetY = Math.round((SIZE - featherMeta.height) / 2);

  // Invert feather: black ink → cream white, rotate 12deg clockwise
  const targetSz = Math.round(SIZE * ZOOM);
  const featherWhite = await sharp(featherBuf)
    .negate({ alpha: false })
    .rotate(12, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .modulate({ brightness: 1.0, saturation: 0.1 })
    .resize(targetSz, targetSz, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const master = await sharp(Buffer.from(bgSvg))
    .composite([{ input: featherWhite, left: offsetX, top: offsetY, blend: "over" }])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(OUT_DIR, "icon.png"), master);
  console.log("Master icon generated");

  const sizes = [
    ["32x32.png", 32], ["128x128.png", 128], ["128x128@2x.png", 256],
    ["Square30x30Logo.png", 30], ["Square44x44Logo.png", 44], ["Square71x71Logo.png", 71],
    ["Square89x89Logo.png", 89], ["Square107x107Logo.png", 107], ["Square142x142Logo.png", 142],
    ["Square150x150Logo.png", 150], ["Square284x284Logo.png", 284], ["Square310x310Logo.png", 310],
    ["StoreLogo.png", 50],
  ];

  for (const [name, sz] of sizes) {
    const buf = await sharp(master).resize(sz, sz).png().toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, name), buf);
  }

  const android = {"android/mipmap-mdpi": 48, "android/mipmap-hdpi": 72,
                    "android/mipmap-xhdpi": 96, "android/mipmap-xxhdpi": 144,
                    "android/mipmap-xxxhdpi": 192};
  for (const [folder, px] of Object.entries(android)) {
    const base = path.join(OUT_DIR, folder);
    const buf = await sharp(master).resize(px, px).png().toBuffer();
    fs.writeFileSync(path.join(base, "ic_launcher.png"), buf);
    fs.writeFileSync(path.join(base, "ic_launcher_round.png"), buf);
    fs.writeFileSync(path.join(base, "ic_launcher_foreground.png"), buf);
  }

  const ios = {"ios/AppIcon-20x20@1x.png": 20, "ios/AppIcon-20x20@2x.png": 40,
               "ios/AppIcon-20x20@2x-1.png": 40, "ios/AppIcon-20x20@3x.png": 60,
               "ios/AppIcon-29x29@1x.png": 29, "ios/AppIcon-29x29@2x.png": 58,
               "ios/AppIcon-29x29@2x-1.png": 58, "ios/AppIcon-29x29@3x.png": 87,
               "ios/AppIcon-40x40@1x.png": 40, "ios/AppIcon-40x40@2x.png": 80,
               "ios/AppIcon-40x40@2x-1.png": 80, "ios/AppIcon-40x40@3x.png": 120,
               "ios/AppIcon-60x60@2x.png": 120, "ios/AppIcon-60x60@3x.png": 180,
               "ios/AppIcon-76x76@1x.png": 76, "ios/AppIcon-76x76@2x.png": 152,
               "ios/AppIcon-83.5x83.5@2x.png": 167, "ios/AppIcon-512@2x.png": 1024};
  for (const [name, px] of Object.entries(ios)) {
    const buf = await sharp(master).resize(px, px).png().toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, name), buf);
  }

  fs.copyFileSync(path.join(OUT_DIR, "icon.png"), path.join(ROOT, "public", "logo.png"));
  fs.copyFileSync(SRC_SVG, path.join(ROOT, "public", "feather-logo.svg"));
  console.log("All done — dark charcoal bg, feather at 96% zoom.");
}

main().catch(e => { console.error(e); process.exit(1); });

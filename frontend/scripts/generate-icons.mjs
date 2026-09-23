import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../");
const svgPath = path.join(rootDir, "public/aires-logo.svg");
const publicDir = path.join(rootDir, "public");
const iconsDir = path.join(rootDir, "public/icons");

if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

function createIcoFromPng(pngBuffer, size = 32) {
    const header = Buffer.from([0, 0, 1, 0, 1, 0]);
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(pngBuffer.length, 8);
    entry.writeUInt32LE(22, 12);
    return Buffer.concat([header, entry, pngBuffer]);
}

async function renderIcons() {
    let sharp;
    try {
        const imported = await import("sharp");
        sharp = imported.default;
    } catch {
        console.log("ℹ️  'sharp' package not found. Installing sharp to rasterize vector logo...");
        const { execSync } = await import("child_process");
        execSync("npm install -D sharp", { stdio: "inherit" });
        const imported = await import("sharp");
        sharp = imported.default;
    }

    const svgBuffer = fs.readFileSync(svgPath);

    // Targets to output (both in public/ and public/icons/)
    const targets = [
        // Standard PWA root targets
        { dest: path.join(publicDir, "pwa-192x192.png"), size: 192, pad: 0 },
        { dest: path.join(publicDir, "pwa-512x512.png"), size: 512, pad: 0 },

        // icons/ directory targets
        { dest: path.join(iconsDir, "icon-192.png"), size: 192, pad: 0 },
        { dest: path.join(iconsDir, "icon-512.png"), size: 512, pad: 0 },
        { dest: path.join(iconsDir, "icon-maskable-192.png"), size: 192, pad: 20 },
        { dest: path.join(iconsDir, "icon-maskable-512.png"), size: 512, pad: 54 },
        { dest: path.join(iconsDir, "apple-touch-icon.png"), size: 180, pad: 12 },
        { dest: path.join(iconsDir, "favicon-32x32.png"), size: 32, pad: 0 },
        { dest: path.join(iconsDir, "favicon-16x16.png"), size: 16, pad: 0 },
    ];

    console.log("🎨 Rasterizing official Aires 3D logo into transparent PNG icons...");

    for (const { dest, size, pad } of targets) {
        const innerSize = size - pad * 2;

        // Resize SVG with transparent background
        const resizedSvg = await sharp(svgBuffer)
            .resize(innerSize, innerSize, {
                fit: "contain",
                background: { r: 0, g: 0, b: 0, alpha: 0 }, // Fully transparent
            })
            .toBuffer();

        // Composite onto a 100% transparent canvas
        await sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }, // Fully transparent background
            },
        })
            .composite([{ input: resizedSvg, gravity: "center" }])
            .png({ compressionLevel: 9 })
            .toFile(dest);

        console.log(`✅ Generated transparent ${path.basename(dest)} (${size}x${size})`);
    }

    // Generate transparent public/favicon.ico
    const ico32Buffer = await sharp(svgBuffer)
        .resize(32, 32, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

    const icoBuffer = createIcoFromPng(ico32Buffer, 32);
    fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);
    console.log("✅ Generated transparent public/favicon.ico (32x32)");

    console.log("🎉 All icons generated with clean transparent backgrounds!");
}

renderIcons().catch((err) => {
    console.error("❌ Icon generation failed:", err);
    process.exit(1);
});
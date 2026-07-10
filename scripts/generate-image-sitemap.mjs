import fs from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://harinrc.github.io/turismo-en-mateare-managua-nicaragua";
const ROOT_PAGE_URL = `${SITE_URL}/`;
const OUT_FILE = path.resolve("sitemap-images.xml");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeImageUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("data:")) return null;
  return `${SITE_URL}/${value.replace(/^\/+/, "")}`;
}

function extractFirebaseConfig(source) {
  const projectIdMatch = source.match(/projectId:\s*"([^"]+)"/);
  const apiKeyMatch = source.match(/apiKey:\s*"([^"]+)"/);

  return {
    projectId: projectIdMatch ? projectIdMatch[1] : "",
    apiKey: apiKeyMatch ? apiKeyMatch[1] : ""
  };
}

function extractStaticImageCandidates(contentSource) {
  const candidates = [];

  const heroMatch = contentSource.match(/export const heroBackgroundImages\s*=\s*\[([\s\S]*?)\];/);
  if (heroMatch) {
    for (const match of heroMatch[1].matchAll(/"([^"]+)"/g)) {
      candidates.push(match[1]);
    }
  }

  for (const match of contentSource.matchAll(/imageUrl\s*:\s*"([^"]+)"/g)) {
    candidates.push(match[1]);
  }

  return candidates;
}

function extractStringValues(value) {
  if (!value) return [];
  if (value.stringValue) return [value.stringValue];

  if (value.arrayValue?.values) {
    return value.arrayValue.values
      .map((entry) => entry?.stringValue)
      .filter((entry) => typeof entry === "string" && entry.trim());
  }

  return [];
}

async function fetchFirestoreCollectionImages(projectId, apiKey, collectionName) {
  if (!projectId || !apiKey) return [];

  const images = [];
  let nextPageToken = "";

  do {
    const endpoint = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`
    );
    endpoint.searchParams.set("pageSize", "200");
    endpoint.searchParams.set("key", apiKey);
    if (nextPageToken) {
      endpoint.searchParams.set("pageToken", nextPageToken);
    }

    const response = await fetch(endpoint.toString());
    if (!response.ok) {
      break;
    }

    const payload = await response.json();
    const documents = Array.isArray(payload.documents) ? payload.documents : [];

    documents.forEach((doc) => {
      const fields = doc.fields || {};
      extractStringValues(fields.imageUrl).forEach((url) => images.push(url));
      extractStringValues(fields.imageUrls).forEach((url) => images.push(url));
    });

    nextPageToken = String(payload.nextPageToken || "");
  } while (nextPageToken);

  return images;
}

async function generateImageSitemap() {
  console.log("Starting image sitemap generation...");
  
  const [contentSource, firebaseConfigSource] = await Promise.all([
    fs.readFile(path.resolve("content.js"), "utf8"),
    fs.readFile(path.resolve("firebase-config.js"), "utf8")
  ]);

  console.log("✓ Read content.js and firebase-config.js");

  const staticCandidates = extractStaticImageCandidates(contentSource);
  const { projectId, apiKey } = extractFirebaseConfig(firebaseConfigSource);

  console.log(`Static images found: ${staticCandidates.length}`);
  console.log(`Firebase Project ID: ${projectId}`);

  const [placeImages, serviceImages] = await Promise.all([
    fetchFirestoreCollectionImages(projectId, apiKey, "places"),
    fetchFirestoreCollectionImages(projectId, apiKey, "services")
  ]);

  console.log(`Place images from Firestore: ${placeImages.length}`);
  console.log(`Service images from Firestore: ${serviceImages.length}`);

  const allImages = [...staticCandidates, ...placeImages, ...serviceImages]
    .map(normalizeImageUrl)
    .filter(Boolean);

  const uniqueImages = [...new Set(allImages)];
  const today = new Date().toISOString().slice(0, 10);

  console.log(`Total unique images: ${uniqueImages.length}`);

  const urlsXml = uniqueImages
    .map((imageUrl) => {
      const title = path.basename(new URL(imageUrl).pathname).replace(/[-_]+/g, " ").replace(/\.[a-z0-9]+$/i, "").trim();
      const caption = title ? `Imagen turística de Mateare: ${title}` : "Imagen turística de Mateare";

      return [
        "  <url>",
        `    <loc>${escapeXml(ROOT_PAGE_URL)}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        "    <image:image>",
        `      <image:loc>${escapeXml(imageUrl)}</image:loc>`,
        `      <image:caption>${escapeXml(caption)}</image:caption>`,
        "    </image:image>",
        "  </url>"
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    urlsXml,
    '</urlset>',
    ''
  ].join("\n");

  await fs.writeFile(OUT_FILE, xml, "utf8");
  console.log(`✓ Generated sitemap-images.xml with ${uniqueImages.length} image entries at ${OUT_FILE}`);
}

generateImageSitemap().catch((error) => {
  console.error("Failed to generate sitemap-images.xml:", error);
  process.exitCode = 1;
});

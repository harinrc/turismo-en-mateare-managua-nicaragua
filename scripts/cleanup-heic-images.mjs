#!/usr/bin/env node
/**
 * Cleanup script to remove HEIC images from Firestore
 * These images don't display in web browsers and should be removed
 * 
 * Usage:
 *   node scripts/cleanup-heic-images.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://harinrc.github.io/turismo-en-mateare-managua-nicaragua";
let firebaseConfig = {};

function extractFirebaseConfig(source) {
  const projectIdMatch = source.match(/projectId:\s*"([^"]+)"/);
  const apiKeyMatch = source.match(/apiKey:\s*"([^"]+)"/);

  return {
    projectId: projectIdMatch ? projectIdMatch[1] : "",
    apiKey: apiKeyMatch ? apiKeyMatch[1] : ""
  };
}

function isHeicImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lowerUrl = url.toLowerCase();
  
  // Check by URL extension
  if (lowerUrl.endsWith('.heic') || lowerUrl.endsWith('.heif')) {
    return true;
  }
  
  // Check Firebase Storage URLs by filename patterns
  if (lowerUrl.includes('firebasestorage.googleapis.com')) {
    if (lowerUrl.match(/(%2F|\/)[^%\/]*\.heic/i) || lowerUrl.match(/(%2F|\/)[^%\/]*\.heif/i)) {
      return true;
    }
  }
  
  return false;
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

async function fetchFirestoreCollectionWithHeic(projectId, apiKey, collectionName) {
  if (!projectId || !apiKey) return [];

  const heicDocuments = [];
  let nextPageToken = "";

  do {
    const endpoint = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`
    );
    endpoint.searchParams.set("pageSize", "100");
    endpoint.searchParams.set("key", apiKey);
    if (nextPageToken) {
      endpoint.searchParams.set("pageToken", nextPageToken);
    }

    const response = await fetch(endpoint.toString());
    if (!response.ok) {
      console.error(`Error fetching ${collectionName}:`, response.statusText);
      break;
    }

    const payload = await response.json();
    const documents = Array.isArray(payload.documents) ? payload.documents : [];

    documents.forEach((doc) => {
      const fields = doc.fields || {};
      const imageUrls = [];
      
      extractStringValues(fields.imageUrl).forEach((url) => imageUrls.push(url));
      extractStringValues(fields.imageUrls).forEach((url) => imageUrls.push(url));

      const heicUrls = imageUrls.filter(isHeicImageUrl);
      
      if (heicUrls.length > 0) {
        heicDocuments.push({
          docId: doc.name.split('/').pop(),
          collection: collectionName,
          name: fields.name?.stringValue || "Unknown",
          heicUrls: heicUrls,
          allImageUrls: imageUrls
        });
      }
    });

    nextPageToken = String(payload.nextPageToken || "");
  } while (nextPageToken);

  return heicDocuments;
}

async function cleanupHeicImages() {
  console.log("🔍 Firestore HEIC Image Cleanup Utility\n");
  console.log("⚠️  This utility identifies and removes HEIC images from Firestore.");
  console.log("   HEIC images don't display in web browsers and should be replaced with JPG/PNG.\n");
  
  // Read Firebase config
  const firebaseConfigSource = await fs.readFile(path.resolve("firebase-config.js"), "utf8");
  firebaseConfig = extractFirebaseConfig(firebaseConfigSource);

  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
    console.error("❌ Firebase config not found. Check firebase-config.js");
    process.exitCode = 1;
    return;
  }

  console.log(`📌 Project: ${firebaseConfig.projectId}\n`);
  console.log("Scanning collections for HEIC images...\n");

  const [placeResults, serviceResults] = await Promise.all([
    fetchFirestoreCollectionWithHeic(firebaseConfig.projectId, firebaseConfig.apiKey, "places"),
    fetchFirestoreCollectionWithHeic(firebaseConfig.projectId, firebaseConfig.apiKey, "services")
  ]);

  const allResults = [...placeResults, ...serviceResults];

  if (allResults.length === 0) {
    console.log("✅ No HEIC images found. Your database is clean!\n");
    return;
  }

  console.log(`⚠️  Found ${allResults.length} documents with HEIC images:\n`);
  
  allResults.forEach((doc, idx) => {
    console.log(`${idx + 1}. [${doc.collection}] "${doc.name}"`);
    console.log(`   Doc ID: ${doc.docId}`);
    console.log(`   HEIC images found: ${doc.heicUrls.length}`);
    console.log(`   Total images: ${doc.allImageUrls.length}`);
    doc.heicUrls.forEach((url, i) => {
      console.log(`     ${i + 1}. ${url.substring(0, 80)}...`);
    });
    console.log();
  });

  console.log("\n📋 Summary:");
  console.log(`  Places with HEIC: ${placeResults.length}`);
  console.log(`  Services with HEIC: ${serviceResults.length}`);
  console.log(`  Total HEIC images: ${allResults.reduce((sum, doc) => sum + doc.heicUrls.length, 0)}`);
  
  console.log("\n✏️  How to fix:");
  console.log("  1. Edit each document in Firestore Console");
  console.log("  2. Remove the HEIC image URLs from the imageUrls array");
  console.log("  3. Upload the images again in JPG or PNG format");
  console.log("  4. Or use https://heic2any.herokuapp.com/ to convert HEIC → JPG\n");
  
  console.log("🌐 Firebase Console: https://console.firebase.google.com/\n");
}

cleanupHeicImages().catch((error) => {
  console.error("Cleanup error:", error);
  process.exitCode = 1;
});

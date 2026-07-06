import { readFileSync } from "node:fs";
import process from "node:process";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [serviceAccountPath, adminEmail] = process.argv.slice(2);

if (!serviceAccountPath || !adminEmail) {
  console.error("Usage: node scripts/set-admin-claim.mjs <service-account.json> <admin-email>");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

async function run() {
  try {
    const auth = getAuth();
    const user = await auth.getUserByEmail(adminEmail);
    await auth.setCustomUserClaims(user.uid, { admin: true });

    console.log("Admin claim assigned successfully.");
    console.log(`Email: ${adminEmail}`);
    console.log(`UID: ${user.uid}`);
    console.log("Claim: { admin: true }");
    console.log("Now sign out and sign in again in the app to refresh the token.");
  } catch (error) {
    console.error("Failed to assign admin claim:", error.message);
    process.exit(1);
  }
}

run();

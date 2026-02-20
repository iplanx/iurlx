/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest, onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {
  UrlRedirect,
  CreateUrlRedirectRequest,
  CreateUrlRedirectResponse,
  CheckShortPathAvailabilityRequest,
  CheckShortPathAvailabilityResponse,
} from "./API";

initializeApp();
const db = getFirestore();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

setGlobalOptions({ maxInstances: 10 });

/**
 * Handle URL redirection based on a short shortened path.
 * Increments the access count and redirects to the original URL.
 */
export const redirectUrl = onRequest(async (req, res) => {
  // Extract shortPath from the path (e.g., /s/my-path -> my-path)
  const pathParts = req.path.split("/").filter((p) => p !== "");
  
  // Assuming the rewrite routes to /s/:shortPath or we are at the root
  const shortPath = pathParts[pathParts.length - 1];

  if (!shortPath) {
    res.status(400).send("Bad Request: Missing path identifier.");
    return;
  }

  try {
    const redirectRef = db.collection("urlRedirects").doc(shortPath);
    
    // Use a transaction to ensure atomic read and write
    const originalUrl = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(redirectRef);

      if (!doc.exists) {
        return null;
      }

      const data = doc.data() as UrlRedirect;
      
      // Increment count
      transaction.update(redirectRef, {
        count: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return data.originalUrl;
    });

    if (!originalUrl) {
      logger.info(`Redirect not found for path: ${shortPath}`);
      res.status(404).send("Not Found: The shortened URL does not exist.");
      return;
    }

    logger.info(`Redirecting ${shortPath} to ${originalUrl}`);
    
    // Perform 302 Found redirect
    res.redirect(302, originalUrl);
  } catch (error) {
    logger.error("Error processing redirect:", error);
    res.status(500).send("Internal Server Error");
  }
});

/**
 * API to create a new URL redirect.
 * Only authenticated users can create redirects.
 */
export const createUrlRedirect = onCall<CreateUrlRedirectRequest, Promise<CreateUrlRedirectResponse>>(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const {shortPath, originalUrl, label} = request.data;

  // Basic validation
  if (!shortPath || typeof shortPath !== "string") {
    throw new HttpsError("invalid-argument", "The 'shortPath' must be a non-empty string.");
  }
  if (!originalUrl || typeof originalUrl !== "string") {
    throw new HttpsError("invalid-argument", "The 'originalUrl' must be a non-empty string.");
  }

  const redirectRef = db.collection("urlRedirects").doc(shortPath);

  try {
    // Check if shortPath already exists using a transaction
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(redirectRef);
      if (doc.exists) {
        throw new HttpsError("already-exists", `The path '${shortPath}' is already taken.`);
      }

      const newRedirect: UrlRedirect = {
        originalUrl,
        label: label || "",
        count: 0,
        ownerId: request.auth!.uid,
        createdAt: FieldValue.serverTimestamp() as FieldValue,
        updatedAt: FieldValue.serverTimestamp() as FieldValue,
      };

      transaction.set(redirectRef, newRedirect);
    });

    logger.info(`Redirect created: ${shortPath} -> ${originalUrl} by ${request.auth!.uid}`);

    return {
      success: true,
      shortPath,
      message: "Redirect created successfully.",
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error("Error creating redirect:", error);
    throw new HttpsError("internal", "An internal error occurred while creating the redirect.");
  }
});

/**
 * API to check if a short path is available.
 */
export const checkShortPathAvailability = onCall<CheckShortPathAvailabilityRequest, Promise<CheckShortPathAvailabilityResponse>>(async (request) => {
  const {shortPath} = request.data;

  if (!shortPath || typeof shortPath !== "string") {
    throw new HttpsError("invalid-argument", "The 'shortPath' must be a non-empty string.");
  }

  try {
    const doc = await db.collection("urlRedirects").doc(shortPath).get();
    return {
      exists: doc.exists,
    };
  } catch (error) {
    logger.error("Error checking path availability:", error);
    throw new HttpsError("internal", "An internal error occurred while checking path availability.");
  }
});

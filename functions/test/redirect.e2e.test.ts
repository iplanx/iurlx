import * as test from "firebase-functions-test";
import * as admin from "firebase-admin";
import { CreateUrlRedirectRequest, CheckShortPathAvailabilityRequest } from "../src/API";

// Initialize the firebase-functions-test SDK
const fft = test();

describe("URL Redirection System E2E", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    // These tests expect to run against the Firebase Emulator
    process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
    
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: "iurl-me", // Mock project ID for emulator
      });
    }
    db = admin.firestore();
  });

  afterAll(() => {
    fft.cleanup();
  });

  describe("createUrlRedirect", () => {
    it("should create a new redirect document", async () => {
      // Import the function dynamically after environment setup
      const { createUrlRedirect } = require("../src/index");
      
      const wrapped = fft.wrap(createUrlRedirect);
      const data: CreateUrlRedirectRequest = {
        shortPath: "test-path-" + Date.now(),
        originalUrl: "https://example.com",
        label: "Test Label"
      };

      const auth = {
        uid: "test-user-123",
        token: { uid: "test-user-123" }
      };

      const result = await wrapped({ data, auth });
      
      expect(result.success).toBe(true);
      expect(result.shortPath).toBe(data.shortPath);

      // Verify in Firestore
      const doc = await db.collection("urlRedirects").doc(data.shortPath).get();
      expect(doc.exists).toBe(true);
      expect(doc.data()?.originalUrl).toBe(data.originalUrl);
      expect(doc.data()?.ownerId).toBe(auth.uid);
    });

    it("should fail if not authenticated", async () => {
      const { createUrlRedirect } = require("../src/index");
      const wrapped = fft.wrap(createUrlRedirect);
      const data: CreateUrlRedirectRequest = {
        shortPath: "no-auth-path",
        originalUrl: "https://example.com"
      };

      await expect(wrapped({ data })).rejects.toThrow(/unauthenticated/);
    });

    it("should fail if shortPath already exists", async () => {
      const { createUrlRedirect } = require("../src/index");
      const wrapped = fft.wrap(createUrlRedirect);
      
      const path = "collision-path";
      await db.collection("urlRedirects").doc(path).set({
        originalUrl: "https://first.com",
        count: 0,
        ownerId: "someone"
      });

      const data: CreateUrlRedirectRequest = {
        shortPath: path,
        originalUrl: "https://second.com"
      };

      const auth = { uid: "user-2", token: { uid: "user-2" } };

      await expect(wrapped({ data, auth })).rejects.toThrow(/already taken/);
    });
  });

  describe("checkShortPathAvailability", () => {
    it("should return true if path exists", async () => {
      const { checkShortPathAvailability } = require("../src/index");
      const wrapped = fft.wrap(checkShortPathAvailability);
      
      const path = "existing-path-" + Date.now();
      await db.collection("urlRedirects").doc(path).set({
        originalUrl: "https://example.com",
        count: 0,
        ownerId: "someone",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const data: CheckShortPathAvailabilityRequest = { shortPath: path };
      const result = await wrapped({ data });
      expect(result.exists).toBe(true);
    });

    it("should return false if path does not exist", async () => {
      const { checkShortPathAvailability } = require("../src/index");
      const wrapped = fft.wrap(checkShortPathAvailability);
      
      const data: CheckShortPathAvailabilityRequest = { shortPath: "non-existent-" + Date.now() };
      const result = await wrapped({ data });
      expect(result.exists).toBe(false);
    });
  });

  describe("redirectUrl", () => {
    it("should redirect and increment count", async () => {
      const { redirectUrl } = require("../src/index");
      
      const path = "redirect-test-" + Date.now();
      const originalUrl = "https://google.com";
      await db.collection("urlRedirects").doc(path).set({
        originalUrl,
        count: 0,
        ownerId: "someone",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Mock request and response
      const req = {
        path: `/s/${path}`,
        query: {}
      };
      const res = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };

      await redirectUrl(req as any, res as any);

      expect(res.redirect).toHaveBeenCalledWith(302, originalUrl);

      // Verify count increment
      const doc = await db.collection("urlRedirects").doc(path).get();
      expect(doc.data()?.count).toBe(1);
    });
  });
});

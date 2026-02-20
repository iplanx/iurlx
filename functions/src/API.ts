import {FieldValue} from "firebase-admin/firestore";

/**
 * Represents the structure of a URL redirect document in Firestore.
 */
export interface UrlRedirect {
  originalUrl: string;
  label: string;
  count: number;
  ownerId: string;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

/**
 * Request payload for createUrlRedirect API.
 */
export interface CreateUrlRedirectRequest {
  shortPath: string;
  originalUrl: string;
  label?: string;
}

/**
 * Response payload for createUrlRedirect API.
 */
export interface CreateUrlRedirectResponse {
  success: boolean;
  shortPath: string;
  message: string;
}

/**
 * Request payload for checkShortPathAvailability API.
 */
export interface CheckShortPathAvailabilityRequest {
  shortPath: string;
}

/**
 * Response payload for checkShortPathAvailability API.
 */
export interface CheckShortPathAvailabilityResponse {
  exists: boolean;
}

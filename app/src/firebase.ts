import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

type Environment = "DEV" | "PROD" | "STAGING";

function getEnvironment(): Environment {
  const environment = process.env.REACT_APP_ENVIRONMENT;
  if (environment === "STAGING") {
    return "STAGING";
  } else if (environment === "PROD") {
    return "PROD";
  } else {
    return "DEV";
  }
}

const environment = getEnvironment();
console.log("iUrlX Environment: ", environment);

const firebaseProdConfig = {
  apiKey: "AIzaSyCZni4WShtGtyLHxrkCt_6oiccldZJwk-s",
  authDomain: "iplanx-bb47f.firebaseapp.com",
  projectId: "iplanx-bb47f",
  storageBucket: "iplanx-bb47f.firebasestorage.app",
  messagingSenderId: "571214115603",
  appId: "1:571214115603:web:0f08214e6a5001edaca0e6",
  measurementId: "G-PWVNPSQKNQ"
};

const firebaseStagingConfig = {
  apiKey: "AIzaSyABwUSzQRSOSIbp_ioVBDeeaE3WJ1Fmw3M",
  authDomain: "iplanx-staging.firebaseapp.com",
  projectId: "iplanx-staging",
  storageBucket: "iplanx-staging.firebasestorage.app",
  messagingSenderId: "868603122159",
  appId: "1:868603122159:web:c966dd89e74d854a0d661a",
  measurementId: "G-RP62SSEM79"
};

// Similar to iplanxwebsite, PROD environment uses firebaseProdConfig, otherwise uses firebaseStagingConfig
const firebaseConfig = environment === "PROD" ? firebaseProdConfig : firebaseStagingConfig;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators if running locally (DEV environment)
if (environment === "DEV" || process.env.REACT_APP_USE_FIREBASE_EMULATOR === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export { app, auth, db };

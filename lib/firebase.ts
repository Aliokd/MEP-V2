import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import app, { auth, googleProvider, initFirebaseAnalytics } from "./firebaseAuth";

/*
 * The full Firebase surface: app, Auth, Firestore and Storage.
 *
 * App and Auth are defined in lib/firebaseAuth.ts and re-exported here so the
 * code that runs on every page (AuthProvider, Navigation, the homepage) can
 * import from there without pulling Firestore and Storage into the bundle a
 * marketing visitor downloads. Same app instance, same Auth singleton, so
 * importing from either module is interchangeable for the exports they share.
 */
export { auth, googleProvider, initFirebaseAnalytics };
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

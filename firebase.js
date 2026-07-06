import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

function hasFirebaseConfig(config) {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.storageBucket &&
      config.messagingSenderId &&
      config.appId
  );
}

export function createFirebaseClient() {
  const enabled = hasFirebaseConfig(firebaseConfig);

  if (!enabled) {
    return {
      enabled: false
    };
  }

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const provider = new GoogleAuthProvider();

  const placesQuery = query(collection(db, "places"), orderBy("createdAt", "desc"));
  const servicesQuery = query(collection(db, "services"), orderBy("createdAt", "desc"));

  return {
    enabled: true,
    auth,

    onAuth(callback) {
      return onAuthStateChanged(auth, callback);
    },

    async signInWithGoogle() {
      return signInWithPopup(auth, provider);
    },

    async signOutUser() {
      return signOut(auth);
    },

    subscribePlaces(callback, onError) {
      return onSnapshot(
        placesQuery,
        (snapshot) => {
          const places = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
          callback(places);
        },
        onError
      );
    },

    subscribeServices(callback, onError) {
      return onSnapshot(
        servicesQuery,
        (snapshot) => {
          const services = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
          callback(services);
        },
        onError
      );
    },

    async uploadPlaceImage(file, uid) {
      const path = `places/${uid}/${Date.now()}-${file.name}`;
      const imageRef = ref(storage, path);
      await uploadBytes(imageRef, file);
      return getDownloadURL(imageRef);
    },

    async addPlace(place) {
      return addDoc(collection(db, "places"), {
        ...place,
        createdAt: serverTimestamp()
      });
    },

    async addService(service) {
      return addDoc(collection(db, "services"), {
        ...service,
        createdAt: serverTimestamp()
      });
    },

    async updatePlaceStatus(placeId, status, moderatedByUid) {
      const placeRef = doc(db, "places", placeId);
      const payload = {
        status,
        moderatedByUid,
        moderatedAt: serverTimestamp()
      };

      if (status === "approved") {
        payload.approvedByUid = moderatedByUid;
        payload.approvedAt = serverTimestamp();
      }

      if (status === "rejected") {
        payload.rejectedByUid = moderatedByUid;
        payload.rejectedAt = serverTimestamp();
      }

      return updateDoc(placeRef, payload);
    },

    async updateServiceStatus(serviceId, status, moderatedByUid) {
      const serviceRef = doc(db, "services", serviceId);
      const payload = {
        status,
        moderatedByUid,
        moderatedAt: serverTimestamp()
      };

      if (status === "approved") {
        payload.approvedByUid = moderatedByUid;
        payload.approvedAt = serverTimestamp();
      }

      if (status === "rejected") {
        payload.rejectedByUid = moderatedByUid;
        payload.rejectedAt = serverTimestamp();
      }

      return updateDoc(serviceRef, payload);
    },

    async deletePlace(placeId) {
      return deleteDoc(doc(db, "places", placeId));
    },

    async deleteService(serviceId) {
      return deleteDoc(doc(db, "services", serviceId));
    }
  };
}

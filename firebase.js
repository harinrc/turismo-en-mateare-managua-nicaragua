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
  where,
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

  const placesAllQuery = query(collection(db, "places"), orderBy("createdAt", "desc"));
  const servicesAllQuery = query(collection(db, "services"), orderBy("createdAt", "desc"));
  const placesApprovedQuery = query(
    collection(db, "places"),
    where("status", "==", "approved")
  );
  const servicesApprovedQuery = query(
    collection(db, "services"),
    where("status", "==", "approved")
  );

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

    subscribePlaces(options, callback, onError) {
      const includeUnapproved = Boolean(options?.includeUnapproved);
      const placesQuery = includeUnapproved ? placesAllQuery : placesApprovedQuery;

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

    subscribeServices(options, callback, onError) {
      const includeUnapproved = Boolean(options?.includeUnapproved);
      const servicesQuery = includeUnapproved ? servicesAllQuery : servicesApprovedQuery;

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

    async uploadImage(file, uid, folder = "places") {
      const safeFolder = folder === "services" ? "services" : "places";
      const uniqueId = typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      const path = `${safeFolder}/${uid}/${uniqueId}-${file.name}`;
      const imageRef = ref(storage, path);
      await uploadBytes(imageRef, file);
      return getDownloadURL(imageRef);
    },

    async uploadPlaceImage(file, uid) {
      return this.uploadImage(file, uid, "places");
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
    },

    async updatePlace(placeId, updates) {
      const placeRef = doc(db, "places", placeId);
      return updateDoc(placeRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    },

    async updateService(serviceId, updates) {
      const serviceRef = doc(db, "services", serviceId);
      return updateDoc(serviceRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
  };
}

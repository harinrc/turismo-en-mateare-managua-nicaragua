import { initialPlaces, initialServices, initialAlerts, i18n, heroBackgroundImages } from "./content.js";
import { createFirebaseClient } from "./firebase.js";

const STORAGE_KEYS = {
  places: "mateare_places_v1",
  services: "mateare_services_v1"
};

const DEFAULT_PLACE_IMAGE =
  "https://images.unsplash.com/photo-1493244040629-496f6d136cc3?auto=format&fit=crop&w=1200&q=80";

const ALERTS_MAX_ITEMS = 8;
const ALERTS_MAX_AGE_DAYS = 14;
const ALERTS_EXTENDED_MAX_AGE_DAYS = 45;
const ALERTS_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const ALERTS_MIN_UPDATE_GAP_MS = 2 * 60 * 1000;
const HERO_BG_CHANGE_INTERVAL_MS = 8 * 1000;
const CARD_SLIDE_INTERVAL_SECONDS = 3;
const MATEARE_TIMEZONE = "America/Managua";
const FAVORITES_STORAGE_PREFIX = "mateare_favorites_v1_";
const ALERTS_PRIMARY_SEARCH_QUERIES = [
  "Mateare Managua",
  "Mateare",
  "Laguna de Xiloa",
  "turismo en Mateare",
  "alcaldia de Mateare"
];
const ALERTS_BACKUP_SEARCH_QUERIES = [
  "Managua turismo",
  "Nicaragua turismo",
  "INTUR Nicaragua"
];

const firebaseClient = createFirebaseClient();

const state = {
  lang: "es",
  places: [...initialPlaces],
  services: [...initialServices],
  alerts: [...initialAlerts],
  map: null,
  markers: [],
  selectedPlaceId: null,
  isPickingLocation: false,
  pickingLocationFor: null,  // "place" o "service"
  pickingLocationForEditor: false,  // True cuando estamos editando desde admin panel
  user: null,
  isAdmin: false,
  useFirebase: firebaseClient.enabled,
  favorites: {
    places: new Set(),
    services: new Set()
  }
};

const refs = {
  guideList: document.getElementById("guideList"),
  communityFeed: document.getElementById("communityFeed"),
  searchGuide: document.getElementById("searchGuide"),
  filterCategory: document.getElementById("filterCategory"),
  placeForm: document.getElementById("placeForm"),
  serviceForm: document.getElementById("serviceForm"),
  weatherPlace: document.getElementById("weatherPlace"),
  refreshWeather: document.getElementById("refreshWeather"),
  weatherOutput: document.getElementById("weatherOutput"),
  alertsList: document.getElementById("alertsList"),
  alertsSyncStatus: document.getElementById("alertsSyncStatus"),
  heroBgCarousel: document.getElementById("heroBgCarousel"),
  quickWeather: document.getElementById("quickWeather"),
  quickAlerts: document.getElementById("quickAlerts"),
  quickPosts: document.getElementById("quickPosts"),
  quickLocalTime: document.getElementById("quickLocalTime"),
  menuBtn: document.getElementById("menuBtn"),
  mainNav: document.getElementById("mainNav"),
  languageSelect: document.getElementById("languageSelect"),
  placeImageFile: document.getElementById("placeImageFile"),
  serviceImageFile: document.getElementById("serviceImageFile"),
  placeImagePreview: document.getElementById("placeImagePreview"),
  authUser: document.getElementById("authUser"),
  signInBtn: document.getElementById("signInBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  authNotice: document.getElementById("authNotice"),
  installBanner: document.getElementById("installBanner"),
  installBannerTitle: document.getElementById("installBannerTitle"),
  installBannerDescription: document.getElementById("installBannerDescription"),
  installBtn: document.getElementById("installBtn"),
  installDismissBtn: document.getElementById("installDismissBtn"),
  imageLightbox: document.getElementById("imageLightbox"),
  imageLightboxBackdrop: document.getElementById("imageLightboxBackdrop"),
  imageLightboxFrame: document.getElementById("imageLightboxFrame"),
  imageLightboxImg: document.getElementById("imageLightboxImg"),
  lightboxClose: document.getElementById("lightboxClose"),
  lightboxPrev: document.getElementById("lightboxPrev"),
  lightboxNext: document.getElementById("lightboxNext"),
  lightboxZoomIn: document.getElementById("lightboxZoomIn"),
  lightboxZoomOut: document.getElementById("lightboxZoomOut"),
  lightboxZoomReset: document.getElementById("lightboxZoomReset"),
  toastRegion: document.getElementById("toastRegion"),
  navModeration: document.getElementById("navModeration"),
  moderationSection: document.getElementById("moderacion"),
  pendingPlacesList: document.getElementById("pendingPlacesList"),
  pendingServicesList: document.getElementById("pendingServicesList"),
  allPlacesList: document.getElementById("allPlacesList"),
  allServicesList: document.getElementById("allServicesList"),
  adminEditorForm: document.getElementById("adminEditorForm"),
  editorEntity: document.getElementById("editorEntity"),
  editorItemId: document.getElementById("editorItemId"),
  editorName: document.getElementById("editorName"),
  editorCategoryLabel: document.getElementById("editorCategoryLabel"),
  editorCategory: document.getElementById("editorCategory"),
  editorTypeLabel: document.getElementById("editorTypeLabel"),
  editorType: document.getElementById("editorType"),
  editorDescriptionLabel: document.getElementById("editorDescriptionLabel"),
  editorDescription: document.getElementById("editorDescription"),
  editorCoordsRow: document.getElementById("editorCoordsRow"),
  editorLat: document.getElementById("editorLat"),
  editorLng: document.getElementById("editorLng"),
  pickEditorLocationBtn: document.getElementById("pickEditorLocationBtn"),
  clearEditorLocationBtn: document.getElementById("clearEditorLocationBtn"),
  editorServiceRow: document.getElementById("editorServiceRow"),
  editorContact: document.getElementById("editorContact"),
  editorSchedule: document.getElementById("editorSchedule"),
  editorImageUrls: document.getElementById("editorImageUrls"),
  editorImageFiles: document.getElementById("editorImageFiles"),
  editorStatus: document.getElementById("editorStatus"),
  cancelEditorBtn: document.getElementById("cancelEditorBtn"),
  placeLat: document.getElementById("placeLat"),
  placeLng: document.getElementById("placeLng"),
  pickLocationBtn: document.getElementById("pickLocationBtn"),
  clearLocationBtn: document.getElementById("clearLocationBtn"),
  serviceLat: document.getElementById("serviceLat"),
  serviceLng: document.getElementById("serviceLng"),
  pickServiceLocationBtn: document.getElementById("pickServiceLocationBtn"),
  clearServiceLocationBtn: document.getElementById("clearServiceLocationBtn")
};

let toastTimer = null;
let pickerMarker = null;
let placesUnsubscribe = null;
let servicesUnsubscribe = null;
let alertsRefreshTimer = null;
let lastAlertsSyncAt = 0;
let alertsLastSuccessAt = 0;
let alertsSyncState = "idle";
let heroBgTimer = null;
let heroBgCurrentIndex = 0;
let localTimeTimer = null;
let deferredInstallPrompt = null;
let lightboxScale = 1;
let lightboxImages = [];
let lightboxIndex = 0;
let lightboxTouchStartX = 0;
let lightboxTouchStartY = 0;
let lightboxPanX = 0;
let lightboxPanY = 0;
let lightboxIsDragging = false;
let lightboxDragStartX = 0;
let lightboxDragStartY = 0;
let lightboxPanStartX = 0;
let lightboxPanStartY = 0;
let placeCardFocusTimer = null;
let serviceCardFocusTimer = null;
const moderationActionLocks = new Set();
const INSTALL_BANNER_DISMISS_KEY = "mateare_install_banner_dismissed_v1";
const INSTALL_BANNER_DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getInstallBannerDismissedAt() {
  const raw = localStorage.getItem(INSTALL_BANNER_DISMISS_KEY);
  const timestamp = Number(raw);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function setInstallBannerDismissedAt(timestampMs) {
  localStorage.setItem(INSTALL_BANNER_DISMISS_KEY, String(timestampMs));
}

function clearInstallBannerDismissedAt() {
  localStorage.removeItem(INSTALL_BANNER_DISMISS_KEY);
}

function shouldSuppressInstallBanner() {
  if (isStandaloneDisplayMode()) return true;

  const dismissedAt = getInstallBannerDismissedAt();
  if (!dismissedAt) return false;

  return Date.now() - dismissedAt < INSTALL_BANNER_DISMISS_TTL_MS;
}

function getFavoritesStorageKey(uid) {
  return `${FAVORITES_STORAGE_PREFIX}${uid}`;
}

function sanitizeFavoriteIds(list) {
  if (!Array.isArray(list)) return [];

  return [...new Set(list.filter((id) => typeof id === "string" && id.trim().length > 0))];
}

function getFavoritesPayloadFromState() {
  return {
    places: [...state.favorites.places],
    services: [...state.favorites.services]
  };
}

function applyFavoritesPayload(payload) {
  const safePlaces = sanitizeFavoriteIds(payload?.places);
  const safeServices = sanitizeFavoriteIds(payload?.services);

  state.favorites.places = new Set(safePlaces);
  state.favorites.services = new Set(safeServices);
}

function loadLocalFavorites(uid) {
  if (!uid) return { places: [], services: [] };

  try {
    const raw = localStorage.getItem(getFavoritesStorageKey(uid));
    if (!raw) return { places: [], services: [] };

    const parsed = JSON.parse(raw);
    return {
      places: sanitizeFavoriteIds(parsed?.places),
      services: sanitizeFavoriteIds(parsed?.services)
    };
  } catch {
    return { places: [], services: [] };
  }
}

function saveLocalFavorites(uid) {
  if (!uid) return;

  const payload = getFavoritesPayloadFromState();
  localStorage.setItem(getFavoritesStorageKey(uid), JSON.stringify(payload));
}

async function loadUserFavorites(user) {
  if (!user?.uid) {
    applyFavoritesPayload({ places: [], services: [] });
    return;
  }

  const localFavorites = loadLocalFavorites(user.uid);
  applyFavoritesPayload(localFavorites);

  if (!state.useFirebase || typeof firebaseClient.getUserFavorites !== "function") {
    return;
  }

  try {
    const cloudFavorites = await firebaseClient.getUserFavorites(user.uid);
    const merged = {
      places: [...new Set([...localFavorites.places, ...sanitizeFavoriteIds(cloudFavorites?.places)])],
      services: [...new Set([...localFavorites.services, ...sanitizeFavoriteIds(cloudFavorites?.services)])]
    };

    applyFavoritesPayload(merged);
    saveLocalFavorites(user.uid);

    if (typeof firebaseClient.setUserFavorites === "function") {
      await firebaseClient.setUserFavorites(user.uid, merged);
    }
  } catch (error) {
    console.warn("Could not sync favorites from cloud:", error);
  }
}

async function persistUserFavorites() {
  if (!state.user?.uid) return;

  saveLocalFavorites(state.user.uid);

  if (!state.useFirebase || typeof firebaseClient.setUserFavorites !== "function") {
    return;
  }

  try {
    await firebaseClient.setUserFavorites(state.user.uid, getFavoritesPayloadFromState());
  } catch (error) {
    console.warn("Could not save favorites in cloud:", error);
  }
}

function isFavorite(entity, itemId) {
  const id = String(itemId || "");
  if (!id) return false;

  return entity === "service"
    ? state.favorites.services.has(id)
    : state.favorites.places.has(id);
}

function buildFavoriteButtonMarkup(entity, itemId, options = {}) {
  const compact = options.compact ?? false;
  const safeId = escapeHtml(itemId || "");
  const active = isFavorite(entity, itemId);
  const actionText = active ? t("favorite.remove") : t("favorite.add");
  const icon = active ? "★" : "☆";
  const attr = entity === "service"
    ? `data-favorite-service="${safeId}"`
    : `data-favorite-place="${safeId}"`;
  const classNames = `btn btn-favorite${compact ? " btn-favorite-compact" : ""}${active ? " is-active" : ""}`;

  return `<button class="${classNames}" type="button" ${attr} aria-pressed="${active}" title="${actionText}">${icon} ${actionText}</button>`;
}

async function toggleFavorite(entity, itemId) {
  if (!state.user) {
    notify(t("favorite.signInRequired"), "info");
    return;
  }

  const id = String(itemId || "").trim();
  if (!id) return;

  const favoritesSet = entity === "service" ? state.favorites.services : state.favorites.places;
  const alreadyFavorite = favoritesSet.has(id);

  if (alreadyFavorite) {
    favoritesSet.delete(id);
  } else {
    favoritesSet.add(id);
  }

  renderGuides();
  renderCommunityFeed();

  await persistUserFavorites();
  notify(t(alreadyFavorite ? "favorite.removed" : "favorite.saved"), "success");
}

function t(key) {
  return i18n[state.lang][key] ?? i18n.es[key] ?? key;
}

function renderInstallBannerContent() {
  const mode = getInstallMode();

  if (refs.installBannerTitle) {
    refs.installBannerTitle.textContent = t("install.title");
  }

  if (refs.installBannerDescription) {
    const descriptionKey =
      mode === "unsupported"
        ? "install.descriptionUnsupported"
        : mode === "prompt-pending"
          ? "install.descriptionPending"
          : "install.description";
    refs.installBannerDescription.textContent = t(descriptionKey);
  }

  if (refs.installBtn) {
    const buttonKey = mode === "prompt" || mode === "prompt-pending" ? "install.cta" : "install.ctaHelp";
    refs.installBtn.textContent = t(buttonKey);
  }

  if (refs.installDismissBtn) {
    refs.installDismissBtn.textContent = t("install.dismiss");
  }
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEYS.places, JSON.stringify(state.places));
  localStorage.setItem(STORAGE_KEYS.services, JSON.stringify(state.services));
}

function isValidImageUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function isHeicImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lowerUrl = url.toLowerCase();
  
  // Check by URL extension
  if (lowerUrl.endsWith('.heic') || lowerUrl.endsWith('.heif')) {
    return true;
  }
  
  // Check Firebase Storage URLs by filename patterns
  // Pattern: ...%2Ffilename.heic or .../filename.heic
  if (lowerUrl.includes('firebasestorage.googleapis.com')) {
    if (lowerUrl.match(/(%2F|\/)[^%\/]*\.heic/i) || lowerUrl.match(/(%2F|\/)[^%\/]*\.heif/i)) {
      return true;
    }
  }
  
  return false;
}

function filterHeicImages(imageUrls) {
  if (!Array.isArray(imageUrls)) return { valid: [], heic: [] };
  
  const valid = [];
  const heic = [];
  
  imageUrls.forEach((url) => {
    if (isHeicImageUrl(url)) {
      heic.push(url);
    } else {
      valid.push(url);
    }
  });
  
  return { valid, heic };
}

const MAX_IMAGE_SIZE_MB = 10; // 10 MB máximo
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

function detectHeicFile(file) {
  // Check by MIME type
  if (file.type === 'image/heic' || file.type === 'image/heif' || file.type === 'image/heif-sequence') {
    console.warn(`Detected HEIC by MIME type: ${file.type}`);
    return Promise.resolve(true);
  }
  
  // Check by file extension (case-insensitive)
  const filename = file.name.toLowerCase();
  if (filename.endsWith('.heic') || filename.endsWith('.heif') || filename.endsWith('.heic-sequence')) {
    console.warn(`Detected HEIC by extension: ${file.name}`);
    return Promise.resolve(true);
  }
  
  // Check by magic bytes (file signature) - HEIC files start with 'ftyp' signature
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const arrayBuffer = event.target?.result;
          if (!(arrayBuffer instanceof ArrayBuffer)) {
            resolve(false);
            return;
          }
          const view = new Uint8Array(arrayBuffer);
          if (view.length >= 12) {
            // Check for 'ftyp' at offset 4
            const ftypMarker = String.fromCharCode(view[4], view[5], view[6], view[7]);
            if (ftypMarker === 'ftyp') {
              // Check for HEIC brand
              const brand = String.fromCharCode(view[8], view[9], view[10], view[11]);
              if (brand.includes('heic') || brand.includes('heix') || brand === 'mif1') {
                console.warn(`Detected HEIC by magic bytes: ftyp${brand}`);
                resolve(true);
                return;
              }
            }
          }
        } catch (e) {
          console.warn('Error reading file magic bytes:', e);
        }
        resolve(false);
      };
      reader.onerror = () => {
        console.warn('FileReader error checking magic bytes');
        resolve(false);
      };
      reader.readAsArrayBuffer(file.slice(0, 12));
    } catch (error) {
      console.warn('Could not check file magic bytes:', error);
      resolve(false);
    }
  });
}

function readFileAsDataUrl(file) {
  return new Promise(async (resolve, reject) => {
    // Validar tamaño del archivo
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      reject(new Error(`image-too-large:${MAX_IMAGE_SIZE_MB}MB`));
      return;
    }

    // Detectar HEIC/HEIF (formato de iOS no soportado en web)
    try {
      const isHeic = await detectHeicFile(file);
      if (isHeic) {
        reject(new Error('image-heic-format'));
        return;
      }
    } catch (error) {
      console.warn('Error detecting HEIC:', error);
      // No rechazar, continuar
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (file.type && !validTypes.includes(file.type)) {
      console.warn(`Unusual MIME type: ${file.name} -> ${file.type}`);
      // Don't reject, just warn - browsers sometimes report wrong MIME types
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      const result = String(reader.result ?? "");
      if (!result) {
        reject(new Error('image-read-empty'));
        return;
      }
      resolve(result);
    };
    
    reader.onerror = () => {
      reject(new Error(`image-read-error:${reader.error?.message || 'Unknown'}`));
    };
    
    reader.onabort = () => {
      reject(new Error('image-read-aborted'));
    };
    
    reader.readAsDataURL(file);
  });
}

function normalizePlace(place) {
  let imageUrls = Array.isArray(place.imageUrls)
    ? place.imageUrls.filter((url) => typeof url === "string" && url)
    : [];

  // Filtrar automáticamente imágenes HEIC (no soportadas en web)
  const { valid, heic } = filterHeicImages(imageUrls);
  if (heic.length > 0) {
    console.warn(`Found ${heic.length} unsupported HEIC images in place "${place.name}" - filtering out`);
  }
  imageUrls = valid;

  if (!imageUrls.length && place.imageUrl && !isHeicImageUrl(place.imageUrl)) {
    imageUrls.push(place.imageUrl);
  }

  if (!imageUrls.length) {
    imageUrls.push(DEFAULT_PLACE_IMAGE);
  }

  return {
    id: place.id,
    name: place.name,
    category: place.category,
    description: place.description,
    lat: Number(place.lat),
    lng: Number(place.lng),
    imageUrls,
    imageUrl: imageUrls[0],
    tags: Array.isArray(place.tags) ? place.tags : ["Comunitario"],
    status: place.status || "approved",
    createdByName: place.createdByName || "Comunidad",
    createdByUid: place.createdByUid || null
  };
}

function normalizeService(service) {
  let imageUrls = Array.isArray(service.imageUrls)
    ? service.imageUrls.filter((url) => typeof url === "string" && url)
    : [];

  // Filtrar automáticamente imágenes HEIC (no soportadas en web)
  const { valid, heic } = filterHeicImages(imageUrls);
  if (heic.length > 0) {
    console.warn(`Found ${heic.length} unsupported HEIC images in service "${service.name}" - filtering out`);
  }
  imageUrls = valid;

  if (!imageUrls.length && service.imageUrl && !isHeicImageUrl(service.imageUrl)) {
    imageUrls.push(service.imageUrl);
  }

  return {
    id: service.id,
    name: service.name,
    type: service.type,
    contact: service.contact,
    schedule: service.schedule,
    imageUrls,
    imageUrl: imageUrls[0] || "",
    status: service.status || "approved",
    createdByName: service.createdByName || "Comunidad",
    createdByUid: service.createdByUid || null,
    lat: service.lat,
    lng: service.lng
  };
}

function getCreatedAtMs(item) {
  const createdAt = item?.createdAt;

  if (!createdAt) return 0;
  if (typeof createdAt?.toMillis === "function") return createdAt.toMillis();

  const fromDate = new Date(createdAt).getTime();
  return Number.isFinite(fromDate) ? fromDate : 0;
}

function sortByCreatedAtDesc(items) {
  return [...items].sort((a, b) => getCreatedAtMs(b) - getCreatedAtMs(a));
}

function getVisiblePlaces() {
  if (!state.useFirebase) {
    return state.places;
  }

  const currentUserUid = state.user?.uid;
  return state.places.filter((place) => {
    const status = place.status || "approved";
    return status === "approved" || (status === "pending" && place.createdByUid === currentUserUid);
  });
}

function getVisibleServices() {
  if (!state.useFirebase) {
    return state.services;
  }

  const currentUserUid = state.user?.uid;
  return state.services.filter((service) => {
    const status = service.status || "approved";
    return status === "approved" || (status === "pending" && service.createdByUid && service.createdByUid === currentUserUid);
  });
}

function shouldShowCommunityStatus(item) {
  return state.useFirebase && item.status && item.status !== "approved";
}

function getPendingPlaces() {
  return state.places.filter((place) => place.status === "pending");
}

function getPendingServices() {
  return state.services.filter((service) => service.status === "pending");
}

function setPlacePreview(src) {
  if (!refs.placeImagePreview) return;

  if (!src) {
    refs.placeImagePreview.hidden = true;
    refs.placeImagePreview.src = "";
    return;
  }

  refs.placeImagePreview.onerror = () => {
    refs.placeImagePreview.onerror = null;
    refs.placeImagePreview.src = DEFAULT_PLACE_IMAGE;
  };
  refs.placeImagePreview.src = src;
  refs.placeImagePreview.hidden = false;
}

function parseImageUrlsText(value) {
  if (!value) return [];
  return value
    .split(/\r?\n|,|;/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildImageTag(url, altText, className = "", extraAttributes = "") {
  const safeUrl = escapeHtml(url || DEFAULT_PLACE_IMAGE);
  const safeAlt = escapeHtml(altText || "");
  const safeClass = className ? ` class="${escapeHtml(className)}"` : "";
  const safeExtra = extraAttributes ? ` ${extraAttributes}` : "";
  return `<img${safeClass} src="${safeUrl}" alt="${safeAlt}" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_PLACE_IMAGE}'"${safeExtra}>`;
}

function buildFadeSlideshow(images, altText, className = "") {
  // Filtrar imágenes vacías, nulas o inválidas
  const imgArray = Array.isArray(images) ? images : [];
  const filtered = imgArray.filter(
    (url) => url && typeof url === "string" && url.trim().length > 0
  );
  const validImages = filtered.length > 0 ? filtered : [DEFAULT_PLACE_IMAGE];
  
  const count = validImages.length;
  const totalDuration = Math.max(count * CARD_SLIDE_INTERVAL_SECONDS, CARD_SLIDE_INTERVAL_SECONDS * 2);
  const boxClass = count > 1 ? "fade-slideshow" : "fade-slideshow single";
  const extraClass = className ? ` ${className}` : "";

  const slides = validImages
    .map(
      (url, index) =>
        buildImageTag(url, altText, "fade-slide", `style="animation-delay:${index * CARD_SLIDE_INTERVAL_SECONDS}s;"`)
    )
    .join("");

  return `<div class="${boxClass}${extraClass}" style="--slide-duration:${totalDuration}s;">${slides}</div>`;
}

async function resolveImages(data, options) {
  const {
    fileField,
    urlField,
    fallbackImage = null,
    uploadFolder = "places"
  } = options;

  const files = data
    .getAll(fileField)
    .filter((entry) => entry instanceof File && entry.size > 0);

  const rawUrls = parseImageUrlsText(String(data.get(urlField) || ""));
  const validUrls = rawUrls.map((url) => {
    if (!isValidImageUrl(url)) {
      throw new Error("invalid-image-url");
    }
    return url;
  });

  // Verificar que Firebase esté habilitado y el usuario autenticado
  if (files.length > 0 && (!state.useFirebase || !state.user)) {
    throw new Error("firebase-required-for-images");
  }

  const uploadedUrls = [];
  const failedFiles = [];
  
  // Intentar subir cada imagen por separado
  for (const file of files) {
    try {
      const uploadedUrl = await firebaseClient.uploadImage(file, state.user.uid, uploadFolder);
      uploadedUrls.push(uploadedUrl);
    } catch (error) {
      // Si una imagen falla, guardarla en lista de errores pero continuar
      failedFiles.push({
        name: file.name,
        error: String(error?.message || "Error desconocido")
      });
      console.error(`Failed to upload ${file.name}:`, error);
    }
  }

  // Si el usuario intentó subir archivos pero TODOS fallaron, reportar error
  if (files.length > 0 && uploadedUrls.length === 0) {
    throw new Error(`all-images-failed:${failedFiles.map(f => f.name).join(", ")}`);
  }

  const allUrls = [...uploadedUrls, ...validUrls];
  // Filtrar URLs vacías o inválidas
  const cleanUrls = allUrls.filter((url) => {
    if (!url || typeof url !== "string") return false;
    if (!isValidImageUrl(url)) return false;
    return true;
  });
  
  // Si no hay URLs válidas y no intentó subir archivos, usar fallback
  if (!cleanUrls.length && fallbackImage && files.length === 0) {
    cleanUrls.push(fallbackImage);
  }

  return {
    imageUrls: cleanUrls,
    hadLocalFallback: false,
    failedFiles: failedFiles,
    uploadedCount: uploadedUrls.length,
    totalCount: files.length
  };
}

async function resolveServiceImages(data) {
  const rawUrls = parseImageUrlsText(String(data.get("imageUrls") || ""));
  const validUrls = rawUrls.map((url) => {
    if (!isValidImageUrl(url)) {
      throw new Error("invalid-image-url");
    }
    return url;
  });

  const files = data
    .getAll("imageFiles")
    .filter((entry) => entry instanceof File && entry.size > 0);

  // Verificar que Firebase esté habilitado y el usuario autenticado
  if (files.length > 0 && (!state.useFirebase || !state.user)) {
    throw new Error("firebase-required-for-images");
  }

  const uploadedUrls = [];
  const failedFiles = [];
  
  // Intentar subir cada imagen por separado
  for (const file of files) {
    try {
      const uploadedUrl = await firebaseClient.uploadImage(file, state.user.uid, "services");
      uploadedUrls.push(uploadedUrl);
    } catch (error) {
      // Si una imagen falla, guardarla en lista de errores pero continuar
      failedFiles.push({
        name: file.name,
        error: String(error?.message || "Error desconocido")
      });
      console.error(`Failed to upload ${file.name}:`, error);
    }
  }

  // Si el usuario intentó subir archivos pero TODOS fallaron, reportar error
  if (files.length > 0 && uploadedUrls.length === 0) {
    throw new Error(`all-images-failed:${failedFiles.map(f => f.name).join(", ")}`);
  }

  const allUrls = [...uploadedUrls, ...validUrls];
  // Filtrar URLs vacías o inválidas
  const cleanUrls = allUrls.filter((url) => {
    if (!url || typeof url !== "string") return false;
    if (!isValidImageUrl(url)) return false;
    return true;
  });

  return {
    imageUrls: cleanUrls,
    hadUploadErrors: failedFiles.length > 0,
    failedFiles: failedFiles,
    uploadedCount: uploadedUrls.length,
    totalCount: files.length
  };
}

function applyTranslations() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    el.setAttribute("placeholder", t(key));
  });

  updateAuthUI();
  renderAlertsSyncStatus();
  renderInstallBannerContent();
  updateMateareLocalTime();
}

function formatSyncDateTime(timestampMs) {
  const safeDate = new Date(timestampMs);
  if (Number.isNaN(safeDate.getTime())) return "";

  const locale = state.lang === "en" ? "en-US" : "es-NI";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short"
  }).format(safeDate);
}

function renderAlertsSyncStatus() {
  if (!refs.alertsSyncStatus) return;

  if (alertsSyncState === "loading") {
    refs.alertsSyncStatus.textContent = t("alerts.sync.loading");
    return;
  }

  if (alertsSyncState === "error") {
    if (alertsLastSuccessAt) {
      refs.alertsSyncStatus.textContent = `${t("alerts.sync.error")} ${t("alerts.sync.updated")}: ${formatSyncDateTime(alertsLastSuccessAt)}`;
      return;
    }

    refs.alertsSyncStatus.textContent = t("alerts.sync.error");
    return;
  }

  if (alertsSyncState === "stale") {
    refs.alertsSyncStatus.textContent = t("alerts.sync.noRecent");
    return;
  }

  if (alertsLastSuccessAt) {
    refs.alertsSyncStatus.textContent = `${t("alerts.sync.updated")}: ${formatSyncDateTime(alertsLastSuccessAt)}`;
    return;
  }

  refs.alertsSyncStatus.textContent = t("alerts.sync.never");
}

function formatCategory(category) {
  const map = {
    naturaleza: t("guides.nature"),
    cultura: t("guides.culture"),
    aventura: t("guides.adventure")
  };
  return map[category] ?? category;
}

function formatServiceType(type) {
  const map = {
    alimentacion: t("publish.food"),
    hospedaje: t("publish.lodging"),
    actividad: t("publish.activities")
  };
  return map[type] ?? type;
}

function buildModerationPlaceMarkup(place, options = {}) {
  const statusClass = options.statusClass || (place.status || "pending");
  const gallery = buildFadeSlideshow(place.imageUrls || [place.imageUrl || DEFAULT_PLACE_IMAGE], place.name, "moderation-thumb");
  const description = place.description || "-";
  const latText = Number.isFinite(place.lat) ? Number(place.lat).toFixed(6) : "-";
  const lngText = Number.isFinite(place.lng) ? Number(place.lng).toFixed(6) : "-";

  return `
    ${gallery}
    <h4>${place.name}</h4>
    <p><span class="status-pill ${statusClass}">${getStatusLabel(place.status)}</span></p>
    <p class="moderation-description">${description}</p>
    <p class="moderation-meta">${t("guide.category")}: ${formatCategory(place.category)}</p>
    <p class="moderation-meta">Lat: ${latText} · Lng: ${lngText}</p>
    <p class="moderation-meta">${t("admin.createdBy")}: ${place.createdByName || "Comunidad"}</p>
  `;
}

function buildModerationServiceMarkup(service, options = {}) {
  const statusClass = options.statusClass || (service.status || "pending");
  const gallery = buildFadeSlideshow(service.imageUrls?.length ? service.imageUrls : [DEFAULT_PLACE_IMAGE], service.name, "moderation-thumb");
  const latText = Number.isFinite(service.lat) ? Number(service.lat).toFixed(6) : "-";
  const lngText = Number.isFinite(service.lng) ? Number(service.lng).toFixed(6) : "-";

  return `
    ${gallery}
    <h4>${service.name}</h4>
    <p><span class="status-pill ${statusClass}">${getStatusLabel(service.status)}</span></p>
    <p class="moderation-meta">${t("publish.serviceType")}: ${formatServiceType(service.type)}</p>
    <p class="moderation-meta">${t("publish.contact")}: ${service.contact || "-"}</p>
    <p class="moderation-meta">${t("publish.schedule")}: ${service.schedule || "-"}</p>
    <p class="moderation-meta">Lat: ${latText} · Lng: ${lngText}</p>
    <p class="moderation-meta">${t("admin.createdBy")}: ${service.createdByName || "Comunidad"}</p>
  `;
}

function renderGuides() {
  const visiblePlaces = getVisiblePlaces();
  const text = refs.searchGuide.value.trim().toLowerCase();
  const filter = refs.filterCategory.value;

  const filtered = visiblePlaces.filter((place) => {
    const byCategory = filter === "all" || place.category === filter;
    const byText =
      !text ||
      place.name.toLowerCase().includes(text) ||
      place.description.toLowerCase().includes(text);
    return byCategory && byText;
  });

  refs.guideList.innerHTML = "";

  filtered.forEach((place) => {
    const card = document.createElement("article");
    card.className = "card place-card";
    card.dataset.placeId = place.id;

    const tags = (place.tags ?? []).map((tag) => `<span class="badge">${tag}</span>`).join("");
    const gallery = buildFadeSlideshow(place.imageUrls || [place.imageUrl || DEFAULT_PLACE_IMAGE], place.name);
    const favoriteButton = buildFavoriteButtonMarkup("place", place.id);

    card.innerHTML = `
      ${gallery}
      <h3>${place.name}</h3>
      <p>${place.description}</p>
      <div class="badges">
        <span class="badge">${t("guide.category")}: ${formatCategory(place.category)}</span>
        ${tags}
      </div>
      <div class="favorite-row">${favoriteButton}</div>
      <div class="actions">
        <button class="btn btn-primary" data-route="${place.id}">${t("guide.route")}</button>
        <button class="btn" data-map="${place.id}">${t("guide.more")}</button>
      </div>
    `;

    refs.guideList.appendChild(card);
  });
}

function renderCommunityFeed() {
  const visiblePlaces = getVisiblePlaces();
  const visibleServices = getVisibleServices();

  refs.communityFeed.innerHTML = "";

  const placeItems = visiblePlaces.slice(0, 4).map((place) => ({
    type: "place",
    title: place.name,
    meta: formatCategory(place.category),
    contact: "",
    imageUrls: place.imageUrls || [place.imageUrl || DEFAULT_PLACE_IMAGE],
    id: place.id,
    lat: place.lat,
    lng: place.lng
  }));

  const serviceItems = visibleServices.slice(0, 4).map((service) => ({
    type: "service",
    title: service.name,
    meta: `${formatServiceType(service.type)} · ${service.schedule}`,
    contact: service.contact || "",
    imageUrls: service.imageUrls || [DEFAULT_PLACE_IMAGE],
    id: service.id,
    lat: service.lat,
    lng: service.lng
  }));

  [...placeItems, ...serviceItems]
    .slice(0, 8)
    .forEach((item) => {
      const card = document.createElement("article");
      card.className = "feed-card";
      if (item.type === "place") {
        card.dataset.placeId = item.id;
      } else {
        card.dataset.serviceId = item.id;
      }
      const maybeImage = item.imageUrls?.length
        ? buildFadeSlideshow(item.imageUrls, item.title, "feed-thumb")
        : "";
      const contactLine = item.contact ? `<p class="feed-contact">${t("publish.contact")}: ${item.contact}</p>` : "";
      const statusLine = shouldShowCommunityStatus(item)
        ? `<p class="feed-status"><span class="status-pill ${item.status}">${getStatusLabel(item.status)}</span></p>`
        : "";
      
      // Agregar botones de mapa solo si hay ubicación
      let mapButtons = "";
      if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
        if (item.type === "place") {
          mapButtons = `
            <div class="actions" style="gap: 0.5rem; margin-top: 0.75rem;">
              <button class="btn btn-primary" type="button" data-map-route="${item.id}" style="font-size: 0.8rem;">${t("guide.route")}</button>
              <button class="btn btn-map-card" type="button" data-map-view-location-place="${item.id}" style="font-size: 0.8rem;">${t("map.viewOnMap")}</button>
            </div>
          `;
        } else {
          mapButtons = `
            <div class="actions" style="gap: 0.5rem; margin-top: 0.75rem;">
              <button class="btn btn-primary" type="button" data-map-route-service="${item.id}" style="font-size: 0.8rem;">${t("guide.route")}</button>
              <button class="btn btn-accent" type="button" data-map-view-location-service="${item.id}" style="font-size: 0.8rem;">${t("map.viewOnMap")}</button>
            </div>
          `;
        }
      }
      
      const typeLabel = item.type === "place" ? t("feed.place") : t("feed.service");
      const favoriteButton = buildFavoriteButtonMarkup(item.type, item.id, { compact: true });
      card.innerHTML = `
        <div class="feed-card-head">
          <strong>${typeLabel}</strong>
          ${favoriteButton}
        </div>
        <h4>${item.title}</h4>
        <p>${item.meta}</p>
        ${statusLine}
        ${contactLine}
        ${maybeImage}
        ${mapButtons}
      `;
      refs.communityFeed.appendChild(card);
    });

  refs.quickPosts.textContent = String(visiblePlaces.length + visibleServices.length);
}

function renderAlerts() {
  refs.alertsList.innerHTML = "";

  if (!state.alerts.length) {
    const empty = document.createElement("li");
    empty.className = "alert-item";
    empty.textContent = t("alert.none");
    refs.alertsList.appendChild(empty);
  }

  state.alerts.forEach((alert) => {
    const item = document.createElement("li");
    item.className = `alert-item ${alert.level === "high" ? "high" : ""}`;

    const title = document.createElement("strong");
    title.textContent = alert.title[state.lang] || alert.title.es || "";
    item.appendChild(title);

    const description = document.createElement("p");
    description.textContent = alert.description[state.lang] || alert.description.es || "";
    item.appendChild(description);

    const relativeTime = alert.publishedAt ? formatRelativeTime(alert.publishedAt) : "";
    const metaParts = [alert.source, relativeTime].filter(Boolean);
    if (metaParts.length) {
      const meta = document.createElement("small");
      meta.className = "alert-meta";
      meta.textContent = metaParts.join(" · ");
      item.appendChild(meta);
    }

    if (alert.sourceUrl) {
      const link = document.createElement("a");
      link.className = "alert-link";
      link.href = alert.sourceUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = t("alerts.readMore");
      item.appendChild(link);
    }

    refs.alertsList.appendChild(item);
  });

  refs.quickAlerts.textContent = String(state.alerts.length);
  renderAlertsSyncStatus();
}

function updateMateareLocalTime() {
  if (!refs.quickLocalTime) return;

  try {
    const locale = state.lang === "en" ? "en-US" : "es-NI";
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: MATEARE_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: state.lang === "en"
    });

    refs.quickLocalTime.textContent = formatter.format(new Date());
  } catch {
    refs.quickLocalTime.textContent = "--:--";
  }
}

function startMateareLocalClock() {
  updateMateareLocalTime();

  if (localTimeTimer) {
    clearInterval(localTimeTimer);
  }

  localTimeTimer = setInterval(updateMateareLocalTime, 30000);
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncateText(value, maxLength = 180) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function toDateMs(value) {
  if (!value) return 0;
  const dateMs = new Date(value).getTime();
  return Number.isFinite(dateMs) ? dateMs : 0;
}

function formatRelativeTime(dateValue) {
  const dateMs = toDateMs(dateValue);
  if (!dateMs) return "";

  const diffMs = dateMs - Date.now();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  const absMinutes = Math.abs(diffMinutes);
  const locale = state.lang === "en" ? "en" : "es";
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absMinutes < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

function isRecentEntry(entryDateMs) {
  if (!entryDateMs) return false;
  const maxAgeMs = ALERTS_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - entryDateMs <= maxAgeMs;
}

function isRecentEntryByDays(entryDateMs, maxAgeDays) {
  if (!entryDateMs) return false;
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return Date.now() - entryDateMs <= maxAgeMs;
}

function getEntryRelevanceScore(entry) {
  const text = `${entry.title || ""} ${stripHtml(entry.description || "")}`.toLowerCase();
  let score = 0;

  if (text.includes("mateare")) score += 6;
  if (text.includes("xiloa")) score += 5;
  if (text.includes("laguna")) score += 2;
  if (text.includes("turismo") || text.includes("turistica") || text.includes("turistico")) score += 3;
  if (text.includes("managua")) score += 2;
  if (text.includes("nicaragua")) score += 1;

  return score;
}

function getEntrySourceLabel(entry) {
  const author = stripHtml(entry.author || "").trim();
  if (author) return author;

  try {
    const hostname = new URL(entry.link).hostname.replace(/^www\./, "");
    return hostname || "Fuente";
  } catch {
    return "Fuente";
  }
}

async function fetchGoogleNewsQuery(query) {
  const encodedQuery = encodeURIComponent(query);
  const googleRssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=es-419&gl=NI&ceid=NI:es-419`;
  const rssUrl = encodeURIComponent(googleRssUrl);
  const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}&_t=${Date.now()}`;
  const response = await fetch(endpoint, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("alerts-feed-unavailable");
  }

  const data = await response.json();
  if (data?.status === "ok" && Array.isArray(data.items)) {
    return data.items;
  }

  const fallbackEndpoint = `https://api.allorigins.win/raw?url=${encodeURIComponent(googleRssUrl)}`;
  const fallbackResponse = await fetch(fallbackEndpoint, { cache: "no-store" });

  if (!fallbackResponse.ok) {
    throw new Error("alerts-feed-unavailable");
  }

  const xmlText = await fallbackResponse.text();
  const xmlDoc = new DOMParser().parseFromString(xmlText, "application/xml");
  const xmlItems = [...xmlDoc.querySelectorAll("item")];

  return xmlItems.map((item) => ({
    title: item.querySelector("title")?.textContent || "",
    description: item.querySelector("description")?.textContent || "",
    link: item.querySelector("link")?.textContent || "",
    pubDate: item.querySelector("pubDate")?.textContent || "",
    author: item.querySelector("source")?.textContent || ""
  }));
}

async function loadMunicipalAlerts(options = {}) {
  const force = options.force ?? false;
  const now = Date.now();

  if (!force && now - lastAlertsSyncAt < ALERTS_MIN_UPDATE_GAP_MS) {
    return;
  }

  lastAlertsSyncAt = now;
  alertsSyncState = "loading";
  renderAlertsSyncStatus();

  try {
    const allQueries = [...ALERTS_PRIMARY_SEARCH_QUERIES, ...ALERTS_BACKUP_SEARCH_QUERIES];
    const responses = await Promise.allSettled(
      allQueries.map((query) => fetchGoogleNewsQuery(query))
    );

    const combined = responses
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);

    if (!combined.length) {
      alertsSyncState = "error";
      renderAlertsSyncStatus();
      return;
    }

    const uniqueByLink = new Map();
    combined.forEach((entry) => {
      const key = String(entry.link || entry.guid || entry.title || "").trim();
      if (!key || uniqueByLink.has(key)) return;
      uniqueByLink.set(key, entry);
    });

    const normalizedEntries = [...uniqueByLink.values()].map((entry) => {
      const dateMs = toDateMs(entry.pubDate || entry.published || entry.isoDate);
      const relevance = getEntryRelevanceScore(entry);
      return { entry, dateMs, relevance };
    });

    const buildAlertItems = (maxAgeDays) => normalizedEntries
      .filter(({ dateMs }) => isRecentEntryByDays(dateMs, maxAgeDays))
      .sort((a, b) => {
        if (b.relevance !== a.relevance) return b.relevance - a.relevance;
        return b.dateMs - a.dateMs;
      })
      .slice(0, ALERTS_MAX_ITEMS)
      .map(({ entry, dateMs }, index) => {
        const cleanTitle = stripHtml(entry.title || "Noticia local");
        const cleanDescription = truncateText(stripHtml(entry.description || cleanTitle), 180);

        return {
          id: `news-${index}-${dateMs || Date.now()}`,
          level: /alerta|riesgo|lluvia|cierre|accidente|incendio/i.test(cleanTitle) ? "high" : "medium",
          title: {
            es: cleanTitle,
            en: cleanTitle
          },
          description: {
            es: cleanDescription,
            en: cleanDescription
          },
          source: getEntrySourceLabel(entry),
          publishedAt: dateMs || null,
          sourceUrl: entry.link
        };
      });

    let freshEntries = buildAlertItems(ALERTS_MAX_AGE_DAYS);
    if (!freshEntries.length) {
      freshEntries = buildAlertItems(ALERTS_EXTENDED_MAX_AGE_DAYS);
    }

    if (!freshEntries.length) {
      alertsSyncState = "stale";
      renderAlertsSyncStatus();
      return;
    }

    state.alerts = freshEntries;
    alertsLastSuccessAt = Date.now();
    alertsSyncState = "success";

    renderAlerts();
  } catch {
    alertsSyncState = "error";
    renderAlertsSyncStatus();
    // Keep static fallback alerts when external sources are unavailable.
  }
}

function initMap() {
  state.map = L.map("map").setView([12.2424, -86.4318], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(state.map);

  state.map.on("click", (event) => {
    if (!state.isPickingLocation) return;
    const { lat, lng } = event.latlng;
    
    if (state.pickingLocationForEditor) {
      setEditorCoordinates(lat, lng, { showToast: true });
      state.pickingLocationForEditor = false;
    } else if (state.pickingLocationFor === "service") {
      setServiceCoordinates(lat, lng, { showToast: true });
    } else {
      setPlaceCoordinates(lat, lng, { showToast: true });
    }
    state.isPickingLocation = false;
  });

  redrawMarkers();
}

function setCoordinates(lat, lng, formType, options = {}) {
  const showToast = options.showToast ?? false;
  const flyTo = options.flyTo ?? false;

  const safeLat = Number(lat);
  const safeLng = Number(lng);
  if (!Number.isFinite(safeLat) || !Number.isFinite(safeLng)) return;

  const latRef = formType === "service" ? refs.serviceLat : refs.placeLat;
  const lngRef = formType === "service" ? refs.serviceLng : refs.placeLng;

  if (latRef) latRef.value = safeLat.toFixed(6);
  if (lngRef) lngRef.value = safeLng.toFixed(6);

  if (state.map) {
    if (pickerMarker) {
      pickerMarker.setLatLng([safeLat, safeLng]);
    } else {
      // Crear ícono con color según el tipo de formulario
      const markerColor = formType === "service" ? "#ff9f1c" : "#1e8a5f";  // Naranja para servicios, Verde para lugares
      const markerIcon = L.divIcon({
        html: `<div style="background-color: ${markerColor}; width: 32px; height: 32px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); font-size: 16px;">${formType === "service" ? "S" : "L"}</div>`,
        className: "picker-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });
      
      pickerMarker = L.marker([safeLat, safeLng], { icon: markerIcon, opacity: 0.95 }).addTo(state.map);
      pickerMarker.bindPopup(t("publish.pickOnMap"));
    }

    if (flyTo) {
      state.map.flyTo([safeLat, safeLng], Math.max(state.map.getZoom(), 14), { duration: 0.7 });
    }
  }

  if (showToast) {
    notify(t("msg.mapLocationSet"), "success");
  }
}

function setPlaceCoordinates(lat, lng, options = {}) {
  setCoordinates(lat, lng, "place", options);
}

function setServiceCoordinates(lat, lng, options = {}) {
  setCoordinates(lat, lng, "service", options);
}

function clearPlaceCoordinates(showToast = true) {
  if (refs.placeLat) refs.placeLat.value = "";
  if (refs.placeLng) refs.placeLng.value = "";
  if (pickerMarker) {
    pickerMarker.remove();
    pickerMarker = null;
  }
  state.isPickingLocation = false;

  if (showToast) {
    notify(t("msg.mapLocationCleared"), "info");
  }
}

function clearServiceCoordinates(showToast = true) {
  if (refs.serviceLat) refs.serviceLat.value = "";
  if (refs.serviceLng) refs.serviceLng.value = "";
  if (pickerMarker) {
    pickerMarker.remove();
    pickerMarker = null;
  }
  state.isPickingLocation = false;

  if (showToast) {
    notify(t("msg.mapLocationCleared"), "info");
  }
}

function setEditorCoordinates(lat, lng, options = {}) {
  const { showToast = true } = options;
  
  if (refs.editorLat) refs.editorLat.value = lat.toFixed(6);
  if (refs.editorLng) refs.editorLng.value = lng.toFixed(6);

  // Mostrar marcador en el mapa
  const markerColor = "#1e8a5f";
  const markerIcon = L.divIcon({
    html: `<div style="background-color: ${markerColor}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">E</div>`,
    className: "location-picker-icon",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });

  if (pickerMarker) {
    pickerMarker.remove();
  }
  pickerMarker = L.marker([lat, lng], { icon: markerIcon }).addTo(state.map);

  state.isPickingLocation = false;

  if (showToast) {
    notify(t("msg.mapLocationSet"), "info");
  }
}

function clearEditorCoordinates(showToast = true) {
  if (refs.editorLat) refs.editorLat.value = "";
  if (refs.editorLng) refs.editorLng.value = "";
  if (pickerMarker) {
    pickerMarker.remove();
    pickerMarker = null;
  }
  state.isPickingLocation = false;

  if (showToast) {
    notify(t("msg.mapLocationCleared"), "info");
  }
}

function redrawMarkers() {
  if (!state.map) return;

  state.markers.forEach((marker) => marker.remove());
  state.markers = [];

  // Dibujar marcadores de LUGARES
  getVisiblePlaces().forEach((place) => {
    const marker = L.marker([place.lat, place.lng]).addTo(state.map);
    marker.placeId = place.id;
    marker.isPlace = true;
    marker.bindPopup(`
      ${buildImageTag(place.imageUrl || DEFAULT_PLACE_IMAGE, place.name, "place-image")}
      <strong>${place.name}</strong><br>${place.description}
      <div class="actions">
        <button class="btn btn-primary" type="button" data-map-route="${place.id}">${t("guide.route")}</button>
        <button class="btn btn-map-card" type="button" data-map-card="${place.id}">${t("map.viewCard")}</button>
      </div>
    `);
    marker.on("click", () => {
      state.selectedPlaceId = place.id;
    });
    state.markers.push(marker);
  });

  // Dibujar marcadores de SERVICIOS (solo aprobados)
  state.services.forEach((service) => {
    if (!Number.isFinite(service.lat) || !Number.isFinite(service.lng)) return;
    // Solo mostrar servicios aprobados en el mapa
    if (service.status !== "approved") return;
    
    // Crear marcador con color naranja para servicios
    const serviceIcon = L.divIcon({
      html: `<div style="background-color: #ff9f1c; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">S</div>`,
      className: "service-marker",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });

    const marker = L.marker([service.lat, service.lng], { icon: serviceIcon }).addTo(state.map);
    marker.serviceId = service.id;
    marker.isService = true;
    // Mapeo de tipos de servicio a claves de traducción
    const typeMap = {
      "alimentacion": "publish.food",
      "hospedaje": "publish.lodging",
      "actividad": "publish.activities"
    };
    const typeKey = typeMap[service.type] || service.type;
    
    marker.bindPopup(`
      <div class="service-popup-content">
        ${buildImageTag(service.imageUrl || DEFAULT_PLACE_IMAGE, service.name, "service-image")}
        <strong>${service.name}</strong><br>
        <small>${t("publish.serviceType")}: ${t(typeKey)}</small><br>
        <small>${t("publish.contact")}: ${service.contact}</small><br>
        <small>${t("publish.schedule")}: ${service.schedule}</small>
        <div class="actions" style="gap: 0.5rem; margin-top: 0.5rem;">
          <button class="btn btn-primary" type="button" data-map-route-service="${service.id}" style="font-size: 0.85rem;">${t("guide.route")}</button>
          <button class="btn btn-accent" type="button" data-map-service="${service.id}" style="font-size: 0.85rem;">${t("map.viewCard")}</button>
        </div>
      </div>
    `);
    state.markers.push(marker);
  });
}

function openPlaceMarkerPopup(placeId) {
  const marker = state.markers.find((item) => item?.placeId === placeId);
  if (!marker) return;
  marker.openPopup();
  
  // Asegurar que el popup se vea centrado en la pantalla
  setTimeout(() => {
    const popup = document.querySelector(".leaflet-popup");
    if (popup) {
      popup.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 100);
}

function focusPlaceCard(placeId) {
  if (!refs.guideList) return;

  const place = getVisiblePlaces().find((item) => item.id === placeId);
  if (!place) return;

  if (refs.searchGuide && refs.searchGuide.value) {
    refs.searchGuide.value = "";
  }

  if (refs.filterCategory && refs.filterCategory.value !== "all") {
    refs.filterCategory.value = "all";
  }

  renderGuides();

  const cards = [...refs.guideList.querySelectorAll(".place-card")];
  const card = cards.find((item) => item.getAttribute("data-place-id") === placeId);
  if (!(card instanceof HTMLElement)) return;

  cards.forEach((item) => item.classList.remove("is-map-focused"));
  card.classList.add("is-map-focused");

  document.getElementById("guias")?.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 180);

  if (placeCardFocusTimer) {
    clearTimeout(placeCardFocusTimer);
  }

  placeCardFocusTimer = setTimeout(() => {
    card.classList.remove("is-map-focused");
  }, 1800);
}

function focusServiceCard(serviceId) {
  if (!refs.communityFeed) return;

  const service = getVisibleServices().find((item) => item.id === serviceId);
  if (!service) return;

  renderCommunityFeed();

  const cards = [...refs.communityFeed.querySelectorAll(".feed-card[data-service-id]")];
  const card = cards.find((item) => item.getAttribute("data-service-id") === serviceId);
  if (!(card instanceof HTMLElement)) return;

  cards.forEach((item) => item.classList.remove("is-map-focused"));
  card.classList.add("is-map-focused");

  document.getElementById("comunidad")?.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 180);

  if (serviceCardFocusTimer) {
    clearTimeout(serviceCardFocusTimer);
  }

  serviceCardFocusTimer = setTimeout(() => {
    card.classList.remove("is-map-focused");
  }, 1800);
}

function goToPlace(placeId) {
  const place = getVisiblePlaces().find((p) => p.id === placeId);
  if (!place || !state.map) return;
  state.selectedPlaceId = placeId;
  state.map.once("moveend", () => {
    openPlaceMarkerPopup(placeId);
  });
  state.map.flyTo([place.lat, place.lng], 14, { duration: 1.2 });
}

// Vuela al lugar SIN abrir popup (para "Ver en mapa" desde tarjeta)
function goToPlaceLocation(placeId) {
  const place = getVisiblePlaces().find((p) => p.id === placeId);
  if (!place || !state.map) return;
  state.selectedPlaceId = placeId;
  state.map.once("moveend", () => {
    openPlaceMarkerPopup(placeId);
  });
  state.map.flyTo([place.lat, place.lng], 14, { duration: 1.2 });
}

function goToService(serviceId) {
  const service = state.services.find((s) => s.id === serviceId);
  if (!service || !state.map) return;
  state.map.once("moveend", () => {
    openServiceMarkerPopup(serviceId);
  });
  state.map.flyTo([service.lat, service.lng], 14, { duration: 1.2 });
}

// Vuela al servicio SIN abrir popup (para "Ver en mapa" desde tarjeta)
function goToServiceLocation(serviceId) {
  const service = state.services.find((s) => s.id === serviceId);
  if (!service || !state.map) return;
  state.map.once("moveend", () => {
    openServiceMarkerPopup(serviceId);
  });
  state.map.flyTo([service.lat, service.lng], 14, { duration: 1.2 });
}

function openServiceMarkerPopup(serviceId) {
  const marker = state.markers.find((item) => item?.serviceId === serviceId);
  if (!marker) return;
  marker.openPopup();
  
  // Asegurar que el popup se vea centrado en la pantalla
  setTimeout(() => {
    const popup = document.querySelector(".leaflet-popup");
    if (popup) {
      popup.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 100);
}

function openRoute(placeId) {
  const place = getVisiblePlaces().find((p) => p.id === placeId);
  if (!place) return;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
  window.open(mapsUrl, "_blank", "noopener,noreferrer");
}

function openServiceRoute(serviceId) {
  const service = getVisibleServices().find((s) => s.id === serviceId);
  if (!service) return;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${service.lat},${service.lng}`;
  window.open(mapsUrl, "_blank", "noopener,noreferrer");
}

async function fetchWeather(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,rain,weather_code,is_day&timezone=auto`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather request failed");
  }

  return response.json();
}

function getWeatherConditionKey(weatherCode) {
  if (weatherCode === 0) return "weather.condition.clear";
  if ([1, 2].includes(weatherCode)) return "weather.condition.partlyCloudy";
  if (weatherCode === 3) return "weather.condition.cloudy";
  if ([45, 48].includes(weatherCode)) return "weather.condition.fog";
  if ([51, 53, 55, 56, 57].includes(weatherCode)) return "weather.condition.drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return "weather.condition.rain";
  if ([95, 96, 99].includes(weatherCode)) return "weather.condition.storm";
  return "weather.condition.cloudy";
}

function getWeatherSuggestionKey(current) {
  const rain = Number(current.rain || 0);
  const wind = Number(current.wind_speed_10m || 0);
  const temp = Number(current.temperature_2m || 0);
  const isDay = Number(current.is_day || 0) === 1;
  const conditionKey = getWeatherConditionKey(current.weather_code);

  if (conditionKey === "weather.condition.storm") {
    return "weather.suggestion.storm";
  }

  if (rain >= 4) {
    return "weather.suggestion.heavyRain";
  }

  if (conditionKey === "weather.condition.rain" || rain >= 0.3) {
    return rain >= 1.5 ? "weather.suggestion.rainRoutes" : "weather.suggestion.rainLight";
  }

  if (conditionKey === "weather.condition.drizzle") {
    return "weather.suggestion.drizzle";
  }

  if (conditionKey === "weather.condition.fog") {
    return "weather.suggestion.fog";
  }

  if (wind >= 36) {
    return "weather.suggestion.strongWind";
  }

  if (wind >= 22) {
    return isDay ? "weather.suggestion.windViewpoints" : "weather.suggestion.windNight";
  }

  if (isDay && temp >= 35) {
    return "weather.suggestion.heatExtreme";
  }

  if (isDay && temp >= 31) {
    return "weather.suggestion.heatWalks";
  }

  if (!isDay && temp <= 20) {
    return "weather.suggestion.coolNight";
  }

  if (!isDay && temp >= 28) {
    return "weather.suggestion.warmNight";
  }

  if (conditionKey === "weather.condition.clear" && isDay) {
    return temp >= 28 ? "weather.suggestion.sunDayHydrate" : "weather.suggestion.sunDayExplore";
  }

  if (conditionKey === "weather.condition.clear" && !isDay) {
    return wind >= 15 ? "weather.suggestion.clearNightBreeze" : "weather.suggestion.clearNightCalm";
  }

  if (conditionKey === "weather.condition.partlyCloudy") {
    return isDay ? "weather.suggestion.partlyCloudyDay" : "weather.suggestion.partlyCloudyNight";
  }

  if (conditionKey === "weather.condition.cloudy") {
    return isDay ? "weather.suggestion.cloudyDay" : "weather.suggestion.cloudyNight";
  }

  return isDay ? "weather.suggestion.stableDay" : "weather.suggestion.stableNight";
}

function getWeatherIcon(current) {
  const weatherCode = Number(current.weather_code);
  const isDay = Number(current.is_day || 0) === 1;
  const conditionKey = getWeatherConditionKey(weatherCode);

  if (conditionKey === "weather.condition.storm") return "⛈️";
  if (conditionKey === "weather.condition.rain") return "🌧️";
  if (conditionKey === "weather.condition.drizzle") return "🌦️";
  if (conditionKey === "weather.condition.fog") return "🌫️";
  if (conditionKey === "weather.condition.cloudy") return "☁️";
  if (conditionKey === "weather.condition.partlyCloudy") {
    return isDay ? "🌤️" : "☁️";
  }

  return isDay ? "☀️" : "🌙";
}

async function renderWeather() {
  const placeId = refs.weatherPlace.value;
  const visiblePlaces = getVisiblePlaces();
  const place = visiblePlaces.find((p) => p.id === placeId) ?? visiblePlaces[0];

  if (!place) {
    refs.weatherOutput.textContent = "Sin datos";
    return;
  }

  refs.weatherOutput.innerHTML = `<p>${t("weather.loading")}</p>`;

  try {
    const data = await fetchWeather(place.lat, place.lng);
    const current = data.current;
    const conditionKey = getWeatherConditionKey(Number(current.weather_code));
    const suggestionKey = getWeatherSuggestionKey(current);
    const isDay = Number(current.is_day || 0) === 1;
    const periodLabel = isDay ? t("weather.periodDay") : t("weather.periodNight");
    const conditionLabel = t(conditionKey);
    const suggestionLabel = t(suggestionKey);
    const weatherIcon = getWeatherIcon(current);

    refs.weatherOutput.innerHTML = `
      <h3>${place.name}</h3>
      <p class="weather-icon-line"><span class="weather-icon" aria-hidden="true">${weatherIcon}</span> ${conditionLabel} · ${periodLabel}</p>
      <p><strong>${t("weather.temp")}:</strong> ${current.temperature_2m} °C</p>
      <p><strong>${t("weather.wind")}:</strong> ${current.wind_speed_10m} km/h</p>
      <p><strong>${t("weather.rain")}:</strong> ${current.rain} mm</p>
      <p><strong>${t("weather.condition")}:</strong> ${conditionLabel}</p>
      <p><strong>${t("weather.period")}:</strong> ${periodLabel}</p>
      <p><strong>${t("weather.suggestion")}:</strong> ${suggestionLabel}</p>
      <small>${t("weather.updated")}: ${current.time}</small>
    `;

    refs.quickWeather.textContent = `${weatherIcon} ${current.temperature_2m} °C · ${conditionLabel}`;
  } catch {
    refs.weatherOutput.innerHTML = `<p>${t("weather.error")}</p>`;
    refs.quickWeather.textContent = "--";
  }
}

function syncWeatherSelector() {
  const current = refs.weatherPlace.value;
  refs.weatherPlace.innerHTML = "";

  getVisiblePlaces().forEach((place) => {
    const option = document.createElement("option");
    option.value = place.id;
    option.textContent = place.name;
    refs.weatherPlace.appendChild(option);
  });

  if (current && getVisiblePlaces().some((place) => place.id === current)) {
    refs.weatherPlace.value = current;
  }
}

function updateImageSchema() {
  // Remove old image schema
  const oldSchema = document.querySelector('script[data-image-schema]');
  if (oldSchema) oldSchema.remove();

  // Collect all image URLs from places and services
  const imageUrls = [];
  
  state.places.forEach((place) => {
    if (Array.isArray(place.imageUrls)) {
      place.imageUrls.forEach((url) => {
        if (url && typeof url === 'string' && imageUrls.indexOf(url) === -1) {
          imageUrls.push(url);
        }
      });
    }
  });

  state.services.forEach((service) => {
    if (Array.isArray(service.imageUrls)) {
      service.imageUrls.forEach((url) => {
        if (url && typeof url === 'string' && imageUrls.indexOf(url) === -1) {
          imageUrls.push(url);
        }
      });
    }
  });

  // Create ImageObject for each image
  const images = imageUrls.map((url) => ({
    "@type": "ImageObject",
    "url": url,
    "name": "Imagen turística de Mateare",
    "description": "Imagen de un lugar o servicio turístico en Mateare, Nicaragua"
  }));

  if (images.length === 0) return;

  // Create and inject schema
  const schemaTag = document.createElement('script');
  schemaTag.type = 'application/ld+json';
  schemaTag.setAttribute('data-image-schema', 'true');
  schemaTag.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": images
  });

  document.head.appendChild(schemaTag);
}

function refreshUiData() {
  renderGuides();
  syncWeatherSelector();
  redrawMarkers();
  renderCommunityFeed();
  renderWeather();
  renderModerationPanel();
  updateImageSchema();
}

function getStatusLabel(status) {
  if (status === "approved") return t("admin.statusApproved");
  if (status === "rejected") return t("admin.statusRejected");
  return t("admin.statusPending");
}

function openAdminEditor(entity, itemId) {
  if (!refs.adminEditorForm || !state.isAdmin) return;

  const source = entity === "place"
    ? state.places.find((item) => item.id === itemId)
    : state.services.find((item) => item.id === itemId);
  if (!source) return;

  refs.editorEntity.value = entity;
  refs.editorItemId.value = source.id;
  refs.editorName.value = source.name || "";
  refs.editorStatus.value = source.status || "pending";
  refs.editorImageUrls.value = (source.imageUrls || []).join("\n");
  if (refs.editorImageFiles) {
    refs.editorImageFiles.value = "";
  }

  const isPlace = entity === "place";
  refs.editorCategoryLabel.hidden = !isPlace;
  refs.editorCoordsRow.hidden = false;  // Mostrar para ambos
  refs.editorDescriptionLabel.hidden = !isPlace;
  refs.editorTypeLabel.hidden = isPlace;
  refs.editorServiceRow.hidden = isPlace;

  if (isPlace) {
    refs.editorCategory.value = source.category || "naturaleza";
    refs.editorDescription.value = source.description || "";
    refs.editorLat.value = Number.isFinite(source.lat) ? source.lat : "";
    refs.editorLng.value = Number.isFinite(source.lng) ? source.lng : "";
  } else {
    refs.editorType.value = source.type || "actividad";
    refs.editorContact.value = source.contact || "";
    refs.editorSchedule.value = source.schedule || "";
    refs.editorLat.value = Number.isFinite(source.lat) ? source.lat : "";
    refs.editorLng.value = Number.isFinite(source.lng) ? source.lng : "";
  }

  refs.adminEditorForm.hidden = false;
  refs.adminEditorForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function closeAdminEditor() {
  if (!refs.adminEditorForm) return;
  refs.adminEditorForm.hidden = true;
  refs.adminEditorForm.reset();
  state.isPickingLocation = false;
  state.pickingLocationForEditor = false;
  if (pickerMarker) {
    pickerMarker.remove();
    pickerMarker = null;
  }
}

function renderModerationPanel() {
  if (!refs.pendingPlacesList || !refs.pendingServicesList || !refs.allPlacesList || !refs.allServicesList) return;

  const pendingPlaces = getPendingPlaces();
  const pendingServices = getPendingServices();

  refs.pendingPlacesList.innerHTML = "";
  refs.pendingServicesList.innerHTML = "";
  refs.allPlacesList.innerHTML = "";
  refs.allServicesList.innerHTML = "";

  if (!pendingPlaces.length) {
    refs.pendingPlacesList.innerHTML = `<p class="moderation-empty">${t("admin.emptyPlaces")}</p>`;
  }

  if (!pendingServices.length) {
    refs.pendingServicesList.innerHTML = `<p class="moderation-empty">${t("admin.emptyServices")}</p>`;
  }

  pendingPlaces.forEach((place) => {
    const item = document.createElement("article");
    item.className = "moderation-item";
    item.innerHTML = `
      ${buildModerationPlaceMarkup(place, { statusClass: "pending" })}
      <div class="moderation-actions">
        <button class="btn btn-primary" data-entity="place" data-id="${place.id}" data-action="approve">${t("admin.approve")}</button>
        <button class="btn btn-warning" data-entity="place" data-id="${place.id}" data-action="reject">${t("admin.reject")}</button>
        <button class="btn btn-danger" data-entity="place" data-id="${place.id}" data-action="delete">${t("admin.delete")}</button>
      </div>
    `;
    refs.pendingPlacesList.appendChild(item);
  });

  pendingServices.forEach((service) => {
    const item = document.createElement("article");
    item.className = "moderation-item";
    item.innerHTML = `
      ${buildModerationServiceMarkup(service, { statusClass: "pending" })}
      <div class="moderation-actions">
        <button class="btn btn-primary" data-entity="service" data-id="${service.id}" data-action="approve">${t("admin.approve")}</button>
        <button class="btn btn-warning" data-entity="service" data-id="${service.id}" data-action="reject">${t("admin.reject")}</button>
        <button class="btn btn-danger" data-entity="service" data-id="${service.id}" data-action="delete">${t("admin.delete")}</button>
      </div>
    `;
    refs.pendingServicesList.appendChild(item);
  });

  if (!state.places.length) {
    refs.allPlacesList.innerHTML = `<p class="moderation-empty">${t("admin.emptyAllPlaces")}</p>`;
  }

  if (!state.services.length) {
    refs.allServicesList.innerHTML = `<p class="moderation-empty">${t("admin.emptyAllServices")}</p>`;
  }

  state.places.forEach((place) => {
    const item = document.createElement("article");
    item.className = "moderation-item";
    item.innerHTML = `
      ${buildModerationPlaceMarkup(place)}
      <div class="moderation-actions">
        <button class="btn" data-entity="place" data-id="${place.id}" data-action="edit">${t("admin.edit")}</button>
        <button class="btn btn-danger" data-entity="place" data-id="${place.id}" data-action="delete">${t("admin.delete")}</button>
      </div>
    `;
    refs.allPlacesList.appendChild(item);
  });

  state.services.forEach((service) => {
    const item = document.createElement("article");
    item.className = "moderation-item";
    item.innerHTML = `
      ${buildModerationServiceMarkup(service)}
      <div class="moderation-actions">
        <button class="btn" data-entity="service" data-id="${service.id}" data-action="edit">${t("admin.edit")}</button>
        <button class="btn btn-danger" data-entity="service" data-id="${service.id}" data-action="delete">${t("admin.delete")}</button>
      </div>
    `;
    refs.allServicesList.appendChild(item);
  });
}

function setFormsEnabled(enabled) {
  [refs.placeForm, refs.serviceForm].forEach((form) => {
    Array.from(form.elements).forEach((field) => {
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement || field instanceof HTMLButtonElement) {
        field.disabled = !enabled;
      }
    });
  });
}

function updateAuthUI() {
  if (!refs.authUser || !refs.signInBtn || !refs.signOutBtn || !refs.authNotice) return;

  if (!state.useFirebase) {
    refs.authUser.textContent = t("auth.guest");
    refs.signInBtn.hidden = true;
    refs.signOutBtn.hidden = true;
    refs.authNotice.textContent = t("auth.firebaseOff");
    refs.authNotice.classList.remove("ok");
    setFormsEnabled(true);
    return;
  }

  if (state.user) {
    const name = state.user.displayName || state.user.email || t("auth.guest");
    refs.authUser.textContent = `${t("auth.connectedAs")}: ${name}`;
    refs.signInBtn.hidden = true;
    refs.signOutBtn.hidden = false;
    refs.authNotice.textContent = t("msg.realtimeSync");
    refs.authNotice.classList.add("ok");
    setFormsEnabled(true);
    return;
  }

  refs.authUser.textContent = t("auth.guest");
  refs.signInBtn.hidden = false;
  refs.signOutBtn.hidden = true;
  refs.authNotice.textContent = t("auth.required");
  refs.authNotice.classList.remove("ok");
  // Keep forms interactive so users can type and receive explicit sign-in feedback on submit.
  setFormsEnabled(true);
}

function updateAdminUI() {
  const canModerate = state.useFirebase && state.isAdmin;

  if (refs.navModeration) {
    refs.navModeration.hidden = !canModerate;
  }

  if (refs.moderationSection) {
    refs.moderationSection.hidden = !canModerate;
  }

  if (!canModerate) {
    closeAdminEditor();
  }
}

function isStandaloneDisplayMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIOSDevice() {
  const ua = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";
  const isIPhoneFamily = /iPad|iPhone|iPod/.test(ua);
  const isIPadOSDesktopUA = platform === "MacIntel" && Number(window.navigator.maxTouchPoints || 0) > 1;
  return isIPhoneFamily || isIPadOSDesktopUA;
}

function isAndroidDevice() {
  const ua = window.navigator.userAgent || "";
  return /Android/i.test(ua);
}

function isDesktopDevice() {
  return !isIOSDevice() && !isAndroidDevice();
}

function isChromiumInstallBrowser() {
  const ua = window.navigator.userAgent || "";
  const isChromiumFamily = /(Chrome|CriOS|EdgA|Edg\/)/i.test(ua);
  const isExcludedBrowser = /(Firefox|FxiOS|OPR|Opera|UCBrowser|YaBrowser)/i.test(ua);
  return isChromiumFamily && !isExcludedBrowser;
}

function canUseAutomaticInstallPrompt() {
  if (isStandaloneDisplayMode() || isIOSDevice()) return false;
  return "onbeforeinstallprompt" in window || isChromiumInstallBrowser();
}

function getInstallMode() {
  if (isStandaloneDisplayMode()) return "installed";
  if (deferredInstallPrompt) return "prompt";
  if (isIOSDevice()) return "ios-manual";
  if (canUseAutomaticInstallPrompt()) return "prompt-pending";
  return "unsupported";
}

function showInstallBanner() {
  if (!refs.installBanner) return;
  renderInstallBannerContent();

  if (shouldSuppressInstallBanner()) {
    refs.installBanner.hidden = true;
    return;
  }

  const mode = getInstallMode();
  if (mode === "installed") {
    refs.installBanner.hidden = true;
    return;
  }

  refs.installBanner.hidden = false;
}

function hideInstallBanner() {
  if (!refs.installBanner) return;
  refs.installBanner.hidden = true;
}

async function promptAppInstall() {
  const mode = getInstallMode();

  if (mode === "installed") {
    hideInstallBanner();
    notify(t("install.notSupported"), "info");
    return;
  }

  if (mode === "ios-manual") {
    notify(t("install.iosInstructions"), "info");
    return;
  }

  if (mode === "prompt-pending") {
    notify(t("install.pendingPrompt"), "info");
    return;
  }

  if (mode !== "prompt" || !deferredInstallPrompt) {
    const unavailableKey = isDesktopDevice() ? "install.unavailableDesktop" : "install.unavailableMobile";
    notify(t(unavailableKey), "info");
    return;
  }

  deferredInstallPrompt.prompt();
  const choiceResult = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;

  if (choiceResult.outcome === "accepted") {
    clearInstallBannerDismissedAt();
    hideInstallBanner();
    notify(t("install.success"), "success");
  } else {
    clearInstallBannerDismissedAt();
    showInstallBanner();
    notify(t("install.promptDismissed"), "info");
  }
}

async function syncAdminClaim(user) {
  if (!user || !state.useFirebase) {
    state.isAdmin = false;
    updateAdminUI();
    return;
  }

  try {
    const token = await user.getIdTokenResult(true);
    state.isAdmin = Boolean(token.claims.admin);
  } catch {
    state.isAdmin = false;
  }

  updateAdminUI();
}

function getSignInErrorMessage(error) {
  const code = String(error?.code || "");

  if (code === "auth/unauthorized-domain") {
    return t("msg.signInBlockedDomain");
  }

  if (code === "auth/popup-blocked") {
    return t("msg.signInPopupBlocked");
  }

  if (code === "auth/popup-closed-by-user") {
    return t("msg.signInPopupClosed");
  }

  if (code === "auth/operation-not-allowed") {
    return t("msg.signInOperationDisabled");
  }

  if (code === "auth/network-request-failed") {
    return t("msg.signInNetworkError");
  }

  return code ? `${t("msg.signInError")} (${code})` : t("msg.signInError");
}

function notify(message, type = "info") {
  if (!refs.toastRegion) {
    alert(message);
    return;
  }

  refs.toastRegion.textContent = message;
  refs.toastRegion.className = `toast show ${type}`;

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastTimer = setTimeout(() => {
    refs.toastRegion.classList.remove("show");
  }, 3200);
}

function getLightboxPanLimits() {
  if (!refs.imageLightboxImg) {
    return { maxX: 0, maxY: 0 };
  }

  const width = refs.imageLightboxImg.clientWidth;
  const height = refs.imageLightboxImg.clientHeight;
  const maxX = Math.max(0, (width * lightboxScale - width) / 2);
  const maxY = Math.max(0, (height * lightboxScale - height) / 2);
  return { maxX, maxY };
}

function clampLightboxPan() {
  const { maxX, maxY } = getLightboxPanLimits();
  lightboxPanX = Math.min(maxX, Math.max(-maxX, lightboxPanX));
  lightboxPanY = Math.min(maxY, Math.max(-maxY, lightboxPanY));
}

function applyLightboxTransform() {
  if (!refs.imageLightboxImg) return;
  refs.imageLightboxImg.style.transform = `translate(${lightboxPanX}px, ${lightboxPanY}px) scale(${lightboxScale})`;
}

function setLightboxScale(nextScale) {
  if (!refs.imageLightboxImg) return;

  const clamped = Math.min(3.5, Math.max(1, nextScale));
  lightboxScale = clamped;

  if (lightboxScale <= 1) {
    lightboxPanX = 0;
    lightboxPanY = 0;
  }

  clampLightboxPan();
  applyLightboxTransform();
}

function renderLightboxImage(index) {
  if (!refs.imageLightboxImg || !lightboxImages.length) return;

  const safeIndex = (index + lightboxImages.length) % lightboxImages.length;
  lightboxIndex = safeIndex;
  const current = lightboxImages[safeIndex];
  refs.imageLightboxImg.src = current.src;
  refs.imageLightboxImg.alt = current.alt || "";
  lightboxPanX = 0;
  lightboxPanY = 0;
  applyLightboxTransform();
}

function showPrevLightboxImage() {
  if (!lightboxImages.length) return;
  renderLightboxImage(lightboxIndex - 1);
}

function showNextLightboxImage() {
  if (!lightboxImages.length) return;
  renderLightboxImage(lightboxIndex + 1);
}

function openImageLightbox(images, startIndex = 0) {
  if (!refs.imageLightbox || !refs.imageLightboxImg || !Array.isArray(images) || !images.length) return;

  lightboxImages = images.filter((entry) => entry?.src);
  if (!lightboxImages.length) return;

  renderLightboxImage(startIndex);
  setLightboxScale(1);
  refs.imageLightbox.hidden = false;
  refs.imageLightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeImageLightbox() {
  if (!refs.imageLightbox || !refs.imageLightboxImg) return;

  refs.imageLightbox.hidden = true;
  refs.imageLightbox.setAttribute("aria-hidden", "true");
  refs.imageLightboxImg.src = "";
  refs.imageLightboxImg.alt = "";
  lightboxImages = [];
  lightboxIndex = 0;
  lightboxPanX = 0;
  lightboxPanY = 0;
  lightboxIsDragging = false;
  document.body.style.overflow = "";
}

function getMostVisibleSlide(slideshow) {
  if (!(slideshow instanceof HTMLElement)) return null;
  const slides = [...slideshow.querySelectorAll("img.fade-slide")];
  if (!slides.length) return null;

  return slides.reduce((best, current) => {
    const currentOpacity = Number.parseFloat(getComputedStyle(current).opacity || "0") || 0;
    const bestOpacity = best ? Number.parseFloat(getComputedStyle(best).opacity || "0") || 0 : -1;
    return currentOpacity >= bestOpacity ? current : best;
  }, null);
}

async function publishPlace(data) {
  if (state.useFirebase && !state.user) {
    notify(t("msg.signInRequired"), "error");
    return;
  }

  let imageUrls = [DEFAULT_PLACE_IMAGE];
  let failedFiles = [];

  try {
    const resolved = await resolveImages(data, {
      fileField: "imageFiles",
      urlField: "imageUrls",
      fallbackImage: DEFAULT_PLACE_IMAGE,
      uploadFolder: "places"
    });
    imageUrls = resolved.imageUrls;
    failedFiles = resolved.failedFiles || [];
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("all-images-failed")) {
      const match = message.match(/all-images-failed:(.+)/);
      const failedNames = match ? match[1] : "las imágenes";
      notify(`No se pudieron subir las imágenes: ${failedNames}`, "error");
    } else if (message.includes("firebase-required-for-images")) {
      notify(t("msg.firebaseSignInRequired"), "error");
    } else if (message.includes("invalid-image-url")) {
      notify(t("msg.invalidImage"), "error");
    } else {
      notify(t("msg.imageUploadError"), "error");
    }
    return;
  }

  const payload = {
    name: String(data.get("name")),
    category: String(data.get("category")),
    description: String(data.get("description")),
    lat: Number(data.get("lat")),
    lng: Number(data.get("lng")),
    imageUrls,
    imageUrl: imageUrls[0],
    status: state.useFirebase ? "pending" : "approved",
    tags: ["Comunitario"],
    createdByName: state.user?.displayName ?? "local",
    createdByUid: state.user?.uid ?? "local"
  };

  if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) {
    notify(t("msg.locationRequired"), "error");
    return;
  }

  try {
    if (state.useFirebase) {
      await firebaseClient.addPlace(payload);
    } else {
      state.places = [{ id: crypto.randomUUID(), ...payload }, ...state.places];
      saveToStorage();
      refreshUiData();
    }
  } catch (error) {
    console.error("Publish place error:", error);
    const isDenied = String(error?.code || "").includes("permission-denied");
    notify(isDenied ? t("msg.permissionDenied") : t("msg.placeSaveError"), "error");
    return;
  }

  refs.placeForm.reset();
  setPlacePreview("");
  clearPlaceCoordinates(false);
  const placeMessage = payload.status === "pending" ? t("msg.placePending") : t("msg.placeSaved");
  
  if (failedFiles.length > 0) {
    const failedNames = failedFiles.map(f => f.name).join(", ");
    notify(`${placeMessage} ⚠️ No se subieron: ${failedNames}`, "warning");
    return;
  }
  
  notify(placeMessage, "success");
}

async function publishService(data) {
  if (state.useFirebase && !state.user) {
    notify(t("msg.signInRequired"), "error");
    return;
  }

  let imageUrls = [];
  let failedFiles = [];

  try {
    const resolved = await resolveServiceImages(data);
    imageUrls = resolved.imageUrls;
    failedFiles = resolved.failedFiles || [];
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("all-images-failed")) {
      const match = message.match(/all-images-failed:(.+)/);
      const failedNames = match ? match[1] : "las imágenes";
      notify(`No se pudieron subir las imágenes: ${failedNames}`, "error");
    } else if (message.includes("firebase-required-for-images")) {
      notify(t("msg.firebaseSignInRequired"), "error");
    } else if (message.includes("invalid-image-url")) {
      notify(t("msg.invalidImage"), "error");
    } else {
      notify(t("msg.serviceSaveError"), "error");
    }
    return;
  }

  // Obtener coordenadas del formulario
  const serviceLat = refs.serviceLat?.value ? parseFloat(refs.serviceLat.value) : undefined;
  const serviceLng = refs.serviceLng?.value ? parseFloat(refs.serviceLng.value) : undefined;

  const payload = {
    name: String(data.get("name")),
    type: String(data.get("type")),
    contact: String(data.get("contact")),
    schedule: String(data.get("schedule")),
    imageUrls,
    imageUrl: imageUrls[0] || "",
    status: state.useFirebase ? "pending" : "approved",
    createdByName: state.user?.displayName ?? "local",
    createdByUid: state.user?.uid ?? "local",
    lat: serviceLat,
    lng: serviceLng
  };

  try {
    if (state.useFirebase) {
      await firebaseClient.addService(payload);
    } else {
      state.services = [{ id: crypto.randomUUID(), ...payload }, ...state.services];
      saveToStorage();
      refreshUiData();
    }
  } catch (error) {
    console.error("Publish service error:", error);
    const isDenied = String(error?.code || "").includes("permission-denied");
    notify(isDenied ? t("msg.permissionDenied") : t("msg.serviceSaveError"), "error");
    return;
  }

  refs.serviceForm.reset();
  const serviceMessage = payload.status === "pending" ? t("msg.servicePending") : t("msg.serviceSaved");
  
  if (failedFiles.length > 0) {
    const failedNames = failedFiles.map(f => f.name).join(", ");
    notify(`${serviceMessage} ⚠️ No se subieron: ${failedNames}`, "warning");
    return;
  }

  notify(serviceMessage, "success");
}

async function applyModeration(entity, itemId, action) {
  if (!state.useFirebase || !state.isAdmin || !state.user) {
    notify(t("msg.adminOnly"), "error");
    return;
  }

  const actionKey = `${entity}:${itemId}`;
  if (moderationActionLocks.has(actionKey)) {
    return;
  }

  if (action === "edit") {
    openAdminEditor(entity, itemId);
    return;
  }

  moderationActionLocks.add(actionKey);

  try {
    if (entity === "place") {
      if (action === "delete") {
        await firebaseClient.deletePlace(itemId);
      } else if (action === "approve") {
        await firebaseClient.updatePlaceStatus(itemId, "approved", state.user.uid);
      } else if (action === "reject") {
        await firebaseClient.updatePlaceStatus(itemId, "rejected", state.user.uid);
      }
    }

    if (entity === "service") {
      if (action === "delete") {
        await firebaseClient.deleteService(itemId);
      } else if (action === "approve") {
        await firebaseClient.updateServiceStatus(itemId, "approved", state.user.uid);
      } else if (action === "reject") {
        await firebaseClient.updateServiceStatus(itemId, "rejected", state.user.uid);
      }
    }

    notify(t("msg.moderationUpdated"), "success");
  } catch (error) {
    console.error("Moderation error:", error);
    notify(t("msg.moderationError"), "error");
  } finally {
    moderationActionLocks.delete(actionKey);
  }
}

async function saveAdminChanges(event) {
  event.preventDefault();

  if (!state.useFirebase || !state.isAdmin || !state.user) {
    notify(t("msg.adminOnly"), "error");
    return;
  }

  const entity = refs.editorEntity.value;
  const itemId = refs.editorItemId.value;
  if (!entity || !itemId) return;

  const status = refs.editorStatus.value;
  let hadServiceImageUploadErrors = false;

  try {
    const rawUrls = parseImageUrlsText(refs.editorImageUrls.value);
    const validUrls = rawUrls.map((url) => {
      if (!isValidImageUrl(url)) {
        throw new Error("invalid-image-url");
      }
      return url;
    });

    const imageFiles = Array.from(refs.editorImageFiles?.files || []).filter((file) => file instanceof File && file.size > 0);

    const uploadedUrls = [];
    for (const file of imageFiles) {
      try {
        if (state.useFirebase && state.user) {
          const uploadedUrl = await firebaseClient.uploadImage(file, state.user.uid, entity === "service" ? "services" : "places");
          uploadedUrls.push(uploadedUrl);
        } else {
          const localUrl = await readFileAsDataUrl(file);
          uploadedUrls.push(localUrl);
        }
      } catch {
        const localUrl = await readFileAsDataUrl(file);
        uploadedUrls.push(localUrl);

        if (entity === "service") {
          hadServiceImageUploadErrors = true;
        }
      }
    }

    const imageUrls = [...uploadedUrls, ...validUrls];

    if (entity === "place") {
      const updates = {
        name: refs.editorName.value.trim(),
        category: refs.editorCategory.value,
        description: refs.editorDescription.value.trim(),
        lat: Number(refs.editorLat.value),
        lng: Number(refs.editorLng.value),
        imageUrls,
        imageUrl: imageUrls[0] || DEFAULT_PLACE_IMAGE,
        status,
        moderatedByUid: state.user.uid,
        moderatedAt: new Date().toISOString()
      };

      if (!Number.isFinite(updates.lat) || !Number.isFinite(updates.lng)) {
        notify(t("msg.locationRequired"), "error");
        return;
      }

      await firebaseClient.updatePlace(itemId, updates);
    }

    if (entity === "service") {
      const updates = {
        name: refs.editorName.value.trim(),
        type: refs.editorType.value,
        contact: refs.editorContact.value.trim(),
        schedule: refs.editorSchedule.value.trim(),
        lat: Number(refs.editorLat.value),
        lng: Number(refs.editorLng.value),
        imageUrls,
        imageUrl: imageUrls[0] || "",
        status,
        moderatedByUid: state.user.uid,
        moderatedAt: new Date().toISOString()
      };

      await firebaseClient.updateService(itemId, updates);
    }

    if (entity === "service" && hadServiceImageUploadErrors) {
      notify(`${t("msg.editorSaved")} ${t("msg.imageUploadPartial")}`, "info");
    } else {
      notify(t("msg.editorSaved"), "success");
    }
    closeAdminEditor();
  } catch (error) {
    console.error("Admin edit error:", error);
    const message = String(error?.message || "");
    if (message.includes("invalid-image-url")) {
      notify(t("msg.invalidImage"), "error");
      return;
    }
    if (message.includes("image-upload-failed")) {
      notify(t("msg.imageUploadError"), "error");
      return;
    }
    notify(t("msg.moderationError"), "error");
  }
}

function handleForms() {
  refs.placeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    // Validar que la ubicación sea obligatoria
    const placeLat = refs.placeLat?.value ? parseFloat(refs.placeLat.value) : null;
    const placeLng = refs.placeLng?.value ? parseFloat(refs.placeLng.value) : null;
    
    if (!Number.isFinite(placeLat) || !Number.isFinite(placeLng)) {
      notify("❌ Debes seleccionar una ubicación en el mapa antes de publicar", "error");
      document.getElementById("mapa")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    
    const data = new FormData(refs.placeForm);
    await publishPlace(data);
  });

  refs.serviceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    // Validar que la ubicación sea obligatoria
    const serviceLat = refs.serviceLat?.value ? parseFloat(refs.serviceLat.value) : null;
    const serviceLng = refs.serviceLng?.value ? parseFloat(refs.serviceLng.value) : null;
    
    if (!Number.isFinite(serviceLat) || !Number.isFinite(serviceLng)) {
      notify("❌ Debes seleccionar una ubicación en el mapa antes de publicar", "error");
      document.getElementById("mapa")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    
    const data = new FormData(refs.serviceForm);
    await publishService(data);
  });
}

function setupFirebaseRealtime() {
  function stopRealtimeSubscriptions() {
    placesUnsubscribe?.();
    servicesUnsubscribe?.();
    placesUnsubscribe = null;
    servicesUnsubscribe = null;
  }

  function startRealtimeSubscriptions() {
    stopRealtimeSubscriptions();
    const includeUnapproved = state.isAdmin;

    placesUnsubscribe = firebaseClient.subscribePlaces(
      { includeUnapproved },
      (places) => {
        const normalized = sortByCreatedAtDesc(places.map(normalizePlace));
        state.places = normalized;
        refreshUiData();
      },
      () => {
        // Keep current state when realtime temporarily fails to avoid flickering back to seed data.
        refs.authNotice.textContent = t("msg.firebaseLoadError");
        refs.authNotice.classList.remove("ok");
      }
    );

    servicesUnsubscribe = firebaseClient.subscribeServices(
      { includeUnapproved },
      (services) => {
        const normalized = sortByCreatedAtDesc(services.map(normalizeService));
        state.services = normalized;
        refreshUiData();
      },
      () => {
        // Keep current state when realtime temporarily fails to avoid flickering back to seed data.
        refs.authNotice.textContent = t("msg.firebaseLoadError");
        refs.authNotice.classList.remove("ok");
      }
    );
  }

  firebaseClient.onAuth(async (user) => {
    state.user = user;
    await syncAdminClaim(user);
    await loadUserFavorites(user);
    startRealtimeSubscriptions();
    updateAuthUI();
    refreshUiData();
  });
}

function setupInteractions() {
  refs.searchGuide.addEventListener("input", renderGuides);
  refs.filterCategory.addEventListener("change", renderGuides);

  refs.guideList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const routeId = target.getAttribute("data-route");
    const mapId = target.getAttribute("data-map");

    if (routeId) {
      openRoute(routeId);
    }

    if (mapId) {
      goToPlace(mapId);
      document.getElementById("mapa")?.scrollIntoView({ behavior: "smooth" });
    }
  });

  refs.weatherPlace.addEventListener("change", renderWeather);
  refs.refreshWeather.addEventListener("click", renderWeather);

  document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const favoritePlaceButton = target.closest("button[data-favorite-place]");
    if (favoritePlaceButton instanceof HTMLButtonElement) {
      const placeId = favoritePlaceButton.getAttribute("data-favorite-place");
      if (!placeId) return;

      await toggleFavorite("place", placeId);
      return;
    }

    const favoriteServiceButton = target.closest("button[data-favorite-service]");
    if (favoriteServiceButton instanceof HTMLButtonElement) {
      const serviceId = favoriteServiceButton.getAttribute("data-favorite-service");
      if (!serviceId) return;

      await toggleFavorite("service", serviceId);
      return;
    }

    const mapRouteButton = target.closest("button[data-map-route]");
    if (mapRouteButton instanceof HTMLButtonElement) {
      const placeId = mapRouteButton.getAttribute("data-map-route");
      if (!placeId) return;

      openRoute(placeId);
      return;
    }

    const mapServiceRouteButton = target.closest("button[data-map-route-service]");
    if (mapServiceRouteButton instanceof HTMLButtonElement) {
      const serviceId = mapServiceRouteButton.getAttribute("data-map-route-service");
      if (!serviceId) return;

      openServiceRoute(serviceId);
      return;
    }

    const mapViewLocationPlace = target.closest("button[data-map-view-location-place]");
    if (mapViewLocationPlace instanceof HTMLButtonElement) {
      const placeId = mapViewLocationPlace.getAttribute("data-map-view-location-place");
      if (!placeId) return;

      goToPlaceLocation(placeId);
      return;
    }

    const mapViewLocationService = target.closest("button[data-map-view-location-service]");
    if (mapViewLocationService instanceof HTMLButtonElement) {
      const serviceId = mapViewLocationService.getAttribute("data-map-view-location-service");
      if (!serviceId) return;

      goToServiceLocation(serviceId);
      return;
    }

    const mapCardButton = target.closest("button[data-map-card]");
    if (mapCardButton instanceof HTMLButtonElement) {
      const placeId = mapCardButton.getAttribute("data-map-card");
      if (!placeId) return;

      focusPlaceCard(placeId);
      state.map?.closePopup();
      return;
    }

    const mapServiceButton = target.closest("button[data-map-service]");
    if (mapServiceButton instanceof HTMLButtonElement) {
      const serviceId = mapServiceButton.getAttribute("data-map-service");
      if (!serviceId) return;

      focusServiceCard(serviceId);
      state.map?.closePopup();
      return;
    }

    const slideshow = target.closest(".fade-slideshow");
    if (!(slideshow instanceof HTMLElement)) return;

    const activeSlide = getMostVisibleSlide(slideshow);
    if (!(activeSlide instanceof HTMLImageElement)) return;

    const slides = [...slideshow.querySelectorAll("img.fade-slide")]
      .filter((img) => img instanceof HTMLImageElement)
      .map((img) => ({ src: img.src, alt: img.alt || "" }));

    const activeIndex = Math.max(
      0,
      slides.findIndex((item) => item.src === activeSlide.src)
    );

    openImageLightbox(slides, activeIndex);
  });

  refs.imageLightboxBackdrop?.addEventListener("click", closeImageLightbox);
  refs.lightboxClose?.addEventListener("click", closeImageLightbox);
  refs.lightboxPrev?.addEventListener("click", showPrevLightboxImage);
  refs.lightboxNext?.addEventListener("click", showNextLightboxImage);
  refs.lightboxZoomIn?.addEventListener("click", () => setLightboxScale(lightboxScale + 0.25));
  refs.lightboxZoomOut?.addEventListener("click", () => setLightboxScale(lightboxScale - 0.25));
  refs.lightboxZoomReset?.addEventListener("click", () => setLightboxScale(1));

  refs.imageLightboxImg?.addEventListener("touchstart", (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    lightboxTouchStartX = touch.clientX;
    lightboxTouchStartY = touch.clientY;
  }, { passive: true });

  refs.imageLightboxImg?.addEventListener("touchend", (event) => {
    if (lightboxScale > 1) return;

    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const deltaX = touch.clientX - lightboxTouchStartX;
    const deltaY = touch.clientY - lightboxTouchStartY;
    if (Math.abs(deltaX) < 70) return;
    if (Math.abs(deltaX) < Math.abs(deltaY) * 1.3) return;

    if (deltaX < 0) {
      showNextLightboxImage();
    } else {
      showPrevLightboxImage();
    }
  }, { passive: true });

  refs.imageLightboxFrame?.addEventListener("pointerdown", (event) => {
    if (refs.imageLightbox?.hidden || lightboxScale <= 1) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();
    lightboxIsDragging = true;
    lightboxDragStartX = event.clientX;
    lightboxDragStartY = event.clientY;
    lightboxPanStartX = lightboxPanX;
    lightboxPanStartY = lightboxPanY;

    if (refs.imageLightboxImg) {
      refs.imageLightboxImg.style.transition = "none";
    }
  });

  refs.imageLightboxFrame?.addEventListener("pointermove", (event) => {
    if (!lightboxIsDragging || lightboxScale <= 1) return;

    const deltaX = event.clientX - lightboxDragStartX;
    const deltaY = event.clientY - lightboxDragStartY;
    lightboxPanX = lightboxPanStartX + deltaX;
    lightboxPanY = lightboxPanStartY + deltaY;
    clampLightboxPan();
    applyLightboxTransform();
  });

  const stopLightboxDrag = () => {
    if (!lightboxIsDragging) return;
    lightboxIsDragging = false;
    if (refs.imageLightboxImg) {
      refs.imageLightboxImg.style.transition = "transform 180ms ease";
    }
  };

  refs.imageLightboxFrame?.addEventListener("pointerup", stopLightboxDrag);
  refs.imageLightboxFrame?.addEventListener("pointercancel", stopLightboxDrag);
  refs.imageLightboxFrame?.addEventListener("pointerleave", stopLightboxDrag);

  refs.imageLightboxImg?.addEventListener("wheel", (event) => {
    if (refs.imageLightbox?.hidden) return;
    event.preventDefault();
    const step = event.deltaY < 0 ? 0.15 : -0.15;
    setLightboxScale(lightboxScale + step);
  }, { passive: false });

  document.addEventListener("keydown", (event) => {
    if (!refs.imageLightbox || refs.imageLightbox.hidden) return;

    if (event.key === "Escape") {
      closeImageLightbox();
      return;
    }

    if (event.key === "ArrowLeft") {
      showPrevLightboxImage();
      return;
    }

    if (event.key === "ArrowRight") {
      showNextLightboxImage();
    }
  });

  refs.menuBtn.addEventListener("click", () => {
    const isOpen = refs.mainNav.classList.toggle("is-open");
    refs.menuBtn.setAttribute("aria-expanded", String(isOpen));
  });

  refs.mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      refs.mainNav.classList.remove("is-open");
      refs.menuBtn.setAttribute("aria-expanded", "false");
    });
  });

  refs.languageSelect.addEventListener("change", () => {
    state.lang = refs.languageSelect.value;
    applyTranslations();
    renderGuides();
    renderCommunityFeed();
    renderAlerts();
    renderWeather();
    renderModerationPanel();
  });

  refs.pickLocationBtn?.addEventListener("click", () => {
    state.isPickingLocation = true;
    state.pickingLocationFor = "place";
    notify(t("msg.mapPickStart"), "info");
    document.getElementById("mapa")?.scrollIntoView({ behavior: "smooth" });
  });

  refs.clearLocationBtn?.addEventListener("click", () => {
    clearPlaceCoordinates(true);
  });

  refs.pickServiceLocationBtn?.addEventListener("click", () => {
    state.isPickingLocation = true;
    state.pickingLocationFor = "service";
    notify(t("msg.mapPickStart"), "info");
    document.getElementById("mapa")?.scrollIntoView({ behavior: "smooth" });
  });

  refs.clearServiceLocationBtn?.addEventListener("click", () => {
    clearServiceCoordinates(true);
  });

  refs.pickEditorLocationBtn?.addEventListener("click", () => {
    state.isPickingLocation = true;
    state.pickingLocationForEditor = true;
    notify(t("msg.mapPickStart"), "info");
    document.getElementById("mapa")?.scrollIntoView({ behavior: "smooth" });
  });

  refs.clearEditorLocationBtn?.addEventListener("click", () => {
    clearEditorCoordinates(true);
  });

  refs.placeForm.addEventListener("reset", () => {
    setTimeout(() => {
      clearPlaceCoordinates(false);
      setPlacePreview("");
    }, 0);
  });

  refs.serviceForm.addEventListener("reset", () => {
    setTimeout(() => {
      clearServiceCoordinates(false);
    }, 0);
  });

  if (refs.placeForm.elements.imageUrls) {
    refs.placeForm.elements.imageUrls.addEventListener("input", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLTextAreaElement)) return;
      const value = parseImageUrlsText(input.value)[0] || "";
      setPlacePreview(value || "");
    });
  }

  if (refs.placeImageFile) {
    refs.placeImageFile.addEventListener("change", async (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      const file = input.files?.[0];
      if (!file) {
        setPlacePreview("");
        return;
      }

      try {
        setPlacePreview(""); // Limpiar vista previa mientras se procesa
        const base64 = await readFileAsDataUrl(file);
        setPlacePreview(base64);
      } catch (error) {
        const message = String(error?.message || "");
        if (message.includes("image-too-large")) {
          const match = message.match(/(\d+)MB/);
          const maxSize = match ? match[1] : "10";
          notify(`Imagen muy grande (maximo: ${maxSize}MB)`, "error");
        } else if (message.includes("image-heic-format")) {
          notify("Formato HEIC no soportado en web. Convierte la imagen a JPG o PNG en tu iPhone: Fotos > Editar > Compartir como JPG, o usa https://heic2any.herokuapp.com/", "error");
        } else if (message.includes("image-invalid-type")) {
          notify("Formato de imagen no valido. Usa JPG, PNG, GIF o WebP", "error");
        } else if (message.includes("image-read-error")) {
          notify("Error al leer la imagen. Intenta con otro archivo", "error");
        } else {
          notify("Error al procesar la imagen", "error");
        }
        setPlacePreview("");
        input.value = ""; // Limpiar el input para permitir reintentar
      }
    });
  }

  refs.signInBtn?.addEventListener("click", async () => {
    try {
      await firebaseClient.signInWithGoogle();
    } catch (error) {
      console.error("Google sign-in error:", error);
      notify(getSignInErrorMessage(error), "error");
    }
  });

  refs.signOutBtn?.addEventListener("click", async () => {
    await firebaseClient.signOutUser();
  });

  refs.installBtn?.addEventListener("click", promptAppInstall);
  refs.installDismissBtn?.addEventListener("click", () => {
    setInstallBannerDismissedAt(Date.now());
    hideInstallBanner();
    notify(t("install.notNow"), "info");
  });

  [refs.pendingPlacesList, refs.pendingServicesList, refs.allPlacesList, refs.allServicesList].forEach((list) => {
    list?.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const button = target.closest("button[data-action][data-entity][data-id]");
      if (!(button instanceof HTMLButtonElement)) return;

      const action = button.dataset.action;
      const entity = button.dataset.entity;
      const itemId = button.dataset.id;

      if (!action || !entity || !itemId) return;
      button.disabled = true;
      await applyModeration(entity, itemId, action);
      button.disabled = false;
    });
  });

  refs.adminEditorForm?.addEventListener("submit", saveAdminChanges);
  refs.cancelEditorBtn?.addEventListener("click", closeAdminEditor);
}

function renderHeroBackground(index) {
  if (!refs.heroBgCarousel) return;
  const slides = refs.heroBgCarousel.querySelectorAll(".hero-bg-slide");
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === index);
  });
}

function initHeroBackgroundCarousel() {
  if (!refs.heroBgCarousel) return;

  const images = Array.isArray(heroBackgroundImages)
    ? heroBackgroundImages.filter((url) => typeof url === "string" && url.trim())
    : [];

  refs.heroBgCarousel.innerHTML = "";

  if (!images.length) {
    return;
  }

  images.forEach((src, index) => {
    const image = document.createElement("img");
    image.className = `hero-bg-slide${index === 0 ? " is-active" : ""}`;
    image.src = src;
    image.alt = "";
    image.loading = index === 0 ? "eager" : "lazy";
    refs.heroBgCarousel.appendChild(image);
  });

  heroBgCurrentIndex = 0;

  if (heroBgTimer) {
    clearInterval(heroBgTimer);
  }

  if (images.length < 2) {
    return;
  }

  heroBgTimer = setInterval(() => {
    heroBgCurrentIndex = (heroBgCurrentIndex + 1) % images.length;
    renderHeroBackground(heroBgCurrentIndex);
  }, HERO_BG_CHANGE_INTERVAL_MS);
}

function setupRevealOnScroll() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    {
      threshold: 0.15
    }
  );

  document.querySelectorAll(".reveal").forEach((node) => observer.observe(node));
}

function boot() {
  initHeroBackgroundCarousel();
  applyTranslations();
  showInstallBanner();
  renderAlerts();
  loadMunicipalAlerts({ force: true });
  if (!alertsRefreshTimer) {
    alertsRefreshTimer = setInterval(loadMunicipalAlerts, ALERTS_REFRESH_INTERVAL_MS);
  }
  window.addEventListener("online", () => loadMunicipalAlerts({ force: true }));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      loadMunicipalAlerts();
    }
  });
  setupInteractions();
  handleForms();
  setupRevealOnScroll();
  initMap();
  startMateareLocalClock();

  if (state.useFirebase) {
    // Avoid showing seed/demo content before realtime data arrives.
    state.places = [];
    state.services = [];
    refreshUiData();
    setupFirebaseRealtime();
    setFormsEnabled(true);
    updateAdminUI();
  } else {
    state.places = loadFromStorage(STORAGE_KEYS.places, state.places).map(normalizePlace);
    state.services = loadFromStorage(STORAGE_KEYS.services, state.services).map(normalizeService);
    refreshUiData();
    updateAuthUI();
    updateAdminUI();
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}

registerServiceWorker();

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallBanner();
  notify(t("install.ready"), "info");
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  clearInstallBannerDismissedAt();
  hideInstallBanner();
  notify(t("install.success"), "success");
});

boot();

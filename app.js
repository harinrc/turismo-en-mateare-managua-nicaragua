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
  user: null,
  isAdmin: false,
  useFirebase: firebaseClient.enabled
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
  clearLocationBtn: document.getElementById("clearLocationBtn")
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
let deferredInstallPrompt = null;
let lightboxScale = 1;
let lightboxImages = [];
let lightboxIndex = 0;
let lightboxTouchStartX = 0;
let placeCardFocusTimer = null;
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

function t(key) {
  return i18n[state.lang][key] ?? i18n.es[key] ?? key;
}

function renderInstallBannerContent() {
  const mode = getInstallMode();

  if (refs.installBannerTitle) {
    refs.installBannerTitle.textContent = t("install.title");
  }

  if (refs.installBannerDescription) {
    const descriptionKey = mode === "unsupported" ? "install.descriptionUnsupported" : "install.description";
    refs.installBannerDescription.textContent = t(descriptionKey);
  }

  if (refs.installBtn) {
    const buttonKey = mode === "prompt" ? "install.cta" : "install.ctaHelp";
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizePlace(place) {
  const imageUrls = Array.isArray(place.imageUrls)
    ? place.imageUrls.filter((url) => typeof url === "string" && url)
    : [];

  if (!imageUrls.length && place.imageUrl) {
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
  const imageUrls = Array.isArray(service.imageUrls)
    ? service.imageUrls.filter((url) => typeof url === "string" && url)
    : [];

  if (!imageUrls.length && service.imageUrl) {
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
    createdByUid: service.createdByUid || null
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
    return status === "approved" || (status === "pending" && place.createdByUid && place.createdByUid === currentUserUid);
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

function buildFadeSlideshow(images, altText, className = "") {
  const validImages = images.length ? images : [DEFAULT_PLACE_IMAGE];
  const count = validImages.length;
  const totalDuration = Math.max(count * CARD_SLIDE_INTERVAL_SECONDS, CARD_SLIDE_INTERVAL_SECONDS * 2);
  const boxClass = count > 1 ? "fade-slideshow" : "fade-slideshow single";
  const extraClass = className ? ` ${className}` : "";

  const slides = validImages
    .map(
      (url, index) =>
        `<img class="fade-slide" src="${url}" alt="${altText}" loading="lazy" style="animation-delay:${index * CARD_SLIDE_INTERVAL_SECONDS}s;">`
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

  const uploadedUrls = [];
  let hadLocalFallback = false;
  for (const file of files) {
    try {
      if (state.useFirebase && state.user) {
        const uploadedUrl = await firebaseClient.uploadImage(file, state.user.uid, uploadFolder);
        uploadedUrls.push(uploadedUrl);
      } else {
        const localUrl = await readFileAsDataUrl(file);
        uploadedUrls.push(localUrl);
      }
    } catch (error) {
      // Fallback keeps the published item from losing the image if Storage is temporarily unavailable.
      const localUrl = await readFileAsDataUrl(file);
      uploadedUrls.push(localUrl);
      hadLocalFallback = true;
      error._usedLocalFallback = true;
    }
  }

  const allUrls = [...uploadedUrls, ...validUrls];
  if (!allUrls.length && fallbackImage) {
    allUrls.push(fallbackImage);
  }

  return {
    imageUrls: allUrls,
    hadLocalFallback
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

  const uploadedUrls = [];
  let hadUploadErrors = false;

  for (const file of files) {
    try {
      if (state.useFirebase && state.user) {
        const uploadedUrl = await firebaseClient.uploadImage(file, state.user.uid, "services");
        uploadedUrls.push(uploadedUrl);
      } else {
        const localUrl = await readFileAsDataUrl(file);
        uploadedUrls.push(localUrl);
      }
    } catch {
      const localUrl = await readFileAsDataUrl(file);
      uploadedUrls.push(localUrl);
      hadUploadErrors = true;
    }
  }

  return {
    imageUrls: [...uploadedUrls, ...validUrls],
    hadUploadErrors
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

    card.innerHTML = `
      ${gallery}
      <h3>${place.name}</h3>
      <p>${place.description}</p>
      <div class="badges">
        <span class="badge">${t("guide.category")}: ${formatCategory(place.category)}</span>
        ${tags}
      </div>
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
    type: t("feed.place"),
    title: place.name,
    meta: formatCategory(place.category),
    contact: "",
    imageUrls: place.imageUrls || [place.imageUrl || DEFAULT_PLACE_IMAGE]
  }));

  const serviceItems = visibleServices.slice(0, 4).map((service) => ({
    type: t("feed.service"),
    title: service.name,
    meta: `${service.type} · ${service.schedule}`,
    contact: service.contact || "",
    imageUrls: service.imageUrls || []
  }));

  [...placeItems, ...serviceItems]
    .slice(0, 8)
    .forEach((item) => {
      const card = document.createElement("article");
      card.className = "feed-card";
      const maybeImage = item.imageUrls?.length
        ? buildFadeSlideshow(item.imageUrls, item.title, "feed-thumb")
        : "";
      const contactLine = item.contact ? `<p class="feed-contact">${t("publish.contact")}: ${item.contact}</p>` : "";
      const statusLine = shouldShowCommunityStatus(item)
        ? `<p class="feed-status"><span class="status-pill ${item.status}">${getStatusLabel(item.status)}</span></p>`
        : "";
      card.innerHTML = `<strong>${item.type}</strong><h4>${item.title}</h4><p>${item.meta}</p>${statusLine}${contactLine}${maybeImage}`;
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
    setPlaceCoordinates(lat, lng, { showToast: true });
    state.isPickingLocation = false;
  });

  redrawMarkers();
}

function setPlaceCoordinates(lat, lng, options = {}) {
  const showToast = options.showToast ?? false;
  const flyTo = options.flyTo ?? false;

  const safeLat = Number(lat);
  const safeLng = Number(lng);
  if (!Number.isFinite(safeLat) || !Number.isFinite(safeLng)) return;

  if (refs.placeLat) refs.placeLat.value = safeLat.toFixed(6);
  if (refs.placeLng) refs.placeLng.value = safeLng.toFixed(6);

  if (state.map) {
    if (pickerMarker) {
      pickerMarker.setLatLng([safeLat, safeLng]);
    } else {
      pickerMarker = L.marker([safeLat, safeLng], { opacity: 0.9 }).addTo(state.map);
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

function redrawMarkers() {
  if (!state.map) return;

  state.markers.forEach((marker) => marker.remove());
  state.markers = [];

  getVisiblePlaces().forEach((place) => {
    const marker = L.marker([place.lat, place.lng]).addTo(state.map);
    marker.bindPopup(`
      <img class="place-image" src="${place.imageUrl || DEFAULT_PLACE_IMAGE}" alt="${place.name}">
      <strong>${place.name}</strong><br>${place.description}
      <div class="actions">
        <button class="btn btn-primary btn-map-card" type="button" data-map-card="${place.id}">${t("map.viewCard")}</button>
      </div>
    `);
    marker.on("click", () => {
      state.selectedPlaceId = place.id;
    });
    state.markers.push(marker);
  });
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

function goToPlace(placeId) {
  const place = getVisiblePlaces().find((p) => p.id === placeId);
  if (!place || !state.map) return;
  state.selectedPlaceId = placeId;
  state.map.flyTo([place.lat, place.lng], 14, { duration: 1.2 });
}

function openRoute(placeId) {
  const place = getVisiblePlaces().find((p) => p.id === placeId);
  if (!place) return;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
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

  if (rain >= 0.3 || ["weather.condition.rain", "weather.condition.storm"].includes(getWeatherConditionKey(current.weather_code))) {
    return "weather.suggestion.rain";
  }

  if (wind >= 28) {
    return "weather.suggestion.wind";
  }

  if (isDay && temp >= 34) {
    return "weather.suggestion.heat";
  }

  if (!isDay && temp <= 22) {
    return "weather.suggestion.coolNight";
  }

  const conditionKey = getWeatherConditionKey(current.weather_code);
  if (conditionKey === "weather.condition.clear" && isDay) {
    return "weather.suggestion.sunDay";
  }

  if (conditionKey === "weather.condition.clear" && !isDay) {
    return "weather.suggestion.clearNight";
  }

  return "weather.suggestion.cloudy";
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

function refreshUiData() {
  renderGuides();
  syncWeatherSelector();
  redrawMarkers();
  renderCommunityFeed();
  renderWeather();
  renderModerationPanel();
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
  refs.editorCoordsRow.hidden = !isPlace;
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
  }

  refs.adminEditorForm.hidden = false;
  refs.adminEditorForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function closeAdminEditor() {
  if (!refs.adminEditorForm) return;
  refs.adminEditorForm.hidden = true;
  refs.adminEditorForm.reset();
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
      <h4>${place.name}</h4>
      <p><span class="status-pill pending">${getStatusLabel(place.status)}</span></p>
      <p class="moderation-meta">${t("guide.category")}: ${formatCategory(place.category)}</p>
      <p class="moderation-meta">${t("admin.createdBy")}: ${place.createdByName || "Comunidad"}</p>
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
      <h4>${service.name}</h4>
      <p><span class="status-pill pending">${getStatusLabel(service.status)}</span></p>
      <p class="moderation-meta">${t("publish.serviceType")}: ${service.type}</p>
      <p class="moderation-meta">${t("publish.contact")}: ${service.contact || "-"}</p>
      <p class="moderation-meta">${t("admin.createdBy")}: ${service.createdByName || "Comunidad"}</p>
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
      <h4>${place.name}</h4>
      <p><span class="status-pill ${place.status || "pending"}">${getStatusLabel(place.status)}</span></p>
      <p class="moderation-meta">${t("guide.category")}: ${formatCategory(place.category)}</p>
      <p class="moderation-meta">${t("admin.createdBy")}: ${place.createdByName || "Comunidad"}</p>
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
      <h4>${service.name}</h4>
      <p><span class="status-pill ${service.status || "pending"}">${getStatusLabel(service.status)}</span></p>
      <p class="moderation-meta">${t("publish.serviceType")}: ${service.type}</p>
      <p class="moderation-meta">${t("publish.contact")}: ${service.contact || "-"}</p>
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

function getInstallMode() {
  if (isStandaloneDisplayMode()) return "installed";
  if (deferredInstallPrompt) return "prompt";
  if (isIOSDevice()) return "ios-manual";
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

  if (mode !== "prompt" || !deferredInstallPrompt) {
    const unavailableKey = isDesktopDevice() ? "install.unavailableDesktop" : "install.unavailableMobile";
    notify(t(unavailableKey), "info");
    return;
  }

  deferredInstallPrompt.prompt();
  const choiceResult = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;

  hideInstallBanner();

  if (choiceResult.outcome === "accepted") {
    clearInstallBannerDismissedAt();
    notify(t("install.success"), "success");
  } else {
    setInstallBannerDismissedAt(Date.now());
    notify(t("install.notNow"), "info");
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

function setLightboxScale(nextScale) {
  if (!refs.imageLightboxImg) return;

  const clamped = Math.min(3.5, Math.max(1, nextScale));
  lightboxScale = clamped;
  refs.imageLightboxImg.style.transform = `scale(${lightboxScale})`;
}

function renderLightboxImage(index) {
  if (!refs.imageLightboxImg || !lightboxImages.length) return;

  const safeIndex = (index + lightboxImages.length) % lightboxImages.length;
  lightboxIndex = safeIndex;
  const current = lightboxImages[safeIndex];
  refs.imageLightboxImg.src = current.src;
  refs.imageLightboxImg.alt = current.alt || "";
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
  let hadLocalFallback = false;

  try {
    const resolved = await resolveImages(data, {
      fileField: "imageFiles",
      urlField: "imageUrls",
      fallbackImage: DEFAULT_PLACE_IMAGE,
      uploadFolder: "places"
    });
    imageUrls = resolved.imageUrls;
    hadLocalFallback = resolved.hadLocalFallback;
  } catch (error) {
    const message = String(error?.message || "");
    notify(message.includes("invalid-image-url") ? t("msg.invalidImage") : t("msg.imageUploadError"), "error");
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
  if (hadLocalFallback) {
    notify(`${placeMessage} ${t("msg.imageUploadPartial")}`, "info");
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
  let hadImageUploadErrors = false;

  try {
    const resolved = await resolveServiceImages(data);
    imageUrls = resolved.imageUrls;
    hadImageUploadErrors = resolved.hadUploadErrors;
  } catch (error) {
    const message = String(error?.message || "");
    notify(message.includes("invalid-image-url") ? t("msg.invalidImage") : t("msg.serviceSaveError"), "error");
    return;
  }

  const payload = {
    name: String(data.get("name")),
    type: String(data.get("type")),
    contact: String(data.get("contact")),
    schedule: String(data.get("schedule")),
    imageUrls,
    imageUrl: imageUrls[0] || "",
    status: state.useFirebase ? "pending" : "approved",
    createdByName: state.user?.displayName ?? "local",
    createdByUid: state.user?.uid ?? "local"
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
  if (hadImageUploadErrors) {
    notify(`${serviceMessage} ${t("msg.imageUploadPartial")}`, "info");
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
    const data = new FormData(refs.placeForm);
    await publishPlace(data);
  });

  refs.serviceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
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

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const mapCardButton = target.closest("button[data-map-card]");
    if (mapCardButton instanceof HTMLButtonElement) {
      const placeId = mapCardButton.getAttribute("data-map-card");
      if (!placeId) return;

      goToPlace(placeId);
      focusPlaceCard(placeId);
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
  }, { passive: true });

  refs.imageLightboxImg?.addEventListener("touchend", (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const deltaX = touch.clientX - lightboxTouchStartX;
    if (Math.abs(deltaX) < 35) return;

    if (deltaX < 0) {
      showNextLightboxImage();
    } else {
      showPrevLightboxImage();
    }
  }, { passive: true });

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
    notify(t("msg.mapPickStart"), "info");
    document.getElementById("mapa")?.scrollIntoView({ behavior: "smooth" });
  });

  refs.clearLocationBtn?.addEventListener("click", () => {
    clearPlaceCoordinates(true);
  });

  refs.placeForm.addEventListener("reset", () => {
    setTimeout(() => {
      clearPlaceCoordinates(false);
      setPlacePreview("");
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

      const base64 = await readFileAsDataUrl(file);
      setPlacePreview(base64);
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

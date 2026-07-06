import { initialPlaces, initialServices, initialAlerts, i18n } from "./content.js";
import { createFirebaseClient } from "./firebase.js";

const STORAGE_KEYS = {
  places: "mateare_places_v1",
  services: "mateare_services_v1"
};

const DEFAULT_PLACE_IMAGE =
  "https://images.unsplash.com/photo-1493244040629-496f6d136cc3?auto=format&fit=crop&w=1200&q=80";

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

function t(key) {
  return i18n[state.lang][key] ?? i18n.es[key] ?? key;
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
  return state.useFirebase
    ? state.places.filter((place) => (place.status || "approved") === "approved")
    : state.places;
}

function getVisibleServices() {
  return state.useFirebase
    ? state.services.filter((service) => (service.status || "approved") === "approved")
    : state.services;
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
  const totalDuration = Math.max(count * 4, 8);
  const boxClass = count > 1 ? "fade-slideshow" : "fade-slideshow single";
  const extraClass = className ? ` ${className}` : "";

  const slides = validImages
    .map(
      (url, index) =>
        `<img class="fade-slide" src="${url}" alt="${altText}" loading="lazy" style="animation-delay:${index * 4}s;">`
    )
    .join("");

  return `<div class="${boxClass}${extraClass}" style="--slide-duration:${totalDuration}s;">${slides}</div>`;
}

async function resolveImages(data, options) {
  const {
    fileField,
    urlField,
    fallbackImage = null
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
  for (const file of files) {
    if (state.useFirebase && state.user) {
      const uploadedUrl = await firebaseClient.uploadPlaceImage(file, state.user.uid);
      uploadedUrls.push(uploadedUrl);
    } else {
      const localUrl = await readFileAsDataUrl(file);
      uploadedUrls.push(localUrl);
    }
  }

  const allUrls = [...uploadedUrls, ...validUrls];
  if (!allUrls.length && fallbackImage) {
    allUrls.push(fallbackImage);
  }

  return allUrls;
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
      card.innerHTML = `<strong>${item.type}</strong><h4>${item.title}</h4><p>${item.meta}</p>${contactLine}${maybeImage}`;
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
    const linkHtml = alert.sourceUrl
      ? `<a class="alert-link" href="${alert.sourceUrl}" target="_blank" rel="noopener noreferrer">${t("alerts.readMore")}</a>`
      : "";
    item.innerHTML = `<strong>${alert.title[state.lang]}</strong><p>${alert.description[state.lang]}</p>${linkHtml}`;
    refs.alertsList.appendChild(item);
  });

  refs.quickAlerts.textContent = String(state.alerts.length);
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncateText(value, maxLength = 180) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

async function loadMunicipalAlerts() {
  try {
    const rssUrl = encodeURIComponent(
      "https://news.google.com/rss/search?q=Mateare+Managua+Nicaragua&hl=es-419&gl=NI&ceid=NI:es-419"
    );
    const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error("alerts-feed-unavailable");
    }

    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items.slice(0, 6) : [];

    if (!items.length) return;

    state.alerts = items.map((entry, index) => {
      const cleanDescription = truncateText(stripHtml(entry.description || entry.title || ""), 180);
      return {
        id: `news-${index}-${entry.pubDate || Date.now()}`,
        level: "medium",
        title: {
          es: entry.title,
          en: entry.title
        },
        description: {
          es: cleanDescription,
          en: cleanDescription
        },
        sourceUrl: entry.link
      };
    });

    renderAlerts();
  } catch {
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
    `);
    marker.on("click", () => {
      state.selectedPlaceId = place.id;
    });
    state.markers.push(marker);
  });
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
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,rain&timezone=auto`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather request failed");
  }

  return response.json();
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
    refs.weatherOutput.innerHTML = `
      <h3>${place.name}</h3>
      <p><strong>${t("weather.temp")}:</strong> ${current.temperature_2m} °C</p>
      <p><strong>${t("weather.wind")}:</strong> ${current.wind_speed_10m} km/h</p>
      <p><strong>${t("weather.rain")}:</strong> ${current.rain} mm</p>
      <small>${t("weather.updated")}: ${current.time}</small>
    `;

    refs.quickWeather.textContent = `${current.temperature_2m} °C`;
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
  setFormsEnabled(false);
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

async function publishPlace(data) {
  if (state.useFirebase && !state.user) {
    notify(t("msg.signInRequired"), "error");
    return;
  }

  let imageUrls = [DEFAULT_PLACE_IMAGE];

  try {
    imageUrls = await resolveImages(data, {
      fileField: "imageFiles",
      urlField: "imageUrls",
      fallbackImage: DEFAULT_PLACE_IMAGE
    });
  } catch {
    notify(t("msg.invalidImage"), "error");
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
  notify(placeMessage, "success");
}

async function publishService(data) {
  if (state.useFirebase && !state.user) {
    notify(t("msg.signInRequired"), "error");
    return;
  }

  let imageUrls = [];

  try {
    imageUrls = await resolveImages(data, {
      fileField: "imageFiles",
      urlField: "imageUrls"
    });
  } catch {
    notify(t("msg.invalidImage"), "error");
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
  notify(serviceMessage, "success");
}

async function applyModeration(entity, itemId, action) {
  if (!state.useFirebase || !state.isAdmin || !state.user) {
    notify(t("msg.adminOnly"), "error");
    return;
  }

  if (action === "edit") {
    openAdminEditor(entity, itemId);
    return;
  }

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
  const imageUrls = parseImageUrlsText(refs.editorImageUrls.value);

  try {
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

    notify(t("msg.editorSaved"), "success");
    closeAdminEditor();
  } catch (error) {
    console.error("Admin edit error:", error);
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
        state.places = normalized.length ? normalized : [...initialPlaces].map(normalizePlace);
        refreshUiData();
      },
      () => {
        state.places = [...initialPlaces].map(normalizePlace);
        refreshUiData();
        refs.authNotice.textContent = t("msg.firebaseLoadError");
        refs.authNotice.classList.remove("ok");
      }
    );

    servicesUnsubscribe = firebaseClient.subscribeServices(
      { includeUnapproved },
      (services) => {
        const normalized = sortByCreatedAtDesc(services.map(normalizeService));
        state.services = normalized.length ? normalized : [...initialServices].map(normalizeService);
        refreshUiData();
      },
      () => {
        state.services = [...initialServices].map(normalizeService);
        refreshUiData();
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
      await applyModeration(entity, itemId, action);
    });
  });

  refs.adminEditorForm?.addEventListener("submit", saveAdminChanges);
  refs.cancelEditorBtn?.addEventListener("click", closeAdminEditor);
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
  applyTranslations();
  renderAlerts();
  loadMunicipalAlerts();
  if (!alertsRefreshTimer) {
    alertsRefreshTimer = setInterval(loadMunicipalAlerts, 15 * 60 * 1000);
  }
  setupInteractions();
  handleForms();
  setupRevealOnScroll();
  initMap();
  // Render base content immediately so the UI is visible even before realtime sync.
  refreshUiData();

  if (state.useFirebase) {
    setupFirebaseRealtime();
    setFormsEnabled(false);
    updateAdminUI();
  } else {
    state.places = loadFromStorage(STORAGE_KEYS.places, state.places).map(normalizePlace);
    state.services = loadFromStorage(STORAGE_KEYS.services, state.services).map(normalizeService);
    refreshUiData();
    updateAuthUI();
    updateAdminUI();
  }
}

boot();

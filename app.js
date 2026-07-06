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
  user: null,
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
  placeImagePreview: document.getElementById("placeImagePreview"),
  authUser: document.getElementById("authUser"),
  signInBtn: document.getElementById("signInBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  authNotice: document.getElementById("authNotice")
};

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
  return {
    id: place.id,
    name: place.name,
    category: place.category,
    description: place.description,
    lat: Number(place.lat),
    lng: Number(place.lng),
    imageUrl: place.imageUrl || DEFAULT_PLACE_IMAGE,
    tags: Array.isArray(place.tags) ? place.tags : ["Comunitario"]
  };
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

async function resolvePlaceImage(data) {
  const file = data.get("imageFile");
  const imageUrl = String(data.get("imageUrl") || "").trim();

  if (file instanceof File && file.size > 0) {
    if (state.useFirebase && state.user) {
      return firebaseClient.uploadPlaceImage(file, state.user.uid);
    }
    return readFileAsDataUrl(file);
  }

  if (imageUrl) {
    if (!isValidImageUrl(imageUrl)) {
      throw new Error("invalid-image-url");
    }
    return imageUrl;
  }

  return DEFAULT_PLACE_IMAGE;
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
  const text = refs.searchGuide.value.trim().toLowerCase();
  const filter = refs.filterCategory.value;

  const filtered = state.places.filter((place) => {
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

    card.innerHTML = `
      <img class="place-image" src="${place.imageUrl || DEFAULT_PLACE_IMAGE}" alt="${place.name}" loading="lazy">
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
  refs.communityFeed.innerHTML = "";

  const placeItems = state.places.slice(0, 4).map((place) => ({
    type: t("feed.place"),
    title: place.name,
    meta: formatCategory(place.category),
    imageUrl: place.imageUrl || DEFAULT_PLACE_IMAGE
  }));

  const serviceItems = state.services.slice(0, 4).map((service) => ({
    type: t("feed.service"),
    title: service.name,
    meta: `${service.type} · ${service.schedule}`
  }));

  [...placeItems, ...serviceItems]
    .slice(0, 8)
    .forEach((item) => {
      const card = document.createElement("article");
      card.className = "feed-card";
      const maybeImage =
        "imageUrl" in item
          ? `<img class="feed-thumb" src="${item.imageUrl}" alt="${item.title}" loading="lazy">`
          : "";
      card.innerHTML = `<strong>${item.type}</strong><h4>${item.title}</h4><p>${item.meta}</p>${maybeImage}`;
      refs.communityFeed.appendChild(card);
    });

  refs.quickPosts.textContent = String(state.places.length + state.services.length);
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
    item.innerHTML = `<strong>${alert.title[state.lang]}</strong><p>${alert.description[state.lang]}</p>`;
    refs.alertsList.appendChild(item);
  });

  refs.quickAlerts.textContent = String(state.alerts.length);
}

function initMap() {
  state.map = L.map("map").setView([12.2424, -86.4318], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(state.map);

  redrawMarkers();
}

function redrawMarkers() {
  if (!state.map) return;

  state.markers.forEach((marker) => marker.remove());
  state.markers = [];

  state.places.forEach((place) => {
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
  const place = state.places.find((p) => p.id === placeId);
  if (!place || !state.map) return;
  state.selectedPlaceId = placeId;
  state.map.flyTo([place.lat, place.lng], 14, { duration: 1.2 });
}

function openRoute(placeId) {
  const place = state.places.find((p) => p.id === placeId);
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
  const place = state.places.find((p) => p.id === placeId) ?? state.places[0];

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

  state.places.forEach((place) => {
    const option = document.createElement("option");
    option.value = place.id;
    option.textContent = place.name;
    refs.weatherPlace.appendChild(option);
  });

  if (current && state.places.some((place) => place.id === current)) {
    refs.weatherPlace.value = current;
  }
}

function refreshUiData() {
  renderGuides();
  syncWeatherSelector();
  redrawMarkers();
  renderCommunityFeed();
  renderWeather();
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

async function publishPlace(data) {
  if (state.useFirebase && !state.user) {
    alert(t("msg.signInRequired"));
    return;
  }

  let imageUrl = DEFAULT_PLACE_IMAGE;

  try {
    imageUrl = await resolvePlaceImage(data);
  } catch {
    alert(t("msg.invalidImage"));
    return;
  }

  const payload = {
    name: String(data.get("name")),
    category: String(data.get("category")),
    description: String(data.get("description")),
    lat: Number(data.get("lat")),
    lng: Number(data.get("lng")),
    imageUrl,
    tags: ["Comunitario"],
    createdByName: state.user?.displayName ?? "local"
  };

  if (state.useFirebase) {
    await firebaseClient.addPlace(payload);
  } else {
    state.places = [{ id: crypto.randomUUID(), ...payload }, ...state.places];
    saveToStorage();
    refreshUiData();
  }

  refs.placeForm.reset();
  setPlacePreview("");
  alert(t("msg.placeSaved"));
}

async function publishService(data) {
  if (state.useFirebase && !state.user) {
    alert(t("msg.signInRequired"));
    return;
  }

  const payload = {
    name: String(data.get("name")),
    type: String(data.get("type")),
    contact: String(data.get("contact")),
    schedule: String(data.get("schedule")),
    createdByName: state.user?.displayName ?? "local"
  };

  if (state.useFirebase) {
    await firebaseClient.addService(payload);
  } else {
    state.services = [{ id: crypto.randomUUID(), ...payload }, ...state.services];
    saveToStorage();
    refreshUiData();
  }

  refs.serviceForm.reset();
  alert(t("msg.serviceSaved"));
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
  firebaseClient.subscribePlaces(
    (places) => {
      const normalized = places.map(normalizePlace);
      state.places = normalized.length ? normalized : [...initialPlaces];
      refreshUiData();
    },
    () => {
      state.places = [...initialPlaces];
      refreshUiData();
      refs.authNotice.textContent = t("msg.firebaseLoadError");
      refs.authNotice.classList.remove("ok");
    }
  );

  firebaseClient.subscribeServices(
    (services) => {
      state.services = services.length ? services : [...initialServices];
      refreshUiData();
    },
    () => {
      state.services = [...initialServices];
      refreshUiData();
      refs.authNotice.textContent = t("msg.firebaseLoadError");
      refs.authNotice.classList.remove("ok");
    }
  );

  firebaseClient.onAuth((user) => {
    state.user = user;
    updateAuthUI();
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
  });

  if (refs.placeForm.elements.imageUrl) {
    refs.placeForm.elements.imageUrl.addEventListener("input", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      const value = input.value.trim();
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
    } catch {
      alert(t("msg.signInError"));
    }
  });

  refs.signOutBtn?.addEventListener("click", async () => {
    await firebaseClient.signOutUser();
  });
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
  setupInteractions();
  handleForms();
  setupRevealOnScroll();
  initMap();
  // Render base content immediately so the UI is visible even before realtime sync.
  refreshUiData();

  if (state.useFirebase) {
    setupFirebaseRealtime();
    setFormsEnabled(false);
  } else {
    state.places = loadFromStorage(STORAGE_KEYS.places, state.places);
    state.services = loadFromStorage(STORAGE_KEYS.services, state.services);
    refreshUiData();
    updateAuthUI();
  }
}

boot();

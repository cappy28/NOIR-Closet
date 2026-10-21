import { products } from "../data/products.js";

const app = document.getElementById("app");
const savedLooksKey = "noir-closet-saved-looks";
const customProductsKey =
  "noir-closet-custom-products";
const favoritesKey =
  "noir-closet-favorite-products";
const laundryProductsKey =
  "noir-closet-laundry-products";
const editedProductsKey =
  "noir-closet-edited-products";
const deletedProductsKey =
  "noir-closet-deleted-products";

const categoryLabels = {
  top: "Haut",
  bottom: "Bas",
  jacket: "Veste",
  shoes: "Chaussures",
  accessory: "Accessoire",
  underwear: "Sous-vêtement"
};

const outfitSlots = [
  {
    key: "top",
    label: "Haut",
    categories: ["top"]
  },
  {
    key: "bottom",
    label: "Bas",
    categories: ["bottom"]
  },
  {
    key: "jacket",
    label: "Veste",
    categories: ["jacket"]
  },
  {
    key: "shoes",
    label: "Chaussures",
    categories: ["shoes"]
  },
  {
    key: "accessory",
    label: "Accessoire",
    categories: ["accessory"]
  }
];

const state = {
  route: "overview",
  productId: null,
  search: "",
  category: "all",
    outfit: {
    top: "004",
    bottom: "008",
    jacket: "009",
    shoes: "007",
    accessory: "016"
  },

  lockedOutfitSlots: {
    top: false,
    bottom: false,
    jacket: false,
    shoes: false,
    accessory: false
  }
};

const removeBgWorkerUrl =
  "https://noir-closet-remove-bg.lucascapel.workers.dev/";

let savedLooks = loadSavedLooks();
let searchFrame = 0;
let editingProductId = null;
let favoriteProductIds =
  loadFavoriteProductIds();
let laundryProductIds = [];
const weatherState = {
  status: "idle",
  data: null,
  error: "",
  selectedForecastIndex: null
};

function loadSavedLooks() {
  try {
    return JSON.parse(
      localStorage.getItem(savedLooksKey) || "[]"
    );
  } catch {
    return [];
  }
}

function saveSavedLooks() {
  localStorage.setItem(
    savedLooksKey,
    JSON.stringify(savedLooks)
  );
}

function escapeHTML(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeColor(color, fallback = "#222222") {
  if (typeof color !== "string") {
    return fallback;
  }

  return /^#[0-9a-fA-F]{3,8}$/.test(color)
    ? color
    : fallback;
}

function getColor(product, index = 0) {
  if (!product) {
    return index === 0 ? "#222222" : "#777777";
  }

  return safeColor(
    product.colors?.[index],
    index === 0 ? "#222222" : "#777777"
  );
}

function formatPrice(price) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR"
  }).format(Number(price || 0));
}

function getProduct(id) {
  return products.find(product => product.id === id);
}

function getTotalValue() {
  return products.reduce((total, product) => {
    return total + Number(product.price || 0);
  }, 0);
}

function getTotalPieces() {
  return products.reduce((total, product) => {
    return total + Number(product.quantity || 1);
  }, 0);
}

function isDarkProduct(product) {
  const value = getColor(product, 0).replace("#", "");

  const normalized =
    value.length === 3
      ? value
          .split("")
          .map(char => char + char)
          .join("")
      : value.slice(0, 6);

  if (normalized.length !== 6) {
    return false;
  }

  const red =
    parseInt(normalized.slice(0, 2), 16) / 255;

  const green =
    parseInt(normalized.slice(2, 4), 16) / 255;

  const blue =
    parseInt(normalized.slice(4, 6), 16) / 255;

  const luminance =
    0.2126 * red +
    0.7152 * green +
    0.0722 * blue;

  return luminance < 0.22;
}

function getProductInitial(product) {
  if (product.category === "shoes") return "SHOES";
  if (product.category === "jacket") return "OUTER";
  if (product.category === "accessory") return "ACC";
  if (product.category === "underwear") return "BASE";
  if (product.category === "bottom") return "LOWER";

  return "TOP";
}

function productMedia(product, extraClass = "") {
  const colorOne = getColor(product, 0);
  const colorTwo = getColor(product, 1);
  const darkClass = isDarkProduct(product)
    ? "is-dark"
    : "";

  const mediaContent = product.image
    ? `
      <img
        src="${escapeHTML(product.image)}"
        alt="${escapeHTML(product.name)}"
        loading="lazy"
      />
    `
    : `
      <div class="product-placeholder">
        ${getProductInitial(product)}
      </div>
    `;

  return `
    <div
      class="product-media ${extraClass} ${darkClass}"
      style="
        --color-one: ${colorOne};
        --color-two: ${colorTwo};
        --primary-color: ${colorOne};
      "
    >
      ${mediaContent}
    </div>
  `;
}

function productCard(product) {
  const favorite = isFavorite(product.id);
  const inLaundry =
  isProductInLaundry(product.id);

  return `
    <article
      class="product-card"
      data-product-id="${escapeHTML(product.id)}"
    >
      <button
        class="favorite-toggle ${
          favorite ? "is-favorite" : ""
        }"
        type="button"
        data-action="toggle-favorite"
        data-product-id="${escapeHTML(product.id)}"
        aria-label="${
          favorite
            ? "Retirer des favoris"
            : "Ajouter aux favoris"
        }"
        aria-pressed="${favorite}"
      >
        <span aria-hidden="true">
          ${favorite ? "♥" : "♡"}
        </span>
      </button>

      ${productMedia(product)}

      <div class="product-content">
        <div class="product-name">
          ${escapeHTML(product.name)}
        </div>

        <div class="product-meta">
          ${escapeHTML(product.brand || "Sans marque")}
          ·
          ${escapeHTML(product.size || "Taille unique")}
        </div>

        <div class="product-price">
          ${formatPrice(product.price)}
        </div>
        <button
  class="laundry-toggle ${
    inLaundry ? "is-laundry" : ""
  }"
  type="button"
  data-action="toggle-laundry"
  data-product-id="${escapeHTML(product.id)}"
>
  ${
    inLaundry
      ? "À la machine à laver"
      : "Disponible"
  }
</button>
      </div>
    </article>
  `;
}

function mountShell() {
  app.innerHTML = `
    <div class="app-shell">
      <div class="ambient ambient-one"></div>
      <div class="ambient ambient-two"></div>
      <div class="chrome-noise"></div>

      <aside class="sidebar">
        <button
          class="brand"
          type="button"
          data-route="overview"
        >
          NØIR<span>.</span>
        </button>

        <div class="sidebar-label">
          Personal wardrobe
        </div>

        <nav class="navigation">
          <button
            class="nav-item"
            type="button"
            data-route="overview"
          >
            <span class="nav-symbol">◈</span>
            <span>Overview</span>
          </button>

          <button
            class="nav-item"
            type="button"
            data-route="closet"
          >
            <span class="nav-symbol">□</span>
            <span>My Closet</span>
          </button>

          <button
            class="nav-item"
            type="button"
            data-route="outfits"
          >
            <span class="nav-symbol">✦</span>
            <span>Outfit Lab</span>
          </button>

          <button
            class="nav-item"
            type="button"
            data-route="looks"
          >
            <span class="nav-symbol">◇</span>
            <span>Saved Looks</span>
          </button>
        </nav>

        <div class="sidebar-bottom">
          <span class="status-dot"></span>

          <div>
            <strong>LOCAL ARCHIVE</strong>
            <small>Your wardrobe only</small>
          </div>
        </div>
      </aside>

      <main class="main-content">
        <header class="topbar">
          <div>
            <div class="topbar-overline">
              NØIR CLOSET
            </div>

            <div
              class="topbar-route"
              id="currentRoute"
            >
              / overview
            </div>
          </div>

          <div class="topbar-right">
            <span class="local-status">
              PRIVATE SPACE
            </span>

            <div class="profile-avatar">
              N
            </div>
          </div>
        </header>

        <div id="view"></div>
      </main>
    </div>
  `;
}

function getRouteTitle(route) {
  const titles = {
    overview: "overview",
    closet: "my closet",
    outfits: "outfit lab",
    looks: "saved looks",
    product: "product"
  };

  return titles[route] || "overview";
}

function setActiveNavigation(route) {
  const activeRoute =
    route === "product" ? "closet" : route;

  document
    .querySelectorAll(".nav-item[data-route]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.route === activeRoute
      );
    });

  const currentRoute =
    document.getElementById("currentRoute");

  if (currentRoute) {
    currentRoute.textContent =
      `/ ${getRouteTitle(route)}`;
  }
}

function getHashRoute() {
  const hash = window.location.hash
    .replace(/^#/, "")
    .trim();

  if (!hash) {
    return {
      route: "overview",
      productId: null
    };
  }

  const parts = hash.split("/");
  const route = parts[0];

  if (route === "product") {
    return {
      route: "product",
      productId: parts[1]
        ? decodeURIComponent(parts[1])
        : null
    };
  }

  if (
    ["overview", "closet", "outfits", "looks"].includes(route)
  ) {
    return {
      route,
      productId: null
    };
  }

  return {
    route: "overview",
    productId: null
  };
}

function syncStateFromHash() {
  const hashState = getHashRoute();

  state.route = hashState.route;
  state.productId = hashState.productId;
}

function goTo(route, productId = null) {
  const validRoutes = [
    "overview",
    "closet",
    "outfits",
    "looks",
    "product"
  ];

  if (!validRoutes.includes(route)) {
    route = "overview";
  }

  state.route = route;
  state.productId = productId;

  const hash =
    route === "product" && productId
      ? `product/${encodeURIComponent(productId)}`
      : route;

  if (window.location.hash.replace(/^#/, "") !== hash) {
    window.location.hash = hash;
    return;
  }

  renderRoute();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function renderRoute() {
  setActiveNavigation(state.route);

  if (state.route === "overview") {
    renderOverview();
    return;
  }

  if (state.route === "closet") {
    renderCloset();
    return;
  }

  if (state.route === "outfits") {
    renderOutfitLab();
    return;
  }

  if (state.route === "looks") {
    renderSavedLooks();
    return;
  }

  if (state.route === "product") {
    renderProductDetail();
    return;
  }

  goTo("overview");
}

function renderOverview() {
  const view = document.getElementById("view");

  if (!view) return;

  const recentProducts = [...products]
    .slice(-4)
    .reverse();

  view.innerHTML = `
    <section class="screen active">
      <div class="overview-hero">
        <div class="hero-content">
          <div class="eyebrow">
            Personal wardrobe system
          </div>

          <h1 class="hero-title">
            Your wardrobe,<br>
            <em>redefined.</em>
          </h1>

          <p class="hero-copy">
            Tous tes vêtements dans un espace privé,
            visuel et minimaliste. Chaque pièce possède
            son propre univers chromé.
          </p>

          <button
            class="button-primary"
            type="button"
            data-route="outfits"
          >
            Créer une tenue
          </button>
        </div>
      </div>
      
      <div id="weatherPanel"></div>
      
      <div class="stat-strip">
        <div class="stat-card">
          <div class="stat-label">
            Références
          </div>

          <div class="stat-value">
            ${String(products.length).padStart(2, "0")}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">
            Pièces individuelles
          </div>

          <div class="stat-value">
            ${String(getTotalPieces()).padStart(2, "0")}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">
            Valeur totale
          </div>

          <div class="stat-value">
            ${formatPrice(getTotalValue())}
          </div>
        </div>
      </div>

      <div class="overview-grid">
        <div class="panel recent-panel">
          <div class="section-header">
            <div>
              <h2>Latest additions</h2>
              <p>
                Les dernières pièces de ton dressing.
              </p>
            </div>

            <button
              class="link-button"
              type="button"
              data-route="closet"
            >
              View all
            </button>
          </div>

          <div class="product-grid">
            ${recentProducts
              .map(productCard)
              .join("")}
          </div>
        </div>

        <div class="panel feature-panel">
          <div class="feature-content">
            <div class="feature-label">
              Wardrobe signature
            </div>

            <h2>Chrome state</h2>

            <p>
              Minimal silhouettes · Dark tones ·
              Personal archive
            </p>
          </div>
        </div>
      </div>
    </section>
    `;

  renderWeatherPanel();
}

function renderCloset() {
  const view = document.getElementById("view");

  if (!view) return;

  view.innerHTML = `
    <section class="screen active">
      <div class="screen-heading">
        <div>
          <h1>My Closet</h1>

          <p>
            Tes vêtements, leurs détails et leurs
            univers visuels.
          </p>
        </div>

        <div
  style="
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  "
>
  <button
    class="button-secondary"
    type="button"
    data-action="open-add-piece"
  >
    + Ajouter une pièce
  </button>

  <button
    class="button-primary"
    type="button"
    data-route="outfits"
  >
    Créer une tenue
  </button>
</div>

      </div>

      <div class="closet-controls">
        <input
          id="closetSearch"
          class="field-input"
          type="search"
          placeholder="Rechercher une marque, une pièce ou une couleur..."
          value="${escapeHTML(state.search)}"
        />

        <select
          id="categoryFilter"
          class="field-select"
        >
          <option value="all">
            Toutes les catégories
          </option>
         
          <option value="favorites">
            Favoris
          </option>

          <option value="laundry">
            À la machine à laver
          </option>

          <option value="top">Hauts</option>
          <option value="bottom">Bas</option>
          <option value="jacket">Vestes</option>
          <option value="shoes">Chaussures</option>
          <option value="accessory">Accessoires</option>
          <option value="underwear">
            Sous-vêtements
          </option>
        </select>
      </div>

      <div
        id="closetGrid"
        class="product-grid"
      ></div>
    </section>
  `;

  const categoryFilter =
    document.getElementById("categoryFilter");

  if (categoryFilter) {
    categoryFilter.value = state.category;
  }

  renderClosetGrid();
}

function renderClosetGrid() {
  const grid = document.getElementById("closetGrid");

  if (!grid) return;

  const search = state.search
    .toLowerCase()
    .trim();

  const filteredProducts = products.filter(product => {
    const searchableText = [
      product.name,
      product.brand,
      product.category,
      product.size,
      ...(product.colors || []),
      ...(product.styles || [])
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      searchableText.includes(search);

    const matchesCategory =
  state.category === "all" ||
  (
    state.category === "favorites" &&
    isFavorite(product.id)
  ) ||
  (
    state.category === "laundry" &&
    isProductInLaundry(product.id)
  ) ||
  (
    !["favorites", "laundry"].includes(
      state.category
    ) &&
    product.category === state.category
  );

    return matchesSearch && matchesCategory;
  });

  if (!filteredProducts.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div>
          <strong>Aucune pièce trouvée</strong>
          Essaie une autre recherche ou une autre
          catégorie.
        </div>
      </div>
    `;

    return;
  }

  grid.innerHTML = filteredProducts
    .map(productCard)
    .join("");
}

function renderProductDetail() {
  const view = document.getElementById("view");

  if (!view) return;

  const product = getProduct(state.productId);

  if (!product) {
    goTo("closet");
    return;
  }

  const image = product.image
    ? `
      <img
        src="${escapeHTML(product.image)}"
        alt="${escapeHTML(product.name)}"
      />
    `
    : `
      <div class="detail-placeholder">
        ${getProductInitial(product)}
      </div>
    `;

  const tags = (product.styles || [])
    .map(style => {
      return `
        <span class="tag">
          ${escapeHTML(style)}
        </span>
      `;
    })
    .join("");

  const compatibleProducts = products
    .filter(other => {
      if (other.id === product.id) {
        return false;
      }

      return (other.styles || []).some(style =>
        (product.styles || []).includes(style)
      );
    })
    .slice(0, 4);

  const discount = product.originalPrice
    ? `
      <div class="detail-fact">
        <span>Prix d'origine</span>
        <strong>
          ${formatPrice(product.originalPrice)}
        </strong>
      </div>
    `
    : "";

  const colors = product.colors?.join(" / ") || "—";

  view.innerHTML = `
    <section class="screen active">
      <div class="product-detail">
        <button
          class="detail-back"
          type="button"
          data-route="closet"
        >
          ← Retour au dressing
        </button>

        <div class="detail-layout">
          <div
            class="detail-art"
            style="
              --detail-one: ${getColor(product, 0)};
              --detail-two: ${getColor(product, 1)};
            "
          >
            ${
              product.image
                ? `
                  <div
                    class="detail-blur"
                    style="
                      background-image: url('${escapeHTML(
                        product.image
                      )}');
                    "
                  ></div>
                `
                : ""
            }

            ${image}
          </div>

          <div class="detail-information">
            <div class="detail-kicker">
              ${escapeHTML(
                categoryLabels[product.category] ||
                "Pièce"
              )}
            </div>

            <h1>
              ${escapeHTML(product.name)}
            </h1>

            <div class="detail-brand">
              ${escapeHTML(product.brand || "Sans marque")}
            </div>

            <div class="detail-price">
              ${formatPrice(product.price)}
            </div>

            <div class="detail-facts">
              <div class="detail-fact">
                <span>Taille</span>
                <strong>
                  ${escapeHTML(product.size || "—")}
                </strong>
              </div>

              <div class="detail-fact">
                <span>Coloris</span>
                <strong>
                  ${escapeHTML(colors)}
                </strong>
              </div>

              <div class="detail-fact">
                <span>Catégorie</span>
                <strong>
                  ${escapeHTML(
                    categoryLabels[product.category] ||
                    "—"
                  )}
                </strong>
              </div>

              <div class="detail-fact">
                <span>Quantité</span>
                <strong>
                  ${product.quantity || 1}
                </strong>
              </div>

              ${discount}
            </div>

            <div class="tag-list">
              ${tags}
            </div>

            <div
  class="detail-actions"
  style="
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  "
>
  <button
    class="button-primary"
    type="button"
    data-use-product="${escapeHTML(product.id)}"
  >
    Créer une tenue avec cette pièce
  </button>
  
<button
  class="button-secondary favorite-detail-button"
  type="button"
  data-action="toggle-favorite"
  data-product-id="${escapeHTML(product.id)}"
  aria-pressed="${isFavorite(product.id)}"
>
  ${
    isFavorite(product.id)
      ? "♥ Dans mes favoris"
      : "♡ Ajouter aux favoris"
  }
</button>
<button
  class="button-secondary laundry-detail-button ${
    isProductInLaundry(product.id)
      ? "is-laundry"
      : ""
  }"
  type="button"
  data-action="toggle-laundry"
  data-product-id="${escapeHTML(product.id)}"
>
  ${
    isProductInLaundry(product.id)
      ? "Remettre propre"
      : "Mettre au sale"
  }
</button>

  <button
    class="button-secondary"
    type="button"
    data-action="edit-product"
    data-product-id="${escapeHTML(product.id)}"
  >
    Modifier
  </button>

  <button
    class="button-secondary button-danger"
    type="button"
    data-action="delete-product"
    data-product-id="${escapeHTML(product.id)}"
  >
    Supprimer cette pièce
  </button>
</div>

          </div>
        </div>

        <div style="margin-top: 30px;">
          <div class="section-header">
            <div>
              <h2>Pièces compatibles</h2>

              <p>
                Des éléments de ton dressing qui partagent
                un univers proche.
              </p>
            </div>
          </div>

          <div class="product-grid">
            ${
              compatibleProducts.length
                ? compatibleProducts
                    .map(productCard)
                    .join("")
                : `
                  <div class="empty-state">
                    <div>
                      <strong>
                        Pas encore de suggestion
                      </strong>

                      Cette pièce est unique dans ton
                      dressing.
                    </div>
                  </div>
                `
            }
          </div>
        </div>
      </div>
    </section>
  `;
}

function getAvailableForSlot(slot) {
  return products.filter(product => {
    const correctCategory =
      slot.categories.includes(product.category);

    const allowed =
      product.includeInOutfits !== false;

    return (
  correctCategory &&
  allowed &&
  !isProductInLaundry(product.id)
);
  });
}

function normalizeOutfitSelection() {
  outfitSlots.forEach(slot => {
    const current =
      getProduct(state.outfit[slot.key]);

    const available =
      getAvailableForSlot(slot);

    const valid =
  current &&
  slot.categories.includes(current.category) &&
  current.includeInOutfits !== false &&
  !isProductInLaundry(current.id);

        if (!valid && state.outfit[slot.key]) {
      state.outfit[slot.key] =
        available[0]?.id || "";
    }
  });
}

function getSelectedOutfitProducts() {
  return outfitSlots
    .map(slot => getProduct(state.outfit[slot.key]))
    .filter(Boolean);
}

function getOutfitGradient(selectedProducts) {
  const colors = selectedProducts.flatMap(product => [
    getColor(product, 0),
    getColor(product, 1)
  ]);

  const first = colors[0] || "#222222";
  const second = colors[1] || "#777777";
  const third = colors[2] || "#171717";

  return `
    radial-gradient(
      circle at 16% 18%,
      ${first} 0%,
      transparent 34%
    ),
    radial-gradient(
      circle at 82% 75%,
      ${second} 0%,
      transparent 42%
    ),
    linear-gradient(
      145deg,
      #050505,
      ${third},
      #050505
    )
  `;
}

function renderWeatherOutfitContext() {
  const context = document.getElementById(
    "weatherOutfitContext"
  );

  if (!context) {
    return;
  }

  const selectedIndex =
    weatherState.selectedForecastIndex;

  const forecast =
    weatherState.data?.forecast || [];

  if (
    selectedIndex === null ||
    !forecast[selectedIndex]
  ) {
    context.innerHTML = "";
    return;
  }

  const day = forecast[selectedIndex];
  const plan = getWeatherOutfitPlan(day);

  context.innerHTML = `
    <section
      class="weather-card weather-ready"
      style="margin-bottom: 24px;"
    >
      <div class="weather-card-top">
        <div>
          <div class="eyebrow">
            Météo prise en compte
          </div>

          <h2>
            ${escapeHTML(
              formatForecastDay(
                day.date,
                selectedIndex
              )
            )}
          </h2>

          <p>
            ${escapeHTML(plan.title)}
          </p>
        </div>

        <div class="weather-temperature">
          ${Math.round(day.temperatureMax)}°
          /
          ${Math.round(day.temperatureMin)}°
        </div>
      </div>

      <div class="weather-facts">
        <div>
          <span>Pluie</span>
          <strong>
            ${Math.round(
              day.precipitationProbability
            )}%
          </strong>
        </div>

        <div>
          <span>Vent</span>
          <strong>
            ${Math.round(day.windSpeed)} km/h
          </strong>
        </div>

        <div>
          <span>Couche</span>
          <strong>
            ${
              plan.needsJacket
                ? "Veste conseillée"
                : "Pas obligatoire"
            }
          </strong>
        </div>
      </div>
    </section>
  `;
}

function getCleanOutfitProduct(slotKey) {
  const product = getProduct(state.outfit[slotKey]);

  if (!product) {
    return null;
  }

  if (isProductInLaundry(product.id)) {
    return null;
  }

  return product;
}

function getWeatherOutfitWarnings(plan) {
  const warnings = [];

  if (!getCleanOutfitProduct("top")) {
    warnings.push("Aucun haut propre disponible.");
  }

  if (!getCleanOutfitProduct("bottom")) {
    warnings.push("Aucun bas propre disponible.");
  }

  if (!getCleanOutfitProduct("shoes")) {
    warnings.push("Aucune chaussure propre disponible.");
  }

  if (
    plan.needsJacket &&
    !getCleanOutfitProduct("jacket")
  ) {
    warnings.push(
      "Une veste est recommandée, mais aucune veste propre n'est sélectionnée."
    );
  }

  if (
    plan.needsAccessory &&
    !getCleanOutfitProduct("accessory")
  ) {
    warnings.push(
      "Un accessoire chaud est conseillé, mais aucun n'est sélectionné."
    );
  }

  return warnings;
}

function renderOutfitLab() {
  const view = document.getElementById("view");

  if (!view) return;

  normalizeOutfitSelection();

  view.innerHTML = `
    <section class="screen active">
      <div class="screen-heading">
        <div>
          <h1>Outfit Lab</h1>

          <p>
            Compose une tenue avec les vêtements que tu
            possèdes déjà.
          </p>
        </div>
            </div>

      <div id="weatherOutfitContext"></div>

      <div class="outfit-layout">

        <div class="panel outfit-controls">
          <div class="section-header">
            <div>
              <h2>Composition</h2>

              <p>
                Sélectionne chaque élément du look.
              </p>
            </div>
          </div>

          ${renderOutfitControls()}

          <div class="outfit-actions">
            <button
              class="button-primary"
              type="button"
              data-action="random-outfit"
            >
              Générer un look harmonisé
            </button>

            <button
              class="button-secondary"
              type="button"
              data-action="save-outfit"
            >
              Sauvegarder
            </button>
          </div>
        </div>

        <div id="outfitStage"></div>
      </div>
    </section>
  `;

   renderWeatherOutfitContext();
  renderOutfitStage();
}

function renderOutfitControls() {
  return outfitSlots
    .map(slot => {
      const available =
        getAvailableForSlot(slot);

      const isLocked =
        state.lockedOutfitSlots[slot.key] === true;

      const options = available
        .map(product => {
          const selected =
            state.outfit[slot.key] === product.id
              ? "selected"
              : "";

          return `
            <option
              value="${escapeHTML(product.id)}"
              ${selected}
            >
              ${escapeHTML(product.name)}
              —
              ${formatPrice(product.price)}
            </option>
          `;
        })
        .join("");

      return `
        <div class="outfit-field">
          <div class="outfit-field-header">
            <label for="outfit-${escapeHTML(slot.key)}">
              ${escapeHTML(slot.label)}
            </label>

            <button
              class="outfit-lock-button ${
                isLocked ? "is-locked" : ""
              }"
              type="button"
              data-action="toggle-outfit-lock"
              data-outfit-slot="${escapeHTML(slot.key)}"
              aria-pressed="${isLocked}"
            >
              ${isLocked ? "VERROUILLÉ" : "VERROUILLER"}
            </button>
          </div>

          <select
            id="outfit-${escapeHTML(slot.key)}"
            class="outfit-select"
            data-outfit-slot="${escapeHTML(slot.key)}"
            ${isLocked ? "disabled" : ""}
          >
            <option value="">
              Aucun élément
            </option>

            ${options}
          </select>
        </div>
      `;
    })
    .join("");
}

function renderOutfitStage() {
  const stage = document.getElementById("outfitStage");

  if (!stage) return;

  const selectedProducts =
    getSelectedOutfitProducts();

  const total = selectedProducts.reduce(
    (sum, product) =>
      sum + Number(product.price || 0),
    0
  );

  const pieces = selectedProducts
    .map(product => {
      return `
        <article class="outfit-piece">
          ${productMedia(product)}

          <div class="product-content">
            <div class="product-name">
              ${escapeHTML(product.name)}
            </div>

            <div class="product-meta">
              ${escapeHTML(product.brand || "Sans marque")}
            </div>

            <div class="product-price">
              ${formatPrice(product.price)}
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  stage.innerHTML = `
    <div
      class="outfit-stage"
      style="
        --outfit-one: ${getColor(selectedProducts[0], 0)};
        --outfit-two: ${getColor(selectedProducts[1], 0)};
        --outfit-three: ${getColor(selectedProducts[2], 0)};
        background: ${getOutfitGradient(selectedProducts)};
      "
    >
      <div class="outfit-header">
        <div>
          <div class="eyebrow">
            Generated composition
          </div>

          <h2>Untitled look</h2>
        </div>

        <div class="outfit-total">
          ${formatPrice(total)}
        </div>
      </div>

      <div class="outfit-pieces">
        ${
          pieces ||
          `
            <div
              class="empty-state"
              style="grid-column: 1 / -1;"
            >
              <div>
                <strong>
                  Ton look est vide
                </strong>

                Sélectionne des vêtements dans le
                panneau de composition.
              </div>
            </div>
          `
        }
      </div>

      <div class="outfit-note">
        ${selectedProducts.length}
        pièce${selectedProducts.length > 1 ? "s" : ""}
        · Palette générée automatiquement à partir de
        tes vêtements.
      </div>
    </div>
  `;
}

function renderSavedLooks() {
  const view = document.getElementById("view");

  if (!view) return;

  view.innerHTML = `
    <section class="screen active">
      <div class="screen-heading">
        <div>
          <h1>Saved Looks</h1>

          <p>
            Tes compositions sauvegardées.
          </p>
        </div>

        <button
          class="button-primary"
          type="button"
          data-route="outfits"
        >
          Créer un look
        </button>
      </div>

      <div
        class="looks-grid"
        id="savedLooksGrid"
      ></div>
    </section>
  `;

  const grid =
    document.getElementById("savedLooksGrid");

  if (!grid) return;

  if (!savedLooks.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div>
          <strong>
            Aucun look sauvegardé
          </strong>

          Crée ta première tenue dans Outfit Lab.
        </div>
      </div>
    `;

    return;
  }

  grid.innerHTML = savedLooks
    .map((look, index) => {
      const selected = (look.items || [])
        .map(id => getProduct(id))
        .filter(Boolean);

      const total = selected.reduce(
        (sum, product) =>
          sum + Number(product.price || 0),
        0
      );

      return `
        <article
          class="look-card"
          style="
            --look-one: ${getColor(selected[0], 0)};
            --look-two: ${getColor(selected[1], 0)};
            --look-three: ${getColor(selected[2], 0)};
          "
        >
          <div class="look-content">
            <div class="look-number">
              LOOK
              ${String(index + 1).padStart(3, "0")}
            </div>

            <h3>
              ${escapeHTML(look.name)}
            </h3>

            <p>
              ${selected.length}
              pièce${selected.length > 1 ? "s" : ""}
              · ${formatPrice(total)}
            </p>

            <button
              class="button-secondary"
              type="button"
              style="margin-top: 15px;"
              data-load-look="${escapeHTML(look.id)}"
            >
              Modifier
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function selectProductForOutfit(product) {
  if (!product) return;

  const slot = outfitSlots.find(item =>
    item.categories.includes(product.category)
  );

  if (!slot) return;

  state.outfit[slot.key] = product.id;
}

function showToast(message) {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(showToast.timeout);

  showToast.timeout = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}
function normalizeColor(color) {
  const value = safeColor(
    color,
    "#222222"
  ).replace("#", "");

  if (value.length === 3) {
    return value
      .split("")
      .map(char => char + char)
      .join("");
  }

  return value.slice(0, 6);
}

function colorToRgb(color) {
  const value = normalizeColor(color);

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function isNeutralRgb(rgb) {
  const maximum = Math.max(
    rgb.r,
    rgb.g,
    rgb.b
  );

  const minimum = Math.min(
    rgb.r,
    rgb.g,
    rgb.b
  );

  const brightness =
    (rgb.r + rgb.g + rgb.b) / 3;

  return (
    maximum - minimum <  30 ||
    brightness < 45 ||
    brightness > 220
  );
}
function colorCompatibility(firstColor, secondColor) {
  const first = colorToRgb(firstColor);
  const second = colorToRgb(secondColor);

  const firstNeutral = isNeutralRgb(first);
  const secondNeutral = isNeutralRgb(second);

  if (firstNeutral && secondNeutral) {
    return 0.9;
  }

  if (firstNeutral || secondNeutral) {
    return 0.76;
  }

  const distance = Math.sqrt(
    Math.pow(first.r - second.r, 2) +
    Math.pow(first.g - second.g, 2) +
    Math.pow(first.b - second.b, 2)
  );

  const maximumDistance = 441.67;

  return Math.max(
    0,
    1 - distance / maximumDistance
  );
}

function styleCompatibility(firstProduct, secondProduct) {
  const firstStyles =
    firstProduct.styles || [];

  const secondStyles =
    secondProduct.styles || [];

  const commonStyles = firstStyles.filter(
    style => secondStyles.includes(style)
  );

  if (!commonStyles.length) {
    return 0;
  }

  return Math.min(
    1,
    commonStyles.length / 2
  );
}

function getWeatherWarmthTarget(plan, category) {
  const minimum = Number(
    plan?.minimum ?? 20
  );

  const maximum = Number(
    plan?.maximum ?? minimum
  );

  if (category === "jacket") {
    if (minimum <= 5) return 5;
    if (minimum <= 12) return 4;
    if (minimum <= 18 || plan?.rainy) return 3;

    return 2;
  }

  if (category === "top") {
    if (minimum <= 5) return 5;
    if (minimum <= 12) return 4;
    if (minimum <= 18) return 3;
    if (maximum >= 27) return 1;

    return 2;
  }

  if (category === "bottom") {
    if (minimum <= 5) return 3;
    if (maximum >= 27) return 1;

    return 2;
  }

  if (category === "accessory") {
    if (minimum <= 5) return 5;
    if (minimum <= 12) return 4;

    return 2;
  }

  return 2;
}

function getWeatherCompatibility(
  candidate,
  plan
) {
  if (!plan) {
    return 0.5;
  }

  const warmth = Number(
    candidate.warmth ?? 2
  );

  const targetWarmth =
    getWeatherWarmthTarget(
      plan,
      candidate.category
    );

  const warmthScore = Math.max(
    0,
    1 -
      Math.abs(warmth - targetWarmth) / 4
  );

  let score = warmthScore;

  if (
    plan.rainy &&
    candidate.category === "jacket"
  ) {
    if (candidate.rainProtection === true) {
      score = Math.min(
        1,
        score + 0.35
      );
    } else {
      score *= 0.45;
    }
  }

  if (
    plan.snowy &&
    candidate.category === "jacket"
  ) {
    if (warmth >= 4) {
      score = Math.min(
        1,
        score + 0.15
      );
    } else {
      score *= 0.5;
    }
  }

  return Math.max(
    0,
    Math.min(1, score)
  );
}

function productCompatibility(
  candidate,
  selectedProducts,
  weatherPlan = null
) {

  if (!selectedProducts.length) {
    return 0.5;
  }

  const scores = selectedProducts.map(product => {
    const candidateColors =
      candidate.colors || ["#222222"];

    const productColors =
      product.colors || ["#222222"];

    let bestColorScore = 0;

    candidateColors.forEach(candidateColor => {
      productColors.forEach(productColor => {
        const score = colorCompatibility(
          candidateColor,
          productColor
        );

        bestColorScore = Math.max(
          bestColorScore,
          score
        );
      });
    });

    const styleScore =
      styleCompatibility(
        candidate,
        product
      );

    return (
      styleScore * 0.58 +
      bestColorScore * 0.42
    );
  });

    const outfitScore =
    scores.reduce(
      (total, score) => total + score,
      0
    ) / scores.length;

  if (!weatherPlan) {
    return outfitScore;
  }

  const weatherScore =
    getWeatherCompatibility(
      candidate,
      weatherPlan
    );

  return (
    outfitScore * 0.62 +
    weatherScore * 0.38
  );
}

function chooseSmartProduct(
  candidates,
  selectedProducts,
  weatherPlan = null
) {
  if (!candidates.length) {
    return null;
  }

  const scoredProducts = candidates
    .map(product => ({
      product,
      score:
        productCompatibility(
  product,
  selectedProducts,
  weatherPlan
) +
        Math.random() * 0.12
    }))
    .sort(
      (first, second) =>
        second.score - first.score
    );

  /*
    On garde une petite part de hasard
    pour ne pas générer toujours le même look.
  */
  const bestProducts =
    scoredProducts.slice(
      0,
      Math.min(3, scoredProducts.length)
    );

  const randomIndex = Math.floor(
    Math.random() * bestProducts.length
  );

  return bestProducts[randomIndex].product;
}

function generateRandomOutfit() {
  const nextOutfit = {
    ...state.outfit
  };

  const selectedProducts = [];

  /*
    On conserve d'abord les pièces verrouillées
    pour que l'algorithme s'adapte autour d'elles.
  */
  outfitSlots.forEach(slot => {
    const isLocked =
      state.lockedOutfitSlots[slot.key] === true;

    if (!isLocked) return;

    const lockedProduct =
      getProduct(state.outfit[slot.key]);

    if (lockedProduct) {
      selectedProducts.push(lockedProduct);
    }
  });

  /*
    On remplace uniquement les pièces non verrouillées.
  */
  outfitSlots.forEach(slot => {
    const isLocked =
      state.lockedOutfitSlots[slot.key] === true;

    if (isLocked) return;

    const availableProducts =
      getAvailableForSlot(slot);

    const productsWithoutDuplicates =
      availableProducts.filter(product => {
        return !selectedProducts.some(
          selected =>
            selected.id === product.id
        );
      });

    const candidates =
      productsWithoutDuplicates.length
        ? productsWithoutDuplicates
        : availableProducts;

    const chosenProduct =
      chooseSmartProduct(
        candidates,
        selectedProducts
      );

    nextOutfit[slot.key] =
      chosenProduct?.id || "";

    if (chosenProduct) {
      selectedProducts.push(chosenProduct);
    }
  });

  state.outfit = {
    ...state.outfit,
    ...nextOutfit
  };

  renderOutfitLab();

  showToast(
    "Look harmonisé généré."
  );
}

function saveCurrentOutfit() {
  const items = getSelectedOutfitProducts()
    .map(product => product.id);

  if (!items.length) {
    showToast("Ajoute au moins une pièce.");
    return;
  }

  const look = {
    id: `look-${Date.now()}`,
    name: `Look ${String(
      savedLooks.length + 1
    ).padStart(2, "0")}`,
    items,
    createdAt: new Date().toISOString()
  };

  savedLooks.unshift(look);
  saveSavedLooks();

  showToast("Look sauvegardé.");
}

function loadSavedLook(lookId) {
  const look = savedLooks.find(
    item => item.id === lookId
  );

  if (!look) return;

  outfitSlots.forEach(slot => {
    state.outfit[slot.key] = "";
  });

  (look.items || []).forEach(productId => {
    const product = getProduct(productId);

    if (product) {
      selectProductForOutfit(product);
    }
  });

  goTo("outfits");
}
function loadCustomProducts() {
  try {
    const savedProducts = JSON.parse(
      localStorage.getItem(customProductsKey) || "[]"
    );

    savedProducts.forEach(product => {
      const alreadyExists = products.some(
        item => item.id === product.id
      );

      if (!alreadyExists) {
        products.push(product);
      }
    });
  } catch {
    // Aucun produit personnalisé enregistré
  }
}

function saveCustomProducts() {
  const customProducts = products.filter(
    product => product.userCreated === true
  );

  localStorage.setItem(
    customProductsKey,
    JSON.stringify(customProducts)
  );
}

function openAddPieceModal(productId = null) {
  const modal = document.getElementById(
    "addPieceModal"
  );

  const form = document.getElementById(
    "addPieceForm"
  );

  const title = document.getElementById(
    "addPieceTitle"
  );

  const submitButton = document.getElementById(
    "addPieceSubmit"
  );

  if (!modal || !form) return;

  editingProductId = productId;

  const product = productId
    ? getProduct(productId)
    : null;

  form.reset();

    const warmthInput =
    form.elements.namedItem("warmth");

  const rainProtectionInput =
    form.elements.namedItem("rainProtection");

  if (warmthInput) {
    warmthInput.value = String(
      product?.warmth ?? 2
    );
  }

  if (rainProtectionInput) {
    rainProtectionInput.checked =
      product?.rainProtection === true;

  }

  const imageInput =
    form.elements.namedItem("image");

  if (imageInput) {
    imageInput.required = !product;
    imageInput.value = "";
  }

  if (product) {
    title.textContent = "Modifier la pièce";

    if (submitButton) {
      submitButton.textContent =
        "Enregistrer les modifications";
    }

    form.elements.name.value =
      product.name || "";

    form.elements.brand.value =
      product.brand || "";

    form.elements.category.value =
      product.category || "top";

    form.elements.size.value =
      product.size || "";

    form.elements.price.value =
      product.price ?? "";

    form.elements.color.value =
      safeColor(
        product.colors?.[0],
        "#222222"
      );
  } else {
    title.textContent = "Ajouter une pièce";

    if (submitButton) {
      submitButton.textContent =
        "Enregistrer dans mon dressing";
    }
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");
  document.body.style.overflow = "hidden";
}

function closeAddPieceModal() {
  const modal = document.getElementById(
    "addPieceModal"
  );

  if (!modal) return;

  modal.hidden = true;
  document.body.classList.remove("modal-open");
  document.body.style.overflow = "";
  editingProductId = null;
}

function createAddPieceModal() {
  if (document.getElementById("addPieceModal")) {
    return;
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="add-piece-modal"
        id="addPieceModal"
        hidden
      >
        <div
          class="add-piece-backdrop"
          data-close-add-piece
        ></div>

        <section
          class="add-piece-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="addPieceTitle"
        >
          <div class="add-piece-header">
            <div>
              <p class="eyebrow">NØIR CLOSET</p>

              <h2 id="addPieceTitle">
                Ajouter une pièce
              </h2>
            </div>

            <button
              type="button"
              class="add-piece-close"
              data-close-add-piece
            >
              ×
            </button>
          </div>

          <form id="addPieceForm">
            <label class="add-piece-field">
              <span>Photo</span>

              <input
                type="file"
                name="image"
                accept="image/*"
                required
              />
            </label>

            <label class="add-piece-field">
              <span>Nom du vêtement</span>

              <input
                type="text"
                name="name"
                placeholder="Ex : Hoodie noir"
                required
              />
            </label>

            <label class="add-piece-field">
              <span>Marque</span>

              <input
                type="text"
                name="brand"
                placeholder="Ex : Bershka"
                required
              />
            </label>

            <label class="add-piece-field">
              <span>Catégorie</span>

              <select name="category" required>
                <option value="top">Haut</option>
                <option value="bottom">Bas</option>
                <option value="jacket">Veste</option>
                <option value="shoes">Chaussures</option>
                <option value="accessory">Accessoire</option>
                <option value="underwear">
                  Sous-vêtement
                </option>
              </select>
            </label>

            <div class="add-piece-row">
              <label class="add-piece-field">
                <span>Taille</span>

                <input
                  type="text"
                  name="size"
                  placeholder="Ex : S, 42, unique"
                  required
                />
              </label>

              <label class="add-piece-field">
                <span>Prix</span>

                <input
                  type="number"
                  name="price"
                  inputmode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="29.99"
                  required
                />
              </label>

              <label class="add-piece-field">
  <span>Niveau de chaleur</span>

  <select name="warmth" required>
    <option value="1">1 — Très léger</option>
    <option value="2" selected>2 — Léger</option>
    <option value="3">3 — Intermédiaire</option>
    <option value="4">4 — Chaud</option>
    <option value="5">5 — Très chaud</option>
  </select>
</label>

<label
  class="add-piece-field"
  style="
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  "
>
  <input
    type="checkbox"
    name="rainProtection"
  />

  <span>Résiste à la pluie</span>
</label>
            </div>

            <label class="add-piece-field">
              <span>Couleur principale</span>

              <input
                type="color"
                name="color"
                value="#222222"
              />
            </label>

            <p
              class="add-piece-error"
              id="addPieceError"
              hidden
            ></p>

            <button
              class="button-primary"
              id="addPieceSubmit"
              type="submit"
            >
              Enregistrer dans mon dressing
            </button>
          </form>
        </section>
      </div>
    `
  );
}

async function removeBackgroundAndCompress(file) {
  const formData = new FormData();

  formData.append(
    "image_file",
    file,
    file.name || "piece.png"
  );

  const response = await fetch(
    removeBgWorkerUrl,
    {
      method: "POST",
      body: formData
    }
  );

  if (!response.ok) {
    let details = "";

    try {
      details = await response.text();
    } catch {
      details = "";
    }

    throw new Error(
      `Erreur remove.bg (${response.status}) ${details}`
    );
  }

  const removedBackgroundImage =
    await response.blob();

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(
      removedBackgroundImage
    );

    const image = new Image();

    image.onload = () => {
      const maxSize = 1200;

      const ratio = Math.min(
        1,
        maxSize / image.width,
        maxSize / image.height
      );

      const canvas = document.createElement(
        "canvas"
      );

      canvas.width = Math.max(
        1,
        Math.round(image.width * ratio)
      );

      canvas.height = Math.max(
        1,
        Math.round(image.height * ratio)
      );

      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas indisponible"));
        return;
      }

      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      URL.revokeObjectURL(objectUrl);

      resolve(
        canvas.toDataURL(
          "image/webp",
          0.86
        )
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);

      reject(
        new Error(
          "Impossible de charger l'image supprimée"
        )
      );
    };

    image.src = objectUrl;
  });
}


async function handleAddPieceSubmit(event) {
  if (event.target.id !== "addPieceForm") {
    return;
  }

  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const error = document.getElementById(
    "addPieceError"
  );

  const currentProduct = editingProductId
    ? getProduct(editingProductId)
    : null;

  const imageFile = formData.get("image");
  const hasNewImage =
    imageFile instanceof File &&
    imageFile.size > 0;

  const name = String(
    formData.get("name") || ""
  ).trim();

  const brand = String(
    formData.get("brand") || ""
  ).trim();

  const category = String(
    formData.get("category") || ""
  );

  const size = String(
    formData.get("size") || ""
  ).trim();

  const price = Number(
    String(formData.get("price") || "")
      .replace(",", ".")
  );

  const color = String(
    formData.get("color") || "#222222"
  );

    const warmth = Number(
    formData.get("warmth") || 2
  );

  const rainProtection =
    form.elements.rainProtection?.checked === true
    ;

  error.hidden = true;
  error.textContent = "";

  if (!currentProduct && !hasNewImage) {
    error.textContent =
      "Sélectionne une image.";
    error.hidden = false;
    return;
  }

  if (
    hasNewImage &&
    !imageFile.type.startsWith("image/")
  ) {
    error.textContent =
      "Sélectionne une image valide.";
    error.hidden = false;
    return;
  }

  if (!name || !brand || !category || !size) {
    error.textContent =
      "Remplis tous les champs.";
    error.hidden = false;
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    error.textContent =
      "Le prix n'est pas valide.";
    error.hidden = false;
    return;
  }

    if (
    !Number.isInteger(warmth) ||
    warmth < 1 ||
    warmth > 5
  ) {
    error.textContent =
      "Le niveau de chaleur doit être compris entre 1 et 5.";
    error.hidden = false;
    return;
   
    }

  try {
    let image = currentProduct?.image || "";

    /*
      L'API remove.bg est utilisée seulement
      si une nouvelle photo est sélectionnée.
    */
    if (hasNewImage) {
      image =
        await removeBackgroundAndCompress(
          imageFile
        );
    }

    const product = currentProduct
      ? {
          ...currentProduct,
          name,
          brand,
          category,
          size,
          price,
          image,
          colors: [color],
          warmth,
          rainProtection

        }
      : {
          id: `custom-${Date.now()}`,
          name,
          brand,
          category,
          size,
          price,
          originalPrice: null,
          image,
          colors: [color],
          warmth,
          rainProtection,
          styles: ["personnel"],
          includeInOutfits: true,
          quantity: 1,
          userCreated: true
        };

    if (currentProduct) {
      const productIndex = products.findIndex(
        item => item.id === currentProduct.id
      );

      if (productIndex === -1) {
        throw new Error(
          "Cette pièce n'existe plus."
        );
      }

      products[productIndex] = product;

      if (product.userCreated === true) {
        removeEditedProduct(product.id);
        saveCustomProducts();
      } else {
        saveEditedProduct(product);
      }

      form.reset();
      closeAddPieceModal();

      editingProductId = null;

      goTo("product", product.id);
      showToast("Pièce modifiée.");

      return;
    }

    products.unshift(product);
    saveCustomProducts();

    form.reset();
    closeAddPieceModal();

    editingProductId = null;
    state.search = "";
    state.category = "all";

    goTo("closet");
    showToast("Pièce ajoutée au dressing.");
  } catch (problem) {
    error.textContent =
      problem.message ||
      "Impossible d'enregistrer cette pièce.";

    error.hidden = false;
  }
}

function getDeletedProductIds() {
  try {
    const deletedIds = JSON.parse(
      localStorage.getItem(deletedProductsKey) || "[]"
    );

    return Array.isArray(deletedIds)
      ? deletedIds
      : [];
  } catch {
    return [];
  }
}

function applyDeletedProducts() {
  const deletedIds = new Set(
    getDeletedProductIds()
  );

  for (let index = products.length - 1; index >= 0; index--) {
    if (deletedIds.has(products[index].id)) {
      products.splice(index, 1);
    }
  }
}

function deleteProductById(productId) {
  const productIndex = products.findIndex(
    product => product.id === productId
  );

  if (productIndex === -1) {
    return false;
  }

  const product = products[productIndex];

  products.splice(productIndex, 1);

  if (product.userCreated === true) {
    saveCustomProducts();
  } else {
    const deletedIds = getDeletedProductIds();

    if (!deletedIds.includes(productId)) {
      deletedIds.push(productId);
    }

    localStorage.setItem(
      deletedProductsKey,
      JSON.stringify(deletedIds)
    );
  }

  savedLooks = savedLooks
    .map(look => ({
      ...look,
      items: (look.items || []).filter(
        id => id !== productId
      )
    }))
    .filter(look => look.items.length > 0);

  saveSavedLooks();

  return true;
}
function getEditedProducts() {
  try {
    const editedProducts = JSON.parse(
      localStorage.getItem(editedProductsKey) || "{}"
    );

    if (
      !editedProducts ||
      typeof editedProducts !== "object" ||
      Array.isArray(editedProducts)
    ) {
      return {};
    }

    return editedProducts;
  } catch {
    return {};
  }
}

function saveEditedProduct(product) {
  const editedProducts = getEditedProducts();

  editedProducts[product.id] = {
    name: product.name,
    brand: product.brand,
    size: product.size,
    price: product.price,
    originalPrice: product.originalPrice ?? null,
    category: product.category,
    image: product.image,
        colors: product.colors || [],
    warmth: product.warmth ?? 2,
    rainProtection:
      product.rainProtection === true,
    styles: product.styles || [],
    includeInOutfits:
      product.includeInOutfits !== false,
    quantity: product.quantity || 1
  };

  localStorage.setItem(
    editedProductsKey,
    JSON.stringify(editedProducts)
  );
}

function removeEditedProduct(productId) {
  const editedProducts = getEditedProducts();

  delete editedProducts[productId];

  localStorage.setItem(
    editedProductsKey,
    JSON.stringify(editedProducts)
  );
}

function applyEditedProducts() {
  const editedProducts = getEditedProducts();

  products.forEach((product, index) => {
    const editedProduct =
      editedProducts[product.id];

    if (editedProduct) {
      products[index] = {
        ...product,
        ...editedProduct
      };
    }
  });
}

function loadFavoriteProductIds() {
  try {
    const savedFavorites = JSON.parse(
      localStorage.getItem(favoritesKey) || "[]"
    );

    return Array.isArray(savedFavorites)
      ? savedFavorites
      : [];
  } catch {
    return [];
  }
}

function saveFavoriteProductIds() {
  localStorage.setItem(
    favoritesKey,
    JSON.stringify(favoriteProductIds)
  );
}

function isFavorite(productId) {
  return favoriteProductIds.includes(productId);
}

function toggleFavorite(productId) {
  const favoriteIndex =
    favoriteProductIds.indexOf(productId);

  if (favoriteIndex === -1) {
    favoriteProductIds.push(productId);
    saveFavoriteProductIds();
    return true;
  }

  favoriteProductIds.splice(favoriteIndex, 1);
  saveFavoriteProductIds();

  return false;
}

function loadLaundryProductIds() {
  try {
    const savedLaundryProducts = JSON.parse(
      localStorage.getItem(laundryProductsKey) || "[]"
    );

    return Array.isArray(savedLaundryProducts)
      ? savedLaundryProducts
      : [];
  } catch {
    return [];
  }
}

function saveLaundryProductIds() {
  localStorage.setItem(
    laundryProductsKey,
    JSON.stringify(laundryProductIds)
  );
}

function isProductInLaundry(productId) {
  return laundryProductIds.includes(productId);
}

function toggleLaundryStatus(productId) {
  const laundryIndex =
    laundryProductIds.indexOf(productId);

  if (laundryIndex === -1) {
    laundryProductIds.push(productId);
    saveLaundryProductIds();
    return true;
  }

  laundryProductIds.splice(laundryIndex, 1);
  saveLaundryProductIds();

  return false;
}

function getWeatherDescription(code) {
  const descriptions = {
    0: "Ciel dégagé",
    1: "Peu nuageux",
    2: "Partiellement nuageux",
    3: "Couvert",
    45: "Brouillard",
    48: "Brouillard givrant",
    51: "Bruine légère",
    53: "Bruine",
    55: "Bruine forte",
    61: "Pluie légère",
    63: "Pluie modérée",
    65: "Forte pluie",
    66: "Pluie verglaçante",
    67: "Forte pluie verglaçante",
    71: "Neige légère",
    73: "Neige modérée",
    75: "Forte neige",
    77: "Grains de neige",
    80: "Averses légères",
    81: "Averses modérées",
    82: "Fortes averses",
    85: "Averses de neige",
    86: "Fortes averses de neige",
    95: "Orage",
    96: "Orage avec grêle",
    99: "Fort orage avec grêle"
  };

  return descriptions[code] || "Conditions variables";
}

function getWeatherIcon(code, isDay = 1) {
  const svg = content => `
    <svg
      class="weather-svg"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      ${content}
    </svg>
  `;

  const cloud = `
    <path
      d="M6.5 18.5h10.3a3.7 3.7 0 0 0 .6-7.35A5.5 5.5 0 0 0 7 9.5a4.5 4.5 0 0 0-.5 9Z"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  `;

  if (code === 0) {
    if (isDay) {
      return svg(`
        <circle
          cx="12"
          cy="12"
          r="3.5"
          stroke="currentColor"
          stroke-width="1.7"
        />

        <path
          d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
        />
      `);
    }

    return svg(`
      <path
        d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linejoin="round"
      />
    `);
  }

  if ([1, 2, 3].includes(code)) {
    return svg(`
      <circle
        cx="8"
        cy="7"
        r="2.8"
        stroke="currentColor"
        stroke-width="1.5"
      />

      ${cloud}
    `);
  }

  if ([45, 48].includes(code)) {
    return svg(`
      <path
        d="M4 8h16M3 12h18M5 16h14"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
      />
    `);
  }

  if (
    [
      51, 53, 55,
      61, 63, 65,
      66, 67,
      80, 81, 82
    ].includes(code)
  ) {
    return svg(`
      ${cloud}

      <path
        d="M8 20l-1 2M12 20l-1 2M16 20l-1 2"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
      />
    `);
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return svg(`
      ${cloud}

      <path
        d="M8 20v3M6.5 21.5h3M6.9 20.4l2.2 2.2M9.1 20.4l-2.2 2.2"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linecap="round"
      />

      <path
        d="M16 20v3M14.5 21.5h3M14.9 20.4l2.2 2.2M17.1 20.4l-2.2 2.2"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linecap="round"
      />
    `);
  }

  if ([95, 96, 99].includes(code)) {
    return svg(`
      ${cloud}

      <path
        d="M13 13h3l-4 8v-5H9l4-7v4Z"
        fill="currentColor"
      />
    `);
  }

  return svg(cloud);
}

function getNearestHourlyValue(
  hourly,
  targetTime,
  key
) {
  if (
    !hourly ||
    !Array.isArray(hourly.time) ||
    !Array.isArray(hourly[key]) ||
    !hourly.time.length
  ) {
    return null;
  }

  let index = hourly.time.indexOf(targetTime);

  if (index === -1) {
    const targetTimestamp =
      new Date(targetTime).getTime();

    index = hourly.time.reduce(
      (bestIndex, value, currentIndex) => {
        const bestDistance = Math.abs(
          new Date(
            hourly.time[bestIndex]
          ).getTime() - targetTimestamp
        );

        const currentDistance = Math.abs(
          new Date(value).getTime() -
            targetTimestamp
        );

        return currentDistance < bestDistance
          ? currentIndex
          : bestIndex;
      },
      0
    );
  }

  return hourly[key][index] ?? null;
}

function getWeatherAdvice(data) {
  const apparentTemperature = Number(
    data.apparentTemperature ??
      data.temperature ??
      20
  );

  const precipitationProbability = Number(
    data.precipitationProbability || 0
  );

  const precipitation = Number(
    data.precipitation || 0
  );

  const windSpeed = Number(
    data.windSpeed || 0
  );

  const weatherCode = Number(
    data.weatherCode
  );

  const rainyCodes = [
    51, 53, 55,
    61, 63, 65,
    66, 67,
    80, 81, 82,
    95, 96, 99
  ];

  const rainy =
    precipitation > 0.1 ||
    precipitationProbability >= 40 ||
    rainyCodes.includes(weatherCode);

  const windy = windSpeed >= 30;

  let title = "Tenue légère";
  let text =
    "Une tenue confortable devrait suffire aujourd'hui.";
  let needsJacket = false;
  let needsAccessory = false;

  if (apparentTemperature <= 5) {
    title = "Tenue très chaude";
    text =
      "Privilégie plusieurs couches, une veste chaude et un accessoire couvrant.";
    needsJacket = true;
    needsAccessory = true;
  } else if (apparentTemperature <= 12) {
    title = "Tenue chaude";
    text =
      "Un haut chaud avec une veste est recommandé.";
    needsJacket = true;
    needsAccessory = true;
  } else if (apparentTemperature <= 18) {
    title = "Tenue intermédiaire";
    text =
      "Prévois une couche supplémentaire, surtout le matin et le soir.";
    needsJacket = true;
  } else if (apparentTemperature >= 27) {
    title = "Tenue légère et respirante";
    text =
      "Choisis des vêtements légers et évite les superpositions.";
  } else {
    title = "Tenue confortable";
    text =
      "Un haut confortable devrait convenir avec une couche légère si nécessaire.";
  }

  if (rainy) {
    text +=
      " Une protection contre la pluie est conseillée.";
    needsJacket = true;
  }

  if (windy) {
    text +=
      " Le vent risque de rafraîchir la température ressentie.";
    needsJacket = true;
  }

  return {
    title,
    text,
    needsJacket,
    needsAccessory,
    rainy,
    windy
  };
}

function buildWeatherForecast(daily) {
  if (
    !daily ||
    !Array.isArray(daily.time)
  ) {
    return [];
  }

  return daily.time.map((date, index) => ({
    date,

    temperatureMax:
      daily.temperature_2m_max?.[index] ?? null,

    temperatureMin:
      daily.temperature_2m_min?.[index] ?? null,

    apparentTemperatureMax:
      daily.apparent_temperature_max?.[index] ?? null,

    apparentTemperatureMin:
      daily.apparent_temperature_min?.[index] ?? null,

    precipitationProbability:
      daily.precipitation_probability_max?.[index] ?? 0,

    precipitation:
      daily.precipitation_sum?.[index] ?? 0,

    weatherCode:
      daily.weather_code?.[index] ?? 0,

    windSpeed:
      daily.wind_speed_10m_max?.[index] ?? 0
  }));
}

async function loadWeather() {
  if (!navigator.geolocation) {
    weatherState.status = "error";
    weatherState.error =
      "La géolocalisation n'est pas disponible sur cet appareil.";
    renderRoute();
    return;
  }

  weatherState.status = "loading";
  weatherState.error = "";
  renderRoute();

  navigator.geolocation.getCurrentPosition(
    async position => {
      try {
        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;

        const weatherUrl = new URL(
          "https://api.open-meteo.com/v1/forecast"
        );

        weatherUrl.search =
          new URLSearchParams({
            latitude: latitude.toFixed(4),
            longitude: longitude.toFixed(4),
            current:
              "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day",
            hourly:
  "precipitation_probability",

daily: [
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "precipitation_probability_max",
  "precipitation_sum",
  "weather_code",
  "wind_speed_10m_max"
].join(","),

forecast_days: "5",
timezone: "auto"
          }).toString();

        const response = await fetch(weatherUrl);

        if (!response.ok) {
          throw new Error(
            "Impossible de récupérer la météo."
          );
        }

        const result = await response.json();

        if (!result.current) {
          throw new Error(
            "Les données météo sont incomplètes."
          );
        }

        const current = result.current;

        weatherState.data = {
          latitude,
          longitude,
          timezone: result.timezone,
          updatedAt: current.time,
          temperature: current.temperature_2m,
          apparentTemperature:
            current.apparent_temperature,
          precipitation:
            current.precipitation || 0,
          precipitationProbability:
            getNearestHourlyValue(
              result.hourly,
              current.time,
              "precipitation_probability"
            ) || 0,
          weatherCode: current.weather_code,
          windSpeed: current.wind_speed_10m,
          isDay: current.is_day,
          forecast: buildWeatherForecast(result.daily)
        };

        weatherState.status = "ready";
        weatherState.error = "";

        renderRoute();
        showToast("Météo actualisée.");
      } catch (error) {
        weatherState.status = "error";
        weatherState.error =
          error.message ||
          "Impossible de récupérer la météo.";
        renderRoute();
      }
    },
    error => {
      const messages = {
        1:
          "Autorise la localisation pour utiliser la météo.",
        2:
          "Ta position est indisponible.",
        3:
          "La localisation a pris trop de temps."
      };

      weatherState.status = "error";
      weatherState.error =
        messages[error.code] ||
        "Impossible de récupérer ta position.";

      renderRoute();
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 15 * 60 * 1000
    }
  );
}

function formatForecastDay(dateString, index) {
  if (index === 0) {
    return "Aujourd'hui";
  }

  const date = new Date(
    `${dateString}T12:00:00`
  );

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric"
  }).format(date);
}

function renderWeatherForecast(forecast = []) {
  if (!forecast.length) {
    return "";
  }

  return `
    <div class="weather-forecast">
      <div class="weather-forecast-header">
        <div>
          <span class="eyebrow">
            Prévisions
          </span>

          <strong>
            Les 5 prochains jours
          </strong>
        </div>

        <small>
          Appuie sur une journée pour générer une tenue
        </small>
      </div>

      <div class="weather-forecast-grid">
        ${forecast.map((day, index) => {
          return `
            <button
              class="forecast-day ${
                index === 0 ? "is-today" : ""
              }"
              type="button"
              data-action="generate-weather-outfit"
              data-forecast-index="${index}"
            >
              <span class="forecast-day-name">
                ${escapeHTML(
                  formatForecastDay(day.date, index)
                )}
              </span>

              <span class="forecast-day-icon">
                ${getWeatherIcon(
                  day.weatherCode,
                  1
                )}
              </span>

              <span class="forecast-day-temperatures">
                ${Math.round(day.temperatureMax)}°
                /
                ${Math.round(day.temperatureMin)}°
              </span>

              <span class="forecast-day-rain">
                Pluie ${Math.round(
                  day.precipitationProbability
                )}%
              </span>
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderWeatherPanel() {
  const panel =
    document.getElementById("weatherPanel");

  if (!panel) return;

  if (weatherState.status === "idle") {
    panel.innerHTML = `
      <section class="weather-card weather-idle">
        <div class="weather-card-content">
          <div class="eyebrow">
            Weather wardrobe system
          </div>

          <h2>
            S'habiller selon la météo
          </h2>

          <p>
            Autorise ta position pour obtenir un conseil
            vestimentaire adapté à la température actuelle.
          </p>

          <button
            class="button-secondary"
            type="button"
            data-action="load-weather"
          >
            Activer la météo
          </button>
        </div>

        <div class="weather-symbol">
          ◌
        </div>
      </section>
    `;

    return;

  }

  if (weatherState.status === "loading") {
    panel.innerHTML = `
      <section class="weather-card weather-loading">
        <div>
          <div class="eyebrow">
            Weather wardrobe system
          </div>

          <h2>
            Analyse de la météo...
          </h2>

          <p>
            Récupération de ta position et des conditions
            actuelles.
          </p>
        </div>

        <div class="weather-loader"></div>
      </section>
    `;

    return;
  }

  if (weatherState.status === "error") {
    panel.innerHTML = `
      <section class="weather-card weather-error">
        <div>
          <div class="eyebrow">
            Weather wardrobe system
          </div>

          <h2>
            Météo indisponible
          </h2>

          <p>
            ${escapeHTML(weatherState.error)}
          </p>

          <button
            class="button-secondary"
            type="button"
            data-action="load-weather"
          >
            Réessayer
          </button>
        </div>
      </section>
    `;

    return;
  }

  const data = weatherState.data;
  const advice = getWeatherAdvice(data);

  panel.innerHTML = `
    <section class="weather-card weather-ready">
      <div class="weather-card-top">
        <div>
          <div class="eyebrow">
            Weather wardrobe system
          </div>

          <h2>
            ${escapeHTML(advice.title)}
          </h2>

          <p>
            ${escapeHTML(
              getWeatherDescription(data.weatherCode)
            )}
          </p>
        </div>

        <div class="weather-temperature">
          <span class="weather-icon">
            ${getWeatherIcon(
              data.weatherCode,
              data.isDay
            )}
          </span>

          ${Math.round(data.temperature)}°
        </div>
      </div>

      <div class="weather-facts">
        <div>
          <span>Ressenti</span>
          <strong>
            ${Math.round(data.apparentTemperature)}°
          </strong>
        </div>

        <div>
          <span>Pluie</span>
          <strong>
            ${Math.round(
              data.precipitationProbability
            )}%
          </strong>
        </div>

        <div>
          <span>Vent</span>
          <strong>
            ${Math.round(data.windSpeed)} km/h
          </strong>
        </div>
      </div>

            <p class="weather-advice">
        ${escapeHTML(advice.text)}
      </p>

      ${renderWeatherForecast(data.forecast)}

      <button
        class="button-primary"
        type="button"
        data-action="generate-weather-outfit"
        data-forecast-index="0"
      >
        Créer la tenue d'aujourd'hui
      </button>

      <button
        class="button-secondary"
        type="button"
        data-action="load-weather"
      >
        Actualiser la météo
      </button>
    </section>
  `;
}

function getWeatherOutfitPlan(day) {
  const minimum = Number(
    day.apparentTemperatureMin ??
      day.temperatureMin ??
      20
  );

  const maximum = Number(
    day.apparentTemperatureMax ??
      day.temperatureMax ??
      minimum
  );

  const rainProbability = Number(
    day.precipitationProbability || 0
  );

  const precipitation = Number(
    day.precipitation || 0
  );

  const windSpeed = Number(
    day.windSpeed || 0
  );

  const weatherCode = Number(
    day.weatherCode || 0
  );

  const snowyCodes = [
    71, 73, 75,
    77, 85, 86
  ];

  const stormCodes = [
    95, 96, 99
  ];

  const rainyCodes = [
    51, 53, 55,
    61, 63, 65,
    66, 67,
    80, 81, 82,
    95, 96, 99
  ];

  const rainy =
    rainProbability >= 40 ||
    precipitation > 0.1 ||
    rainyCodes.includes(weatherCode);

  const snowy =
    snowyCodes.includes(weatherCode);

  const stormy =
    stormCodes.includes(weatherCode);

  const windy = windSpeed >= 30;

  const needsJacket =
    minimum <= 17 ||
    rainy ||
    windy ||
    snowy;

  const needsAccessory =
    minimum <= 10 ||
    snowy;

  let title = "Tenue confortable";

  if (minimum <= 5) {
    title = "Tenue très chaude";
  } else if (minimum <= 12) {
    title = "Tenue chaude";
  } else if (maximum >= 27) {
    title = "Tenue légère";
  } else if (rainy) {
    title = "Tenue protégée de la pluie";
  }

  return {
    title,
    minimum,
    maximum,
    rainy,
    snowy,
    stormy,
    windy,
    needsJacket,
    needsAccessory
  };
}

function generateWeatherOutfit(
  forecastIndex = 0
) {
  const forecast =
    weatherState.data?.forecast || [];

  const day = forecast[forecastIndex];

  if (!day) {
    showToast(
      "Les prévisions météo ne sont pas disponibles."
    );

    return;
  }

  weatherState.selectedForecastIndex =
    forecastIndex;

  const plan =
    getWeatherOutfitPlan(day);
  weatherState.selectedForecastIndex =
  forecastIndex;

  const nextOutfit = {
    ...state.outfit
  };

  const selectedProducts = [];

  /*
    Les pièces verrouillées sont conservées
    uniquement si elles sont propres.
  */
  outfitSlots.forEach(slot => {
    const isLocked =
      state.lockedOutfitSlots[slot.key] === true;

    if (!isLocked) {
      return;
    }

    const lockedProduct =
      getProduct(state.outfit[slot.key]);

    if (
      lockedProduct &&
      !isProductInLaundry(lockedProduct.id)
    ) {
      selectedProducts.push(lockedProduct);
    } else {
      nextOutfit[slot.key] = "";
    }
  });

  const requiredSlots = new Set([
    "top",
    "bottom",
    "shoes"
  ]);

  if (plan.needsJacket) {
    requiredSlots.add("jacket");
  }

  if (plan.needsAccessory) {
    requiredSlots.add("accessory");
  }

  outfitSlots.forEach(slot => {
    const isLocked =
      state.lockedOutfitSlots[slot.key] === true;

    if (isLocked) {
      return;
    }

    if (!requiredSlots.has(slot.key)) {
      nextOutfit[slot.key] = "";
      return;
    }

    const available =
      getAvailableForSlot(slot);

    const withoutDuplicates =
      available.filter(product => {
        return !selectedProducts.some(
          selected =>
            selected.id === product.id
        );
      });

    const candidates =
      withoutDuplicates.length
        ? withoutDuplicates
        : available;

   const chosen =
  chooseSmartProduct(
    candidates,
    selectedProducts,
    plan
  );

    nextOutfit[slot.key] =
      chosen?.id || "";

    if (chosen) {
      selectedProducts.push(chosen);
    }
  });

  state.outfit = {
    ...state.outfit,
    ...nextOutfit
  };

  goTo("outfits");

  window.setTimeout(() => {
    showToast(
      `${plan.title} générée pour ${formatForecastDay(
        day.date,
        forecastIndex
      )}.`
    );
  }, 250);
}

function handleClick(event) {
  const closeAddPiece =
    event.target.closest("[data-close-add-piece]");

  if (closeAddPiece) {
    event.preventDefault();
    closeAddPieceModal();
    return;
  }

  /*
    Important :
    les boutons Modifier et Supprimer possèdent aussi
    data-product-id. On traite donc data-action avant
    data-product-id.
  */
  const actionTarget =
    event.target.closest("[data-action]");

  if (actionTarget) {
    event.preventDefault();

    const action =
      actionTarget.dataset.action;

    if (action === "generate-weather-outfit") {
  const forecastIndex = Number(
    actionTarget.dataset.forecastIndex || 0
  );

  generateWeatherOutfit(forecastIndex);
  return;
}

    if (action === "load-weather") {
  loadWeather();
  return;
}
    
    if (action === "toggle-laundry") {
      
  const productId =
    actionTarget.dataset.productId;

  const product = getProduct(productId);

  if (!product) {
    return;
  }

  const isNowInLaundry =
    toggleLaundryStatus(productId);

  showToast(
    isNowInLaundry
      ? "Pièce placée au sale."
      : "Pièce remise propre."
  );

  renderRoute();

  return;
}
    
    if (action === "toggle-favorite") {
  const productId =
    actionTarget.dataset.productId;

  const product = getProduct(productId);

  if (!product) {
    return;
  }

  const isNowFavorite =
    toggleFavorite(productId);

  showToast(
    isNowFavorite
      ? "Ajouté aux favoris."
      : "Retiré des favoris."
  );

  renderRoute();

  return;
}

    if (action === "edit-product") {
      const productId =
        actionTarget.dataset.productId;

      if (getProduct(productId)) {
        openAddPieceModal(productId);
      }

      return;
    }

    if (action === "delete-product") {
      const productId =
        actionTarget.dataset.productId;

      const product = getProduct(productId);

      if (!product) {
        return;
      }

      const confirmed = window.confirm(
        `Supprimer « ${product.name} » de ton dressing ?`
      );

      if (!confirmed) {
        return;
      }

      const deleted =
        deleteProductById(productId);

      if (deleted) {
        showToast("Pièce supprimée.");
        goTo("closet");
      }

      return;
    }

    if (action === "open-add-piece") {
      openAddPieceModal();
      return;
    }
    
if (action === "toggle-outfit-lock") {
  const slot =
    actionTarget.dataset.outfitSlot;

  if (
    !Object.prototype.hasOwnProperty.call(
      state.lockedOutfitSlots,
      slot
    )
  ) {
    return;
  }

  state.lockedOutfitSlots[slot] =
    !state.lockedOutfitSlots[slot];

  renderOutfitLab();

  showToast(
    state.lockedOutfitSlots[slot]
      ? "Pièce verrouillée."
      : "Pièce déverrouillée."
  );

  return;
}

    if (action === "random-outfit") {
      generateRandomOutfit();
      return;
    }

    if (action === "save-outfit") {
      saveCurrentOutfit();
      return;
    }

    return;
  }

  const routeTarget =
    event.target.closest("[data-route]");

  if (routeTarget) {
    event.preventDefault();
    goTo(routeTarget.dataset.route);
    return;
  }

  const useProductTarget =
    event.target.closest("[data-use-product]");

  if (useProductTarget) {
    event.preventDefault();

    const product =
      getProduct(
        useProductTarget.dataset.useProduct
      );

    if (product) {
      selectProductForOutfit(product);
      goTo("outfits");
    }

    return;
  }

  const productTarget =
    event.target.closest("[data-product-id]");

  if (productTarget) {
    event.preventDefault();

    goTo(
      "product",
      productTarget.dataset.productId
    );

    return;
  }

  const loadLookTarget =
    event.target.closest("[data-load-look]");

  if (loadLookTarget) {
    event.preventDefault();

    loadSavedLook(
      loadLookTarget.dataset.loadLook
    );
  }
}

function handleInput(event) {
  if (event.target.id !== "closetSearch") {
    return;
  }

  const value = event.target.value;

  cancelAnimationFrame(searchFrame);

  searchFrame = requestAnimationFrame(() => {
    state.search = value;
    renderClosetGrid();
  });
}

function handleChange(event) {
  if (event.target.id === "categoryFilter") {
    state.category = event.target.value;
    renderClosetGrid();
  }

  if (event.target.matches("[data-outfit-slot]")) {
    state.outfit[event.target.dataset.outfitSlot] =
      event.target.value;

    renderOutfitStage();
  }
}

function init() {
  if (!app) {
    return;
  }

loadCustomProducts();
  laundryProductIds =
  loadLaundryProductIds();
applyEditedProducts();
applyDeletedProducts();

mountShell();
createAddPieceModal();

document.addEventListener(
  "click",
  handleClick
);

document.addEventListener(
  "submit",
  handleAddPieceSubmit
);

  document.addEventListener(
    "input",
    handleInput
  );

  document.addEventListener(
    "change",
    handleChange
  );

  window.addEventListener("hashchange", () => {
    syncStateFromHash();
    renderRoute();
  });

  syncStateFromHash();
  renderRoute();
}

init();

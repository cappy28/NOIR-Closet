import { products } from "../data/products.js";

const app = document.getElementById("app");
const savedLooksKey = "noir-closet-saved-looks";
const customProductsKey =
  "noir-closet-custom-products";
const favoritesKey =
  "noir-closet-favorite-products";
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
  }
};

const removeBgWorkerUrl =
  "https://noir-closet-remove-bg.lucascapel.workers.dev/";

let savedLooks = loadSavedLooks();
let searchFrame = 0;
let editingProductId = null;
let favoriteProductIds =
  loadFavoriteProductIds();

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
    state.category !== "favorites" &&
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

    return correctCategory && allowed;
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
      current.includeInOutfits !== false;

    if (!valid) {
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
              Générer un look
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

  renderOutfitStage();
}

function renderOutfitControls() {
  return outfitSlots
    .map(slot => {
      const available =
        getAvailableForSlot(slot);

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
          <label for="outfit-${slot.key}">
            ${escapeHTML(slot.label)}
          </label>

          <select
            id="outfit-${slot.key}"
            class="outfit-select"
            data-outfit-slot="${escapeHTML(slot.key)}"
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

function productCompatibility(
  candidate,
  selectedProducts
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

  return (
    scores.reduce(
      (total, score) => total + score,
      0
    ) / scores.length
  );
}

function chooseSmartProduct(
  candidates,
  selectedProducts
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
          selectedProducts
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
  outfitSlots.forEach(slot => {
    const available =
      getAvailableForSlot(slot);

    if (!available.length) return;

    const randomIndex = Math.floor(
      Math.random() * available.length
    );

    state.outfit[slot.key] =
      available[randomIndex].id;
  });

  renderOutfitLab();
  showToast("Nouveau look généré.");
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
          colors: [color]
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

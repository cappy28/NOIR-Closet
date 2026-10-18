import { products } from "../data/products.js";

const STORAGE_KEY = "noir-closet-user-products";

function getSavedProducts() {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );
  } catch {
    return [];
  }
}

function saveProduct(product) {
  const savedProducts = getSavedProducts();

  savedProducts.unshift(product);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(savedProducts)
  );
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = event => {
      const image = new Image();

      image.onload = () => {
        const maxSize = 1400;
        const ratio = Math.min(
          1,
          maxSize / image.width,
          maxSize / image.height
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);

        const context = canvas.getContext("2d");

        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        let imageData = canvas.toDataURL(
          "image/webp",
          0.86
        );

        if (!imageData.startsWith("data:image/webp")) {
          imageData = canvas.toDataURL("image/png");
        }

        resolve(imageData);
      };

      image.onerror = reject;
      image.src = event.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function createInterface() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <button
        class="add-piece-launcher"
        id="openAddPiece"
        type="button"
      >
        <span>＋</span>
        Ajouter
      </button>

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
              class="add-piece-close"
              type="button"
              data-close-add-piece
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          <form id="addPieceForm">
            <label class="add-piece-field">
              <span>Photo du vêtement</span>
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
                placeholder="Ex : Pantalon cargo noir"
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
              <select
                name="category"
                id="pieceCategory"
                required
              ></select>
            </label>

            <div class="add-piece-row">
              <label class="add-piece-field">
                <span>Taille</span>
                <input
                  type="text"
                  name="size"
                  placeholder="Ex : M, 42, unique"
                  required
                />
              </label>

              <label class="add-piece-field">
                <span>Prix</span>
                <input
                  type="number"
                  name="price"
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
              class="add-piece-submit"
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

function fillCategories() {
  const select = document.querySelector("#pieceCategory");

  if (!select) return;

  const categories = [
    ...new Set(
      products
        .map(product => product.category)
        .filter(Boolean)
    )
  ];

  select.innerHTML = "";

  categories.forEach(category => {
    const option = document.createElement("option");

    option.value = category;
    option.textContent = category;

    select.appendChild(option);
  });

  const otherOption = document.createElement("option");

  otherOption.value = "Autre";
  otherOption.textContent = "Autre";

  select.appendChild(otherOption);
}

function openModal() {
  const modal = document.querySelector("#addPieceModal");

  if (!modal) return;

  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeModal() {
  const modal = document.querySelector("#addPieceModal");

  if (!modal) return;

  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

async function handleSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);
  const error = document.querySelector("#addPieceError");

  error.hidden = true;
  error.textContent = "";

  const imageFile = formData.get("image");
  const name = String(formData.get("name")).trim();
  const brand = String(formData.get("brand")).trim();
  const category = String(formData.get("category")).trim();
  const size = String(formData.get("size")).trim();
  const color = String(formData.get("color"));
  const price = Number(formData.get("price"));

  if (!imageFile || !imageFile.type.startsWith("image/")) {
    error.textContent = "Choisis une image valide.";
    error.hidden = false;
    return;
  }

  if (!name || !brand || !category || !size) {
    error.textContent = "Remplis tous les champs.";
    error.hidden = false;
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    error.textContent = "Le prix n'est pas valide.";
    error.hidden = false;
    return;
  }

  try {
    const image = await compressImage(imageFile);

    const product = {
      id: `custom-${Date.now()}`,
      name,
      brand,
      category,
      size,
      price,
      originalPrice: null,
      colors: [color],
      image,
      userCreated: true
    };

    saveProduct(product);

    closeModal();

    window.location.hash = "#closet";
    window.location.reload();
  } catch {
    error.textContent =
      "Impossible de traiter cette image.";
    error.hidden = false;
  }
}

function init() {
  createInterface();
  fillCategories();

  document
    .querySelector("#openAddPiece")
    .addEventListener("click", openModal);

  document.addEventListener("click", event => {
    if (
      event.target.closest("[data-close-add-piece]")
    ) {
      closeModal();
    }
  });

  document
    .querySelector("#addPieceForm")
    .addEventListener("submit", handleSubmit);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
    }
    

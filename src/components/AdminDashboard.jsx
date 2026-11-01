
import { useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  Package,
  AlertCircle,
  Upload,
  ExternalLink,
  Plus,
  X,
  Save,
  Edit3,
  Eye,
  Archive,
  CheckCircle2,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { adminApi } from "../services/adminApi";

const DRIVE_UPLOAD_URL =
  "https://script.google.com/macros/s/AKfycbzsK66IhmREKq5jdrHtfbsO9g8mqiM08MJl1oXTnVOBkWwmEJ959x3vVvJgIQ57TcTa4w/exec";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const EMPTY_FORM = {
  product_code: "",
  title: "",
  slug: "",
  category_id: "",
  short_description: "",
  description: "",
  price: "0",
  currency: "KES",
  cover_image_url: "",
  status: "draft",
  is_featured: false,
};

function makeSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPrice(price, currency) {
  return `${currency} ${Number(price || 0).toLocaleString()}`;
}

export default function AdminDashboard({ user }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const data = await adminApi("products.list");
      setProducts(data.products ?? []);
      setCategories(data.categories ?? []);
    } catch (err) {
      console.error("ENEMIND dashboard loading failed:", err);
      setError(err.message || "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function updateField(name, value) {
    setForm((previous) => {
      const next = { ...previous, [name]: value };

      if (name === "title" && !editingId) {
        next.slug = makeSlug(value);
      }

      return next;
    });
  }

  function clearImageSelection() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);
    setImagePreview("");
  }

  function openNewProduct() {
    clearImageSelection();
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function openEditProduct(product) {
    clearImageSelection();

    setEditingId(product.id);

    setForm({
      product_code: product.product_code || "",
      title: product.title || "",
      slug: product.slug || "",
      category_id: product.category_id || "",
      short_description: product.short_description || "",
      description: product.description || "",
      price: String(product.price ?? 0),
      currency: product.currency || "KES",
      cover_image_url: product.cover_image_url || "",
      status: product.status || "draft",
      is_featured: Boolean(product.is_featured),
    });

    setError("");
    setNotice("");
    setShowForm(true);
  }

  function openDriveUpload(productCode = "") {
    const url = productCode
      ? `${DRIVE_UPLOAD_URL}?productCode=${encodeURIComponent(productCode)}`
      : DRIVE_UPLOAD_URL;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setError("");
    setNotice("");

    clearImageSelection();

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function saveProduct(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const title = form.title.trim();
      const productCode = form.product_code.trim();
      const slug = makeSlug(form.slug || title);

      if (!title || !productCode || !slug) {
        throw new Error(
          "Product name, product code and URL slug are required."
        );
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(productCode)) {
        throw new Error(
          "Product code can contain only letters, numbers, hyphens and underscores."
        );
      }

      if (!form.category_id) {
        throw new Error("Please select a product category.");
      }

      const price = Number(form.price);

      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Enter a valid product price.");
      }

      const payload = {
        ...(editingId ? { id: editingId } : {}),
        product_code: productCode,
        title,
        slug,
        category_id: form.category_id,
        short_description: form.short_description.trim(),
        description: form.description.trim(),
        price,
        currency: form.currency,
        cover_image_url: form.cover_image_url || null,
        status: form.status,
        is_featured: form.is_featured,
      };

      setImageUploading(Boolean(imageFile));
      await adminApi("products.save", { payload, image: imageFile });
      setImageUploading(false);

      setNotice(
        editingId
          ? "Product updated successfully."
          : "Product created successfully."
      );

      clearImageSelection();

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);

      await loadProducts();
    } catch (err) {
      setImageUploading(false);
      console.error("ENEMIND product save failed:", err);

      const message = err.message || "Could not save product.";

      if (
        message.toLowerCase().includes("row-level security") ||
        message.toLowerCase().includes("permission denied")
      ) {
        setError(
          "Supabase blocked this operation. Admin write permissions and Storage upload permissions must be securely configured. No public write access should be enabled."
        );
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function archiveProduct(product) {
    const confirmed = window.confirm(
      `Archive "${product.title}"?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await adminApi("products.archive", {
        payload: { id: product.id },
      });

      setNotice("Product archived successfully.");
      await loadProducts();
    } catch (err) {
      setError(
        err.message || "Could not archive product."
      );
    }
  }

  const filteredProducts = products.filter((product) => {
    const term = search.toLowerCase();

    return (
      product.title?.toLowerCase().includes(term) ||
      product.product_code?.toLowerCase().includes(term) ||
      product.categories?.name?.toLowerCase().includes(term)
    );
  });

  const publishedCount = products.filter(
    (p) => p.status === "published"
  ).length;

  const draftCount = products.filter(
    (p) => p.status === "draft"
  ).length;

  const archivedCount = products.filter(
    (p) => p.status === "archived"
  ).length;

  return (
    <section className="admin-dashboard">
      <style>{`
        .admin-dashboard {
          max-width: 1250px;
          margin: 0 auto;
          padding: 30px 20px 70px;
          color: #17212b;
        }

        .admin-dashboard * {
          box-sizing: border-box;
        }

        .admin-dashboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 30px;
        }

        .admin-eyebrow {
          color: #126b48;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .admin-dashboard-header h1 {
          font-size: clamp(27px, 4vw, 38px);
          margin: 8px 0;
        }

        .admin-dashboard-header p,
        .admin-section-heading p {
          color: #667085;
          margin: 0;
          font-size: 14px;
        }

        .admin-action-button,
        .admin-refresh-button {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 9px;
          border: 0;
          border-radius: 9px;
          padding: 12px 16px;
          background: #126b48;
          color: white;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }

        .admin-action-button:hover {
          background: #0d5438;
        }

        .admin-action-button:disabled,
        .admin-refresh-button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .admin-refresh-button {
          background: #eef2f6;
          color: #263445;
        }

        .admin-refresh-button:hover {
          background: #e0e6ec;
        }

        .admin-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 28px;
        }

        .admin-summary-card {
          padding: 20px;
          border: 1px solid #e7ebef;
          border-radius: 13px;
          background: white;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .admin-summary-card svg {
          color: #126b48;
        }

        .admin-summary-card span {
          color: #667085;
          font-size: 13px;
        }

        .admin-summary-card strong {
          font-size: 27px;
        }

        .admin-products-section {
          padding: 23px;
          background: white;
          border: 1px solid #e7ebef;
          border-radius: 15px;
        }

        .admin-section-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 20px;
        }

        .admin-section-heading h2 {
          margin: 0 0 7px;
          font-size: 21px;
        }

        .admin-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .admin-search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 13px;
          border: 1px solid #dce2e8;
          border-radius: 9px;
          min-width: 240px;
          flex: 1;
          max-width: 470px;
          height: 45px;
          color: #667085;
          margin-bottom: 20px;
        }

        .admin-search-box input {
          border: 0;
          outline: none;
          width: 100%;
          height: 100%;
          background: transparent;
          color: #17212b;
        }

        .admin-drive-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          padding: 18px;
          margin: 0 0 22px;
          background: #f2f8f5;
          border: 1px solid #dceee4;
          border-radius: 12px;
        }

        .admin-drive-section h3 {
          margin: 0 0 6px;
          font-size: 15px;
        }

        .admin-drive-section p {
          margin: 0;
          color: #667085;
          font-size: 13px;
          line-height: 1.5;
        }

        .admin-product-list {
          display: flex;
          flex-direction: column;
        }

        .admin-product-row {
          display: grid;
          grid-template-columns: 65px minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 15px;
          padding: 15px 0;
          border-bottom: 1px solid #edf0f2;
        }

        .admin-product-row:last-child {
          border-bottom: 0;
        }

        .admin-product-image {
          width: 65px;
          height: 65px;
          border-radius: 10px;
          background: #f1f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          color: #87929e;
        }

        .admin-product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .admin-product-details {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .admin-product-details strong {
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .admin-product-details span {
          font-size: 12px;
          color: #667085;
        }

        .admin-status {
          display: inline-block;
          padding: 6px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          text-transform: capitalize;
        }

        .admin-status.published {
          background: #e8f5ee;
          color: #126b48;
        }

        .admin-status.draft {
          background: #fff5df;
          color: #986300;
        }

        .admin-status.archived {
          background: #eef0f2;
          color: #667085;
        }

        .admin-row-actions {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }

        .admin-small-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid #dce2e8;
          background: white;
          color: #344054;
          border-radius: 7px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .admin-small-button:hover {
          background: #f4f6f8;
        }

        .admin-loading,
        .admin-empty {
          color: #667085;
          padding: 25px 0;
          text-align: center;
          font-size: 14px;
        }

        .admin-error,
        .admin-notice {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 13px;
          margin: 15px 0;
          border-radius: 9px;
          font-size: 13px;
          line-height: 1.5;
        }

        .admin-error {
          background: #fff0f0;
          color: #b42318;
          border: 1px solid #f3c1bd;
        }

        .admin-notice {
          background: #e8f5ee;
          color: #126b48;
          border: 1px solid #b7dfc8;
        }

        .admin-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(10, 20, 30, .58);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 25px 12px;
          overflow-y: auto;
        }

        .admin-modal {
          width: 100%;
          max-width: 760px;
          background: white;
          border-radius: 16px;
          padding: 25px;
          box-shadow: 0 20px 70px #0003;
          margin: auto;
        }

        .admin-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 22px;
        }

        .admin-modal-header h2 {
          font-size: 22px;
          margin: 0 0 5px;
        }

        .admin-modal-header p {
          color: #667085;
          font-size: 13px;
          margin: 0;
        }

        .admin-close-button {
          border: 0;
          background: #f1f3f5;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          cursor: pointer;
          display: grid;
          place-items: center;
        }

        .admin-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 17px;
        }

        .admin-form-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .admin-form-field.full {
          grid-column: 1 / -1;
        }

        .admin-form-field label {
          font-size: 12px;
          color: #344054;
          font-weight: 800;
        }

        .admin-form-field input,
        .admin-form-field select,
        .admin-form-field textarea {
          width: 100%;
          border: 1px solid #d5dce3;
          border-radius: 8px;
          padding: 12px;
          font: inherit;
          font-size: 13px;
          background: white;
          color: #17212b;
          outline: none;
        }

        .admin-form-field input:focus,
        .admin-form-field select:focus,
        .admin-form-field textarea:focus {
          border-color: #126b48;
          box-shadow: 0 0 0 2px #126b481a;
        }

        .admin-form-field textarea {
          min-height: 95px;
          resize: vertical;
        }

        .admin-checkbox-field {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #344054;
          padding: 8px 0;
        }

        .admin-checkbox-field input {
          width: 17px;
          height: 17px;
          accent-color: #126b48;
        }

        .admin-form-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 23px;
          padding-top: 18px;
          border-top: 1px solid #edf0f2;
        }

        .admin-cover-preview {
          width: 180px;
          height: 130px;
          object-fit: cover;
          border-radius: 10px;
          margin-top: 10px;
          border: 1px solid #e7ebef;
        }

        .admin-image-help {
          color: #667085;
          font-size: 12px;
          line-height: 1.5;
        }

        .admin-remove-image {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          background: #fff0f0;
          border: 0;
          color: #b42318;
          border-radius: 7px;
          padding: 8px 10px;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
        }

        @media(max-width: 800px) {
          .admin-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .admin-product-row {
            grid-template-columns: 55px minmax(0, 1fr);
          }

          .admin-product-image {
            width: 55px;
            height: 55px;
          }

          .admin-product-row > .admin-status,
          .admin-product-row > .admin-row-actions {
            grid-column: 2;
            justify-self: start;
          }
        }

        @media(max-width: 520px) {
          .admin-dashboard {
            padding: 20px 12px 50px;
          }

          .admin-products-section {
            padding: 15px;
          }

          .admin-form-grid {
            grid-template-columns: 1fr;
          }

          .admin-form-field.full {
            grid-column: auto;
          }

          .admin-modal {
            padding: 19px;
          }

          .admin-summary-card {
            padding: 15px;
          }

          .admin-toolbar,
          .admin-toolbar button {
            width: 100%;
          }

          .admin-search-box {
            max-width: none;
          }
        }
      `}</style>

      <div className="admin-dashboard-header">
        <div>
          <span className="admin-eyebrow">ENEMIND CONTROL PANEL</span>
          <h1>Admin Dashboard</h1>
          <p>Welcome, {user?.displayName || user?.email}.</p>
        </div>

        <div className="admin-toolbar">
          <button
            className="admin-refresh-button"
            onClick={loadProducts}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            className="admin-action-button"
            onClick={openNewProduct}
          >
            <Plus size={17} />
            Add product
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="admin-notice">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      <div className="admin-summary-grid">
        <div className="admin-summary-card">
          <Package size={22} />
          <span>Total products</span>
          <strong>{products.length}</strong>
        </div>

        <div className="admin-summary-card">
          <Eye size={22} />
          <span>Published</span>
          <strong>{publishedCount}</strong>
        </div>

        <div className="admin-summary-card">
          <Edit3 size={22} />
          <span>Drafts</span>
          <strong>{draftCount}</strong>
        </div>

        <div className="admin-summary-card">
          <Archive size={22} />
          <span>Archived</span>
          <strong>{archivedCount}</strong>
        </div>
      </div>

      <div className="admin-products-section">
        <div className="admin-section-heading">
          <div>
            <h2>Product Manager</h2>
            <p>Create, edit and manage your digital product catalogue.</p>
          </div>
        </div>

        <div className="admin-drive-section">
          <div>
            <h3>Google Drive Product Files</h3>
            <p>
              Store actual downloadable files privately in Google Drive.
            </p>
          </div>

          <button
            className="admin-action-button"
            onClick={() => openDriveUpload()}
          >
            <Upload size={17} />
            Open file storage
            <ExternalLink size={14} />
          </button>
        </div>

        <div className="admin-search-box">
          <Search size={19} />
          <input
            type="search"
            placeholder="Search product name, code or category..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <p className="admin-loading">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="admin-empty">
            {products.length === 0
              ? "No products found. Add your first product."
              : "No products match your search."}
          </p>
        ) : (
          <div className="admin-product-list">
            {filteredProducts.map((product) => (
              <article className="admin-product-row" key={product.id}>
                <div className="admin-product-image">
                  {product.cover_image_url ? (
                    <img
                      src={product.cover_image_url}
                      alt={product.title}
                    />
                  ) : (
                    <ImageIcon size={25} />
                  )}
                </div>

                <div className="admin-product-details">
                  <strong>{product.title}</strong>
                  <span>
                    {product.product_code} ·{" "}
                    {product.categories?.name || "Uncategorised"}
                  </span>
                  <span>
                    {formatPrice(product.price, product.currency)}
                  </span>
                </div>

                <span className={`admin-status ${product.status}`}>
                  {product.status}
                </span>

                <div className="admin-row-actions">
                  <button
                    className="admin-small-button"
                    onClick={() => openEditProduct(product)}
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>

                  <button
                    className="admin-small-button"
                    onClick={() => openDriveUpload(product.product_code)}
                  >
                    <Upload size={14} />
                    Upload file
                  </button>

                  {product.status !== "archived" && (
                    <button
                      className="admin-small-button"
                      onClick={() => archiveProduct(product)}
                    >
                      <Archive size={14} />
                      Archive
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setShowForm(false);
              clearImageSelection();
            }
          }}
        >
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <h2>
                  {editingId ? "Edit product" : "Add new product"}
                </h2>
                <p>
                  Add product information and upload its cover image.
                </p>
              </div>

              <button
                type="button"
                className="admin-close-button"
                onClick={() => {
                  setShowForm(false);
                  clearImageSelection();
                }}
                disabled={saving}
                aria-label="Close product form"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveProduct}>
              <div className="admin-form-grid">
                <div className="admin-form-field">
                  <label htmlFor="product_code">Product code *</label>
                  <input
                    id="product_code"
                    value={form.product_code}
                    onChange={(e) =>
                      updateField("product_code", e.target.value)
                    }
                    placeholder="Example: ENE-001"
                    required
                  />
                </div>

                <div className="admin-form-field">
                  <label htmlFor="title">Product name *</label>
                  <input
                    id="title"
                    value={form.title}
                    onChange={(e) =>
                      updateField("title", e.target.value)
                    }
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div className="admin-form-field full">
                  <label htmlFor="slug">Product URL slug *</label>
                  <input
                    id="slug"
                    value={form.slug}
                    onChange={(e) =>
                      updateField("slug", e.target.value)
                    }
                    placeholder="example-product"
                    required
                  />
                </div>

                <div className="admin-form-field">
                  <label htmlFor="category_id">Category *</label>
                  <select
                    id="category_id"
                    value={form.category_id}
                    onChange={(e) =>
                      updateField("category_id", e.target.value)
                    }
                    required
                  >
                    <option value="">Select category</option>

                    {categories
                      .filter((category) => category.is_active)
                      .map((category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="admin-form-field">
                  <label htmlFor="status">Publication status</label>
                  <select
                    id="status"
                    value={form.status}
                    onChange={(e) =>
                      updateField("status", e.target.value)
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="admin-form-field">
                  <label htmlFor="price">Price *</label>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      updateField("price", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="admin-form-field">
                  <label htmlFor="currency">Currency</label>
                  <select
                    id="currency"
                    value={form.currency}
                    onChange={(e) =>
                      updateField("currency", e.target.value)
                    }
                  >
                    <option value="KES">KES - Kenyan Shilling</option>
                    <option value="USD">USD - US Dollar</option>
                  </select>
                </div>

                <div className="admin-form-field full">
                  <label htmlFor="short_description">
                    Short description
                  </label>
                  <textarea
                    id="short_description"
                    value={form.short_description}
                    onChange={(e) =>
                      updateField("short_description", e.target.value)
                    }
                    placeholder="Short summary shown in product listings..."
                  />
                </div>

                <div className="admin-form-field full">
                  <label htmlFor="description">
                    Full product description
                  </label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) =>
                      updateField("description", e.target.value)
                    }
                    placeholder="Explain what the customer receives and what is included..."
                  />
                </div>

                <div className="admin-form-field full">
                  <label htmlFor="cover_image_file">
                    Product cover image
                  </label>

                  <input
                    id="cover_image_file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                  />

                  <span className="admin-image-help">
                    JPG, PNG or WebP. Maximum image size: 5 MB.
                  </span>

                  {(imagePreview || form.cover_image_url) && (
                    <>
                      <img
                        className="admin-cover-preview"
                        src={imagePreview || form.cover_image_url}
                        alt="Product cover preview"
                      />

                      <button
                        type="button"
                        className="admin-remove-image"
                        onClick={() => {
                          clearImageSelection();
                          updateField("cover_image_url", "");
                        }}
                      >
                        <Trash2 size={14} />
                        Remove cover image
                      </button>
                    </>
                  )}
                </div>

                <div className="admin-form-field full">
                  <label className="admin-checkbox-field">
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={(e) =>
                        updateField("is_featured", e.target.checked)
                      }
                    />
                    Feature this product on the storefront
                  </label>
                </div>
              </div>

              <div className="admin-form-footer">
                <button
                  type="button"
                  className="admin-refresh-button"
                  onClick={() => {
                    setShowForm(false);
                    clearImageSelection();
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-action-button"
                  disabled={saving || imageUploading}
                >
                  <Save size={17} />

                  {imageUploading
                    ? "Uploading image..."
                    : saving
                      ? "Saving..."
                      : editingId
                        ? "Update product"
                        : "Save product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

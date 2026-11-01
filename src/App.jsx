
import { useEffect, useState } from "react";

import {
  BookOpen,
  BriefcaseBusiness,
  GraduationCap,
  Laptop,
  Wallet,
  Heart,
  Dumbbell,
  Plane,
  Gamepad2,
  Search,
  Menu,
  X,
  ArrowRight,
  Sparkles,
  Users,
  Library,
  ShoppingBag,
  Share2,
  Copy,
  MessageCircle,
  ChevronLeft,
  Image as ImageIcon,
} from "lucide-react";

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { auth, googleProvider, authReady } from "./firebase";
import { getProducts, getCategories } from "./services/productService";
import AdminDashboard from "./components/AdminDashboard";

import "./App.css";

const WHATSAPP_NUMBER = "254180752220";
const ADMIN_EMAIL = "joicebarasa7@gmail.com";

const categoryDesign = [
  { name: "Social Media & Digital Culture", icon: Laptop, description: "Social media, content creation and digital trends" },
  { name: "Jobs & Careers", icon: BriefcaseBusiness, description: "Career guidance, CVs and job opportunities" },
  { name: "Kids Learning & Education", icon: GraduationCap, description: "Learning materials and activities for children" },
  { name: "Online Work & Digital Income", icon: Wallet, description: "Online work, digital skills and earning opportunities" },
  { name: "Technology & AI", icon: Laptop, description: "Technology, artificial intelligence and software" },
  { name: "Business & Entrepreneurship", icon: BriefcaseBusiness, description: "Business ideas, planning and entrepreneurship" },
  { name: "Money & Personal Finance", icon: Wallet, description: "Saving, budgeting and financial management" },
  { name: "Life Skills & Personal Development", icon: Sparkles, description: "Personal growth, confidence and practical life skills" },
  { name: "Travel, Adventure & Tourism", icon: Plane, description: "Travel guides, destinations and adventures" },
  { name: "Gaming & eFootball", icon: Gamepad2, description: "Gaming guides, eFootball and gaming resources" },
  { name: "Professional & Course Resources", icon: BookOpen, description: "Professional learning and course materials" },
  { name: "Project Ideas & Project Resources", icon: Library, description: "Project inspiration, guides and practical resources" },
  { name: "Beauty & Personal Care", icon: Heart, description: "Beauty, grooming and personal care guidance" },
  { name: "Sports, Football & Fitness", icon: Dumbbell, description: "Sports training, football and fitness plans" },
  { name: "Teachers & Teaching Resources", icon: GraduationCap, description: "Teaching materials, lesson plans and worksheets" },
  { name: "Health, Wellness & Healthy Living", icon: Heart, description: "Healthy habits, wellness and everyday wellbeing" },
  { name: "Campus Life & First-Year Survival", icon: GraduationCap, description: "Campus guides, student life and opportunities" },
  { name: "Workers, Family & Better Living", icon: Users, description: "Work-life balance, family and everyday living" },
];

function App() {
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adminView, setAdminView] = useState(false);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const isAdmin =
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // Firebase authentication listener
  useEffect(() => {
    let unsubscribe = () => {};
    let active = true;

    async function startAuthListener() {
      try {
        await authReady;

        if (!active) return;

        console.log(
          "ENEMIND Firebase project:",
          auth.app.options.projectId
        );

        unsubscribe = onAuthStateChanged(
          auth,
          (currentUser) => {
            console.log(
              "ENEMIND authentication state:",
              currentUser
            );

            console.log(
              "ENEMIND user email:",
              currentUser?.email || "Not signed in"
            );

            setUser(currentUser);
            setAdminView(false);
            setAuthLoading(false);
          },
          (authError) => {
            console.error(
              "ENEMIND authentication listener error:",
              authError
            );

            setAuthError(
              authError.message || "Authentication error."
            );

            setAuthLoading(false);
          }
        );
      } catch (err) {
        console.error("ENEMIND Firebase initialization error:", err);
        setAuthError(err.message || "Firebase could not initialize.");
        setAuthLoading(false);
      }
    }

    startAuthListener();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Google popup sign-in
  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      setAuthError("");

      await authReady;

      console.log("ENEMIND starting Google popup sign-in...");
      console.log(
        "ENEMIND Firebase project:",
        auth.app.options.projectId
      );

      const result = await signInWithPopup(auth, googleProvider);

      console.log(
        "ENEMIND Google sign-in successful:",
        result.user.email
      );

      setUser(result.user);
      setAuthError("");
    } catch (err) {
      console.error("ENEMIND Google sign-in error:", err);

      if (err.code === "auth/popup-blocked") {
        setAuthError(
          "Your browser blocked the Google sign-in popup. Allow popups for this website and try again."
        );
      } else if (err.code === "auth/popup-closed-by-user") {
        setAuthError(
          "The Google sign-in window was closed before sign-in completed."
        );
      } else if (err.code === "auth/unauthorized-domain") {
        setAuthError(
          "This website domain is not authorized in Firebase Authentication."
        );
      } else if (err.code === "auth/operation-not-allowed") {
        setAuthError(
          "Google sign-in is not enabled in Firebase Authentication."
        );
      } else if (err.code === "auth/network-request-failed") {
        setAuthError(
          "A network error interrupted sign-in. Check your internet connection and try again."
        );
      } else {
        setAuthError(
          err.message || "Google sign-in failed. Please try again."
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      setAuthError("");
      await signOut(auth);
      setUser(null);
      setAdminView(false);
      console.log("ENEMIND signed out successfully.");
    } catch (err) {
      console.error("ENEMIND sign-out error:", err);
      setAuthError(err.message || "Unable to sign out.");
    }
  };

  // Load public categories and published products
  useEffect(() => {
    let active = true;

    async function loadStore() {
      try {
        setLoading(true);
        setError("");

        const [categoryData, productData] = await Promise.all([
          getCategories(),
          getProducts(),
        ]);

        if (!active) return;

        setCategories(
          categoryData.map((item) => {
            const design = categoryDesign.find(
              (category) => category.name === item.name
            );

            return {
              ...item,
              icon: design?.icon || BookOpen,
              description:
                item.description || design?.description || "",
            };
          })
        );

        setProducts(
          productData.map((item) => ({
            id: item.product_code,
            databaseId: item.id,
            title: item.title,
            category: item.categories?.name || "General",
            description:
              item.short_description || item.description || "",
            fullDescription:
              item.description || item.short_description || "",
            price: Number(item.price),
            currency: item.currency || "KES",
            image: item.cover_image_url || "",
            badge: item.categories?.name || "ENEMIND resource",
          }))
        );

        console.log("ENEMIND categories loaded:", categoryData.length);
        console.log("ENEMIND products loaded:", productData.length);
      } catch (err) {
        console.error("ENEMIND store loading error:", err);

        if (active) {
          setError(
            "We couldn't load the store. Please check your connection and try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadStore();

    return () => {
      active = false;
    };
  }, []);

  const filteredCategories = categories.filter((category) =>
    `${category.name} ${category.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "All" ||
      product.category === selectedCategory;

    const matchesSearch =
      `${product.title} ${product.description} ${product.category}`
        .toLowerCase()
        .includes(productSearch.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const productUrl = (product) => {
    const url = new URL(window.location.href);
    url.searchParams.set("product", product.id);
    return url.toString();
  };

  const orderProduct = (product) => {
    const message = `Hello ENEMIND. I would like to order:

Product: ${product.title}
Product ID: ${product.id}
Price: ${product.currency} ${product.price}
Product link: ${productUrl(product)}`;

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareProduct = async (product) => {
    const data = {
      title: product.title,
      text: `${product.description}\nPrice: ${product.currency} ${product.price}`,
      url: productUrl(product),
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(
          `${data.text}\n${data.url}`
        );
        alert("Product details copied.");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Sharing failed:", err);
      }
    }
  };

  const shareImage = async (product) => {
    if (!product.image) {
      alert("This product does not have an image yet.");
      return;
    }

    try {
      const response = await fetch(product.image);

      if (!response.ok) {
        throw new Error("Image could not be loaded.");
      }

      const blob = await response.blob();

      const file = new File(
        [blob],
        `${product.id}-cover.jpg`,
        { type: blob.type || "image/jpeg" }
      );

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: product.title,
        });
      } else {
        window.open(
          product.image,
          "_blank",
          "noopener,noreferrer"
        );
      }
    } catch (err) {
      console.error("Image sharing error:", err);

      window.open(
        product.image,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  const copyProductLink = async (product) => {
    try {
      await navigator.clipboard.writeText(productUrl(product));
      alert("Product link copied.");
    } catch {
      alert("Unable to copy automatically. Please copy the page address.");
    }
  };

  return (
    <div className="app">
      <header className="navbar">
        <a
          className="brand"
          href="#"
          onClick={() => setAdminView(false)}
        >
          <span className="brand-icon">
            <GraduationCap size={25} />
          </span>
          <span>ENEMIND</span>
        </a>

        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          {[
            ["Discover", "#discover"],
            ["Categories", "#categories"],
            ["Digital Store", "#store"],
            ["Resource Finder", "#resources"],
            ["About", "#about"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              onClick={() => {
                setMenuOpen(false);
                setAdminView(false);
              }}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="account-area">
          {authLoading ? (
            <span className="account-loading">Checking account...</span>
          ) : user ? (
            <>
              <div className="account-user">
                {user.photoURL ? (
                  <img
                    className="account-avatar"
                    src={user.photoURL}
                    alt={user.displayName || "Account"}
                  />
                ) : (
                  <span className="account-avatar-placeholder">
                    {(user.displayName || user.email || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}

                <span className="account-name">
                  {user.displayName || user.email}
                </span>
              </div>

              {isAdmin && (
                <>
                  <span className="admin-label">Admin</span>

                  <button
                    className="account-button"
                    onClick={() => {
                      setAdminView(!adminView);
                      setSelectedProduct(null);
                      window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                    }}
                  >
                    {adminView ? "View Store" : "Admin Dashboard"}
                  </button>
                </>
              )}

              <button
                className="account-button"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              className="google-signin-button"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
            >
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.04 46.98 31.85 46.98 24.55Z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.97-6.19Z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.94-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.9 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48Z"
                />
              </svg>
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      {authError && (
        <div className="auth-error" role="alert">
          {authError}
          <button
            onClick={() => setAuthError("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {isAdmin && adminView ? (
        <AdminDashboard user={user} />
      ) : (
        <main>
          <section className="hero" id="discover">
            <div className="hero-content">
              <span className="eyebrow">
                <Sparkles size={15} />
                KNOWLEDGE FOR A BETTER FUTURE
              </span>

              <h1>
                Learn. Earn.
                <br />
                <span>Live Better.</span>
              </h1>

              <p>
                Discover practical knowledge, useful resources, digital
                opportunities and tools to help you move forward in life.
              </p>

              <div className="hero-actions">
                <a href="#categories" className="primary-button">
                  Explore ENEMIND <ArrowRight size={18} />
                </a>

                <a href="#store" className="secondary-button">
                  Visit Digital Store
                </a>
              </div>

              <div className="hero-note">
                <Users size={18} />
                Resources for students, workers, families and entrepreneurs.
              </div>
            </div>

            <div className="hero-visual">
              <div className="visual-card main-visual-card">
                <div className="visual-symbol">
                  <BookOpen size={48} />
                </div>
                <span>YOUR KNOWLEDGE HUB</span>
                <h3>
                  Discover what
                  <br />
                  you can become.
                </h3>
                <div className="visual-bottom">
                  <span>Learn something new</span>
                  <ArrowRight size={18} />
                </div>
              </div>

              <div className="floating-card floating-one">
                <GraduationCap size={22} />
                <span>Learn</span>
              </div>

              <div className="floating-card floating-two">
                <Wallet size={22} />
                <span>Grow</span>
              </div>
            </div>
          </section>

          <section className="intro-strip">
            <div>
              <strong>One platform.</strong> Many ways to grow.
            </div>
            <span>
              Knowledge • Skills • Opportunities • Better Living
            </span>
          </section>

          <section className="categories-section" id="categories">
            <div className="section-heading">
              <span className="eyebrow">EXPLORE ENEMIND</span>
              <h2>What do you want to discover?</h2>
              <p>
                Find information and practical resources for your next step.
              </p>
            </div>

            <div className="search-box">
              <Search size={20} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search jobs, learning, business, technology..."
              />
            </div>

            {loading ? (
              <p className="empty-state">Loading ENEMIND categories...</p>
            ) : (
              <div className="category-grid">
                {filteredCategories.map((category) => {
                  const Icon = category.icon;

                  return (
                    <button
                      className="category-card"
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.name);
                        document
                          .getElementById("store")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <span className="category-icon">
                        <Icon size={23} />
                      </span>
                      <h3>{category.name}</h3>
                      <p>{category.description}</p>
                      <span className="card-arrow">
                        <ArrowRight size={18} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {!loading && filteredCategories.length === 0 && (
              <p className="empty-state">No categories found.</p>
            )}
          </section>

          <section className="store-section" id="store">
            <div className="section-heading">
              <span className="eyebrow">ENEMIND DIGITAL STORE</span>
              <h2>Practical resources. Ready to use.</h2>
              <p>
                Explore guides, templates and digital resources to help you
                take action.
              </p>
            </div>

            <div className="store-toolbar">
              <div className="store-search">
                <Search size={18} />
                <input
                  value={productSearch}
                  onChange={(event) =>
                    setProductSearch(event.target.value)
                  }
                  placeholder="Search digital products..."
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(event) =>
                  setSelectedCategory(event.target.value)
                }
              >
                <option value="All">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct ? (
              <div className="product-detail">
                <button
                  className="back-button"
                  onClick={() => setSelectedProduct(null)}
                >
                  <ChevronLeft size={18} />
                  Back to store
                </button>

                <div className="product-detail-grid">
                  {selectedProduct.image && (
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.title}
                    />
                  )}

                  <div>
                    <span className="eyebrow">
                      {selectedProduct.badge}
                    </span>
                    <h2>{selectedProduct.title}</h2>
                    <p>{selectedProduct.fullDescription}</p>
                    <p className="product-category">
                      {selectedProduct.category}
                    </p>
                    <div className="product-price">
                      {selectedProduct.currency} {selectedProduct.price}
                    </div>

                    <button
                      className="primary-button"
                      onClick={() => orderProduct(selectedProduct)}
                    >
                      <MessageCircle size={18} />
                      Order on WhatsApp
                    </button>

                    <div className="share-actions">
                      <button onClick={() => shareProduct(selectedProduct)}>
                        <Share2 size={17} />
                        Share product
                      </button>
                      <button onClick={() => shareImage(selectedProduct)}>
                        <ImageIcon size={17} />
                        Share image
                      </button>
                      <button
                        onClick={() => copyProductLink(selectedProduct)}
                      >
                        <Copy size={17} />
                        Copy link
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {loading && (
                  <p className="empty-state">Loading ENEMIND products...</p>
                )}

                {error && (
                  <div className="empty-state">
                    <p>{error}</p>
                    <button
                      className="secondary-button"
                      onClick={() => window.location.reload()}
                    >
                      Try again
                    </button>
                  </div>
                )}

                {!loading && !error && (
                  <div className="product-grid">
                    {filteredProducts.map((product) => (
                      <article
                        className="product-card"
                        key={product.databaseId}
                      >
                        <button
                          className="product-image-button"
                          onClick={() => setSelectedProduct(product)}
                          aria-label={`View ${product.title}`}
                        >
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.title}
                            />
                          ) : (
                            <div className="product-image-placeholder">
                              <ShoppingBag size={36} />
                            </div>
                          )}
                        </button>

                        <div className="product-info">
                          <span className="product-category">
                            {product.category}
                          </span>
                          <h3>{product.title}</h3>
                          <p>{product.description}</p>

                          <div className="product-card-bottom">
                            <strong>
                              {product.currency} {product.price}
                            </strong>
                            <button
                              onClick={() => setSelectedProduct(product)}
                            >
                              View resource <ArrowRight size={16} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}

                    {filteredProducts.length === 0 && (
                      <p className="empty-state">
                        No published products are available in this category.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="resource-section" id="resources">
            <div className="resource-icon">
              <Library size={32} />
            </div>
            <div>
              <span className="eyebrow">RESOURCE FINDER</span>
              <h2>Find the right tools for your journey.</h2>
              <p>
                Discover useful websites, applications, courses, books,
                calculators and learning resources in one place.
              </p>
            </div>
            <a href="#categories" className="primary-button">
              Explore resources <ArrowRight size={18} />
            </a>
          </section>

          <section className="about-section" id="about">
            <span className="eyebrow">WHY ENEMIND?</span>
            <h2>Knowledge should lead to action.</h2>
            <p>
              ENEMIND brings useful information and practical resources
              together to help people learn skills, find opportunities, solve
              everyday problems and make better decisions.
            </p>
          </section>
        </main>
      )}

      <footer className="footer">
        <a className="brand footer-brand" href="#">
          <span className="brand-icon">
            <GraduationCap size={22} />
          </span>
          ENEMIND
        </a>
        <p>
          Knowledge and practical resources for a better future.
        </p>
        <span>© {new Date().getFullYear()} ENEMIND</span>
      </footer>
    </div>
  );
}

export default App;

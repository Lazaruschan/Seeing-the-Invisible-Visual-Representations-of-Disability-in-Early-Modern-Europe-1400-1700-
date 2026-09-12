/* ============================================================
   WebDatabase 12SEP2026 — hash SPA
   Flat collection · homepage A/B toggle · dark theme
   ============================================================ */

const { artworks, project } = DATABASE;
const LAYOUT_KEY = "hkbu-webdb-home-layout";

let homeLayout = localStorage.getItem(LAYOUT_KEY) === "carousel" ? "carousel" : "grid";
let carouselIndex = 0;

function encodePath(p) {
  if (!p) return "";
  return p
    .split("/")
    .map((seg, i) => (i === 0 ? seg : encodeURIComponent(seg).replace(/%2F/gi, "/")))
    .join("/");
}

function handleImageLoadError(img) {
  img.style.display = "none";
}

function renderArtworkImage(path, alt, className, placeholderHtml) {
  if (!path) return placeholderHtml;
  return `<img src="${encodePath(path)}" alt="${escapeHtml(alt)}" class="${className}" loading="lazy" onerror="handleImageLoadError(this)">`;
}

function getArtworkById(id) {
  return artworks.find((a) => a.id === Number(id));
}

function sortedArtworks() {
  return [...artworks].sort((a, b) => a.id - b.id);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderParagraphs(text, className) {
  const source = (text || "").trim();
  if (!source) return "";
  return source
    .split(/\n{2,}/)
    .map((paragraph) => `<p class="${className}">${escapeHtml(paragraph)}</p>`)
    .join("");
}

function navigate(hash) {
  window.location.hash = hash;
}

function setHomeLayout(layout) {
  homeLayout = layout === "carousel" ? "carousel" : "grid";
  localStorage.setItem(LAYOUT_KEY, homeLayout);
  if (!window.location.hash || window.location.hash === "#" || window.location.hash === "#/") {
    route();
  }
}

window.setHomeLayout = setHomeLayout;
window.handleImageLoadError = handleImageLoadError;
window.carouselPrev = function carouselPrev() {
  const list = sortedArtworks();
  carouselIndex = (carouselIndex - 1 + list.length) % list.length;
  updateCarouselDom();
};
window.carouselNext = function carouselNext() {
  const list = sortedArtworks();
  carouselIndex = (carouselIndex + 1) % list.length;
  updateCarouselDom();
};
window.carouselGo = function carouselGo(i) {
  carouselIndex = i;
  updateCarouselDom();
};

function updateCarouselDom() {
  const track = document.getElementById("carouselTrack");
  const counter = document.getElementById("carouselCounter");
  const dots = document.querySelectorAll(".carousel-dot");
  const slides = document.querySelectorAll(".carousel-slide");
  if (!track) return;
  const list = sortedArtworks();
  track.style.transform = `translateX(-${carouselIndex * 100}%)`;
  if (counter) counter.textContent = `${carouselIndex + 1} / ${list.length}`;
  dots.forEach((dot, i) => {
    dot.classList.toggle("is-active", i === carouselIndex);
  });
  slides.forEach((slide, i) => {
    slide.classList.toggle("is-active", i === carouselIndex);
  });
}

function renderReviewBar() {
  return `
    <div class="review-bar" role="region" aria-label="Homepage layout review">
      <strong>Homepage review</strong>
      <span>Compare both options for Angelo</span>
      <div class="layout-toggle" role="group" aria-label="Homepage layout">
        <button type="button" class="${homeLayout === "carousel" ? "is-active" : ""}" onclick="setHomeLayout('carousel')">A · Carousel</button>
        <button type="button" class="${homeLayout === "grid" ? "is-active" : ""}" onclick="setHomeLayout('grid')">B · All 20</button>
      </div>
    </div>
  `;
}

function renderArtworkCard(art, index = 0) {
  const imageContent = renderArtworkImage(
    art.image,
    art.title,
    "artwork-thumb-img",
    `<div class="artwork-thumb-placeholder">◆</div>`
  );

  return `
    <a class="artwork-card" href="#artwork/${art.id}" data-nav="#artwork/${art.id}" style="--stagger: ${index % 12}" data-reveal>
      <div class="artwork-thumb">${imageContent}</div>
      <div class="artwork-card-body">
        <p class="artwork-card-title">${escapeHtml(art.title)}</p>
        <p class="artwork-card-artist">${escapeHtml(art.artist)}</p>
        <p class="artwork-card-year">${escapeHtml(art.year)}</p>
        <p class="artwork-card-location">${escapeHtml(art.location)}</p>
      </div>
    </a>
  `;
}

function renderCarousel() {
  const list = sortedArtworks();
  if (carouselIndex >= list.length) carouselIndex = 0;

  const slides = list
    .map((art, i) => {
      const img = renderArtworkImage(
        art.image,
        art.title,
        "",
        `<div class="artwork-thumb-placeholder">◆</div>`
      );
      return `
        <a class="carousel-slide ${i === carouselIndex ? "is-active" : ""}" href="#artwork/${art.id}" data-nav="#artwork/${art.id}">
          <div class="carousel-slide-img">${img}</div>
          <div class="carousel-slide-body">
            <p class="carousel-slide-num">Work ${String(art.id).padStart(2, "0")} of ${list.length}</p>
            <h3 class="carousel-slide-title">${escapeHtml(art.title)}</h3>
            <p class="carousel-slide-meta">${escapeHtml(art.artist)} · ${escapeHtml(art.year)}</p>
            <p class="carousel-slide-summary">${escapeHtml(art.shortSummary || "")}</p>
          </div>
        </a>
      `;
    })
    .join("");

  const dots = list
    .map(
      (_, i) =>
        `<button type="button" class="carousel-dot ${i === carouselIndex ? "is-active" : ""}" aria-label="Go to work ${i + 1}" onclick="event.preventDefault(); carouselGo(${i})"></button>`
    )
    .join("");

  return `
    <div class="carousel" id="homeCarousel">
      <div class="carousel-track-wrap">
        <div class="carousel-track" id="carouselTrack" style="transform: translateX(-${carouselIndex * 100}%)">
          ${slides}
        </div>
      </div>
      <div class="carousel-controls">
        <button type="button" class="carousel-btn" aria-label="Previous" onclick="carouselPrev()">‹</button>
        <span class="carousel-counter" id="carouselCounter">${carouselIndex + 1} / ${list.length}</span>
        <button type="button" class="carousel-btn" aria-label="Next" onclick="carouselNext()">›</button>
      </div>
      <div class="carousel-dots" aria-hidden="true">${dots}</div>
    </div>
  `;
}

function renderHomeWorksSection() {
  if (homeLayout === "carousel") {
    return `
      <section class="section" id="home-works">
        <div class="section-inner">
          <div class="section-header">
            <p class="section-eyebrow">Option A</p>
            <h2 class="section-title">Image carousel</h2>
            <p class="section-subtitle">Flip through thumbnails and open any work for the full catalogue entry.</p>
          </div>
          ${renderCarousel()}
        </div>
      </section>
    `;
  }

  return `
    <section class="section" id="home-works">
      <div class="section-inner">
        <div class="section-header">
          <p class="section-eyebrow">Option B</p>
          <h2 class="section-title">All twenty works</h2>
          <p class="section-subtitle">The full collection on the homepage — no thematic groups on the website.</p>
        </div>
        <div class="artwork-grid">
          ${sortedArtworks().map((art, i) => renderArtworkCard(art, i)).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderHome() {
  const featured = [1, 8, 11, 16, 17, 20]
    .map((id) => getArtworkById(id))
    .filter(Boolean);

  return `
    <div class="page-fade-in">
      ${renderReviewBar()}
      <section class="hero">
        <p class="hero-eyebrow">${escapeHtml(project.institution)} · ${escapeHtml(project.year)}</p>
        <h1 class="hero-title">${escapeHtml(project.title)}</h1>
        <p class="hero-subtitle">${escapeHtml(project.subtitle)}</p>
        <div class="hero-statement">
          ${renderParagraphs(project.homepageStatement, "")}
          <p><span class="placeholder-note">Placeholder copy — replace when Angelo delivers final statement</span></p>
        </div>
        <div class="hero-actions">
          <a class="btn-primary" href="#collection" data-nav="#collection">Browse Collection ›</a>
          <a class="btn-secondary" href="#vr-gallery" data-nav="#vr-gallery">Enter VR Gallery</a>
        </div>
      </section>

      <hr class="section-divider">
      ${renderHomeWorksSection()}
      <hr class="section-divider">

      <section class="section section-alt">
        <div class="section-inner">
          <div class="section-header">
            <p class="section-eyebrow">Featured</p>
            <h2 class="section-title">Selected highlights</h2>
            <p class="section-subtitle">A few works from across the collection.</p>
          </div>
          <div class="artwork-grid">
            ${featured.map((art, i) => renderArtworkCard(art, i)).join("")}
          </div>
        </div>
      </section>

      <section class="vr-banner" id="home-vr" data-reveal>
        <div class="vr-banner-inner">
          <p class="vr-banner-label">Immersive Experience</p>
          <h2 class="vr-banner-title">Enter the Virtual Gallery</h2>
          <p class="vr-banner-desc">Experience the collection in a browser-based VR teaching environment. Walk the corridors and open each accompanying essay from inside VR.</p>
          <a class="btn-white" href="#vr-gallery" data-nav="#vr-gallery">
            <span>Open VR Gallery page</span>
            <span>→</span>
          </a>
        </div>
      </section>
    </div>
  `;
}

function renderCollection() {
  return `
    <div class="page-wrap page-fade-in">
      <p class="section-eyebrow">Collection</p>
      <h1 class="page-title">Twenty artworks</h1>
      <p class="page-lead">A flat catalogue — not divided by corridor groups on the website. Groups 1–5, 6–10, 11–15, and 16–20 are used only in the VR gallery layout.</p>
      <div class="artwork-grid">
        ${sortedArtworks().map((art, i) => renderArtworkCard(art, i)).join("")}
      </div>
    </div>
  `;
}

function renderArtworkDetail(id) {
  const list = sortedArtworks();
  const art = getArtworkById(id);
  if (!art) return renderNotFound();

  const idx = list.findIndex((a) => a.id === art.id);
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx < list.length - 1 ? list[idx + 1] : null;

  const imageContent = renderArtworkImage(
    art.image,
    art.title,
    "artwork-detail-img",
    `<div class="artwork-detail-placeholder">◆</div>`
  );

  const metaItems = [
    ["Medium", art.medium],
    ["Year", art.year],
    ["Dimensions", art.dimensions],
    ["Location", art.location],
  ]
    .filter(([, v]) => v)
    .map(
      ([label, value]) => `
      <div class="artwork-meta-item">
        <label>${escapeHtml(label)}</label>
        <span>${escapeHtml(value)}</span>
      </div>`
    )
    .join("");

  return `
    <div class="artwork-detail page-fade-in">
      <div class="breadcrumb">
        <a href="#" data-nav="#">Home</a>
        <span class="breadcrumb-sep">›</span>
        <a href="#collection" data-nav="#collection">Collection</a>
        <span class="breadcrumb-sep">›</span>
        <span>${escapeHtml(art.title)}</span>
      </div>

      <div class="artwork-detail-image-container">
        ${imageContent}
      </div>

      <h1 class="artwork-detail-title">${escapeHtml(art.title)}</h1>
      <p class="artwork-detail-artist">${escapeHtml(art.artist)}</p>

      <div class="artwork-meta-grid">
        ${metaItems}
      </div>

      ${renderParagraphs(art.essay || art.shortSummary, "artwork-detail-desc")}

      ${
        art.url
          ? `<a class="artwork-source-link" href="${escapeHtml(art.url)}" target="_blank" rel="noopener">View source / permissions ↗</a>`
          : ""
      }
      ${
        art.permissionsNote
          ? `<p class="permissions-note">${escapeHtml(art.permissionsNote)}</p>`
          : ""
      }

      <div class="artwork-nav">
        ${
          prev
            ? `<a class="artwork-nav-btn prev" href="#artwork/${prev.id}" data-nav="#artwork/${prev.id}">
                <span class="artwork-nav-btn-label">← Previous</span>
                <span class="artwork-nav-btn-title">${escapeHtml(prev.title)}</span>
              </a>`
            : "<div></div>"
        }
        ${
          next
            ? `<a class="artwork-nav-btn next" href="#artwork/${next.id}" data-nav="#artwork/${next.id}">
                <span class="artwork-nav-btn-label">Next →</span>
                <span class="artwork-nav-btn-title">${escapeHtml(next.title)}</span>
              </a>`
            : "<div></div>"
        }
      </div>
    </div>
  `;
}

function renderAbout() {
  return `
    <div class="page-narrow page-fade-in">
      <p class="section-eyebrow">About</p>
      <h1 class="page-title">About the project</h1>
      <div class="prose">
        ${renderParagraphs(project.aboutText, "")}
        <p><span class="placeholder-note">Placeholder — final About text pending from Angelo</span></p>
      </div>
    </div>
  `;
}

function renderContact() {
  const c = project.contact || {};
  return `
    <div class="page-narrow page-fade-in">
      <p class="section-eyebrow">Contact</p>
      <h1 class="page-title">Contact</h1>
      <p class="page-lead">Reach the project team for research, teaching, or access questions.</p>
      <dl class="contact-card">
        <dt>Name</dt>
        <dd>${escapeHtml(c.name || "—")}</dd>
        <dt>Role</dt>
        <dd>${escapeHtml(c.role || "—")}</dd>
        <dt>Institution</dt>
        <dd>${escapeHtml(c.institution || project.institution)}</dd>
        <dt>Email</dt>
        <dd>${escapeHtml(c.email || "—")}</dd>
        <dt>Note</dt>
        <dd>${escapeHtml(c.note || "")}</dd>
      </dl>
    </div>
  `;
}

function renderVrGallery() {
  const hasUrl = Boolean(project.vrGalleryUrl);
  return `
    <div class="page-narrow page-fade-in">
      <p class="section-eyebrow">VR Gallery</p>
      <h1 class="page-title">Virtual Gallery</h1>
      <p class="page-lead">Launch or access the immersive teaching environment from the browser. Works hang on a single wall in each corridor; essays open from this website while inside VR.</p>
      <div class="vr-page-panel">
        <p class="vr-banner-label">Browser access</p>
        <h2 class="vr-banner-title" style="margin-bottom:16px">Enter the VR environment</h2>
        <p class="vr-banner-desc">${escapeHtml(project.vrGalleryNote || "")}</p>
        ${
          hasUrl
            ? `<a class="btn-primary" href="${escapeHtml(project.vrGalleryUrl)}" target="_blank" rel="noopener">Launch VR Gallery →</a>`
            : `<button class="btn-primary" type="button" disabled style="opacity:0.55;cursor:not-allowed">Launch URL pending</button>`
        }
        <p style="margin-top:20px;color:var(--color-text-secondary);font-size:14px;line-height:1.5">Desktop: WASD + mouse. On a Meta Quest, open this page in the headset browser and use Enter VR.</p>
      </div>
    </div>
  `;
}

function renderNotFound() {
  return `
    <div class="page-fade-in" style="text-align:center;padding:120px 24px;">
      <h2 class="page-title">Page not found</h2>
      <p class="page-lead">The page you are looking for does not exist.</p>
      <a class="btn-primary" href="#" data-nav="#">Return Home</a>
    </div>
  `;
}

function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-inner">
        <p class="footer-text">
          ${escapeHtml(project.title)} · ${escapeHtml(project.institution)} · ${escapeHtml(project.year)}<br>
          Visual database of 20 artworks · Template 1 / Sep 2026 review build
        </p>
      </div>
    </footer>
  `;
}

function updateNavActive(hash) {
  const links = document.querySelectorAll(".nav-links a");
  links.forEach((a) => {
    const target = (a.getAttribute("href") || "").replace(/^#/, "");
    const current = hash || "";
    a.classList.toggle("is-active", target && (current === target || current.startsWith(target + "/")));
  });
}

let revealObserver = null;

function initRevealAnimations() {
  if (revealObserver) {
    revealObserver.disconnect();
    revealObserver = null;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = document.querySelectorAll("[data-reveal], .artwork-card, .vr-banner");

  if (reduceMotion) {
    targets.forEach((el) => el.classList.add("is-visible"));
    updateCarouselDom();
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  targets.forEach((el) => revealObserver.observe(el));
  updateCarouselDom();
}

function route() {
  const hash = window.location.hash.slice(1) || "";
  const app = document.getElementById("app");
  let content = "";

  if (!hash || hash === "/") {
    content = renderHome();
  } else if (hash === "collection") {
    content = renderCollection();
  } else if (hash.startsWith("artwork/")) {
    content = renderArtworkDetail(hash.replace("artwork/", ""));
  } else if (hash === "vr-gallery") {
    content = renderVrGallery();
  } else if (hash === "about") {
    content = renderAbout();
  } else if (hash === "contact") {
    content = renderContact();
  } else {
    content = renderNotFound();
  }

  app.innerHTML = `${content}${renderFooter()}`;
  updateNavActive(hash);
  window.scrollTo({ top: 0, behavior: "instant" });

  const navLinks = document.getElementById("navLinks");
  if (navLinks) navLinks.classList.remove("is-open");
  const toggle = document.getElementById("navToggle");
  if (toggle) toggle.setAttribute("aria-expanded", "false");

  requestAnimationFrame(() => initRevealAnimations());
}

function initNav() {
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-nav]");
    if (!a) return;
    const dest = a.getAttribute("data-nav");
    if (dest === null) return;
    e.preventDefault();
    navigate(dest === "#" ? "" : dest.replace(/^#/, ""));
  });
}

function init() {
  initNav();
  window.addEventListener("hashchange", route);
  route();
}

document.addEventListener("DOMContentLoaded", init);

/* ============================================================
   Template 3 — Stripe Inspired
   Vanilla SPA · hash routing · gradient elegance
   ============================================================ */

const { artworks, categories, project } = DATABASE;

function normalizeImagePath(path) {
  if (!path) return path;

  let normalized = path.trim();

  // Route group folders through the shared assets directory.
  normalized = normalized.replace(/^\.\.\/(I|II|III|IV)\//, "../assets/$1/");

  // Normalize known filename encoding mismatches.
  normalized = normalized
    .replace(/\u00CC\u02C6/g, "\u0308") // I^ -> combining diaeresis
    .replace(/\u00CC\u0160/g, "\u030A") // IS -> combining ring
    .replace(/\u00CC\u201A/g, "\u0302") // I, -> combining circumflex
    .replace(/\u00CC\u0192/g, "\u0303") // Iƒ -> combining tilde
    .replace(/\u00E2\u20AC\u2122/g, "\u2019"); // â€™ -> right single quote

  return normalized;
}

function encodePath(p) {
  return normalizeImagePath(p)
    .split('/')
    .map((seg, i) => i === 0 ? seg : encodeURIComponent(seg).replace(/%2F/gi, '/'))
    .join('/');
}

const CAT_CLASSES = ["cat-1", "cat-2", "cat-3", "cat-4"];
const CAT_COLORS  = ["#635bff", "#059669", "#0073e6", "#9333ea"];
const CAT_ICONS   = ["✦", "◈", "◉", "◎"];
const CAT_GRADIENTS = [
  "linear-gradient(135deg, rgba(99,91,255,0.15), rgba(75,105,255,0.05))",
  "linear-gradient(135deg, rgba(5,150,105,0.12), rgba(16,185,129,0.04))",
  "linear-gradient(135deg, rgba(0,115,230,0.12), rgba(0,153,255,0.04))",
  "linear-gradient(135deg, rgba(147,51,234,0.12), rgba(168,85,247,0.04))"
];
const CAT_BAR_GRADIENTS = [
  "linear-gradient(90deg, #635bff, #4b69ff)",
  "linear-gradient(90deg, #059669, #10b981)",
  "linear-gradient(90deg, #0073e6, #0099ff)",
  "linear-gradient(90deg, #9333ea, #a855f7)"
];

function getCategoryById(id) {
  return categories.find(c => c.id === id);
}

function getArtworkById(id) {
  return artworks.find(a => a.id === id);
}

function getArtworksByCategory(categoryId) {
  return artworks.filter(a => a.categoryId === categoryId);
}

function catIdx(cat) {
  return categories.indexOf(cat);
}

// ── Renderers ────────────────────────────────────────────────

function renderHome() {
  const featured = [34, 38, 12, 23, 1, 13, 27, 8].map(id => getArtworkById(id)).filter(Boolean);

  return `
    <div class="page-fade-in">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-bg">
          <div class="hero-bg-shape hero-bg-shape-1"></div>
          <div class="hero-bg-shape hero-bg-shape-2"></div>
        </div>
        <div class="hero-inner">
          <div class="hero-badge">
            <span class="hero-badge-dot"></span>
            ${project.institution} · ${project.year}
          </div>
          <h1 class="hero-title">
            <span class="hero-title-gradient">${project.title}</span>
          </h1>
          <p class="hero-subtitle">${project.subtitle}</p>
          <p class="hero-desc">${project.description}</p>
          <div class="hero-actions">
            <a class="btn-primary" href="#categories" data-nav="#categories">Explore the Collection →</a>
            <a class="btn-secondary" href="#vr-gallery" data-nav="#vr-gallery">Enter VR Gallery</a>
          </div>
        </div>
      </section>

      <!-- Categories -->
      <section class="section" id="categories">
        <div class="section-inner">
          <div class="section-header">
            <p class="section-pill">Collection</p>
            <h2 class="section-title">Four Thematic Categories</h2>
            <p class="section-subtitle">Explore 40 significant artworks organised into four thematic lenses.</p>
          </div>
          <div class="category-grid">
            ${categories.map((cat, i) => `
              <a class="category-card ${CAT_CLASSES[i]}" href="#category/${cat.slug}" data-nav="#category/${cat.slug}">
                <div class="category-card-icon" style="background:${CAT_GRADIENTS[i]};color:${CAT_COLORS[i]}">${CAT_ICONS[i]}</div>
                <span class="category-card-label" style="color:${CAT_COLORS[i]}">Group ${i + 1}</span>
                <h3 class="category-card-title">${cat.title}</h3>
                <p class="category-card-desc">${cat.introText}</p>
                <div class="category-card-footer">
                  <span class="category-card-count">${cat.artworkIds.length} artworks</span>
                  <span class="category-card-cta" style="color:${CAT_COLORS[i]}">Browse →</span>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Featured Works -->
      <section class="section section-alt">
        <div class="section-inner">
          <div class="section-header">
            <p class="section-pill">Highlights</p>
            <h2 class="section-title">Featured Works</h2>
            <p class="section-subtitle">A curated selection drawn from across all four thematic categories.</p>
          </div>
          <div class="artwork-grid">
            ${featured.map(art => renderArtworkCard(art)).join('')}
          </div>
        </div>
      </section>

      <!-- VR Banner -->
      <section class="vr-banner" id="vr-gallery">
        <div class="vr-banner-inner">
          <div class="vr-banner-icon">⬡</div>
          <h2 class="vr-banner-title">Step Inside the Virtual Gallery</h2>
          <p class="vr-banner-desc">Explore the collection in an immersive, browser-based 3D environment. No headset required — just a modern web browser.</p>
          <a class="btn-white" href="#vr-gallery">Launch VR Experience →</a>
        </div>
      </section>
    </div>
  `;
}

function renderArtworkCard(art) {
  const cat = getCategoryById(art.categoryId);
  const i = catIdx(cat);

  const imageContent = art.image 
    ? `<img src="${encodePath(art.image)}" alt="${art.title}" class="artwork-thumb-img">`
    : `<div class="artwork-thumb-placeholder" style="background:${CAT_GRADIENTS[i]};color:${CAT_COLORS[i]}">${CAT_ICONS[i]}</div>`;

  return `
    <a class="artwork-card" href="#artwork/${art.id}" data-nav="#artwork/${art.id}">
      <div class="artwork-thumb">
        ${imageContent}
      </div>
      <div class="artwork-card-body">
        <p class="artwork-card-category" style="color:${CAT_COLORS[i]}">${cat.title}</p>
        <p class="artwork-card-title">${art.title}</p>
        <p class="artwork-card-artist">${art.artist}</p>
        <p class="artwork-card-year">${art.year}</p>
      </div>
    </a>
  `;
}

function renderCategory(slug) {
  const cat = categories.find(c => c.slug === slug);
  if (!cat) return renderNotFound();
  const i = catIdx(cat);
  const catArtworks = getArtworksByCategory(cat.id);

  return `
    <div class="category-page page-fade-in">
      <a class="btn-back" href="#" data-nav="#" style="color:${CAT_COLORS[i]}">← Back to Collection</a>
      <div class="category-page-hero">
        <div style="position:absolute;top:0;left:0;right:0;height:4px;background:${CAT_BAR_GRADIENTS[i]}"></div>
        <p class="category-page-label" style="color:${CAT_COLORS[i]}">
          <span style="width:8px;height:8px;background:${CAT_COLORS[i]};border-radius:50%;display:inline-block;box-shadow:0 0 8px ${CAT_COLORS[i]}55"></span>
          Group ${i + 1} · ${catArtworks.length} Artworks
        </p>
        <h1 class="category-page-title">${cat.title}</h1>
        <p class="category-page-intro">${cat.introText}</p>
      </div>
      <div class="artwork-grid">
        ${catArtworks.map(art => renderArtworkCard(art)).join('')}
      </div>
    </div>
  `;
}

function renderArtworkDetail(id) {
  const art = getArtworkById(parseInt(id));
  if (!art) return renderNotFound();
  const cat = getCategoryById(art.categoryId);
  const i = catIdx(cat);
  const catArtworks = getArtworksByCategory(art.categoryId);
  const pos = catArtworks.indexOf(art);
  const prev = catArtworks[pos - 1];
  const next = catArtworks[pos + 1];

  const imageContent = art.image 
    ? `<img src="${encodePath(art.image)}" alt="${art.title}" class="artwork-detail-img">`
    : `<div class="artwork-detail-placeholder" style="background:${CAT_GRADIENTS[i]};color:${CAT_COLORS[i]}">${CAT_ICONS[i]}</div>`;

  return `
    <div class="artwork-detail page-fade-in">
      <div class="breadcrumb">
        <a href="#" data-nav="#">Home</a>
        <span class="breadcrumb-sep">›</span>
        <a href="#category/${cat.slug}" data-nav="#category/${cat.slug}" style="color:${CAT_COLORS[i]}">${cat.title}</a>
        <span class="breadcrumb-sep">›</span>
        <span>${art.title}</span>
      </div>

      <div class="artwork-detail-image-container">
        ${imageContent}
      </div>

      <div class="artwork-detail-category-pill" style="color:${CAT_COLORS[i]};background:${CAT_GRADIENTS[i]};border:1px solid ${CAT_COLORS[i]}33">
        <span style="width:6px;height:6px;background:${CAT_COLORS[i]};border-radius:50%;display:inline-block"></span>
        ${cat.title}
      </div>
      <h1 class="artwork-detail-title">${art.title}</h1>
      <p class="artwork-detail-artist">${art.artist}</p>

      <div class="artwork-meta-grid">
        <div class="artwork-meta-item"><label>Year</label><span>${art.year}</span></div>
        <div class="artwork-meta-item"><label>Location</label><span>${art.location}</span></div>
        <div class="artwork-meta-item"><label>Category</label><span>${cat.title}</span></div>
        <div class="artwork-meta-item"><label>Artwork ID</label><span style="font-family:var(--font-mono);font-size:12px">#${String(art.id).padStart(3,'0')}</span></div>
      </div>

      <p class="artwork-detail-desc">${art.shortSummary}</p>

      <div class="artwork-tags">
        ${art.tags.map(t => `<span class="tag" style="color:${CAT_COLORS[i]};background:${CAT_COLORS[i]}0d;border-color:${CAT_COLORS[i]}28">${t}</span>`).join('')}
      </div>

      ${art.url ? `<a class="artwork-source-link" href="${art.url}" target="_blank" rel="noopener" style="color:${CAT_COLORS[i]};border-color:${CAT_COLORS[i]}40">View at Source Institution ↗</a>` : ''}

      <div class="artwork-nav">
        ${prev ? `
          <a class="artwork-nav-btn prev" href="#artwork/${prev.id}" data-nav="#artwork/${prev.id}">
            <span class="artwork-nav-btn-label">← Previous</span>
            <span class="artwork-nav-btn-title" style="color:${CAT_COLORS[i]}">${prev.title}</span>
          </a>` : '<div></div>'}
        ${next ? `
          <a class="artwork-nav-btn next" href="#artwork/${next.id}" data-nav="#artwork/${next.id}">
            <span class="artwork-nav-btn-label">Next →</span>
            <span class="artwork-nav-btn-title" style="color:${CAT_COLORS[i]}">${next.title}</span>
          </a>` : '<div></div>'}
      </div>
    </div>
  `;
}

function renderNotFound() {
  return `
    <div class="page-fade-in" style="text-align:center;padding:120px 28px;">
      <p style="font-size:56px;margin-bottom:20px">◌</p>
      <h2 style="font-size:32px;font-weight:700;letter-spacing:-0.04em;color:var(--color-text);margin-bottom:10px">Page not found</h2>
      <p style="font-size:16px;color:var(--color-text-3);margin-bottom:32px">The page you are looking for does not exist.</p>
      <a class="btn-primary" href="#" data-nav="#">Return to Collection</a>
    </div>
  `;
}

// ── Router ───────────────────────────────────────────────────

function route() {
  const hash = window.location.hash.slice(1) || '';
  const app = document.getElementById('app');
  let content = '';

  if (!hash || hash === '/') {
    content = renderHome();
  } else if (hash.startsWith('category/')) {
    content = renderCategory(hash.replace('category/', ''));
  } else if (hash.startsWith('artwork/')) {
    content = renderArtworkDetail(hash.replace('artwork/', ''));
  } else if (hash === 'vr-gallery' || hash === 'categories') {
    content = renderHome();
  } else {
    content = renderNotFound();
  }

  app.innerHTML = `${content}${renderFooter()}`;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div>
            <p class="footer-brand">${project.title}</p>
            <p class="footer-tagline">A research database of 40 artworks examining disability in Western visual history from the medieval period through the early modern era.</p>
          </div>
          <div class="footer-links">
            <a href="#" data-nav="#">Home</a>
            <a href="#categories" data-nav="#categories">Collection</a>
            <a href="#category/group-1" data-nav="#category/group-1">Healing &amp; Miracles</a>
            <a href="#category/group-2" data-nav="#category/group-2">Social Life</a>
            <a href="#category/group-3" data-nav="#category/group-3">Portraiture</a>
            <a href="#category/group-4" data-nav="#category/group-4">Creative Practice</a>
            <a href="#vr-gallery" data-nav="#vr-gallery">VR Gallery</a>
          </div>
        </div>
        <p class="footer-bottom">${project.institution} · ${project.year} · Research Database</p>
      </div>
    </footer>
  `;
}

// ── Init ─────────────────────────────────────────────────────

window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', route);

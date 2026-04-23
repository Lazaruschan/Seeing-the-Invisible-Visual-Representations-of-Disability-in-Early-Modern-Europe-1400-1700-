/* ============================================================
   Template 1 — Apple Inspired
   Vanilla SPA with hash-based routing
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

// Encode a file path so spaces and special chars work in img src attributes
function encodePath(p) {
  return normalizeImagePath(p)
    .split('/')
    .map((seg, i) => i === 0 ? seg : encodeURIComponent(seg).replace(/%2F/gi, '/'))
    .join('/');
}

const EMOJI_MAP = {
  "group-1": "✦",
  "group-2": "◈",
  "group-3": "◉",
  "group-4": "◎"
};

function getCategoryById(id) {
  return categories.find(c => c.id === id);
}

function getArtworkById(id) {
  return artworks.find(a => a.id === id);
}

function getArtworksByCategory(categoryId) {
  return artworks.filter(a => a.categoryId === categoryId);
}

function navigate(hash) {
  window.location.hash = hash;
}

// ── Renderers ────────────────────────────────────────────────

function renderHome() {
  const featuredArtworks = [1, 8, 12, 13, 21, 23, 34, 38].map(id => getArtworkById(id)).filter(Boolean);

  return `
    <div class="page-fade-in">
      <!-- Hero -->
      <section class="hero">
        <p class="hero-eyebrow">${project.institution} · ${project.year}</p>
        <h1 class="hero-title">${project.title}</h1>
        <p class="hero-subtitle">${project.subtitle}</p>
        <p class="hero-desc">${project.description}</p>
        <div class="hero-actions">
          <a class="btn-primary" href="#categories">Browse Collection ›</a>
          <a class="btn-secondary" href="#vr-gallery">Enter VR Gallery</a>
        </div>
      </section>

      <hr class="section-divider">

      <!-- Categories -->
      <section class="section section-alt" id="categories">
        <div class="section-inner">
          <div class="section-header">
            <p class="section-eyebrow">Collection</p>
            <h2 class="section-title">Four Thematic Categories</h2>
            <p class="section-subtitle">Explore 40 works across four distinct themes examining disability in Western visual history.</p>
          </div>
          <div class="category-grid">
            ${categories.map((cat, i) => `
              <a class="category-card" href="#category/${cat.slug}" data-nav="#category/${cat.slug}">
                <span class="category-card-num">Group ${i + 1}</span>
                <span class="category-card-swatch" style="background: ${cat.heroColor}"></span>
                <h3 class="category-card-title">${cat.title}</h3>
                <p class="category-card-desc">${cat.introText}</p>
                <p class="category-card-count">${cat.artworkIds.length} artworks</p>
                <span class="category-card-arrow">→</span>
              </a>
            `).join('')}
          </div>
        </div>
      </section>

      <hr class="section-divider">

      <!-- Featured Artworks -->
      <section class="section">
        <div class="section-inner">
          <div class="section-header">
            <p class="section-eyebrow">Featured Works</p>
            <h2 class="section-title">Selected Highlights</h2>
            <p class="section-subtitle">A curated selection from across the four thematic categories.</p>
          </div>
          <div class="artwork-grid">
            ${featuredArtworks.map(art => renderArtworkCard(art)).join('')}
          </div>
        </div>
      </section>

      <hr class="section-divider">

      <!-- VR Banner -->
      <section class="vr-banner" id="vr-gallery">
        <div class="vr-banner-inner">
          <p class="vr-banner-label">Immersive Experience</p>
          <h2 class="vr-banner-title">Enter the Virtual Gallery</h2>
          <p class="vr-banner-desc">Experience the collection in a browser-based 3D virtual reality environment. Walk through the gallery and explore each artwork up close.</p>
          <a class="btn-white" href="#vr-gallery">
            <span>Launch VR Gallery</span>
            <span>→</span>
          </a>
        </div>
      </section>
    </div>
  `;
}

function renderArtworkCard(art) {
  const cat = getCategoryById(art.categoryId);
  const emoji = EMOJI_MAP[art.categoryId] || '◆';
  
  const imageContent = art.image 
    ? `<img src="${encodePath(art.image)}" alt="${art.title}" class="artwork-thumb-img">`
    : `<div class="artwork-thumb-placeholder">${emoji}</div>`;

  return `
    <a class="artwork-card" href="#artwork/${art.id}" data-nav="#artwork/${art.id}">
      <div class="artwork-thumb">
        ${imageContent}
      </div>
      <div class="artwork-card-body">
        <p class="artwork-card-title">${art.title}</p>
        <p class="artwork-card-artist">${art.artist}</p>
        <p class="artwork-card-year">${art.year}</p>
        <p class="artwork-card-location">${art.location}</p>
      </div>
    </a>
  `;
}

function renderCategory(slug) {
  const cat = categories.find(c => c.slug === slug);
  if (!cat) return renderNotFound();
  const catArtworks = getArtworksByCategory(cat.id);
  const catIndex = categories.indexOf(cat);

  return `
    <div class="category-page page-fade-in">
      <a class="btn-back" href="#" data-nav="#">← All Categories</a>
      <div class="category-hero-bar" style="background: ${cat.heroColor}"></div>
      <p class="section-eyebrow">Group ${catIndex + 1}</p>
      <h1 class="category-page-title">${cat.title}</h1>
      <p class="category-page-intro">${cat.introText}</p>
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
  const catArtworks = getArtworksByCategory(art.categoryId);
  const idx = catArtworks.indexOf(art);
  const prev = catArtworks[idx - 1];
  const next = catArtworks[idx + 1];
  const emoji = EMOJI_MAP[art.categoryId] || '◆';

  const imageContent = art.image 
    ? `<img src="${encodePath(art.image)}" alt="${art.title}" class="artwork-detail-img">`
    : `<div class="artwork-detail-placeholder">${emoji}</div>`;

  return `
    <div class="artwork-detail page-fade-in">
      <div class="breadcrumb">
        <a href="#" data-nav="#">Home</a>
        <span class="breadcrumb-sep">›</span>
        <a href="#category/${cat.slug}" data-nav="#category/${cat.slug}">${cat.title}</a>
        <span class="breadcrumb-sep">›</span>
        <span>${art.title}</span>
      </div>

      <div class="artwork-detail-image-container">
        ${imageContent}
      </div>

      <h1 class="artwork-detail-title">${art.title}</h1>
      <p class="artwork-detail-artist">${art.artist}</p>

      <div class="artwork-meta-grid">
        <div class="artwork-meta-item"><label>Year</label><span>${art.year}</span></div>
        <div class="artwork-meta-item"><label>Location</label><span>${art.location}</span></div>
        <div class="artwork-meta-item"><label>Category</label><span>${cat.title}</span></div>
        <div class="artwork-meta-item"><label>Artwork ID</label><span style="font-family:var(--font-mono);font-size:13px">#${String(art.id).padStart(3,'0')}</span></div>
      </div>

      <p class="artwork-detail-desc">${art.shortSummary}</p>

      <div class="artwork-tags">
        ${art.tags.map(t => `<span class="tag">${t}</span>`).join('')}
      </div>

      ${art.url ? `<a class="artwork-source-link" href="${art.url}" target="_blank" rel="noopener">View at Source Institution ↗</a>` : ''}

      <div class="artwork-nav">
        ${prev ? `
          <a class="artwork-nav-btn prev" href="#artwork/${prev.id}" data-nav="#artwork/${prev.id}">
            <span class="artwork-nav-btn-label">← Previous</span>
            <span class="artwork-nav-btn-title">${prev.title}</span>
          </a>` : '<div></div>'}
        ${next ? `
          <a class="artwork-nav-btn next" href="#artwork/${next.id}" data-nav="#artwork/${next.id}">
            <span class="artwork-nav-btn-label">Next →</span>
            <span class="artwork-nav-btn-title">${next.title}</span>
          </a>` : '<div></div>'}
      </div>
    </div>
  `;
}

function renderNotFound() {
  return `
    <div class="page-fade-in" style="text-align:center;padding:120px 24px;">
      <p style="font-size:64px;margin-bottom:24px">◌</p>
      <h2 style="font-size:28px;font-weight:700;letter-spacing:-0.03em;margin-bottom:12px">Page not found</h2>
      <p style="font-size:17px;color:var(--color-text-secondary);margin-bottom:32px">The page you are looking for does not exist.</p>
      <a class="btn-primary" href="#" data-nav="#">Return Home</a>
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
    const slug = hash.replace('category/', '');
    content = renderCategory(slug);
  } else if (hash.startsWith('artwork/')) {
    const id = hash.replace('artwork/', '');
    content = renderArtworkDetail(id);
  } else if (hash === 'vr-gallery') {
    content = renderHome();
  } else {
    content = renderNotFound();
  }

  app.innerHTML = `
    ${content}
    ${renderFooter()}
  `;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-inner">
        <p class="footer-text">
          ${project.title} · ${project.institution} · ${project.year}<br>
          Research database of 40 artworks depicting disability in Western art history.
        </p>
      </div>
    </footer>
  `;
}

// ── Init ─────────────────────────────────────────────────────

function init() {
  window.addEventListener('hashchange', route);
  route();
}

document.addEventListener('DOMContentLoaded', init);

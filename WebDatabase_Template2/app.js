/* ============================================================
   Template 2 — Vercel Inspired
   Vanilla SPA · hash routing · monochrome precision
   ============================================================ */

const { artworks, categories, project } = DATABASE;

const MONO_ICONS = ["▪", "▫", "◆", "◇"];
const DOT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7"];

function getCategoryById(id) {
  return categories.find(c => c.id === id);
}

function getArtworkById(id) {
  return artworks.find(a => a.id === id);
}

function getArtworksByCategory(categoryId) {
  return artworks.filter(a => a.categoryId === categoryId);
}

function catIndex(cat) {
  return categories.indexOf(cat);
}

// ── Renderers ────────────────────────────────────────────────

function renderHome() {
  const featured = [1, 12, 13, 23, 27, 34, 38, 11].map(id => getArtworkById(id)).filter(Boolean);

  return `
    <div class="page-fade-in">
      <!-- Hero -->
      <section class="hero" style="padding-left:24px;padding-right:24px;max-width:1200px;margin:0 auto;position:relative;">
        <div class="hero-grid-bg"></div>
        <div class="hero-inner">
          <div class="hero-badge">${project.institution} // ${project.year}</div>
          <h1 class="hero-title">
            Disability<br>
            <span>in Western Art</span>
          </h1>
          <p class="hero-desc">${project.description}</p>
          <div class="hero-actions">
            <a class="btn-primary" href="#categories" data-nav="#categories">Browse Collection →</a>
            <a class="btn-secondary" href="#vr-gallery" data-nav="#vr-gallery">Enter VR Gallery</a>
          </div>
          <div class="hero-stats">
            <div>
              <p class="hero-stat-num">40</p>
              <p class="hero-stat-label">// artworks</p>
            </div>
            <div>
              <p class="hero-stat-num">04</p>
              <p class="hero-stat-label">// categories</p>
            </div>
            <div>
              <p class="hero-stat-num">16c–18c</p>
              <p class="hero-stat-label">// period</p>
            </div>
            <div>
              <p class="hero-stat-num">EU/AS</p>
              <p class="hero-stat-label">// regions</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Categories -->
      <section class="section" id="categories">
        <div class="section-inner">
          <div class="section-header">
            <div>
              <p class="section-title-mono">// COLLECTION</p>
              <h2 class="section-title">Four Thematic Categories</h2>
            </div>
            <a class="view-all-link" href="#categories">View all →</a>
          </div>
          <div class="category-grid">
            ${categories.map((cat, i) => `
              <a class="category-card" href="#category/${cat.slug}" data-nav="#category/${cat.slug}">
                <div class="category-card-header">
                  <span class="category-card-index">GROUP_${String(i+1).padStart(2,'0')}</span>
                  <span class="category-card-dot" style="background:${DOT_COLORS[i]}"></span>
                </div>
                <h3 class="category-card-title">${cat.title}</h3>
                <p class="category-card-desc">${cat.introText}</p>
                <div class="category-card-footer">
                  <span class="category-card-count">${cat.artworkIds.length} artworks</span>
                  <span class="category-card-arrow">→</span>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Featured Works -->
      <section class="section">
        <div class="section-inner">
          <div class="section-header">
            <div>
              <p class="section-title-mono">// FEATURED</p>
              <h2 class="section-title">Selected Works</h2>
            </div>
          </div>
          <div class="artwork-grid">
            ${featured.map(art => renderArtworkCard(art)).join('')}
          </div>
        </div>
      </section>

      <!-- VR Banner -->
      <section class="vr-banner" id="vr-gallery">
        <div class="vr-banner-inner">
          <p class="vr-banner-badge">IMMERSIVE EXPERIENCE</p>
          <h2 class="vr-banner-title">Virtual Gallery</h2>
          <p class="vr-banner-desc">Enter a browser-based 3D environment and walk through the collection. No installation required.</p>
          <a class="btn-primary" href="#vr-gallery" style="width:fit-content">Launch VR Gallery →</a>
        </div>
      </section>
    </div>
  `;
}

function renderArtworkCard(art) {
  const i = catIndex(getCategoryById(art.categoryId));
  
  const imageContent = art.image 
    ? `<img src="${art.image}" alt="${art.title}" class="artwork-thumb-img">`
    : `<div class="artwork-thumb-placeholder" style="color:${DOT_COLORS[i]}">${MONO_ICONS[i]}</div>`;

  return `
    <a class="artwork-card" href="#artwork/${art.id}" data-nav="#artwork/${art.id}">
      <div class="artwork-thumb">
        ${imageContent}
      </div>
      <div class="artwork-card-body">
        <p class="artwork-card-id">#${String(art.id).padStart(3,'0')}</p>
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
  const idx = catIndex(cat);
  const catArtworks = getArtworksByCategory(cat.id);

  return `
    <div class="category-page page-fade-in">
      <a class="btn-back" href="#" data-nav="#">← home</a>
      <div class="category-page-header">
        <p class="category-page-index">
          <span style="width:8px;height:8px;background:${DOT_COLORS[idx]};border-radius:50%;display:inline-block;box-shadow:0 0 6px ${DOT_COLORS[idx]}66"></span>
          GROUP_${String(idx+1).padStart(2,'0')} // ${catArtworks.length} ARTWORKS
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
  const idx = catIndex(cat);
  const catArtworks = getArtworksByCategory(art.categoryId);
  const pos = catArtworks.indexOf(art);
  const prev = catArtworks[pos - 1];
  const next = catArtworks[pos + 1];

  const imageContent = art.image 
    ? `<img src="${art.image}" alt="${art.title}" class="artwork-detail-img">`
    : `<div class="artwork-detail-placeholder" style="color:${DOT_COLORS[idx]}">${MONO_ICONS[idx]}</div>`;

  return `
    <div class="artwork-detail page-fade-in">
      <div class="breadcrumb">
        <a href="#" data-nav="#">~</a>
        <span class="breadcrumb-sep">/</span>
        <a href="#category/${cat.slug}" data-nav="#category/${cat.slug}">${cat.slug}</a>
        <span class="breadcrumb-sep">/</span>
        <span>artwork_${String(art.id).padStart(3,'0')}</span>
      </div>

      <div class="artwork-detail-image-container">
        ${imageContent}
      </div>

      <p class="artwork-detail-id">#${String(art.id).padStart(3,'0')} // ${cat.title}</p>
      <h1 class="artwork-detail-title">${art.title}</h1>
      <p class="artwork-detail-artist">${art.artist}</p>

      <div class="artwork-meta-grid">
        <div class="artwork-meta-item"><label>YEAR</label><span>${art.year}</span></div>
        <div class="artwork-meta-item"><label>LOCATION</label><span>${art.location}</span></div>
        <div class="artwork-meta-item"><label>CATEGORY</label><span>${cat.title}</span></div>
        <div class="artwork-meta-item"><label>ID</label><span style="font-family:var(--font-mono);font-size:12px">#${String(art.id).padStart(3,'0')}</span></div>
      </div>

      <p class="artwork-detail-desc">${art.shortSummary}</p>

      <div class="artwork-tags">
        ${art.tags.map(t => `<span class="tag">${t}</span>`).join('')}
      </div>

      ${art.url ? `<a class="artwork-source-link" href="${art.url}" target="_blank" rel="noopener">view_source ↗</a>` : ''}

      <div class="artwork-nav">
        ${prev ? `
          <a class="artwork-nav-btn prev" href="#artwork/${prev.id}" data-nav="#artwork/${prev.id}">
            <span class="artwork-nav-btn-label">← PREV</span>
            <span class="artwork-nav-btn-title">${prev.title}</span>
          </a>` : '<div></div>'}
        ${next ? `
          <a class="artwork-nav-btn next" href="#artwork/${next.id}" data-nav="#artwork/${next.id}">
            <span class="artwork-nav-btn-label">NEXT →</span>
            <span class="artwork-nav-btn-title">${next.title}</span>
          </a>` : '<div></div>'}
      </div>
    </div>
  `;
}

function renderNotFound() {
  return `
    <div class="page-fade-in" style="max-width:1200px;margin:0 auto;padding:120px 24px;text-align:center;">
      <p style="font-family:var(--font-mono);font-size:11px;color:var(--color-text-3);letter-spacing:0.06em;margin-bottom:16px">// ERROR 404</p>
      <h2 style="font-size:40px;font-weight:700;letter-spacing:-0.04em;margin-bottom:12px">Not Found</h2>
      <p style="font-size:14px;color:var(--color-text-2);margin-bottom:32px">The requested resource does not exist.</p>
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
    content = renderCategory(hash.replace('category/', ''));
  } else if (hash.startsWith('artwork/')) {
    content = renderArtworkDetail(hash.replace('artwork/', ''));
  } else if (hash === 'vr-gallery') {
    content = renderHome();
  } else if (hash === 'categories') {
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
        <p class="footer-text">${project.title} · ${project.institution} · ${project.year}</p>
        <div class="footer-links">
          <a href="#" data-nav="#">home</a>
          <a href="#categories" data-nav="#categories">collection</a>
          <a href="#vr-gallery" data-nav="#vr-gallery">vr gallery</a>
        </div>
      </div>
    </footer>
  `;
}

// ── Init ─────────────────────────────────────────────────────

window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', route);

/**
 * Artwork info overlay + intro video slot.
 */

/**
 * @param {{ project?: { introVideoUrl?: string | null } }} database
 */
export function setupUi(database) {
  const panel = document.getElementById("artwork-panel");
  const titleEl = document.getElementById("panelTitle");
  const metaEl = document.getElementById("panelMeta");
  const summaryEl = document.getElementById("panelSummary");
  const essayLink = document.getElementById("panelEssay");
  const closeBtn = document.getElementById("panelClose");
  const closeBtn2 = document.getElementById("panelCloseBtn");
  const introSlot = document.getElementById("intro-slot");
  const introVideo = document.getElementById("introVideo");
  const introDismiss = document.getElementById("introDismiss");

  function closePanel() {
    if (panel) panel.hidden = true;
  }

  /**
   * @param {{ id: number, title?: string, artist?: string, year?: string, shortSummary?: string }} art
   */
  function showArtwork(art) {
    if (!panel || !art) return;
    titleEl.textContent = art.title || `Artwork ${art.id}`;
    metaEl.textContent = [art.artist, art.year].filter(Boolean).join(" · ");
    summaryEl.textContent = art.shortSummary || "";
    essayLink.href = `../index.html#artwork/${art.id}`;
    panel.hidden = false;
  }

  closeBtn?.addEventListener("click", closePanel);
  closeBtn2?.addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => {
    if (e.code === "Escape") closePanel();
  });

  const introUrl = database?.project?.introVideoUrl;
  if (introUrl && introSlot && introVideo) {
    introVideo.src = introUrl;
    introSlot.hidden = false;
    introDismiss?.addEventListener("click", () => {
      introVideo.pause();
      introSlot.hidden = true;
    });
  }

  return { showArtwork, closePanel };
}

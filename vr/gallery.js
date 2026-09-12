import * as THREE from "three";
import { XRButton } from "three/addons/webxr/XRButton.js";
import { buildGallery, resolveCollisions } from "./layout.js";
import { createControls } from "./controls.js";
import { setupUi } from "./ui.js";

const database = typeof DATABASE !== "undefined" ? DATABASE : { artworks: [], project: {} };
const artworks = database.artworks || [];

const ui = setupUi(database);

const loadOverlay = document.getElementById("load-overlay");
const loadStatus = document.getElementById("loadStatus");
const loadBar = document.getElementById("loadBar");

function setLoadProgress(ratio, status) {
  if (loadStatus) loadStatus.textContent = status;
  if (loadBar) loadBar.style.width = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0c0c);
scene.fog = null;

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.08, 160);

const player = new THREE.Group();
player.name = "PlayerRig";
player.position.set(0, 0, 0);
camera.position.set(0, 1.6, 0);
player.add(camera);
scene.add(player);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

const xrSlot = document.getElementById("xr-button-slot");
const xrButton = XRButton.createButton(renderer, {
  optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
});
xrSlot?.appendChild(xrButton);

const clock = new THREE.Clock();
/** @type {ReturnType<typeof createControls> | null} */
let controls = null;
/** @type {Awaited<ReturnType<typeof buildGallery>> | null} */
let gallery = null;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (controls) controls.update(dt, renderer.xr);
  renderer.render(scene, camera);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

async function boot() {
  try {
    setLoadProgress(0.01, "Starting…");
    gallery = await buildGallery(scene, artworks, {
      assetBase: "../",
      onProgress: setLoadProgress,
    });

    player.position.set(gallery.spawn.x, 0, gallery.spawn.z);

    controls = createControls({
      camera,
      player,
      domElement: renderer.domElement,
      colliders: gallery.colliders,
      resolveCollisions,
      artworksMeshes: gallery.artworksMeshes,
      onSelectArtwork: (data) => ui.showArtwork(data),
      spawn: gallery.spawn,
    });

    controls.setXrActiveGetter(() => renderer.xr.isPresenting);
    controls.attachXrControllers(renderer, scene);

    renderer.xr.addEventListener("sessionstart", () => {
      player.position.set(gallery.spawn.x, 0, gallery.spawn.z);
      document.body.classList.add("is-locked");
    });

    renderer.xr.addEventListener("sessionend", () => {
      player.position.set(gallery.spawn.x, 0, gallery.spawn.z);
      camera.position.set(0, 1.6, 0);
      document.body.classList.remove("is-locked");
    });

    if (loadOverlay) loadOverlay.hidden = true;
    window.__vrGallery = { scene, camera, player, renderer, gallery };
  } catch (err) {
    console.error(err);
    setLoadProgress(0, "Failed to load gallery model");
    if (loadStatus) {
      const detail = err?.message || String(err);
      loadStatus.textContent =
        `Could not load gallery_scene_vr_ver6_12SEP2026_web-optimized.glb (~21 MB). ${detail}`;
    }
  }
}

boot();

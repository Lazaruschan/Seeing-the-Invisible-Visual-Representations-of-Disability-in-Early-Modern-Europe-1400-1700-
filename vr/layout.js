import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

/** @typedef {{ id: number, title: string, artist: string, year: string, dimensions: string, shortSummary: string, image: string }} Artwork */

export const CORRIDOR_LABELS = ["I", "II", "III", "IV"];

export const GALLERY_MODEL_URL = "./assets/gallery_scene_vr_ver6_12SEP2026_web-optimized.glb";

/** Google-hosted Draco WASM/JS decoders (KHR_draco_mesh_compression). */
const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

/** Measured from gallery_scene_vr_ver6 (metres) — used for walk colliders. */
const HUB_RADIUS = 10.35;
const HUB_HEIGHT = 6.1;
const CORRIDOR_WIDTH = 10;
const CORRIDOR_LENGTH = 26;
const CORRIDOR_HEIGHT = 4.87;
const CORRIDOR_START = 10;
const WALL_THICKNESS = 0.35;
const WALL_INNER = 4.85;
const DOORWAY_WIDTH = 9.2;
const COL_R = 0.34;

const CORRIDORS = [
  { label: "I", axis: new THREE.Vector3(0, 0, 1) },
  { label: "II", axis: new THREE.Vector3(0, 0, -1) },
  { label: "III", axis: new THREE.Vector3(-1, 0, 0) },
  { label: "IV", axis: new THREE.Vector3(1, 0, 0) },
];

const ART_NAME_RE = /^Art_(I{1,3}|IV)_0*(\d+)/i;

/**
 * @param {string} dim
 * @returns {{ heightM: number, widthM: number }}
 */
export function parseDimensions(dim) {
  const m = String(dim || "").match(/([\d.]+)\s*[x×]\s*([\d.]+)/i);
  if (!m) return { heightM: 1.4, widthM: 1.1 };
  let heightM = parseFloat(m[1]) / 100;
  let widthM = parseFloat(m[2]) / 100;
  const maxH = 2.15;
  const minH = 0.95;
  const scale = Math.min(1, maxH / Math.max(heightM, 0.01));
  heightM *= scale;
  widthM *= scale;
  if (heightM < minH) {
    const up = minH / heightM;
    heightM *= up;
    widthM *= up;
  }
  return { heightM, widthM };
}

/**
 * @param {Artwork[]} artworks
 * @returns {Artwork[][]}
 */
export function groupByCorridor(artworks) {
  const sorted = [...artworks].sort((a, b) => a.id - b.id);
  return [
    sorted.filter((a) => a.id >= 1 && a.id <= 5),
    sorted.filter((a) => a.id >= 6 && a.id <= 10),
    sorted.filter((a) => a.id >= 11 && a.id <= 15),
    sorted.filter((a) => a.id >= 16 && a.id <= 20),
  ];
}

/**
 * Load C4D-exported GLB architecture, reconnect painting textures onto Art_* (Unity-style),
 * wire catalogue metadata, add walk colliders.
 * @param {THREE.Scene} scene
 * @param {Artwork[]} artworks
 * @param {{
 *   modelUrl?: string,
 *   assetBase?: string,
 *   onProgress?: (ratio: number, status: string) => void,
 * }} [opts]
 */
export async function buildGallery(scene, artworks, opts = {}) {
  const modelUrl = opts.modelUrl ?? GALLERY_MODEL_URL;
  const assetBase = opts.assetBase ?? "../";
  const onProgress = opts.onProgress ?? (() => {});

  const root = new THREE.Group();
  root.name = "GalleryRoot";
  scene.add(root);

  /** @type {{ minX: number, maxX: number, minZ: number, maxZ: number, minY?: number, maxY?: number }[]} */
  const colliders = [];
  /** @type {THREE.Object3D[]} */
  const artworksMeshes = [];

  onProgress(0.02, "Loading gallery model…");
  const model = await loadGalleryGlb(modelUrl, onProgress);
  root.add(model);

  onProgress(0.88, "Importing artworks…");
  const wired = await reconnectArtworksLikeUnity(model, artworks, artworksMeshes, assetBase, onProgress);

  if (wired < artworks.length) {
    onProgress(0.94, `Placing missing artworks (${wired}/${artworks.length})…`);
    await placeMissingArtworks(root, model, artworks, artworksMeshes, assetBase, wired);
  }

  // Architecture as EdgesGeometry lines (not full-mesh wireframe); canvases stay solid
  onProgress(0.95, "Building edge lines…");
  await applyEdgesArchitecture(model, onProgress);

  const uniqueIds = new Set(
    artworksMeshes.filter((o) => o.userData?.kind === "artwork").map((o) => o.userData.id)
  );
  onProgress(0.97, `Linked ${uniqueIds.size} artworks`);

  buildWalkColliders(colliders);
  // Unlit edge lines + MeshBasic paintings — no scene lights needed
  onProgress(1, "Ready");

  return {
    root,
    model,
    colliders,
    artworksMeshes,
    spawn: new THREE.Vector3(0, 1.6, 0),
    artCount: uniqueIds.size,
  };
}

/**
 * @param {string} url
 * @param {(ratio: number, status: string) => void} onProgress
 * @returns {Promise<THREE.Group>}
 */
function loadGalleryGlb(url, onProgress) {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_DECODER_PATH);
  loader.setDRACOLoader(draco);

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        model.name = "GalleryModel_ver6";

        // C4D exports are often in centimetres
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 200) {
          model.scale.setScalar(0.01);
          model.updateMatrixWorld(true);
        }

        // Drop imported lights/cameras — wireframe view is unlit
        const removeList = [];
        model.traverse((obj) => {
          if (obj.isLight || obj.isCamera) removeList.push(obj);
        });
        for (const obj of removeList) {
          obj.parent?.remove(obj);
        }

        draco.dispose();
        onProgress(0.88, "Preparing scene…");
        resolve(model);
      },
      (event) => {
        if (event.total > 0) {
          const ratio = Math.min(0.85, 0.05 + (event.loaded / event.total) * 0.8);
          const mb = (event.loaded / (1024 * 1024)).toFixed(1);
          const totalMb = (event.total / (1024 * 1024)).toFixed(1);
          onProgress(ratio, `Downloading model… ${mb} / ${totalMb} MB`);
        } else {
          const mb = (event.loaded / (1024 * 1024)).toFixed(1);
          onProgress(0.3, `Downloading model… ${mb} MB`);
        }
      },
      (err) => {
        draco.dispose();
        reject(err);
      }
    );
  });
}

/**
 * Mirror Unity GalleryArtworkLink + ReconnectPaintingTextures:
 * find Art_* (or MatPic_* / numeric painting mats), apply catalogue image maps,
 * attach metadata + pick volumes.
 * @param {THREE.Object3D} model
 * @param {Artwork[]} artworks
 * @param {THREE.Object3D[]} artworksMeshes
 * @param {string} assetBase
 * @param {(ratio: number, status: string) => void} onProgress
 */
async function reconnectArtworksLikeUnity(model, artworks, artworksMeshes, assetBase, onProgress) {
  const byId = new Map(artworks.map((a) => [a.id, a]));
  model.updateMatrixWorld(true);

  const targets = collectArtworkMeshes(model);
  const loader = new THREE.TextureLoader();
  let count = 0;

  for (let i = 0; i < targets.length; i++) {
    const { mesh, id, corridor } = targets[i];
    const art = byId.get(id);
    if (!art) continue;

    const data = {
      kind: "artwork",
      id: art.id,
      title: art.title,
      artist: art.artist,
      year: art.year,
      shortSummary: art.shortSummary,
      corridor: corridor || corridorFromId(id),
    };
    mesh.userData = { ...mesh.userData, ...data };

    const texUrl = assetBase + String(art.image || "").replace(/^\//, "");
    try {
      const tex = await loadTexture(loader, texUrl);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      // TextureLoader default flipY=true; keep it so catalogue images match C4D/GLB UVs upright
      tex.flipY = true;
      tex.needsUpdate = true;

      mesh.material = new THREE.MeshBasicMaterial({
        map: tex,
        color: 0xffffff,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      mesh.userData.isArtworkCanvas = true;
    } catch {
      // keep embedded GLB material if catalogue image fails
      console.warn("[gallery] texture reconnect failed for artwork", id, texUrl);
      mesh.userData.isArtworkCanvas = true;
    }

    addArtworkPickVolume(model, mesh, data, artworksMeshes);
    artworksMeshes.push(mesh);
    count += 1;

    const t = 0.88 + (0.08 * (i + 1)) / Math.max(targets.length, 1);
    onProgress(t, `Importing artworks… ${i + 1}/${targets.length}`);
  }

  return count;
}

/** Degrees — higher keeps only sharper creases (fewer lines, cheaper). */
const ARCH_EDGE_THRESHOLD = 20;

/**
 * Replace architecture triangle meshes with EdgesGeometry LineSegments.
 * Much cheaper than MeshBasic wireframe on dense GLBs (hard edges only, no triangle overdraw).
 * Art canvases stay solid MeshBasic.
 * @param {THREE.Object3D} model
 * @param {(ratio: number, status: string) => void} [onProgress]
 */
async function applyEdgesArchitecture(model, onProgress = () => {}) {
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x8a8278,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    toneMapped: false,
  });
  const hiddenMat = new THREE.MeshBasicMaterial({ visible: false });

  /** @type {THREE.Mesh[]} */
  const archMeshes = [];

  model.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData?.isArtworkCanvas || obj.userData?.kind === "artwork") {
      if (obj.material && !obj.material.isMeshBasicMaterial && obj.material.map) {
        obj.material = new THREE.MeshBasicMaterial({
          map: obj.material.map,
          color: 0xffffff,
          side: THREE.DoubleSide,
          toneMapped: false,
        });
      }
      obj.castShadow = false;
      obj.receiveShadow = false;
      return;
    }
    // Invisible pick volumes
    if (obj.material && obj.material.visible === false) return;

    archMeshes.push(obj);
  });

  const chunk = 32;
  for (let i = 0; i < archMeshes.length; i++) {
    const mesh = archMeshes[i];
    const parent = mesh.parent;
    const srcGeo = mesh.geometry;
    if (!parent || !srcGeo) continue;

    let edges;
    try {
      edges = new THREE.EdgesGeometry(srcGeo, ARCH_EDGE_THRESHOLD);
    } catch {
      mesh.visible = false;
      continue;
    }

    const pos = edges.getAttribute("position");
    if (!pos || pos.count === 0) {
      edges.dispose();
      srcGeo.dispose();
      mesh.geometry = new THREE.BufferGeometry();
      mesh.material = hiddenMat;
      continue;
    }

    const lines = new THREE.LineSegments(edges, edgeMat);
    lines.name = `${mesh.name || "arch"}_edges`;
    lines.castShadow = false;
    lines.receiveShadow = false;

    // Keep hierarchy if this mesh has children; otherwise swap in place
    if (mesh.children.length > 0) {
      mesh.add(lines);
      srcGeo.dispose();
      mesh.geometry = new THREE.BufferGeometry();
      mesh.material = hiddenMat;
    } else {
      lines.position.copy(mesh.position);
      lines.quaternion.copy(mesh.quaternion);
      lines.scale.copy(mesh.scale);
      parent.add(lines);
      srcGeo.dispose();
      parent.remove(mesh);
    }

    mesh.castShadow = false;
    mesh.receiveShadow = false;

    if (i % chunk === chunk - 1 || i === archMeshes.length - 1) {
      const t = 0.95 + (0.02 * (i + 1)) / Math.max(archMeshes.length, 1);
      onProgress(t, `Building edge lines… ${i + 1}/${archMeshes.length}`);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}

/**
 * @param {number} id
 */
function corridorFromId(id) {
  if (id <= 5) return "I";
  if (id <= 10) return "II";
  if (id <= 15) return "III";
  return "IV";
}

/**
 * @param {THREE.Object3D} model
 * @returns {{ mesh: THREE.Mesh, id: number, corridor: string | null }[]}
 */
function collectArtworkMeshes(model) {
  /** @type {{ mesh: THREE.Mesh, id: number, corridor: string | null }[]} */
  const found = [];
  const seen = new Set();

  model.traverse((obj) => {
    if (!obj.isMesh) return;

    let id = null;
    let corridor = null;

    const nameMatch = obj.name.match(ART_NAME_RE);
    if (nameMatch) {
      corridor = nameMatch[1].toUpperCase();
      id = parseInt(nameMatch[2], 10);
    }

    // Walk parents for Art_* nulls (C4D hierarchy often parents canvas under Art_*)
    if (id == null) {
      let p = obj.parent;
      while (p) {
        const pm = p.name.match(ART_NAME_RE);
        if (pm) {
          corridor = pm[1].toUpperCase();
          id = parseInt(pm[2], 10);
          break;
        }
        p = p.parent;
      }
    }

    // Unity-style material names: MatPic_I_01_* or embedded "01" / "01.mat"
    if (id == null && obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        const n = mat?.name || "";
        const matPic = n.match(/MatPic_(I{1,3}|IV)_0*(\d+)/i);
        if (matPic) {
          corridor = matPic[1].toUpperCase();
          id = parseInt(matPic[2], 10);
          break;
        }
        const numeric = n.match(/^0*(\d{1,2})(?:\.|$)/);
        if (numeric) {
          const nId = parseInt(numeric[1], 10);
          if (nId >= 1 && nId <= 20) {
            id = nId;
            corridor = corridorFromId(nId);
            break;
          }
        }
      }
    }

    // Skip ornate frame bars (Fb_Art_*)
    if (/^Fb_Art_/i.test(obj.name)) return;
    if (id == null || id < 1 || id > 20) return;
    if (seen.has(id)) return;
    seen.add(id);
    found.push({ mesh: obj, id, corridor });
  });

  found.sort((a, b) => a.id - b.id);
  return found;
}

/**
 * @param {THREE.TextureLoader} loader
 * @param {string} url
 * @returns {Promise<THREE.Texture>}
 */
function loadTexture(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

/**
 * @param {THREE.Object3D} model
 * @param {THREE.Mesh} mesh
 * @param {object} data
 * @param {THREE.Object3D[]} artworksMeshes
 */
function addArtworkPickVolume(model, mesh, data, artworksMeshes) {
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(
      Math.max(size.x, 0.15) + 0.2,
      Math.max(size.y, 0.15) + 0.2,
      Math.max(size.z, 0.08) + 0.25
    ),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.copy(center);
  hit.userData = data;
  model.add(hit);
  artworksMeshes.push(hit);
}

/**
 * If GLB is missing some Art_* canvases, hang remaining catalogue works at C4D positions
 * (same layout Unity uses for corridors I–IV).
 * @param {THREE.Group} root
 * @param {THREE.Object3D} model
 * @param {Artwork[]} artworks
 * @param {THREE.Object3D[]} artworksMeshes
 * @param {string} assetBase
 * @param {number} alreadyWired
 */
async function placeMissingArtworks(root, model, artworks, artworksMeshes, assetBase, alreadyWired) {
  const present = new Set();
  for (const o of artworksMeshes) {
    if (o.userData?.kind === "artwork" && o.userData.id) present.add(o.userData.id);
  }

  const hang = {
    I: { axis: new THREE.Vector3(0, 0, 1), hangDir: new THREE.Vector3(1, 0, 0), faceYaw: -Math.PI / 2 },
    II: { axis: new THREE.Vector3(0, 0, -1), hangDir: new THREE.Vector3(-1, 0, 0), faceYaw: Math.PI / 2 },
    III: { axis: new THREE.Vector3(-1, 0, 0), hangDir: new THREE.Vector3(0, 0, 1), faceYaw: Math.PI },
    IV: { axis: new THREE.Vector3(1, 0, 0), hangDir: new THREE.Vector3(0, 0, -1), faceYaw: 0 },
  };
  const along = [14.5, 18.875, 23.25, 27.625, 32.0];
  const eyeY = 1.55;
  const hangOffset = 4.56;
  const frameMat = new THREE.LineBasicMaterial({
    color: 0x9a8b6a,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    toneMapped: false,
  });
  const loader = new THREE.TextureLoader();
  const missing = artworks.filter((a) => !present.has(a.id)).sort((a, b) => a.id - b.id);

  for (const art of missing) {
    const corr = corridorFromId(art.id);
    const cfg = hang[corr];
    const indexInCorr = (art.id - 1) % 5;
    const pos = cfg.axis
      .clone()
      .multiplyScalar(along[indexInCorr])
      .add(cfg.hangDir.clone().multiplyScalar(hangOffset));
    pos.y = eyeY;

    const { heightM, widthM } = parseDimensions(art.dimensions);
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = cfg.faceYaw;

    const frameBox = new THREE.BoxGeometry(widthM + 0.12, heightM + 0.12, 0.04);
    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(frameBox, ARCH_EDGE_THRESHOLD),
      frameMat
    );
    frameBox.dispose();
    frame.position.z = -0.02;
    group.add(frame);

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(widthM, heightM),
      new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.DoubleSide, toneMapped: false })
    );
    plane.position.z = 0.005;
    plane.userData.isArtworkCanvas = true;
    group.add(plane);

    const data = {
      kind: "artwork",
      id: art.id,
      title: art.title,
      artist: art.artist,
      year: art.year,
      shortSummary: art.shortSummary,
      corridor: corr,
    };
    group.userData = data;
    plane.userData = data;

    const texUrl = assetBase + String(art.image || "").replace(/^\//, "");
    try {
      const tex = await loadTexture(loader, texUrl);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.flipY = true;
      plane.material.map = tex;
      plane.material.color.set(0xffffff);
      plane.material.needsUpdate = true;
    } catch {
      plane.material.color.set(0x666666);
    }

    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(widthM + 0.15, heightM + 0.15, 0.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.z = 0.08;
    hit.userData = data;
    group.add(hit);

    root.add(group);
    artworksMeshes.push(group, plane, hit);
  }

  void alreadyWired;
  void model;
}

/**
 * Invisible walk colliders matching measured C4D layout (metres).
 * @param {object[]} colliders
 */
function buildWalkColliders(colliders) {
  const halfAng = DOORWAY_WIDTH / 2 / HUB_RADIUS;
  const openings = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

  for (let i = 0; i < openings.length; i++) {
    let start = openings[i] + halfAng;
    let end = openings[(i + 1) % openings.length] - halfAng;
    if (i === openings.length - 1) end += Math.PI * 2;
    if (end <= start) end += Math.PI * 2;
    const span = end - start;
    if (span < 0.05) continue;
    const segs = Math.max(4, Math.ceil(span / 0.12));
    for (let s = 0; s < segs; s++) {
      const a0 = start + (span * s) / segs;
      const a1 = start + (span * (s + 1)) / segs;
      const amid = (a0 + a1) / 2;
      const x = Math.sin(amid) * HUB_RADIUS;
      const z = Math.cos(amid) * HUB_RADIUS;
      const arcLen = HUB_RADIUS * (a1 - a0);
      addOrientedCollider(
        colliders,
        new THREE.Vector3(x, HUB_HEIGHT / 2, z),
        arcLen * 1.02,
        WALL_THICKNESS,
        amid,
        HUB_HEIGHT
      );
    }
  }

  // Hub columns (8 on ring)
  const ring = [
    [3.09, 9.51],
    [9.51, 3.09],
    [9.51, -3.09],
    [3.09, -9.51],
    [-3.09, -9.51],
    [-9.51, -3.09],
    [-9.51, 3.09],
    [-3.09, 9.51],
  ];
  for (const [cx, cz] of ring) {
    colliders.push({
      minX: cx - COL_R - 0.1,
      maxX: cx + COL_R + 0.1,
      minZ: cz - COL_R - 0.1,
      maxZ: cz + COL_R + 0.1,
      minY: 0,
      maxY: 6,
    });
  }

  for (const cfg of CORRIDORS) {
    const axis = cfg.axis;
    const midDist = CORRIDOR_START + CORRIDOR_LENGTH / 2;
    const endDist = CORRIDOR_START + CORRIDOR_LENGTH;
    const mid = axis.clone().multiplyScalar(midDist);
    const end = axis.clone().multiplyScalar(endDist);
    const right = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0)).normalize();
    // Match hang-wall side used in C4D (I:+X, II:-X, III:+Z, IV:-Z)
    const hangDir =
      cfg.label === "I"
        ? new THREE.Vector3(1, 0, 0)
        : cfg.label === "II"
          ? new THREE.Vector3(-1, 0, 0)
          : cfg.label === "III"
            ? new THREE.Vector3(0, 0, 1)
            : new THREE.Vector3(0, 0, -1);
    if (right.dot(hangDir) < 0) right.negate();

    const yaw = Math.atan2(axis.x, axis.z);

    for (const side of [-1, 1]) {
      const offset = right.clone().multiplyScalar(side * (WALL_INNER + WALL_THICKNESS / 2));
      addOrientedCollider(
        colliders,
        new THREE.Vector3(mid.x + offset.x, CORRIDOR_HEIGHT / 2, mid.z + offset.z),
        WALL_THICKNESS,
        CORRIDOR_LENGTH,
        yaw,
        CORRIDOR_HEIGHT
      );
    }

    addOrientedCollider(
      colliders,
      new THREE.Vector3(end.x, CORRIDOR_HEIGHT / 2, end.z),
      CORRIDOR_WIDTH,
      WALL_THICKNESS,
      yaw,
      CORRIDOR_HEIGHT
    );
  }
}

/**
 * @param {object[]} colliders
 * @param {THREE.Vector3} pos
 * @param {number} sizeX
 * @param {number} sizeZ
 * @param {number} yaw
 * @param {number} height
 */
function addOrientedCollider(colliders, pos, sizeX, sizeZ, yaw, height) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const hx = sizeX / 2;
  const hz = sizeZ / 2;
  const corners = [
    [hx, hz],
    [hx, -hz],
    [-hx, hz],
    [-hx, -hz],
  ];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [lx, lz] of corners) {
    const wx = pos.x + lx * c + lz * s;
    const wz = pos.z - lx * s + lz * c;
    minX = Math.min(minX, wx);
    maxX = Math.max(maxX, wx);
    minZ = Math.min(minZ, wz);
    maxZ = Math.max(maxZ, wz);
  }
  colliders.push({ minX, maxX, minZ, maxZ, minY: 0, maxY: height });
}

/**
 * @param {THREE.Group} root
 */
function addLighting(root) {
  const hemi = new THREE.HemisphereLight(0xf7f2e8, 0x4a5244, 0.95);
  root.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff5e8, 0.7);
  sun.position.set(8, 22, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 70;
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  root.add(sun);

  const hubLight = new THREE.PointLight(0xffe8c8, 2.8, 32, 1.2);
  hubLight.position.set(0, HUB_HEIGHT - 1.0, 0);
  root.add(hubLight);

  const skyFill = new THREE.PointLight(0xe8f0ff, 1.6, 26, 1.6);
  skyFill.position.set(0, HUB_HEIGHT + 0.3, 0);
  root.add(skyFill);

  for (const cfg of CORRIDORS) {
    const p = cfg.axis.clone().multiplyScalar(CORRIDOR_START + 8);
    p.y = 3.4;
    const fill = new THREE.PointLight(0xfff2dd, 1.8, 24, 1.6);
    fill.position.copy(p);
    root.add(fill);
  }
}

/**
 * @param {THREE.Vector3} pos
 * @param {{ minX: number, maxX: number, minZ: number, maxZ: number, minY?: number, maxY?: number }[]} colliders
 * @param {number} radius
 */
export function resolveCollisions(pos, colliders, radius = 0.28) {
  for (const c of colliders) {
    const minY = c.minY ?? 0;
    const maxY = c.maxY ?? 4;
    if (pos.y < minY || pos.y > maxY) continue;

    const nearestX = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nearestZ = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nearestX;
    const dz = pos.z - nearestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq >= radius * radius) continue;

    if (distSq < 1e-8) {
      const left = Math.abs(pos.x - c.minX);
      const right = Math.abs(c.maxX - pos.x);
      const back = Math.abs(pos.z - c.minZ);
      const forward = Math.abs(c.maxZ - pos.z);
      const m = Math.min(left, right, back, forward);
      if (m === left) pos.x = c.minX - radius;
      else if (m === right) pos.x = c.maxX + radius;
      else if (m === back) pos.z = c.minZ - radius;
      else pos.z = c.maxZ + radius;
    } else {
      const dist = Math.sqrt(distSq);
      const push = (radius - dist) / dist;
      pos.x += dx * push;
      pos.z += dz * push;
    }
  }
}

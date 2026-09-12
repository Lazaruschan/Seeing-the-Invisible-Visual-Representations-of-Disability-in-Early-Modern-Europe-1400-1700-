import * as THREE from "three";

/**
 * Desktop pointer-lock FPS + WebXR smooth locomotion / select.
 * Center reticle drives look-aim selection (click / E).
 */
export function createControls({
  camera,
  player,
  domElement,
  colliders,
  resolveCollisions,
  artworksMeshes,
  onSelectArtwork,
  spawn,
}) {
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const keys = {
    forward: false,
    back: false,
    left: false,
    right: false,
  };

  let locked = false;
  let yaw = 0;
  let pitch = 0;
  const eyeHeight = 1.6;
  const moveSpeed = 4.2;
  const lookSensitivity = 0.0022;
  const selectMaxDist = 12;

  /** @type {{ kind?: string, id?: number, title?: string } | null} */
  let hoveredArt = null;

  const blocker = document.getElementById("blocker");
  const startBtn = document.getElementById("startBtn");
  const hudHint = document.getElementById("hudHint");
  const reticle = document.getElementById("reticle");
  const lookHint = document.getElementById("lookHint");

  player.position.set(spawn.x, 0, spawn.z);
  camera.position.set(0, eyeHeight, 0);
  camera.rotation.order = "YXZ";
  // Hub spawn: face Corridor I (+Z). Default camera looks −Z, so yaw = π.
  yaw = Math.PI;
  pitch = 0;
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  const raycaster = new THREE.Raycaster();
  raycaster.far = selectMaxDist;
  const ndcCenter = new THREE.Vector2(0, 0);

  function setLocked(value) {
    locked = value;
    document.body.classList.toggle("is-locked", value);
    if (!value) {
      clearHover();
    }
    if (hudHint) {
      hudHint.textContent = value
        ? "WASD walk · mouse look · aim center · click / E select · Esc release"
        : "Click to look · WASD to walk · Aim center at a painting · click / E for details";
    }
  }

  function clearHover() {
    hoveredArt = null;
    reticle?.classList.remove("is-hot");
    if (lookHint) {
      lookHint.hidden = true;
      lookHint.textContent = "";
    }
  }

  function setHover(art) {
    if (!art) {
      clearHover();
      return;
    }
    const same = hoveredArt && hoveredArt.id === art.id;
    hoveredArt = art;
    reticle?.classList.add("is-hot");
    if (lookHint) {
      lookHint.hidden = false;
      lookHint.textContent = same
        ? lookHint.textContent
        : `E / click · ${art.title || `Artwork ${art.id}`}`;
    }
  }

  function beginDesktopSession() {
    setLocked(true);
    if (domElement.requestPointerLock) {
      domElement.requestPointerLock();
    }
  }

  function endDesktopSession() {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    setLocked(false);
  }

  startBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    beginDesktopSession();
  });
  blocker?.addEventListener("click", (e) => {
    if (e.target === blocker || e.target === startBtn) beginDesktopSession();
  });

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === domElement) {
      setLocked(true);
    } else if (!rendererXrActive()) {
      // Esc / lost focus — exit look mode so UX matches reticle visibility
      setLocked(false);
    }
  });

  document.addEventListener("pointerlockerror", () => {
    // Still allow drag-look fallback without hardware pointer lock
    setLocked(true);
  });

  let dragging = false;
  domElement.addEventListener("mousedown", (e) => {
    if (rendererXrActive()) return;
    if (!locked) {
      beginDesktopSession();
      return;
    }
    if (document.pointerLockElement !== domElement) {
      dragging = true;
    }
  });
  document.addEventListener("mouseup", () => {
    dragging = false;
  });

  document.addEventListener("mousemove", (e) => {
    if (!locked || rendererXrActive()) return;
    if (document.pointerLockElement === domElement || dragging) {
      yaw -= e.movementX * lookSensitivity;
      pitch -= e.movementY * lookSensitivity;
      pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch));
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Escape") {
      if (document.pointerLockElement === domElement) {
        // pointerlockchange will unlock
        return;
      }
      if (locked) {
        endDesktopSession();
      }
      return;
    }
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        keys.forward = true;
        break;
      case "KeyS":
      case "ArrowDown":
        keys.back = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        keys.left = true;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.right = true;
        break;
      case "KeyE":
        trySelectDesktop();
        break;
      default:
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        keys.forward = false;
        break;
      case "KeyS":
      case "ArrowDown":
        keys.back = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        keys.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.right = false;
        break;
      default:
        break;
    }
  });

  domElement.addEventListener("click", () => {
    if (!locked) {
      beginDesktopSession();
      return;
    }
    if (rendererXrActive()) return;
    // Prefer selecting only when reticle is on an artwork
    trySelectDesktop();
  });

  let xrActiveGetter = () => false;
  function rendererXrActive() {
    return xrActiveGetter();
  }

  function setXrActiveGetter(fn) {
    xrActiveGetter = fn;
  }

  /**
   * @returns {{ kind?: string, id?: number, title?: string } | null}
   */
  function pickArtworkFromCenter() {
    raycaster.setFromCamera(ndcCenter, camera);
    raycaster.far = selectMaxDist;
    const hits = raycaster.intersectObjects(artworksMeshes, true);
    for (const hit of hits) {
      if (hit.distance > selectMaxDist) continue;
      let obj = hit.object;
      while (obj) {
        if (obj.userData?.kind === "artwork") {
          return obj.userData;
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  function trySelectDesktop() {
    const art = pickArtworkFromCenter() || hoveredArt;
    if (art) onSelectArtwork(art);
  }

  function updateReticleHover() {
    if (!locked || rendererXrActive()) {
      clearHover();
      return;
    }
    const art = pickArtworkFromCenter();
    if (art) setHover(art);
    else clearHover();
  }

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const wish = new THREE.Vector3();
  const next = new THREE.Vector3();
  let hoverAccum = 0;

  /**
   * @param {number} dt
   * @param {THREE.WebXRManager} [xr]
   */
  function update(dt, xr) {
    const presenting = !!xr?.isPresenting;
    document.body.classList.toggle("is-xr", presenting);

    if (presenting) {
      clearHover();
      updateXrLocomotion(dt, xr);
      return;
    }

    if (!locked) {
      velocity.set(0, 0, 0);
      return;
    }

    direction.set(0, 0, 0);
    if (keys.forward) direction.z -= 1;
    if (keys.back) direction.z += 1;
    if (keys.left) direction.x -= 1;
    if (keys.right) direction.x += 1;

    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() > 0) forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    wish.set(0, 0, 0);
    wish.addScaledVector(forward, -direction.z);
    wish.addScaledVector(right, direction.x);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(moveSpeed);

    next.copy(player.position);
    next.x += wish.x * dt;
    next.z += wish.z * dt;
    next.y = eyeHeight;
    resolveCollisions(next, colliders);
    player.position.x = next.x;
    player.position.z = next.z;
    player.position.y = 0;

    // Throttle hover raycasts a bit for smoother UX without over-testing
    hoverAccum += dt;
    if (hoverAccum >= 0.05) {
      hoverAccum = 0;
      updateReticleHover();
    }
  }

  const xrMove = new THREE.Vector3();
  const xrRight = new THREE.Vector3();

  function updateXrLocomotion(dt, xr) {
    const session = xr.getSession?.();
    if (!session) return;

    let ax = 0;
    let az = 0;
    for (const source of session.inputSources) {
      const gp = source.gamepad;
      if (!gp?.axes?.length) continue;
      const x = gp.axes[2] ?? gp.axes[0] ?? 0;
      const y = gp.axes[3] ?? gp.axes[1] ?? 0;
      if (Math.abs(x) > Math.abs(ax)) ax = x;
      if (Math.abs(y) > Math.abs(az)) az = y;
    }

    if (Math.abs(ax) < 0.15) ax = 0;
    if (Math.abs(az) < 0.15) az = 0;
    if (!ax && !az) return;

    const xrCam = xr.getCamera();
    xrCam.getWorldDirection(xrMove);
    xrMove.y = 0;
    if (xrMove.lengthSq() > 0) xrMove.normalize();
    xrRight.crossVectors(xrMove, new THREE.Vector3(0, 1, 0)).normalize();

    next.copy(player.position);
    next.addScaledVector(xrMove, -az * moveSpeed * dt);
    next.addScaledVector(xrRight, ax * moveSpeed * dt);
    next.y = eyeHeight;
    resolveCollisions(next, colliders);
    player.position.x = next.x;
    player.position.z = next.z;
    player.position.y = 0;
  }

  function attachXrControllers(renderer, scene) {
    const controller1 = renderer.xr.getController(0);
    const controller2 = renderer.xr.getController(1);
    player.add(controller1);
    player.add(controller2);
    controller1.visible = false;
    controller2.visible = false;

    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -2.5),
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xa67c52 });
    controller1.add(new THREE.Line(lineGeom, lineMat));
    controller2.add(new THREE.Line(lineGeom.clone(), lineMat.clone()));

    renderer.xr.addEventListener("sessionstart", () => {
      controller1.visible = true;
      controller2.visible = true;
      document.body.classList.add("is-xr");
      clearHover();
    });
    renderer.xr.addEventListener("sessionend", () => {
      controller1.visible = false;
      controller2.visible = false;
      document.body.classList.remove("is-xr");
    });

    const onSelect = (event) => {
      const controller = event.target;
      const tempMatrix = new THREE.Matrix4();
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      raycaster.far = selectMaxDist;
      const hits = raycaster.intersectObjects(artworksMeshes, true);
      for (const hit of hits) {
        let obj = hit.object;
        while (obj) {
          if (obj.userData?.kind === "artwork") {
            onSelectArtwork(obj.userData);
            return;
          }
          obj = obj.parent;
        }
      }
    };

    controller1.addEventListener("select", onSelect);
    controller2.addEventListener("select", onSelect);

    return { controller1, controller2 };
  }

  return {
    update,
    setXrActiveGetter,
    attachXrControllers,
    isLocked: () => locked,
  };
}

// ui_cleanup.js
// Prevent UI duplication + fix stacking on small devices

window.UICleanup = (function () {
  const tracked = new Set();

  function ensureContainer() {
    let ui = document.getElementById("ui");

    if (!ui) {
      ui = document.createElement("div");
      ui.id = "ui";
      document.body.appendChild(ui);
    }

    // Apply layout once
    if (!ui.dataset.ready) {
      ui.dataset.ready = "1";

      ui.style.position = "fixed";
      ui.style.left = "0";
      ui.style.right = "0";
      ui.style.bottom = "0";
      ui.style.display = "flex";
      ui.style.flexWrap = "wrap";              // 🔥 allows wrapping
      ui.style.justifyContent = "center";
      ui.style.alignItems = "center";
      ui.style.gap = "8px";
      ui.style.padding = "10px 12px calc(14px + env(safe-area-inset-bottom))";
      ui.style.boxSizing = "border-box";
      ui.style.zIndex = "9999";
      ui.style.maxWidth = "100%";
    }

    return ui;
  }

  function applyResponsiveSizing() {
    const ui = document.getElementById("ui");
    if (!ui) return;

    const buttons = ui.querySelectorAll("button");

    buttons.forEach(btn => {
      btn.style.flex = "1 1 auto";
      btn.style.minWidth = "80px";
      btn.style.maxWidth = "45%";          // 🔥 prevents full-row takeover
      btn.style.fontSize = "clamp(12px, 3vw, 16px)";
      btn.style.padding = "8px 10px";
      btn.style.boxSizing = "border-box";
      btn.style.touchAction = "none";
    });
  }

  function createButton(text, onDown, onUp) {
    const ui = ensureContainer();
    const btn = document.createElement("button");
    btn.textContent = text;

    if (typeof onDown === "function")
      btn.addEventListener("pointerdown", onDown);

    if (typeof onUp === "function") {
      btn.addEventListener("pointerup", onUp);
      btn.addEventListener("pointercancel", onUp);
      btn.addEventListener("pointerleave", onUp);
    }

    ui.appendChild(btn);
    tracked.add(btn);

    applyResponsiveSizing();
    return btn;
  }

  function cleanup() {
    tracked.forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    tracked.clear();
  }

  window.addEventListener("resize", applyResponsiveSizing);
  window.addEventListener("orientationchange", applyResponsiveSizing);

  return {
    createButton,
    cleanup
  };
})();
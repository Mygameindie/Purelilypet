// canvas_fix.js
// Auto-resize canvas correctly for portrait & landscape
// Prevents blur and handles devicePixelRatio properly

(function () {
  const canvas = document.getElementById("canvas");
  if (!canvas) {
    console.warn("canvas_fix.js: No canvas with id='canvas' found.");
    return;
  }

  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // Set internal resolution
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    // Set visible size
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssHeight + "px";

    // Scale context to avoid blur
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Optional: notify game if needed
    if (typeof window.onGameResize === "function") {
      window.onGameResize(cssWidth, cssHeight);
    }
  }

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", resizeCanvas);

  resizeCanvas();
})();
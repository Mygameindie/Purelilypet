// ui_cleanup.js
// Prevents buttons/UI stacking when switching modes

window.UICleanup = (function () {
  const trackedElements = new Set();

  function track(element) {
    if (!element) return element;
    trackedElements.add(element);
    return element;
  }

  function cleanup() {
    trackedElements.forEach(el => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    trackedElements.clear();
  }

  return {
    track,
    cleanup
  };
})();
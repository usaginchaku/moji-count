// Keep touch scrolling and text entry available while disabling pinch zoom.
document.addEventListener('gesturestart', event => event.preventDefault(), {passive:false});
document.addEventListener('gesturechange', event => event.preventDefault(), {passive:false});
document.addEventListener('touchmove', event => {
  if (event.touches.length > 1) event.preventDefault();
}, {passive:false});

// Move between pages: works with a finger, a mouse drag, or a two-finger trackpad swipe.
// Swipe left = next page, swipe right = previous page.
// Keep scrolling down at the bottom of a page = next page, scroll up at the top = previous page.
// The page order comes from the menu, so adding a page to the menu adds it here too.

const links = Array.from(document.querySelectorAll(".site-nav a"));
const current = links.findIndex((link) => link.getAttribute("aria-current") === "page");
let leaving = false;

// wrap = true: past Contact goes back to Home, and the other way round
function goTo(step, wrap = true) {
  if (current === -1 || leaving) return;
  let next = current + step;
  if (wrap) {
    next = (next + links.length) % links.length;
  } else if (next < 0 || next >= links.length) {
    return; // already on the first or last page
  }
  leaving = true;
  window.location.href = links[next].href;
}

// ---------- Scrolling past the end of a page ----------
const openedAt = Date.now();
let pushY = 0;
let pushTimer;

function atBottom() {
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
}

function atTop() {
  return window.scrollY <= 0;
}

// Adds up how far someone keeps scrolling after hitting the bottom (or top),
// so one small scroll doesn't change the page by accident
function pushPastEdge(amount) {
  // Ignore the first second on a new page, so one long scroll doesn't fly through every page
  if (Date.now() - openedAt < 1000) return;
  if ((amount > 0 && !atBottom()) || (amount < 0 && !atTop())) {
    pushY = 0;
    return;
  }
  pushY += amount;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushY = 0; }, 400);
  if (pushY > 250) goTo(1, false);
  if (pushY < -250) goTo(-1, false);
}

// Mouse wheel, or two fingers up/down on a trackpad
document.addEventListener("wheel", (event) => {
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
  // Some browsers count wheel steps in lines instead of pixels
  const pixels = event.deltaMode === 1 ? event.deltaY * 40 : event.deltaY;
  pushPastEdge(pixels);
}, { passive: true });

// A finger on a phone: pushing the page up at the bottom, or down at the top
let edgeStartY = null;
let startedAtBottom = false;
let startedAtTop = false;

document.addEventListener("touchstart", (event) => {
  edgeStartY = event.target.closest("input, textarea") ? null : event.touches[0].clientY;
  startedAtBottom = atBottom();
  startedAtTop = atTop();
}, { passive: true });

document.addEventListener("touchend", (event) => {
  if (edgeStartY === null || Date.now() - openedAt < 1000) return;
  // Positive = finger moved up = scrolling down
  const scrolled = edgeStartY - event.changedTouches[0].clientY;
  if (scrolled > 120 && startedAtBottom) goTo(1, false);
  if (scrolled < -120 && startedAtTop) goTo(-1, false);
}, { passive: true });

// ---------- Finger or mouse: press, drag sideways, let go ----------
let startX = 0;
let startY = 0;
let tracking = false;

document.addEventListener("pointerdown", (event) => {
  // Don't swipe while someone is typing in the form or pressing a button
  tracking = !event.target.closest("input, textarea, button");
  startX = event.clientX;
  startY = event.clientY;
});

document.addEventListener("pointerup", (event) => {
  if (!tracking) return;
  tracking = false;

  const moveX = event.clientX - startX;
  const moveY = event.clientY - startY;

  // Only count it as a swipe if it moved far enough sideways,
  // and more sideways than up/down (so normal scrolling still works)
  if (Math.abs(moveX) < 80 || Math.abs(moveX) < Math.abs(moveY) * 2) return;

  goTo(moveX < 0 ? 1 : -1);
});

// ---------- The hint bubble: swipe it down (or drag it down with the mouse) to hide it ----------
const hint = document.querySelector(".swipe-hint");

function hideHint() {
  if (!hint.classList.contains("show")) return; // already hidden
  hint.classList.remove("show");
  // Remember it on this device, so it stays hidden on the other pages too
  try { localStorage.setItem("swipeHintHidden", "yes"); } catch (error) {}
}

if (hint) {
  let hidden = false;
  try { hidden = localStorage.getItem("swipeHintHidden") === "yes"; } catch (error) {}
  if (!hidden) {
    // Wait a moment so it slides in instead of just appearing
    setTimeout(() => hint.classList.add("show"), 400);
  }

  let hintStartY = 0;
  hint.addEventListener("pointerdown", (event) => {
    hintStartY = event.clientY;
    // Keep listening even if the finger or mouse leaves the bubble while dragging
    // (but not on the × button, or its click would get lost)
    if (!event.target.closest("button")) hint.setPointerCapture(event.pointerId);
  });
  hint.addEventListener("pointerup", (event) => {
    if (event.clientY - hintStartY > 30) hideHint();
  });

  hint.querySelector(".hint-close").addEventListener("click", hideHint);

  // No pressing needed: just moving the mouse down across the bubble hides it
  let hoverY = 0;
  hint.addEventListener("pointerenter", () => { hoverY = 0; });
  hint.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || event.buttons !== 0) return;
    hoverY += event.movementY;
    if (hoverY > 15) hideHint();
  });

  // Scrolling the page also hides it: a finger moving up or down on a phone...
  let fingerStartY = null;
  document.addEventListener("touchstart", (event) => {
    fingerStartY = event.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchmove", (event) => {
    if (fingerStartY !== null && Math.abs(event.touches[0].clientY - fingerStartY) > 30) hideHint();
  }, { passive: true });

  // ...or the mouse wheel / two fingers up or down on a trackpad
  document.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) hideHint();
  }, { passive: true });
}

// Stop the browser from dragging the photos around instead of swiping
document.addEventListener("dragstart", (event) => event.preventDefault());

// ---------- Trackpad: two-finger swipe sideways ----------
let wheelX = 0;
let wheelTimer;

document.addEventListener("wheel", (event) => {
  // Ignore normal up/down scrolling
  if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;

  wheelX += event.deltaX;
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => { wheelX = 0; }, 300);

  if (Math.abs(wheelX) > 150) {
    goTo(wheelX > 0 ? 1 : -1);
  }
}, { passive: true });

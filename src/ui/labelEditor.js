// src/ui/labelEditor.js - add map labels by hand (no internet needed). Open the page with ?label=1 in the address,
// then Shift+click a spot, type the name, and the full labels.json text is copied to your clipboard each time.
export function enableLabelEditor(svg, places, redraw) {
  svg.addEventListener("click", ev => {
    if (!ev.shiftKey) return;                                  // plain clicks still run the route test
    ev.stopImmediatePropagation();
    const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
    const m = p.matrixTransform(svg.getScreenCTM().inverse()); // screen pixels -> map metres
    const name = prompt("Label text (leave empty to cancel):");
    if (!name) return;
    const kind = confirm("OK = landmark (dot + small text)\nCancel = area name (large italic text)") ? "landmark" : "place";
    places.push({ name, kind, x: Math.round(m.x), y: Math.round(m.y) });
    redraw();
    const json = JSON.stringify(places, null, 1);
    navigator.clipboard?.writeText(json);
    console.log("labels.json (also copied to clipboard):\n" + json);
  }, true);                                                    // capture phase: runs before the route-test click handler
}
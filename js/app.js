/* app.js — viewer, tools, XYZ and undo for Avogadro Simple.
   Depends on chemistry.js (EL, EL_ORDER, A, Bd, dist3, idealLen,
   bondOrderSum, canBond, formulaFor, molarMassFor) and molecules.js
   (PRESETS). No external JS dependencies. */

"use strict";

/* ============ State ============ */
var mol = { atoms: [], bonds: [] };
var tool = "navigate", view = "ball", curEl = "C", curOrder = 1;
var selected = -1, bondFirst = -1, measureSel = [], undoStack = [];
var rotX = -0.45, rotY = 0.6, zoomScale = 1, spinning = true, showLabels = false, presetName = "Water";
var cv = document.getElementById("cv"), ctx = cv.getContext("2d");

function clone(m) { return JSON.parse(JSON.stringify(m)); }
function pushHist() {
  undoStack.push(clone(mol));
  if (undoStack.length > 60) undoStack.shift();
}
function toast(msg, err) {
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "show" + (err ? " err" : "");
  clearTimeout(t._h);
  t._h = setTimeout(function () { t.className = ""; }, 2600);
}

/* One place that clears every piece of transient tool state.
   FIX (single-file audit): erase and clear used to leave bondFirst and
   measureSel pointing at deleted atoms, so the next bond tap could
   dereference mol.atoms[staleIndex] and throw. Every state-changing
   action below goes through resetToolState, except loadPreset/undo
   which set the same fields explicitly. */
function resetToolState() {
  selected = -1;
  bondFirst = -1;
  measureSel = [];
  document.getElementById("measureBox").style.display = "none";
}

/* After an atom is deleted, shift the remaining tool indices down.
   Called only by the erase handler; other actions reset outright. */
function remapToolStateAfterErase(removed) {
  if (selected === removed) selected = -1;
  else if (selected > removed) selected -= 1;
  if (bondFirst === removed) bondFirst = -1;
  else if (bondFirst > removed) bondFirst -= 1;
  measureSel = measureSel
    .filter(function (i) { return i !== removed; })
    .map(function (i) { return i > removed ? i - 1 : i; });
  if (measureSel.length < 2) document.getElementById("measureBox").style.display = "none";
}

/* ============ Readout ============ */
function updateReadout() {
  document.getElementById("formula").textContent = mol.atoms.length ? formulaFor(mol.atoms) : "—";
  document.getElementById("mass").textContent = mol.atoms.length ? molarMassFor(mol.atoms).toFixed(2) + " g/mol" : "—";
  document.getElementById("acount").textContent = mol.atoms.length;
  refreshXYZ();
}

function updateSelInfo() {
  var el = document.getElementById("selInfo");
  if (selected < 0 || !mol.atoms[selected]) { el.textContent = "Nothing selected."; return; }
  var a = mol.atoms[selected];
  el.textContent = "Atom " + (selected + 1) + ": " + a.el + " — " + EL[a.el].name +
    " · bonds used " + bondOrderSum(mol, selected) + " of " + EL[a.el].val;
}

/* ============ Load / presets UI ============ */
function loadPreset(p) {
  pushHist();
  mol = clone(p);
  presetName = p.name;
  resetToolState();
  document.querySelectorAll(".pbtn").forEach(function (b) {
    b.setAttribute("aria-pressed", b.dataset.name === p.name ? "true" : "false");
  });
  updateReadout(); updateSelInfo(); setHint(); draw();
}

var prow = document.getElementById("presets");
PRESETS.forEach(function (p) {
  var counts = {};
  p.atoms.forEach(function (a) { counts[a.el] = (counts[a.el] || 0) + 1; });
  var b = document.createElement("button");
  b.className = "pbtn";
  b.dataset.name = p.name;
  b.setAttribute("aria-pressed", "false");
  b.innerHTML = p.name + "<small>" + Object.keys(counts).length + " elements · " + p.atoms.length + " atoms</small>";
  b.addEventListener("click", function () { loadPreset(p); toast(p.name + " loaded"); });
  prow.appendChild(b);
});

/* Element picker */
var egrid = document.getElementById("elements");
EL_ORDER.forEach(function (sym) {
  var e = EL[sym];
  var b = document.createElement("button");
  b.className = "ebtn";
  b.style.background = e.color;
  b.style.color = e.tc;
  b.dataset.el = sym;
  b.setAttribute("aria-pressed", sym === curEl ? "true" : "false");
  b.innerHTML = sym + "<small>" + e.name + "</small>";
  b.addEventListener("click", function () {
    curEl = sym;
    document.querySelectorAll(".ebtn").forEach(function (x) {
      x.setAttribute("aria-pressed", x.dataset.el === sym ? "true" : "false");
    });
    if (tool !== "draw" && tool !== "bond") setTool("draw");
    toast(e.name + " picked — tap the picture to add it, or drag from an atom to add it bonded.");
  });
  egrid.appendChild(b);
});

/* Tools */
var HINTS = {
  navigate: "Drag to spin the molecule. Scroll or pinch to zoom.",
  select: "Tap an atom to see what it is.",
  draw: "Tap empty space to add a new atom. Drag from an atom to grow a bonded atom.",
  bond: "Tap one atom, then a second atom, to join them with the bond type picked below.",
  measure: "Tap 2 atoms for a distance. Tap 3 atoms for an angle.",
  erase: "Tap an atom to remove it. Tap the middle of a bond to remove just the bond."
};
function setHint() { document.getElementById("hint").textContent = HINTS[tool]; }
function setTool(t) {
  tool = t;
  bondFirst = -1;
  if (t !== "measure") {
    measureSel = [];
    document.getElementById("measureBox").style.display = "none";
  }
  document.querySelectorAll("#tools .tbtn").forEach(function (b) {
    b.setAttribute("aria-pressed", b.dataset.tool === t ? "true" : "false");
  });
  setHint(); draw();
}
document.querySelectorAll("#tools .tbtn").forEach(function (b) {
  b.addEventListener("click", function () { setTool(b.dataset.tool); });
});
document.querySelectorAll("#bondOrder button").forEach(function (b) {
  b.addEventListener("click", function () {
    curOrder = +b.dataset.order;
    document.querySelectorAll("#bondOrder button").forEach(function (x) {
      x.setAttribute("aria-pressed", x === b ? "true" : "false");
    });
  });
});
document.querySelectorAll("#views button").forEach(function (b) {
  b.addEventListener("click", function () {
    view = b.dataset.view;
    document.querySelectorAll("#views button").forEach(function (x) {
      x.setAttribute("aria-pressed", x === b ? "true" : "false");
    });
    draw();
  });
});

/* ============ 3D rendering (canvas 2D, projected) ============ */
function fitCanvas() {
  var r = cv.getBoundingClientRect();
  var d = window.devicePixelRatio || 1;
  cv.width = r.width * d;
  cv.height = r.height * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
}
window.addEventListener("resize", function () { fitCanvas(); draw(); });

function scaleFor() {
  return 46 * zoomScale * (+document.getElementById("zoom").value / 100);
}
/* FIX (audit): the single-file proj() called getBoundingClientRect()
   once per atom per frame. draw() now measures the canvas once and
   passes rect + scale into proj(), pickAtom() and pickBond(). */
function proj(a, r, s) {
  var cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
  var x1 = a.x * cy + a.z * sy, z1 = -a.x * sy + a.z * cy;
  var y2 = a.y * cx - z1 * sx, z2 = a.y * sx + z1 * cx;
  var persp = 1 / (1 + z2 * 0.035);
  return { x: r.width / 2 + x1 * s * persp, y: r.height / 2 + y2 * s * persp, z: z2, s: persp };
}
function atomRadius(a) {
  if (view === "space") return EL[a.el].vdw * 26;
  if (view === "stick") return 9;
  return (a.el === "H" ? 13 : 19);
}
function draw() {
  var r = cv.getBoundingClientRect();
  var s = scaleFor();
  ctx.clearRect(0, 0, r.width, r.height);
  if (!mol.atoms.length) {
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
    ctx.font = "17px Atkinson Hyperlegible, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Empty — tap a molecule above, or use Add atom.", r.width / 2, r.height / 2);
    return;
  }
  var P = mol.atoms.map(function (a) { return proj(a, r, s); });
  if (view !== "space") {
    mol.bonds.forEach(function (b) {
      var p = P[b.a], q = P[b.b];
      if (!p || !q) return;
      var dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1;
      var nx = -dy / L, ny = dx / L;
      ctx.strokeStyle = "#7d8a83";
      ctx.lineCap = "round";
      var offs = b.o === 1 ? [0] : b.o === 2 ? [-3.4, 3.4] : [-6, 0, 6];
      var w = view === "stick" ? 7 : 5;
      offs.forEach(function (o) {
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(p.x + nx * o, p.y + ny * o);
        ctx.lineTo(q.x + nx * o, q.y + ny * o);
        ctx.stroke();
      });
    });
  }
  var order = mol.atoms.map(function (a, i) { return i; }).sort(function (i, j) { return P[i].z - P[j].z; });
  order.forEach(function (i) {
    var a = mol.atoms[i], p = P[i], rad = atomRadius(a) * p.s, e = EL[a.el];
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(rad, 3), 0, Math.PI * 2);
    ctx.fillStyle = e.color;
    ctx.fill();
    var hot = (i === selected || i === bondFirst || measureSel.indexOf(i) >= 0);
    ctx.lineWidth = hot ? 3.5 : 1.2;
    ctx.strokeStyle = hot ? "#ff8c1a" : "rgba(0,0,0,.35)";
    ctx.stroke();
    if (showLabels || view !== "space") {
      ctx.fillStyle = e.tc;
      ctx.font = "700 " + Math.max(rad * 0.85, 9) + "px Atkinson Hyperlegible, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (showLabels || rad > 11) ctx.fillText(a.el, p.x, p.y);
    }
  });
  if (measureSel.length >= 2) {
    ctx.strokeStyle = "#ff8c1a";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    measureSel.forEach(function (i, k) {
      var p = P[i];
      if (!p) return;
      if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
function pickAtom(mx, my) {
  var r = cv.getBoundingClientRect(), s = scaleFor();
  var best = -1, bd = 1e9;
  mol.atoms.forEach(function (a, i) {
    var p = proj(a, r, s);
    var d = Math.hypot(p.x - mx, p.y - my);
    var rad = Math.max(atomRadius(a) * p.s, 14);
    if (d < rad + 6 && d < bd) { bd = d; best = i; }
  });
  return best;
}
function pickBond(mx, my) {
  var r = cv.getBoundingClientRect(), s = scaleFor();
  var best = -1, bd = 16;
  mol.bonds.forEach(function (b, bi) {
    var p = proj(mol.atoms[b.a], r, s), q = proj(mol.atoms[b.b], r, s);
    var L2 = (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y);
    var t = L2 ? Math.max(0, Math.min(1, ((mx - p.x) * (q.x - p.x) + (my - p.y) * (q.y - p.y)) / L2)) : 0;
    var d = Math.hypot(mx - (p.x + t * (q.x - p.x)), my - (p.y + t * (q.y - p.y)));
    if (d < bd) { bd = d; best = bi; }
  });
  return best;
}
function screenToWorld(mx, my) {
  /* Inverse of proj() for a point on the z = 0 plane. The full inverse
     needs a depth, which a 2D tap cannot supply, so this is an
     approximation — it is accurate enough to place a new atom, and the
     bonded-grow path below then snaps it to the ideal bond length. */
  var r = cv.getBoundingClientRect(), s = scaleFor();
  var x = (mx - r.width / 2) / s, y = (my - r.height / 2) / s;
  var cy = Math.cos(-rotY), sy = Math.sin(-rotY), cx = Math.cos(-rotX), sx = Math.sin(-rotX);
  var y2 = y * cx, z2 = y * sx;
  return { x: x * cy, y: y2, z: -x * sy + z2 * 0 };
}

/* ============ Pointer interaction (drag, tap, pinch zoom) ============ */
var drag = null;
var activePointers = new Map();
var pinch = null;

cv.addEventListener("pointerdown", function (ev) {
  cv.setPointerCapture(ev.pointerId);
  activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  /* FIX (audit): the single-file hint promised "pinch to zoom" but
     only implemented wheel zoom, so pinch did nothing on mobile.
     Two active pointers now start a pinch; the single-pointer drag
     is cancelled for its duration and restored afterwards. */
  if (activePointers.size === 2) {
    var pts = Array.from(activePointers.values());
    pinch = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, zoom: zoomScale };
    drag = null;
    return;
  }
  if (activePointers.size > 2) return;
  var r = cv.getBoundingClientRect();
  var mx = ev.clientX - r.left, my = ev.clientY - r.top;
  var hit = pickAtom(mx, my);
  drag = { x: mx, y: my, hit: hit, moved: false, pointerId: ev.pointerId };
  if (tool === "select") { selected = hit; updateSelInfo(); draw(); }
  else if (tool === "erase" && hit >= 0) {
    pushHist();
    var removed = hit;
    mol.atoms.splice(hit, 1);
    mol.bonds = mol.bonds.filter(function (b) { return b.a !== removed && b.b !== removed; })
      .map(function (b) { return { a: b.a > removed ? b.a - 1 : b.a, b: b.b > removed ? b.b - 1 : b.b, o: b.o }; });
    remapToolStateAfterErase(removed);
    updateReadout(); updateSelInfo();
    toast("Atom removed");
    drag = null; draw();
  }
  else if (tool === "bond") {
    if (hit >= 0) {
      if (bondFirst < 0 || bondFirst >= mol.atoms.length) {
        bondFirst = hit; selected = hit;
        toast("Now tap a second atom to join them.");
      } else if (hit !== bondFirst) {
        var ex = -1;
        mol.bonds.forEach(function (b, i) {
          if ((b.a === bondFirst && b.b === hit) || (b.a === hit && b.b === bondFirst)) ex = i;
        });
        var oldOrder = ex >= 0 ? mol.bonds[ex].o : 0;
        var need = curOrder - oldOrder;
        if (need > 0 && (!canBond(mol, bondFirst, need) || !canBond(mol, hit, need))) {
          var full = canBond(mol, bondFirst, need) ? hit : bondFirst;
          toast("That would give an atom too many bonds. " + EL[mol.atoms[full].el].name + " is full.", true);
        } else {
          pushHist();
          if (ex >= 0) {
            mol.bonds[ex].o = curOrder;
            toast(oldOrder === curOrder ? "That bond already exists." : "Bond changed to " + (curOrder === 1 ? "single." : curOrder === 2 ? "double." : "triple."));
          } else {
            mol.bonds.push(Bd(bondFirst, hit, curOrder));
            toast("Bond made");
          }
        }
        bondFirst = -1; updateSelInfo(); draw();
      } else { bondFirst = -1; draw(); }
    } else { bondFirst = -1; draw(); }
  }
  else if (tool === "measure" && hit >= 0) {
    if (measureSel.indexOf(hit) >= 0) {
      toast("That atom is already in this measurement — tap a different atom.");
    } else {
      measureSel.push(hit);
      if (measureSel.length > 3) measureSel = [hit];
      showMeasure(); selected = hit; updateSelInfo(); draw();
    }
  }
});

cv.addEventListener("pointermove", function (ev) {
  if (activePointers.has(ev.pointerId)) activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pinch && activePointers.size === 2) {
    var pts = Array.from(activePointers.values());
    var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
    zoomScale = Math.max(0.45, Math.min(2.4, pinch.zoom * (d / pinch.dist)));
    draw();
    return;
  }
  if (!drag || ev.pointerId !== drag.pointerId) return;
  var r = cv.getBoundingClientRect();
  var mx = ev.clientX - r.left, my = ev.clientY - r.top;
  var dx = mx - drag.x, dy = my - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
  if (tool === "navigate" && drag.moved) {
    rotY += dx * 0.012; rotX += dy * 0.012;
    drag.x = mx; drag.y = my; draw();
  } else if (tool === "draw" && drag.hit >= 0 && drag.moved) {
    draw();
  }
});

function endPointer(ev) {
  activePointers.delete(ev.pointerId);
  if (pinch && activePointers.size < 2) pinch = null;
  if (!drag || ev.pointerId !== drag.pointerId) return;
  var r = cv.getBoundingClientRect();
  var mx = ev.clientX - r.left, my = ev.clientY - r.top;
  var d = drag; drag = null;
  if (tool === "draw") {
    if (d.hit >= 0 && d.moved) {
      /* Drag from an atom: grow a bonded atom, snapped to the ideal
         bond length along the drag direction. FIX (audit): the
         single-file version left a near-zero bond when the drag was
         only just over the 4px moved threshold (L <= 0.2 was not
         rescaled), so the new atom landed on top of the old one. */
      var w = screenToWorld(mx, my);
      var src = mol.atoms[d.hit];
      var dx = w.x - src.x, dy = w.y - src.y;
      var L = Math.hypot(dx, dy);
      var idl = idealLen(src.el, curEl, curOrder);
      var ux = L > 0.01 ? dx / L : 1, uy = L > 0.01 ? dy / L : 0;
      var na = { el: curEl, x: src.x + ux * idl, y: src.y + uy * idl, z: src.z };
      /* FIX (audit): the old code checked only the source atom's
         valence, so dragging e.g. a triple bond onto a new hydrogen
         created H with bond order 3. Both ends are checked now. */
      if (curOrder > EL[curEl].val) {
        toast(EL[curEl].name + " can only hold " + EL[curEl].val + " bond" + (EL[curEl].val === 1 ? "" : "s") + " — a " + (curOrder === 2 ? "double" : "triple") + " bond is too much.", true);
        return;
      }
      if (!canBond(mol, d.hit, curOrder)) {
        toast(EL[src.el].name + " already has all its bonds.", true);
        return;
      }
      pushHist();
      mol.atoms.push(na);
      mol.bonds.push(Bd(d.hit, mol.atoms.length - 1, curOrder));
      selected = mol.atoms.length - 1;
      updateReadout(); updateSelInfo();
      toast(curEl + " added, bonded");
      draw();
    } else if (d.hit < 0 && !d.moved) {
      var w2 = screenToWorld(mx, my);
      pushHist();
      mol.atoms.push({ el: curEl, x: w2.x, y: w2.y, z: 0 });
      selected = mol.atoms.length - 1;
      presetName = "";
      document.querySelectorAll(".pbtn").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      updateReadout(); updateSelInfo();
      toast(curEl + " added — use Make bond to join it");
      draw();
    }
  }
  else if (tool === "erase" && d.hit < 0 && !d.moved) {
    var bi = pickBond(mx, my);
    if (bi >= 0) { pushHist(); mol.bonds.splice(bi, 1); toast("Bond removed"); draw(); }
  }
  else if (tool === "navigate") { draw(); }
}
cv.addEventListener("pointerup", endPointer);
cv.addEventListener("pointercancel", endPointer);
cv.addEventListener("wheel", function (ev) {
  ev.preventDefault();
  zoomScale = Math.max(0.45, Math.min(2.4, zoomScale * (ev.deltaY < 0 ? 1.08 : 0.93)));
  draw();
}, { passive: false });

function showMeasure() {
  var box = document.getElementById("measureBox");
  if (measureSel.length === 2) {
    var d = dist3(mol.atoms[measureSel[0]], mol.atoms[measureSel[1]]);
    box.style.display = "block";
    box.textContent = "Distance: " + mol.atoms[measureSel[0]].el + (measureSel[0] + 1) + " — " + mol.atoms[measureSel[1]].el + (measureSel[1] + 1) + " = " + d.toFixed(2) + " Å";
  } else if (measureSel.length === 3) {
    var a = mol.atoms[measureSel[0]], b = mol.atoms[measureSel[1]], c = mol.atoms[measureSel[2]];
    var v1 = [a.x - b.x, a.y - b.y, a.z - b.z], v2 = [c.x - b.x, c.y - b.y, c.z - b.z];
    var dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
    var m1 = Math.hypot(v1[0], v1[1], v1[2]), m2 = Math.hypot(v2[0], v2[1], v2[2]);
    var ang = Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * 180 / Math.PI;
    box.style.display = "block";
    box.textContent = "Angle at " + mol.atoms[measureSel[1]].el + (measureSel[1] + 1) + ": " + ang.toFixed(1) + "°  ·  distances " + m1.toFixed(2) + " Å and " + m2.toFixed(2) + " Å";
  }
}

/* ============ Actions: cleanup, undo, clear ============ */
document.getElementById("cleanup").addEventListener("click", function () {
  if (mol.atoms.length < 2) { toast("Add a molecule first."); return; }
  pushHist();
  for (var it = 0; it < 140; it++) {
    var F = mol.atoms.map(function () { return [0, 0, 0]; });
    mol.bonds.forEach(function (b) {
      var a = mol.atoms[b.a], c = mol.atoms[b.b];
      var d = dist3(a, c) || 0.01;
      var idl = idealLen(a.el, c.el, b.o);
      var f = (d - idl) * 0.28;
      var ux = (c.x - a.x) / d, uy = (c.y - a.y) / d, uz = (c.z - a.z) / d;
      F[b.a][0] += ux * f; F[b.a][1] += uy * f; F[b.a][2] += uz * f;
      F[b.b][0] -= ux * f; F[b.b][1] -= uy * f; F[b.b][2] -= uz * f;
    });
    for (var i = 0; i < mol.atoms.length; i++) for (var j = i + 1; j < mol.atoms.length; j++) {
      var bonded = mol.bonds.some(function (b) { return (b.a === i && b.b === j) || (b.a === j && b.b === i); });
      if (bonded) continue;
      var a2 = mol.atoms[i], c2 = mol.atoms[j];
      var d2 = dist3(a2, c2);
      var min = (EL[a2.el].cov + EL[c2.el].cov) * 1.15;
      if (d2 < min && d2 > 0.01) {
        var push = (min - d2) * 0.12;
        var ux2 = (c2.x - a2.x) / d2, uy2 = (c2.y - a2.y) / d2, uz2 = (c2.z - a2.z) / d2;
        F[i][0] -= ux2 * push; F[i][1] -= uy2 * push; F[i][2] -= uz2 * push;
        F[j][0] += ux2 * push; F[j][1] += uy2 * push; F[j][2] += uz2 * push;
      }
    }
    mol.atoms.forEach(function (a, k) { a.x += F[k][0]; a.y += F[k][1]; a.z += F[k][2]; });
  }
  var cx = 0, cy2 = 0, cz = 0;
  mol.atoms.forEach(function (a) { cx += a.x; cy2 += a.y; cz += a.z; });
  cx /= mol.atoms.length; cy2 /= mol.atoms.length; cz /= mol.atoms.length;
  mol.atoms.forEach(function (a) { a.x -= cx; a.y -= cy2; a.z -= cz; });
  toast("Shape tidied — bond lengths set to normal values.");
  draw();
});
document.getElementById("undo").addEventListener("click", function () {
  if (!undoStack.length) { toast("Nothing to undo."); return; }
  mol = undoStack.pop();
  resetToolState();
  updateReadout(); updateSelInfo(); draw();
  toast("Undone");
});
document.getElementById("clear").addEventListener("click", function () {
  if (!mol.atoms.length) return;
  pushHist();
  mol = { atoms: [], bonds: [] };
  resetToolState();
  document.querySelectorAll(".pbtn").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
  updateReadout(); updateSelInfo(); draw();
});

/* ============ Advanced: XYZ ============ */
document.getElementById("advToggle").addEventListener("change", function (e) {
  document.getElementById("adv").hidden = !e.target.checked;
  if (e.target.checked) refreshXYZ();
});
document.getElementById("spinChk").addEventListener("change", function (e) { spinning = e.target.checked; });
document.getElementById("labelChk").addEventListener("change", function (e) { showLabels = e.target.checked; draw(); });
document.getElementById("zoom").addEventListener("input", draw);

function xyzText() {
  var lines = [String(mol.atoms.length), (presetName || plainFormulaFor(mol.atoms)) + "  Avogadro Simple"];
  mol.atoms.forEach(function (a) {
    lines.push(a.el + " " + a.x.toFixed(4) + " " + a.y.toFixed(4) + " " + a.z.toFixed(4));
  });
  return lines.join("\n");
}
function refreshXYZ() {
  if (!document.getElementById("adv").hidden) document.getElementById("xyz").value = mol.atoms.length ? xyzText() : "";
}
document.getElementById("xyzRefresh").addEventListener("click", function () { refreshXYZ(); toast("XYZ updated"); });
document.getElementById("xyzDownload").addEventListener("click", function () {
  if (!mol.atoms.length) { toast("Nothing to download yet.", true); return; }
  refreshXYZ();
  var blob = new Blob([xyzText()], { type: "text/plain" });
  var aEl = document.createElement("a");
  aEl.href = URL.createObjectURL(blob);
  aEl.download = (presetName || "molecule").toLowerCase().replace(/\s+/g, "-") + ".xyz";
  aEl.click();
  setTimeout(function () { URL.revokeObjectURL(aEl.href); }, 2000);
  toast("XYZ downloaded — it opens in desktop Avogadro");
});
document.getElementById("xyzCopy").addEventListener("click", function () {
  refreshXYZ();
  var t = xyzText();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(function () { toast("XYZ copied"); }, function () { toast("Copy blocked — select the text and copy it.", true); });
  } else toast("Copy blocked — select the text and copy it.", true);
});

/* FIX (audit): the single-file importXYZ() trusted its input — a line
   with fewer than 4 fields or non-numeric coordinates produced NaN
   atoms (or a raw TypeError for a truncated file), and n <= 0 produced
   an empty molecule with a misleading "loaded" toast. Every field is
   validated here and failures carry a plain-language line number. */
function importXYZ(text) {
  if (typeof text !== "string" || !text.trim()) throw new Error("Paste XYZ text first, or open an .xyz file.");
  var lines = text.split(/\r?\n/).filter(function (l) { return l.trim().length; });
  var n = parseInt(lines[0], 10);
  if (isNaN(n) || n < 1) throw new Error("The first line must be the atom count (a whole number of 1 or more).");
  /* The second line is a comment in standard XYZ. If the file has
     exactly n + 1 lines, there is no comment line. */
  var start = lines.length >= n + 2 ? 2 : 1;
  if (start + n > lines.length) {
    throw new Error("XYZ file is truncated: the header says " + n + " atoms but only " + (lines.length - start) + " atom line(s) were found.");
  }
  var atoms = [];
  for (var i = 0; i < n; i++) {
    var parts = lines[start + i].trim().split(/\s+/);
    if (parts.length < 4) throw new Error("Line " + (start + i + 1) + ": expected '<element> x y z', got '" + lines[start + i].trim() + "'.");
    var sym = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    if (!EL[sym]) throw new Error("Line " + (start + i + 1) + ": element '" + parts[0] + "' is not in the 12-element picker.");
    var x = +parts[1], y = +parts[2], z = +parts[3];
    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) throw new Error("Line " + (start + i + 1) + ": coordinates must be numbers.");
    atoms.push({ el: sym, x: x, y: y, z: z });
  }
  /* XYZ carries no bond information, so bonds are inferred from
     distance (covalent radii × 1.30) and capped by valence, all
     single bonds. A re-imported molecule therefore keeps its formula
     but loses double/triple bond orders — see README. */
  var bonds = [];
  for (var a = 0; a < atoms.length; a++) for (var b = a + 1; b < atoms.length; b++) {
    var d = dist3(atoms[a], atoms[b]);
    var max = (EL[atoms[a].el].cov + EL[atoms[b].el].cov) * 1.30;
    if (d < max && d > 0.4) {
      var sa = 0, sb = 0;
      bonds.forEach(function (xb) {
        if (xb.a === a || xb.b === a) sa += xb.o;
        if (xb.a === b || xb.b === b) sb += xb.o;
      });
      if (sa + 1 <= EL[atoms[a].el].val && sb + 1 <= EL[atoms[b].el].val) bonds.push({ a: a, b: b, o: 1 });
    }
  }
  pushHist();
  mol = { atoms: atoms, bonds: bonds };
  presetName = "";
  resetToolState();
  document.querySelectorAll(".pbtn").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
  var cx = 0, cy = 0, cz = 0;
  atoms.forEach(function (a) { cx += a.x; cy += a.y; cz += a.z; });
  cx /= atoms.length; cy /= atoms.length; cz /= atoms.length;
  atoms.forEach(function (a) { a.x -= cx; a.y -= cy; a.z -= cz; });
  updateReadout(); updateSelInfo(); draw();
  toast("XYZ loaded: " + atoms.length + " atoms, " + bonds.length + " bonds found");
}
document.getElementById("xyzImport").addEventListener("click", function () {
  try { importXYZ(document.getElementById("xyz").value); }
  catch (e) { toast("That XYZ did not load: " + e.message, true); }
});
document.getElementById("xyzFile").addEventListener("change", function (e) {
  var f = e.target.files[0];
  if (!f) return;
  var rd = new FileReader();
  rd.onload = function () {
    try { importXYZ(String(rd.result)); }
    catch (err) { toast("That file did not load: " + err.message, true); }
  };
  rd.readAsText(f);
});

/* ============ Spin loop & start ============ */
function loop() {
  if (spinning && tool === "navigate" && !drag && !pinch) { rotY += 0.008; draw(); }
  requestAnimationFrame(loop);
}
fitCanvas();
mol = clone(PRESETS[0]);
presetName = "Water";
document.querySelectorAll(".pbtn").forEach(function (b) {
  b.setAttribute("aria-pressed", b.dataset.name === "Water" ? "true" : "false");
});
updateReadout(); updateSelInfo(); setHint(); draw();
requestAnimationFrame(loop);

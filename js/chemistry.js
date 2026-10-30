/* chemistry.js — pure chemistry data and helpers for Avogadro Simple.
   No DOM access here, so this file can be checked and validated in Node
   as well as loaded in the browser. Element data: standard CPK colours,
   standard atomic weights, and the valence (maximum bond-order sum) used
   to reject chemically impossible bonds.
   P and S are given their expanded-octet valences (5 and 6); N is 3,
   which is correct for the neutral molecules in this app (ammonia,
   caffeine, etc.) — charged species such as ammonium are out of scope. */

var EL = {
  H:  { name: "Hydrogen",  color: "#e8e8e8", tc: "#111", mass: 1.008,  val: 1, cov: 0.31, vdw: 1.20 },
  B:  { name: "Boron",     color: "#ffb5b5", tc: "#111", mass: 10.81,  val: 3, cov: 0.84, vdw: 1.92 },
  C:  { name: "Carbon",    color: "#505050", tc: "#fff", mass: 12.011, val: 4, cov: 0.76, vdw: 1.70 },
  N:  { name: "Nitrogen",  color: "#3050f8", tc: "#fff", mass: 14.007, val: 3, cov: 0.71, vdw: 1.55 },
  O:  { name: "Oxygen",    color: "#ff0d0d", tc: "#fff", mass: 15.999, val: 2, cov: 0.66, vdw: 1.52 },
  F:  { name: "Fluorine",  color: "#90e050", tc: "#111", mass: 18.998, val: 1, cov: 0.57, vdw: 1.47 },
  Si: { name: "Silicon",   color: "#f0c8a0", tc: "#111", mass: 28.085, val: 4, cov: 1.11, vdw: 2.10 },
  P:  { name: "Phosphorus", color: "#ff8000", tc: "#111", mass: 30.974, val: 5, cov: 1.07, vdw: 1.80 },
  S:  { name: "Sulfur",    color: "#e8c832", tc: "#111", mass: 32.06,  val: 6, cov: 1.05, vdw: 1.80 },
  Cl: { name: "Chlorine",  color: "#1ff01f", tc: "#111", mass: 35.45,  val: 1, cov: 1.02, vdw: 1.75 },
  Br: { name: "Bromine",   color: "#a62929", tc: "#fff", mass: 79.904, val: 1, cov: 1.20, vdw: 1.85 },
  I:  { name: "Iodine",    color: "#940094", tc: "#fff", mass: 126.90, val: 1, cov: 1.39, vdw: 1.98 }
};

var EL_ORDER = ["H", "C", "N", "O", "B", "F", "Si", "P", "S", "Cl", "Br", "I"];

function A(el, x, y, z) { return { el: el, x: x, y: y, z: z }; }
function Bd(a, b, o) { return { a: a, b: b, o: o || 1 }; }

function dist3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function idealLen(e1, e2, o) {
  var base = EL[e1].cov + EL[e2].cov;
  if (o === 2) base *= 0.87;
  if (o === 3) base *= 0.78;
  return base;
}

/* Sum of bond orders on one atom in a molecule {atoms, bonds}. */
function bondOrderSum(mol, i) {
  var s = 0;
  mol.bonds.forEach(function (b) {
    if (b.a === i || b.b === i) s += b.o;
  });
  return s;
}

function canBond(mol, i, extra) {
  if (i < 0 || i >= mol.atoms.length) return false;
  return bondOrderSum(mol, i) + extra <= EL[mol.atoms[i].el].val;
}

/* Conventional formula order, with unicode subscripts.
   Carbon compounds: C, then H, then the rest alphabetically (Hill).
   No-carbon compounds: N first when present (so ammonia is NH3, not
   the strict-Hill H3N the single-file version printed), otherwise
   alphabetical (so water is H2O). */
var SUBSCRIPTS = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉"
};

function formulaFor(atoms) {
  var c = {};
  atoms.forEach(function (a) { c[a.el] = (c[a.el] || 0) + 1; });
  var ord = [];
  if (c.C) {
    ord.push("C");
    if (c.H) ord.push("H");
  } else if (c.N) {
    ord.push("N");
    if (c.H) ord.push("H");
  }
  Object.keys(c).sort().forEach(function (k) {
    if (ord.indexOf(k) < 0) ord.push(k);
  });
  return ord.map(function (k) {
    if (c[k] <= 1) return k;
    return k + String(c[k]).split("").map(function (d) { return SUBSCRIPTS[d]; }).join("");
  }).join("");
}

/* Plain (non-subscript) formula, used for XYZ comments and tests. */
function plainFormulaFor(atoms) {
  var c = {};
  atoms.forEach(function (a) { c[a.el] = (c[a.el] || 0) + 1; });
  var ord = [];
  if (c.C) {
    ord.push("C");
    if (c.H) ord.push("H");
  } else if (c.N) {
    ord.push("N");
    if (c.H) ord.push("H");
  }
  Object.keys(c).sort().forEach(function (k) {
    if (ord.indexOf(k) < 0) ord.push(k);
  });
  return ord.map(function (k) { return k + (c[k] > 1 ? c[k] : ""); }).join("");
}

function molarMassFor(atoms) {
  var s = 0;
  atoms.forEach(function (a) { s += EL[a.el].mass; });
  return s;
}

/* Return a list of human-readable valence violations, empty when clean.
   Also flags duplicate bonds and out-of-range bond indices. */
function validateMolecule(mol) {
  var problems = [];
  var sums = mol.atoms.map(function () { return 0; });
  var seen = {};
  mol.bonds.forEach(function (b) {
    if (b.a < 0 || b.b < 0 || b.a >= mol.atoms.length || b.b >= mol.atoms.length) {
      problems.push("Bond index out of range: " + b.a + "-" + b.b);
      return;
    }
    if (b.a === b.b) problems.push("Atom bonded to itself: " + b.a);
    var key = Math.min(b.a, b.b) + "-" + Math.max(b.a, b.b);
    if (seen[key]) problems.push("Duplicate bond: " + key);
    seen[key] = true;
    sums[b.a] += b.o;
    sums[b.b] += b.o;
  });
  mol.atoms.forEach(function (a, i) {
    if (!EL[a.el]) problems.push("Unknown element: " + a.el);
    else if (sums[i] > EL[a.el].val) {
      problems.push(a.el + " atom " + (i + 1) + " has bond order " + sums[i] + " > valence " + EL[a.el].val);
    }
    if (!isFinite(a.x) || !isFinite(a.y) || !isFinite(a.z)) {
      problems.push("Atom " + (i + 1) + " has a non-numeric coordinate");
    }
  });
  return problems;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    EL: EL, EL_ORDER: EL_ORDER, A: A, Bd: Bd, dist3: dist3,
    idealLen: idealLen, bondOrderSum: bondOrderSum, canBond: canBond,
    formulaFor: formulaFor, plainFormulaFor: plainFormulaFor,
    molarMassFor: molarMassFor, validateMolecule: validateMolecule
  };
}

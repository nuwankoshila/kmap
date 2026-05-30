/* ============================================================
   K-MAP SOLVER — SCRIPT.JS
   Full K-map engine: parse → plot → group → simplify → explain
   ============================================================ */

// ─────────────────────────────────────────────
// LANGUAGE STRINGS
// ─────────────────────────────────────────────
const STRINGS = {
  en: {
    appTitle: "K-Map Solver",
    appSubtitle: "Interactive Karnaugh Map Simplifier",
    inputHeading: "Boolean Expression Input",
    inputHint: "Enter a Sum of Products (SOP) expression using variables A, B, C, D. Use ' for NOT (e.g. A'B).",
    labelVars: "Variables:",
    vkLabel: "Insert:",
    btnSolve: "Solve & Plot",
    btnReset: "Reset",
    exLabel: "Examples:",
    rulesHeading: "📋 K-Map Rules",
    kmapHeading: "Karnaugh Map",
    stepsHeading: "Step-by-Step Solution",
    answerHeading: "✅ Simplified Expression",
    prevText: "Previous",
    nextText: "Next Step",
    footerText: "Built for ICT students · Karnaugh Map Simplifier · Supports Sinhala & English",
    stepOf: (cur, tot) => `Step ${cur} of ${tot}`,
    stepTitles: [
      "Parsing the Expression",
      "Plotting on K-Map",
      "Identifying Groups",
      "Extracting Simplified Terms",
      "Final Simplified Expression"
    ],
    stepDescs: {
      parse: (expr, minterms, vars) =>
        `The expression <span class='expr-highlight'>${escHtml(expr)}</span> has been parsed.<br>
         Variables detected: <span class='expr-highlight'>${vars.join(', ')}</span> (${vars.length}-variable K-map)<br>
         Minterms (cells with value 1): <span class='expr-highlight'>${minterms.join(', ')}</span>`,
      plot: (minterms, total) =>
        `The K-map has <strong>${total}</strong> cells (${Math.log2(total)}-variable map). Each minterm is placed in its corresponding cell using Gray code ordering to ensure only ONE bit changes between adjacent cells.<br>
         Cells with value <span class='expr-highlight'>1</span>: minterms ${minterms.join(', ')}`,
      group: (groups) => {
        let html = `Found <strong>${groups.length}</strong> group(s). Groups must be powers of 2 and as large as possible:<br><br>`;
        groups.forEach((g, i) => {
          const color = GROUP_COLORS[i % GROUP_COLORS.length];
          html += `<div class="group-term-row" style="border-color:${color.border};color:${color.border}">
            <span>Group ${i+1} (size ${g.cells.length}):</span>
            <span class="g-cells">cells: {${g.cells.join(',')}}</span>
            <span class="g-term">${g.term}</span>
          </div>`;
        });
        return html;
      },
      extract: (groups) => {
        let html = `Each group eliminates variables that change within it. Only variables that stay constant contribute to the term:<br><br>`;
        groups.forEach((g, i) => {
          const color = GROUP_COLORS[i % GROUP_COLORS.length];
          html += `<div class="group-term-row" style="border-color:${color.border};color:${color.border}">
            <span style="color:var(--text2)">Group ${i+1}:</span>
            <span class="g-cells">${g.explanation}</span>
            <span class="g-term">${g.term}</span>
          </div>`;
        });
        return html;
      },
      final: (expr, orig) =>
        `Original expression: <span class='expr-highlight'>${escHtml(orig)}</span><br>
         Simplified result: <span class='expr-highlight' style='color:var(--accent2);font-size:1.05rem'>${escHtml(expr)}</span>`
    },
    rules: [
      "1s cannot be grouped with 0s.",
      "Diagonal grouping is NOT allowed.",
      "Groups must only be powers of 2 (1, 2, 4, 8, 16).",
      "Every group must be as large as possible.",
      "Any '1' that can't be grouped must remain as its own single-cell group.",
      "A single cell can belong to multiple groups (overlapping allowed).",
      "Wrap-around is allowed: left↔right and top↔bottom edges can group together.",
      "The total number of groups must be minimized."
    ],
    examples: [
      { label: "2-var: AB + A'B'", expr: "AB + A'B'", vars: 2 },
      { label: "3-var: A'BC + AB'C + ABC", expr: "A'BC + AB'C + ABC", vars: 3 },
      { label: "3-var: A'B'C' + A'BC' + AB'C' + ABC'", expr: "A'B'C' + A'BC' + AB'C' + ABC'", vars: 3 },
      { label: "4-var: A'B'C'D' + A'B'CD' + AB'C'D' + AB'CD'", expr: "A'B'C'D' + A'B'CD' + AB'C'D' + AB'CD'", vars: 4 },
      { label: "4-var: full simplification", expr: "A'B'C'D + A'B'CD + A'BC'D + A'BCD + AB'C'D + AB'CD + ABC'D + ABCD", vars: 4 }
    ],
    errNoExpr: "Please enter a Boolean expression.",
    errParse: "Could not parse expression. Check your syntax (use ' for NOT, + for OR, and just concatenate for AND).",
    errVarMismatch: (found, expected) => `Expression uses ${found} variables but you selected ${expected}. Please match.`,
    noOnes: "The expression evaluates to all 0s — nothing to simplify.",
    allOnes: "All cells are 1 — the simplified expression is: 1",
    groupRuleActivated: [1,2,3,4,5,6,7],
  },
  si: {
    appTitle: "කාර්නෝ සිතියම් විසඳුම්",
    appSubtitle: "අන්තර්ක්‍රියාකාරී කාර්නෝ සිතියම් සරල කිරීම",
    inputHeading: "බූලීය ප්‍රකාශනය ඇතුළත් කරන්න",
    inputHint: "A, B, C, D විචල්‍ය භාවිතා කර SOP ආකාරයේ ප්‍රකාශනය ඇතුළත් කරන්න. NOT සඳහා ' (prime) සහිතව ලියන්න.",
    labelVars: "විචල්‍ය:",
    vkLabel: "ඇතුළු කරන්න:",
    btnSolve: "විසඳීම & සිතියම",
    btnReset: "යළි පිහිටුවන්න",
    exLabel: "උදාහරණ:",
    rulesHeading: "📋 කාර්නෝ නීති",
    kmapHeading: "කාර්නෝ සිතියම",
    stepsHeading: "පියවරෙන් පියවර විසඳුම",
    answerHeading: "✅ සරල කළ ප්‍රකාශනය",
    prevText: "පෙර",
    nextText: "ඊළඟ පියවර",
    footerText: "ICT සිසුන් සඳහා · කාර්නෝ සිතියම් · සිංහල සහ ඉංග්‍රීසි",
    stepOf: (cur, tot) => `පියවර ${cur} / ${tot}`,
    stepTitles: [
      "ප්‍රකාශනය විශ්ලේෂණය",
      "සිතියමේ නිරූපණය",
      "කාණ්ඩ හඳුනා ගැනීම",
      "සරල පද ලබා ගැනීම",
      "අවසාන සරල ප්‍රකාශනය"
    ],
    stepDescs: {
      parse: (expr, minterms, vars) =>
        `ප්‍රකාශනය <span class='expr-highlight'>${escHtml(expr)}</span> විශ්ලේෂණය කරන ලදී.<br>
         හඳුනා ගත් විචල්‍ය: <span class='expr-highlight'>${vars.join(', ')}</span> (${vars.length}-විචල්‍ය සිතියම)<br>
         1 ලෙස ඇති කෝෂ (minterms): <span class='expr-highlight'>${minterms.join(', ')}</span>`,
      plot: (minterms, total) =>
        `කාර්නෝ සිතියමේ <strong>${total}</strong> කෝෂ ඇත. ග්‍රේ කේතය (Gray code) ප්‍රකාරව යාබද කෝෂ අතර එක් bit එකක් පමණක් වෙනස් වේ.<br>
         1 ලෙස ඇති කෝෂ: ${minterms.join(', ')}`,
      group: (groups) => {
        let html = `කාණ්ඩ <strong>${groups.length}</strong> ක් හඳුනා ගන්නා ලදී. කාණ්ඩ ප්‍රමාණය 2 හි ගුණාකාර විය යුතුය:<br><br>`;
        groups.forEach((g, i) => {
          const color = GROUP_COLORS[i % GROUP_COLORS.length];
          html += `<div class="group-term-row" style="border-color:${color.border};color:${color.border}">
            <span>කාණ්ඩ ${i+1} (ප්‍රමාණ ${g.cells.length}):</span>
            <span class="g-cells">කෝෂ: {${g.cells.join(',')}}</span>
            <span class="g-term">${g.term}</span>
          </div>`;
        });
        return html;
      },
      extract: (groups) => {
        let html = `සෑම කාණ්ඩයකම නිරන්තරව 1 ව ඇති විචල්‍ය පමණක් සරල පදයට ගනු ලැබේ:<br><br>`;
        groups.forEach((g, i) => {
          const color = GROUP_COLORS[i % GROUP_COLORS.length];
          html += `<div class="group-term-row" style="border-color:${color.border};color:${color.border}">
            <span style="color:var(--text2)">කාණ්ඩ ${i+1}:</span>
            <span class="g-cells">${g.explanation}</span>
            <span class="g-term">${g.term}</span>
          </div>`;
        });
        return html;
      },
      final: (expr, orig) =>
        `මුල් ප්‍රකාශනය: <span class='expr-highlight'>${escHtml(orig)}</span><br>
         සරල කළ ප්‍රකාශනය: <span class='expr-highlight' style='color:var(--accent2);font-size:1.05rem'>${escHtml(expr)}</span>`
    },
    rules: [
      "1 අගයන් 0 අගයන් සමඟ කාණ්ඩ කළ නොහැකිය.",
      "විකර්ණ ආකාරයට කාණ්ඩ කිරීම තහනම්.",
      "කාණ්ඩ ප්‍රමාණය 2 හි ගුණාකාර විය යුතුය (1, 2, 4, 8, 16).",
      "එක් කාණ්ඩයක් හැකි උපරිමයෙන් විශාල විය යුතුය.",
      "1 ක් කාණ්ඩ කළ නොහැකි නම්, එය තනි කාණ්ඩයක් ලෙස සලකන්න.",
      "එක් කෝෂයක් කාණ්ඩ කිහිපයකට අයත් විය හැකිය (overlap).",
      "Wrap-around (ඔතා ගැනීම) කළ හැකිය: වම/දකුණ, ඉහළ/පහළ.",
      "සාදන කාණ්ඩ ගණන හැකිතාක් අඩු කළ යුතුය."
    ],
    examples: [
      { label: "2-විචල්‍ය: AB + A'B'", expr: "AB + A'B'", vars: 2 },
      { label: "3-විචල්‍ය: A'BC + AB'C + ABC", expr: "A'BC + AB'C + ABC", vars: 3 },
      { label: "3-විචල්‍ය: A'B'C' + A'BC' + AB'C' + ABC'", expr: "A'B'C' + A'BC' + AB'C' + ABC'", vars: 3 },
      { label: "4-විචල්‍ය: සරල නිදර්ශකය", expr: "A'B'C'D' + A'B'CD' + AB'C'D' + AB'CD'", vars: 4 },
      { label: "4-විචල්‍ය: D ≡ 1", expr: "A'B'C'D + A'B'CD + A'BC'D + A'BCD + AB'C'D + AB'CD + ABC'D + ABCD", vars: 4 }
    ],
    errNoExpr: "කරුණාකර බූලීය ප්‍රකාශනයක් ඇතුළත් කරන්න.",
    errParse: "ප්‍රකාශනය විශ්ලේෂණය කළ නොහැකිය. ව්‍යාකරණය පරීක්ෂා කරන්න.",
    errVarMismatch: (found, expected) => `ප්‍රකාශනයේ ${found} විචල්‍ය ඇත, නමුත් ${expected} තෝරා ඇත. ගැලපෙන්නේ නැත.`,
    noOnes: "ප්‍රකාශනය සියල්ල 0 — සරල කිරීමට කිසිවක් නැත.",
    allOnes: "සියලු කෝෂ 1 — සරල ප්‍රකාශනය: 1",
  }
};

// ─────────────────────────────────────────────
// GROUP COLORS
// ─────────────────────────────────────────────
const GROUP_COLORS = [
  { bg: 'rgba(91,141,238,0.18)', border: '#5b8dee' },
  { bg: 'rgba(247,201,72,0.18)', border: '#f7c948' },
  { bg: 'rgba(76,175,125,0.18)', border: '#4caf7d' },
  { bg: 'rgba(239,83,80,0.18)', border: '#ef5350' },
  { bg: 'rgba(186,104,200,0.18)', border: '#ba68c8' },
  { bg: 'rgba(255,152,0,0.18)', border: '#ff9800' },
  { bg: 'rgba(38,198,218,0.18)', border: '#26c6da' },
  { bg: 'rgba(240,98,146,0.18)', border: '#f06292' },
];

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let lang = 'en';
let varCount = 3;
let currentStep = 0;
let totalSteps = 0;
let solverState = null; // holds parsed data between steps

// ─────────────────────────────────────────────
// GRAY CODE ORDERINGS
// ─────────────────────────────────────────────
const GRAY_2 = [0, 1]; // for 1-variable axis (2 columns)
const GRAY_4 = [0, 1, 3, 2]; // for 2-variable axis (4 columns/rows)

// K-map cell index (minterm number) layout
// Row × Col → minterm number
function buildKmapLayout(vars) {
  if (vars === 2) {
    // A(rows), B(cols)
    const rows = GRAY_2; // A: 0,1
    const cols = GRAY_2; // B: 0,1
    const layout = [];
    for (const r of rows) {
      const row = [];
      for (const c of cols) {
        row.push((r << 1) | c); // A*2 + B
      }
      layout.push(row);
    }
    return { layout, rowGray: rows, colGray: cols, rowVars: ['A'], colVars: ['B'] };
  } else if (vars === 3) {
    // AB(cols), C(rows)
    const rows = GRAY_2; // C: 0,1
    const cols = GRAY_4; // AB: 00,01,11,10
    const layout = [];
    for (const r of rows) {
      const row = [];
      for (const c of cols) {
        // minterm = A*4 + B*2 + C
        const A = (c >> 1) & 1;
        const B = c & 1;
        const C = r;
        row.push(A * 4 + B * 2 + C);
      }
      layout.push(row);
    }
    return { layout, rowGray: rows, colGray: cols, rowVars: ['C'], colVars: ['A', 'B'] };
  } else {
    // 4 vars: AB(cols), CD(rows)
    const rows = GRAY_4; // CD
    const cols = GRAY_4; // AB
    const layout = [];
    for (const r of rows) {
      const row = [];
      for (const c of cols) {
        const A = (c >> 1) & 1;
        const B = c & 1;
        const C = (r >> 1) & 1;
        const D = r & 1;
        row.push(A * 8 + B * 4 + C * 2 + D);
      }
      layout.push(row);
    }
    return { layout, rowGray: rows, colGray: cols, rowVars: ['C', 'D'], colVars: ['A', 'B'] };
  }
}

// ─────────────────────────────────────────────
// EXPRESSION PARSER
// ─────────────────────────────────────────────
function parseExpression(expr, vars) {
  // Normalize: remove spaces, uppercase
  expr = expr.replace(/\s/g, '').toUpperCase();
  // Split by + (OR terms)
  const terms = expr.split('+').filter(t => t.length > 0);
  const minterms = new Set();
  const varNames = ['A', 'B', 'C', 'D'].slice(0, vars);
  const nVars = vars;

  for (const term of terms) {
    // Parse each literal: X or X'
    const bits = {}; // varName → 0 or 1
    let i = 0;
    const t = term.trim();
    while (i < t.length) {
      const ch = t[i];
      if (/[A-D]/.test(ch)) {
        const varIdx = varNames.indexOf(ch);
        if (varIdx === -1) throw new Error('unknown_var:' + ch);
        const complemented = (i + 1 < t.length && t[i + 1] === "'");
        bits[ch] = complemented ? 0 : 1;
        i += complemented ? 2 : 1;
      } else {
        throw new Error('syntax');
      }
    }

    // Generate all minterms covered by this product term
    // Missing variables are "don't care" (but not marked — we just expand them)
    const missing = varNames.filter(v => !(v in bits));
    const numMissing = missing.length;

    for (let mask = 0; mask < (1 << numMissing); mask++) {
      const fullBits = { ...bits };
      for (let m = 0; m < numMissing; m++) {
        fullBits[missing[m]] = (mask >> (numMissing - 1 - m)) & 1;
      }
      // Calculate minterm number
      let minterm = 0;
      for (let v = 0; v < nVars; v++) {
        minterm = (minterm << 1) | (fullBits[varNames[v]] ?? 0);
      }
      minterms.add(minterm);
    }
  }

  return [...minterms].sort((a, b) => a - b);
}

// Detect variable count from expression
function detectVarCount(expr) {
  const upper = expr.toUpperCase().replace(/\s/g, '');
  const vars = new Set();
  for (const ch of upper) {
    if (/[A-D]/.test(ch)) vars.add(ch);
  }
  const sorted = [...vars].sort();
  // Must be contiguous A, AB, ABC, or ABCD
  if (sorted.length === 0) return 0;
  const expected = ['A', 'B', 'C', 'D'].slice(0, sorted.length);
  if (JSON.stringify(sorted) !== JSON.stringify(expected)) return -1;
  return sorted.length;
}

// ─────────────────────────────────────────────
// K-MAP GROUPING ALGORITHM
// ─────────────────────────────────────────────

// Find all possible valid groups (prime implicants)
function findAllGroups(minterms, vars) {
  const total = 1 << vars;
  const cells = new Array(total).fill(0);
  for (const m of minterms) cells[m] = 1;

  const { layout } = buildKmapLayout(vars);
  const numRows = layout.length;
  const numCols = layout[0].length;

  // Build cell position map: minterm → {row, col}
  const cellPos = {};
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      cellPos[layout[r][c]] = { r, c };
    }
  }

  // All valid rectangular groups (considering wrap-around)
  const groups = [];

  // Try all possible group sizes (powers of 2) and positions
  for (let groupSize = total; groupSize >= 1; groupSize >>= 1) {
    // Try all (startRow, startCol, rowSpan, colSpan) combos where rowSpan*colSpan = groupSize
    for (let rowSpan = 1; rowSpan <= numRows; rowSpan <<= 1) {
      if (groupSize % rowSpan !== 0) continue;
      const colSpan = groupSize / rowSpan;
      if (colSpan > numCols || (colSpan & (colSpan - 1)) !== 0) continue;
      if ((rowSpan & (rowSpan - 1)) !== 0) continue;

      // Try all starting positions
      for (let sr = 0; sr < numRows; sr++) {
        for (let sc = 0; sc < numCols; sc++) {
          // Collect cells in this group (with wrap-around)
          const groupCells = [];
          let valid = true;
          for (let dr = 0; dr < rowSpan; dr++) {
            for (let dc = 0; dc < colSpan; dc++) {
              const r = (sr + dr) % numRows;
              const c = (sc + dc) % numCols;
              const minterm = layout[r][c];
              if (cells[minterm] !== 1) { valid = false; break; }
              groupCells.push(minterm);
            }
            if (!valid) break;
          }
          if (valid && groupCells.length === groupSize) {
            // Check for duplicates
            const key = [...new Set(groupCells)].sort((a,b)=>a-b).join(',');
            if (!groups.some(g => g.key === key)) {
              groups.push({ cells: [...new Set(groupCells)].sort((a,b)=>a-b), key, size: groupSize });
            }
          }
        }
      }
    }
  }

  return groups;
}

// Select minimum cover (essential prime implicants first, then greedy)
function selectMinCover(allGroups, minterms) {
  if (minterms.length === 0) return [];
  const mintermSet = new Set(minterms);
  const covered = new Set();
  const selected = [];

  // Sort groups by size descending (largest first)
  const sorted = [...allGroups].sort((a, b) => b.size - a.size);

  // Find essential prime implicants
  for (const m of mintermSet) {
    const covering = sorted.filter(g => g.cells.includes(m));
    if (covering.length === 1) {
      const g = covering[0];
      if (!selected.includes(g)) {
        selected.push(g);
        for (const c of g.cells) covered.add(c);
      }
    }
  }

  // Greedy cover remaining
  let remaining = [...mintermSet].filter(m => !covered.has(m));
  while (remaining.length > 0) {
    // Find group covering the most uncovered minterms
    let best = null, bestCount = 0;
    for (const g of sorted) {
      if (selected.includes(g)) continue;
      const count = g.cells.filter(c => remaining.includes(c)).length;
      if (count > bestCount || (count === bestCount && best && g.size > best.size)) {
        best = g;
        bestCount = count;
      }
    }
    if (!best) break;
    selected.push(best);
    for (const c of best.cells) covered.add(c);
    remaining = remaining.filter(m => !covered.has(m));
  }

  return selected;
}

// ─────────────────────────────────────────────
// TERM EXTRACTION FROM GROUP
// ─────────────────────────────────────────────
function extractTerm(group, vars) {
  const varNames = ['A', 'B', 'C', 'D'].slice(0, vars);
  const n = vars;
  // For each variable, check if it's constant across all cells in the group
  let term = '';
  const explanations = [];

  for (let v = 0; v < n; v++) {
    const bit = n - 1 - v; // MSB first
    const values = group.cells.map(m => (m >> bit) & 1);
    const allOne = values.every(x => x === 1);
    const allZero = values.every(x => x === 0);
    if (allOne) {
      term += varNames[v];
      explanations.push(`${varNames[v]}=1 (constant)`);
    } else if (allZero) {
      term += varNames[v] + "'";
      explanations.push(`${varNames[v]}=0 → ${varNames[v]}'`);
    } else {
      explanations.push(`${varNames[v]} varies → eliminated`);
    }
  }

  if (term === '') term = '1'; // All variables eliminated → tautology
  return { term, explanation: explanations.join(', ') };
}

// ─────────────────────────────────────────────
// K-MAP TABLE RENDERER
// ─────────────────────────────────────────────
function renderKmap(vars, cells, highlightMinterms, groups, activeGroupIdx) {
  const { layout, rowGray, colGray, rowVars, colVars } = buildKmapLayout(vars);
  const numRows = layout.length;
  const numCols = layout[0].length;

  // Build HTML string for table
  let html = '<div class="kmap-table-wrapper"><table class="kmap-table">';

  // Header row
  html += '<thead><tr>';
  // Corner cell with diagonal label
  html += `<th class="corner-th">
    <span class="row-var-label">${rowVars.join('')}</span>
    <span class="col-var-label">${colVars.join('')}</span>
  </th>`;

  // Column headers (Gray code)
  for (const cg of colGray) {
    const label = cg.toString(2).padStart(colVars.length, '0');
    html += `<th>${label}</th>`;
  }
  html += '</tr></thead>';

  // Body rows
  html += '<tbody>';
  for (let r = 0; r < numRows; r++) {
    html += '<tr>';
    // Row header
    const rowLabel = rowGray[r].toString(2).padStart(rowVars.length, '0');
    html += `<th>${rowLabel}</th>`;

    for (let c = 0; c < numCols; c++) {
      const minterm = layout[r][c];
      const val = cells[minterm];
      let cellClass = `cell-${val}`;
      let extra = '';
      if (highlightMinterms && highlightMinterms.includes(minterm) && val === 1) {
        cellClass += ' cell-highlight';
      }

      // Group background colors
      let bgStyle = '';
      if (groups && groups.length > 0) {
        const memberOf = [];
        for (let gi = 0; gi < groups.length; gi++) {
          if (activeGroupIdx !== undefined && gi > activeGroupIdx) continue;
          if (groups[gi].cells.includes(minterm)) memberOf.push(gi);
        }
        if (memberOf.length > 0) {
          // Use the last group color for background
          const gi = memberOf[memberOf.length - 1];
          const color = GROUP_COLORS[gi % GROUP_COLORS.length];
          bgStyle = `background:${color.bg};`;
        }
      }

      html += `<td class="${cellClass}" data-minterm="${minterm}" style="${bgStyle}">
        <span class="cell-minterm">${minterm}</span>
        ${val === 'x' ? 'x' : val}
      </td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';

  // Draw group borders using absolutely positioned divs
  if (groups && groups.length > 0) {
    html += '<div id="group-overlays">';
    groups.forEach((g, gi) => {
      if (activeGroupIdx !== undefined && gi > activeGroupIdx) return;
      const color = GROUP_COLORS[gi % GROUP_COLORS.length];
      // We'll position overlays via JS after DOM insertion
      html += `<div class="group-overlay visible" id="overlay-${gi}" 
        data-cells="${g.cells.join(',')}" 
        style="border-color:${color.border};box-shadow:inset 0 0 0 2px ${color.border}20;">
      </div>`;
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
}

// Position group overlays after DOM insertion
function positionOverlays(vars, groups, activeGroupIdx) {
  const { layout } = buildKmapLayout(vars);
  const numRows = layout.length;
  const numCols = layout[0].length;

  setTimeout(() => {
    const table = document.querySelector('.kmap-table');
    if (!table) return;
    const wrapper = document.querySelector('.kmap-table-wrapper');
    if (!wrapper) return;

    const cells = table.querySelectorAll('td[data-minterm]');
    if (!cells.length) return;

    const tableRect = wrapper.getBoundingClientRect();

    groups.forEach((g, gi) => {
      if (activeGroupIdx !== undefined && gi > activeGroupIdx) return;
      const overlay = document.getElementById(`overlay-${gi}`);
      if (!overlay) return;

      // Find all cells in this group
      const cellEls = [];
      g.cells.forEach(m => {
        const el = table.querySelector(`td[data-minterm="${m}"]`);
        if (el) cellEls.push(el);
      });
      if (!cellEls.length) return;

      // Find bounding box
      let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
      cellEls.forEach(el => {
        const r = el.getBoundingClientRect();
        const wR = wrapper.getBoundingClientRect();
        const left = r.left - wR.left;
        const top = r.top - wR.top;
        minLeft = Math.min(minLeft, left);
        minTop = Math.min(minTop, top);
        maxRight = Math.max(maxRight, left + r.width);
        maxBottom = Math.max(maxBottom, top + r.height);
      });

      // Check for wrap-around (cells on both edges)
      // If wrap, draw split overlays — simplified: just use dashed border hint
      overlay.style.position = 'absolute';
      overlay.style.left = (minLeft + 2) + 'px';
      overlay.style.top = (minTop + 2) + 'px';
      overlay.style.width = (maxRight - minLeft - 4) + 'px';
      overlay.style.height = (maxBottom - minTop - 4) + 'px';
    });
  }, 50);
}

// ─────────────────────────────────────────────
// RULES PANEL
// ─────────────────────────────────────────────
function renderRules() {
  const S = STRINGS[lang];
  const list = document.getElementById('rules-list');
  list.innerHTML = S.rules.map((r, i) =>
    `<li id="rule-${i}"><span class="rule-num">${i+1}.</span><span>${r}</span></li>`
  ).join('');
}

function highlightRule(idx) {
  document.querySelectorAll('#rules-list li').forEach(li => li.classList.remove('rule-active'));
  const rule = document.getElementById(`rule-${idx}`);
  if (rule) {
    rule.classList.add('rule-active');
    rule.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ─────────────────────────────────────────────
// STEP DEFINITIONS
// ─────────────────────────────────────────────
function buildSteps(state) {
  const S = STRINGS[lang];
  const { expr, minterms, vars, varNames, cells, groups, simplified } = state;

  const steps = [];

  // Step 0: Parse
  steps.push({
    title: S.stepTitles[0],
    content: S.stepDescs.parse(expr, minterms, varNames),
    ruleIdx: null,
    kmapHighlight: null,
    activeGroupIdx: -1
  });

  // Step 1: Plot
  steps.push({
    title: S.stepTitles[1],
    content: S.stepDescs.plot(minterms, 1 << vars),
    ruleIdx: null,
    kmapHighlight: minterms,
    activeGroupIdx: -1
  });

  // Steps 2…n: Show groups one by one
  groups.forEach((g, gi) => {
    const ruleIdx = g.cells.length === 1 ? 4 : (gi === 0 ? 3 : 5);
    const isWrap = detectWrapAround(g, vars);
    steps.push({
      title: S.stepTitles[2],
      content: S.stepDescs.group(groups.slice(0, gi + 1)),
      ruleIdx: isWrap ? 6 : ruleIdx,
      kmapHighlight: minterms,
      activeGroupIdx: gi
    });
  });

  // Extraction step
  steps.push({
    title: S.stepTitles[3],
    content: S.stepDescs.extract(groups),
    ruleIdx: 7,
    kmapHighlight: minterms,
    activeGroupIdx: groups.length - 1
  });

  // Final
  steps.push({
    title: S.stepTitles[4],
    content: S.stepDescs.final(simplified, expr),
    ruleIdx: null,
    kmapHighlight: minterms,
    activeGroupIdx: groups.length - 1
  });

  return steps;
}

function detectWrapAround(group, vars) {
  const { layout } = buildKmapLayout(vars);
  const numRows = layout.length;
  const numCols = layout[0].length;
  const cellPos = {};
  for (let r = 0; r < numRows; r++)
    for (let c = 0; c < numCols; c++)
      cellPos[layout[r][c]] = { r, c };
  const positions = group.cells.map(m => cellPos[m]);
  const rows = positions.map(p => p.r);
  const cols = positions.map(p => p.c);
  const hasTopBottom = Math.min(...rows) === 0 && Math.max(...rows) === numRows - 1;
  const hasLeftRight = Math.min(...cols) === 0 && Math.max(...cols) === numCols - 1;
  return hasTopBottom || hasLeftRight;
}

// ─────────────────────────────────────────────
// RENDER STEPS UI
// ─────────────────────────────────────────────
function renderStepsUI(steps) {
  const container = document.getElementById('steps-container');
  container.innerHTML = steps.map((s, i) =>
    `<div class="step-block ${i === 0 ? 'active' : ''}" id="step-block-${i}">
      <div class="step-header">
        <div class="step-badge">${i + 1}</div>
        <div class="step-title">${s.title}</div>
      </div>
      <div class="step-body">${s.content}</div>
    </div>`
  ).join('');

  // Dots
  const dots = document.getElementById('step-dots');
  dots.innerHTML = steps.map((_, i) =>
    `<div class="dot ${i === 0 ? 'active' : ''}" id="dot-${i}"></div>`
  ).join('');

  updateStepCounter(0, steps.length);
}

function updateStepCounter(cur, tot) {
  document.getElementById('step-counter').textContent = STRINGS[lang].stepOf(cur + 1, tot);
}

// ─────────────────────────────────────────────
// STEP NAVIGATION
// ─────────────────────────────────────────────
function showStep(idx) {
  const steps = solverState.steps;
  if (idx < 0 || idx >= steps.length) return;

  // Hide all, show current
  document.querySelectorAll('.step-block').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  document.querySelectorAll('.dot').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });

  currentStep = idx;
  updateStepCounter(idx, steps.length);

  // Update buttons
  document.getElementById('btn-prev').disabled = idx === 0;
  const btnNext = document.getElementById('btn-next');
  const S = STRINGS[lang];
  if (idx === steps.length - 1) {
    btnNext.disabled = true;
    // Show answer card
    document.getElementById('answer-card').style.display = 'block';
    document.getElementById('answer-display').innerHTML =
      `<div class="answer-expr">${escHtml(solverState.simplified)}</div>
       <div class="answer-meta">${solverState.groups.length} group(s) → ${solverState.simplified}</div>`;
  } else {
    btnNext.disabled = false;
    document.getElementById('answer-card').style.display = 'none';
  }

  // Update K-map
  const step = steps[idx];
  const { vars, cells, groups } = solverState;
  const container = document.getElementById('kmap-container');
  container.innerHTML = renderKmap(vars, cells, step.kmapHighlight, groups, step.activeGroupIdx);
  positionOverlays(vars, groups, step.activeGroupIdx);

  // Highlight rule
  if (step.ruleIdx !== null) {
    highlightRule(step.ruleIdx);
  } else {
    document.querySelectorAll('#rules-list li').forEach(li => li.classList.remove('rule-active'));
  }

  // Group legend
  renderGroupLegend(groups, step.activeGroupIdx);
}

function nextStep() {
  if (currentStep < solverState.steps.length - 1) showStep(currentStep + 1);
}

function prevStep() {
  if (currentStep > 0) showStep(currentStep - 1);
}

function renderGroupLegend(groups, activeIdx) {
  const legend = document.getElementById('group-legend');
  if (!groups || groups.length === 0) { legend.innerHTML = ''; return; }
  legend.innerHTML = groups.map((g, gi) => {
    const color = GROUP_COLORS[gi % GROUP_COLORS.length];
    const visible = activeIdx === undefined || gi <= activeIdx;
    return `<div class="legend-item ${visible ? 'visible' : ''}" style="border-color:${color.border};color:${color.border}">
      <div class="legend-dot" style="background:${color.border}"></div>
      <span>G${gi+1}: ${escHtml(g.term)}</span>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// MAIN SOLVE FUNCTION
// ─────────────────────────────────────────────
function solve() {
  const S = STRINGS[lang];
  const expr = document.getElementById('expr-input').value.trim();
  const errEl = document.getElementById('input-error');
  errEl.style.display = 'none';

  if (!expr) {
    showError(S.errNoExpr);
    return;
  }

  // Detect variables
  const detectedVars = detectVarCount(expr);
  if (detectedVars === -1 || detectedVars === 0) {
    showError(S.errParse);
    return;
  }
  if (detectedVars !== varCount) {
    // Try to be flexible — auto-adjust varCount
    setVarCount(detectedVars, false);
  }

  let minterms;
  try {
    minterms = parseExpression(expr, varCount);
  } catch (e) {
    showError(S.errParse);
    return;
  }

  const total = 1 << varCount;
  const cells = new Array(total).fill(0);
  for (const m of minterms) {
    if (m < total) cells[m] = 1;
  }

  if (minterms.length === 0) {
    showError(S.noOnes);
    return;
  }

  if (minterms.length === total) {
    showError(S.allOnes);
    return;
  }

  // Find groups
  const allGroups = findAllGroups(minterms, varCount);
  const selectedGroups = selectMinCover(allGroups, minterms);

  // Extract terms
  const varNames = ['A', 'B', 'C', 'D'].slice(0, varCount);
  selectedGroups.forEach(g => {
    const { term, explanation } = extractTerm(g, varCount);
    g.term = term;
    g.explanation = explanation;
  });

  const simplified = selectedGroups.map(g => g.term).join(' + ') || '0';

  // Build solver state
  solverState = {
    expr,
    minterms,
    vars: varCount,
    varNames,
    cells,
    groups: selectedGroups,
    simplified
  };
  solverState.steps = buildSteps(solverState);

  // Show panels
  document.getElementById('kmap-card').style.display = 'block';
  document.getElementById('steps-card').style.display = 'block';
  document.getElementById('answer-card').style.display = 'none';

  currentStep = 0;
  renderStepsUI(solverState.steps);
  showStep(0);

  // Scroll to kmap
  document.getElementById('kmap-card').scrollIntoView({ behavior: 'smooth' });
}

// ─────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────
function showError(msg) {
  const errEl = document.getElementById('input-error');
  errEl.textContent = msg;
  errEl.style.display = 'block';
}

function resetAll() {
  document.getElementById('expr-input').value = '';
  document.getElementById('input-error').style.display = 'none';
  document.getElementById('kmap-card').style.display = 'none';
  document.getElementById('steps-card').style.display = 'none';
  document.getElementById('answer-card').style.display = 'none';
  document.getElementById('kmap-container').innerHTML = '';
  document.getElementById('steps-container').innerHTML = '';
  document.getElementById('answer-display').innerHTML = '';
  document.getElementById('group-legend').innerHTML = '';
  document.getElementById('step-dots').innerHTML = '';
  document.querySelectorAll('#rules-list li').forEach(li => li.classList.remove('rule-active'));
  solverState = null;
  currentStep = 0;
}

function setVarCount(n, updateUI = true) {
  varCount = n;
  if (updateUI) {
    document.querySelectorAll('.var-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.v) === n);
    });
    buildVirtualKeyboard();
    buildExamples();
  }
}

function buildVirtualKeyboard() {
  const varNames = ['A', 'B', 'C', 'D'].slice(0, varCount);
  const S = STRINGS[lang];
  const container = document.getElementById('vk-btns');
  container.innerHTML = '';

  const tokens = [...varNames.map(v => v), ...varNames.map(v => v + "'"), '+', "'", '(', ')'];
  tokens.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'vk-btn';
    btn.textContent = t;
    btn.onclick = () => insertAtCursor(t);
    container.appendChild(btn);
  });
}

function insertAtCursor(text) {
  const inp = document.getElementById('expr-input');
  const start = inp.selectionStart;
  const end = inp.selectionEnd;
  const val = inp.value;
  inp.value = val.slice(0, start) + text + val.slice(end);
  inp.setSelectionRange(start + text.length, start + text.length);
  inp.focus();
}

function buildExamples() {
  const S = STRINGS[lang];
  const container = document.getElementById('examples-list');
  container.innerHTML = '';
  const relevant = S.examples.filter(e => e.vars === varCount);
  relevant.forEach(e => {
    const btn = document.createElement('button');
    btn.className = 'ex-btn';
    btn.textContent = e.label;
    btn.onclick = () => {
      setVarCount(e.vars);
      document.getElementById('expr-input').value = e.expr;
    };
    container.appendChild(btn);
  });
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────
// LANGUAGE SWITCH
// ─────────────────────────────────────────────
function setLang(l) {
  lang = l;
  const S = STRINGS[lang];
  document.body.classList.toggle('lang-si', l === 'si');
  document.getElementById('btn-en').classList.toggle('active', l === 'en');
  document.getElementById('btn-si').classList.toggle('active', l === 'si');
  document.documentElement.lang = l === 'si' ? 'si' : 'en';

  document.getElementById('app-title').textContent = S.appTitle;
  document.getElementById('app-subtitle').textContent = S.appSubtitle;
  document.getElementById('input-heading').textContent = S.inputHeading;
  document.getElementById('input-hint').textContent = S.inputHint;
  document.getElementById('label-vars').textContent = S.labelVars;
  document.getElementById('vk-label').textContent = S.vkLabel;
  document.getElementById('btn-solve-text').textContent = S.btnSolve;
  document.getElementById('btn-reset-text').textContent = S.btnReset;
  document.getElementById('ex-label').textContent = S.exLabel;
  document.getElementById('rules-heading').textContent = S.rulesHeading;
  document.getElementById('kmap-heading').textContent = S.kmapHeading;
  document.getElementById('steps-heading').textContent = S.stepsHeading;
  document.getElementById('answer-heading').textContent = S.answerHeading;
  document.getElementById('prev-text').textContent = S.prevText;
  document.getElementById('next-text').textContent = S.nextText;
  document.getElementById('footer-text').textContent = S.footerText;

  renderRules();
  buildVirtualKeyboard();
  buildExamples();

  // Re-render steps if solver is active
  if (solverState) {
    solverState.steps = buildSteps(solverState);
    renderStepsUI(solverState.steps);
    showStep(Math.min(currentStep, solverState.steps.length - 1));
  }
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setLang('en');
  setVarCount(3);

  // Allow Enter key to solve
  document.getElementById('expr-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') solve();
  });
});

import { describe, expect, test } from "vitest";
import { contrastRatio, cssCustomProperties, parseHex, resolveToken } from "../tooling/contrast.ts";
import { readCssDir, readProjectFile } from "./files.ts";

const themeCss = readProjectFile("src/styles/theme.css");
const baseCss = readProjectFile("src/styles/base.css");

/** Todos los nombres de color de CSS. */
const NAMED_COLORS = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse " +
    "chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta " +
    "darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet " +
    "deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green " +
    "greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral " +
    "lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray " +
    "lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple " +
    "mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite " +
    "navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink " +
    "plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue " +
    "slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen"
  ).split(" "),
);

/** Colores literales en las declaraciones de `css` (sin contar los `var(...)`). */
function literalColors(css: string): string[] {
  const found: string[] = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of clean.matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:\s*([^;{}]+)(?=[;}])/g)) {
    const value = m[2]!.replace(/var\([^)]*\)/g, "").toLowerCase();
    found.push(...(value.match(/#[0-9a-f]{3,8}\b/g) ?? []));
    found.push(...(value.match(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g) ?? []));
    found.push(...(value.match(/[a-z]+/g) ?? []).filter((w) => NAMED_COLORS.has(w)));
  }
  return found;
}

const BACKGROUNDS = ["color-surface", "color-bg"];
const TEXTS = ["color-text", "color-text-muted", "color-ink", "color-link"];

/** Note backgrounds: every `--color-note-<n>` in the sheet. */
function noteColors(props: Map<string, string>): string[] {
  return [...props.keys()].filter((k) => /^color-note-\d+$/.test(k));
}

/** Pares texto/fondo o foco/fondo por debajo del mínimo; vacío si todo cumple. */
function contrastProblems(css: string): string[] {
  const props = cssCustomProperties(css);
  const color = (name: string) => resolveToken(props, name);
  const out: string[] = [];
  for (const bg of BACKGROUNDS) {
    for (const fg of TEXTS) {
      const r = contrastRatio(color(fg), color(bg));
      if (r < 4.5) out.push(`--${fg} sobre --${bg}: ${r.toFixed(2)}`);
    }
    const r = contrastRatio(color("color-focus"), color(bg));
    if (r < 3) out.push(`--color-focus sobre --${bg}: ${r.toFixed(2)}`);
  }
  for (const note of noteColors(props)) {
    const r = contrastRatio(color(`${note}-ink`), color(note));
    if (r < 4.5) out.push(`--${note}-ink sobre --${note}: ${r.toFixed(2)}`);
  }
  return out;
}

/** Declaraciones de texto o foco que usan el acento decorativo. */
function accentAsText(css: string): string[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...clean.matchAll(/(?:^|[;{\s])((?:color|outline|outline-color|text-decoration-color|caret-color)\s*:[^;}]*var\(--color-accent\))/g)].map((m) => m[1]!.trim());
}

describe("contraste de los tokens de color", () => {
  test("la función de contraste: 21:1, 1:1 y formatos", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#fff", "#ffffff")).toBe(1);
    expect(parseHex("#290074")).toEqual([0x29, 0x00, 0x74]);
    expect(() => parseHex("rgb(0 0 0)")).toThrow(/hexadecimal/);
  });

  test("theme.css: textos al menos 4,5:1 y foco al menos 3:1 sobre la hoja y el fondo", () => {
    expect(contrastProblems(themeCss)).toEqual([]);
  });

  test("reply-notes: four note colours, each ink fails on its paper if it turns white, and a missing ink fails", () => {
    expect(noteColors(cssCustomProperties(themeCss))).toEqual(["color-note-1", "color-note-2", "color-note-3", "color-note-4"]);
    const white = contrastProblems(themeCss.replace(/(--color-note-\d+-ink):[^;]+;/g, "$1: #fff;"));
    expect(white).toEqual([1, 2, 3, 4].map((n) => expect.stringMatching(new RegExp(`^--color-note-${n}-ink sobre --color-note-${n}:`))));
    expect(() => contrastProblems(themeCss.replace(/--color-note-4-ink:[^;]+;/, ""))).toThrow(/color-note-4-ink/);
  });

  test("falla si un texto o el foco pasan al acento decorativo", () => {
    expect(contrastProblems(themeCss.replace("--color-link: var(--color-ink);", "--color-link: var(--color-accent);"))).toEqual([
      expect.stringMatching(/^--color-link sobre --color-surface/),
      expect.stringMatching(/^--color-link sobre --color-bg/),
    ]);
    expect(contrastProblems(themeCss.replace("--color-focus: var(--color-ink);", "--color-focus: var(--color-accent);"))).toHaveLength(2);
  });

  test("ningún componente ni base.css usa el acento para texto o foco", () => {
    const components = readCssDir("src/styles/components");
    expect(Object.keys(components).length).toBeGreaterThan(0);
    for (const [file, css] of Object.entries({ "base.css": baseCss, ...components })) {
      expect(css.trim(), file).not.toBe("");
      expect(accentAsText(css), file).toEqual([]);
    }
    expect(accentAsText(baseCss.replace("var(--color-focus)", "var(--color-accent)"))).toEqual(["outline: 2px solid var(--color-accent)"]);
    expect(accentAsText(".x { background: var(--color-accent); }")).toEqual([]);
  });
});

/** `rem` value of a token, or an error if it is not in `rem`. */
function rem(css: string, name: string): number {
  const v = resolveToken(cssCustomProperties(css), name);
  const m = /^(\d*\.?\d+)rem$/.exec(v);
  if (!m) throw new Error(`--${name} is not in rem: ${v}`);
  return Number(m[1]);
}

/** A stuck note must overlap the one before it by less than its bottom padding. */
function overlapCoversText(css: string): boolean {
  return rem(css, "note-overlap") >= rem(css, "note-padding-block");
}

const repliesCss = readProjectFile("src/styles/components/replies.css");

/** Declarations of the first rule whose selector is exactly `selector`. */
function rule(css: string, selector: string): string | undefined {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|})\\s*${esc}\\s*{([^}]*)}`).exec(clean)?.[1];
}

/** Value of `--name: var(--target)` in a block, or `null`. */
function varRef(block: string | undefined, name: string): string | null {
  return block ? (new RegExp(`--${name}:\\s*var\\(--([a-z0-9-]+)\\)`).exec(block)?.[1] ?? null) : null;
}

/**
 * Problems in the colour cycles of replies.css (decision 4): simulates threads
 * with 0 to 4 stuck notes, in the order they show on screen, and reports any
 * two neighbours with the same colour, a thread off the 1, 2, 3, 4 cycle, or
 * a note whose ink is not its paper's.
 */
function colourProblems(css: string): string[] {
  const out: string[] = [];
  const threads = [1, 2, 3, 4].map((k) => rule(css, `.replies__thread:nth-child(4n + ${k})`));
  const slot = (selector: string) => {
    const block = rule(css, selector);
    const note = varRef(block, "note")?.replace(/^note-/, "") ?? null;
    if (note && varRef(block, "note-ink") !== `note-${note}-ink`) out.push(`${selector}: ink is not its paper's`);
    return note;
  };
  const main = slot(".replies__thread > .reply");
  const stuck = [1, 2, 3].map((k) => slot(`.replies__followups > .reply:nth-child(3n + ${k})`));
  /** Colour number of `slotName` (own, a, b) in thread `t` (0-based), checking its ink. */
  const colour = (t: number, slotName: string | null): number | null => {
    const block = threads[t % 4];
    const paper = slotName && varRef(block, `note-${slotName}`);
    const n = paper ? /^color-note-(\d+)$/.exec(paper)?.[1] : undefined;
    if (!n) return null;
    if (varRef(block, `note-${slotName}-ink`) !== `color-note-${n}-ink`) out.push(`thread 4n + ${(t % 4) + 1}: ${slotName} ink is not its paper's`);
    return Number(n);
  };
  for (let counts = 0; counts < 5 ** 4; counts++) {
    const sequence: (number | null)[] = [];
    for (let t = 0; t < 5; t++) {
      const c = colour(t, main);
      if (c !== ((t % 4) + 1)) out.push(`thread ${t + 1} is colour ${c}`);
      sequence.push(c);
      const n = t < 4 ? Math.floor(counts / 5 ** t) % 5 : 0;
      for (let f = 0; f < n; f++) sequence.push(colour(t, stuck[f % 3]!));
    }
    sequence.forEach((c, i) => {
      if (c === null) out.push(`note ${i + 1} has no colour`);
      else if (i > 0 && c === sequence[i - 1]) out.push(`notes ${i} and ${i + 1} are both colour ${c}`);
    });
    if (out.length) break;
  }
  return [...new Set(out)];
}

describe("sticky notes (reply-notes)", () => {
  test("--note-overlap is smaller than --note-padding-block", () => {
    expect(overlapCoversText(themeCss)).toBe(false);
    expect(overlapCoversText(themeCss.replace(/--note-overlap:[^;]+;/, "--note-overlap: 1.5rem;"))).toBe(true);
  });

  test("colour cycles: threads 1, 2, 3, 4 and no two notes in a row alike, stuck notes included", () => {
    expect(repliesCss.trim()).not.toBe("");
    expect(colourProblems(repliesCss)).toEqual([]);
  });

  test("the colour check catches a stuck note matching the next thread, a wrong ink and a missing rule", () => {
    // Thread 1's `a` set to colour 2: a single stuck note matches thread 2 below it.
    const sameAsNext = repliesCss.replace(
      /(nth-child\(4n \+ 1\)\s*{[^}]*--note-a:\s*)var\(--color-note-3\);(\s*--note-a-ink:\s*)var\(--color-note-3-ink\)/,
      "$1var(--color-note-2);$2var(--color-note-2-ink)",
    );
    expect(sameAsNext).not.toBe(repliesCss);
    expect(colourProblems(sameAsNext)).toContainEqual(expect.stringMatching(/both colour 2/));
    // Paper and ink of different colours.
    const wrongInk = repliesCss.replace(/(nth-child\(4n \+ 2\)\s*{[^}]*--note-own-ink:\s*)var\(--color-note-2-ink\)/, "$1var(--color-note-3-ink)");
    expect(wrongInk).not.toBe(repliesCss);
    expect(colourProblems(wrongInk)).toContainEqual(expect.stringMatching(/ink is not its paper's/));
    // A stuck-note slot without its rule.
    const missing = repliesCss.replace(".replies__followups > .reply:nth-child(3n + 3)", ".replies__followups > .reply:nth-child(3n + 9)");
    expect(colourProblems(missing)).toContainEqual(expect.stringMatching(/has no colour/));
  });
});

describe("colores en los componentes", () => {
  test("los componentes no usan colores literales; el comprobador los detecta", () => {
    const files = readCssDir("src/styles/components");
    expect(Object.keys(files).length).toBe(12);
    for (const [f, css] of Object.entries(files)) {
      expect(css.trim(), f).not.toBe(""); // si la lectura falla, el test no puede pasar en vacío
      expect(literalColors(css), f).toEqual([]);
    }
    expect(literalColors(".x { color: white; }")).toEqual(["white"]);
    expect(literalColors(".x { border: 1px solid #ABC; background: rgb(0 0 0); outline-color: oklch(0.5 0.1 200) }")).toEqual(["#abc", "rgb(", "oklch("]);
    expect(literalColors(".x { color: var(--color-text); border-color: currentColor; background: transparent; /* red */ }")).toEqual([]);
    expect(literalColors(".white a:hover { color: inherit; }")).toEqual([]);
  });});

describe("viewer opening transition (image-viewer 4.2)", () => {
  const viewerCss = readProjectFile("src/styles/components/viewer.css").replace(/\/\*[\s\S]*?\*\//g, "");

  test("opens with @starting-style, and its transitions use the token", () => {
    expect(viewerCss.trim()).not.toBe("");
    expect(viewerCss).toMatch(/@starting-style\s*{/);
    const transitions = [...viewerCss.matchAll(/transition:\s*([^;]+);/g)].map((m) => m[1]!.trim());
    const animated = transitions.filter((t) => t !== "none");
    expect(animated.length).toBeGreaterThan(0);
    for (const t of animated) expect(t).toContain("var(--viewer-duration)");
    expect(resolveToken(cssCustomProperties(themeCss), "viewer-duration")).toMatch(/^\d+m?s$/);
  });

  test("with reduced motion there is no transition", () => {
    const start = viewerCss.search(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(start).toBeGreaterThan(-1);
    expect(viewerCss.slice(start)).toMatch(/transition:\s*none/);
  });
});

describe("page turn (page-turn-transition 3.1)", () => {
  const pageTurnCss = readProjectFile("src/styles/components/page-turn.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const TOKENS = ["page-turn-duration", "page-turn-notes-duration"];

  test("every animation uses the tokens, and they resolve to times", () => {
    expect(pageTurnCss.trim()).not.toBe("");
    const animations = [...pageTurnCss.matchAll(/animation:\s*([^;]+);/g)].map((m) => m[1]!.trim());
    const animated = animations.filter((a) => a !== "none");
    expect(animated.length).toBe(4); // sheet away, sheet back, notes out, notes in
    for (const a of animated) expect(TOKENS.some((t) => a.includes(`var(--${t})`)), a).toBe(true);
    // The new notes wait for the sheet to land.
    expect(animated).toContainEqual(expect.stringMatching(/var\(--page-turn-notes-duration\).*var\(--page-turn-duration\)/));
    const props = cssCustomProperties(themeCss);
    for (const t of TOKENS) expect(resolveToken(props, t), t).toMatch(/^\d+m?s$/);
  });

  test("the names exist only during a turn", () => {
    const named = [...pageTurnCss.matchAll(/([^{}]+)\{\s*view-transition-name:\s*([\w-]+)/g)].map((m) => [m[1]!.trim(), m[2]]);
    expect(named.map(([, name]) => name)).toEqual(["sheet", "notes", "site-header", "pager"]);
    for (const [selector] of named) expect(selector).toMatch(/^:root\[data-page-turn\] /);
  });

  test("with reduced motion there is no animation", () => {
    const start = pageTurnCss.search(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(start).toBeGreaterThan(-1);
    const block = pageTurnCss.slice(start);
    expect(block).toMatch(/animation:\s*none/);
    for (const part of ['[data-page-turn="older"]::view-transition-old(sheet)', '[data-page-turn="newer"]::view-transition-new(sheet)', "::view-transition-old(notes)", "::view-transition-new(notes)"]) {
      expect(block, part).toContain(part);
    }
  });
});

describe("pager breakpoint (page-navigation 3.2)", () => {
  const rem = (props: Map<string, string>, name: string) => {
    const v = resolveToken(props, name);
    const m = /^([\d.]+)rem$/.exec(v);
    if (!m) throw new Error(`--${name} is not in rem: ${v}`);
    return Number(m[1]);
  };
  /** Width where the sheet, both arrows with their gaps and the page gutters fit. */
  const expected = (theme: string) => {
    const p = cssCustomProperties(theme);
    return rem(p, "sheet-width") + 2 * (rem(p, "pager-arrow-size") + rem(p, "pager-gap")) + 2 * rem(p, "space-4");
  };
  const breakpoints = (css: string) => [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/@media\s*\(\s*width\s*>=\s*([\d.]+)rem\s*\)/g)].map((m) => Number(m[1]));

  test("pager.css and drawing.css use the breakpoint the tokens give", () => {
    expect(expected(themeCss)).toBe(39.25);
    for (const file of ["src/styles/components/pager.css", "src/styles/components/drawing.css"]) {
      const found = breakpoints(readProjectFile(file));
      expect(found, file).toEqual([expected(themeCss)]);
    }
  });

  test("a bigger arrow changes the expected breakpoint, so the check would fail", () => {
    const bigger = themeCss.replace(/--pager-arrow-size:\s*3rem/, "--pager-arrow-size: 4rem");
    expect(bigger).not.toBe(themeCss);
    expect(expected(bigger)).not.toBe(breakpoints(readProjectFile("src/styles/components/pager.css"))[0]);
  });

  test("each arrow is a touch target of at least 44 px", () => {
    expect(rem(cssCustomProperties(themeCss), "pager-arrow-size") * 16).toBeGreaterThanOrEqual(44);
  });
});

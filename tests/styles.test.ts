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

describe("colores en los componentes", () => {
  test("los componentes no usan colores literales; el comprobador los detecta", () => {
    const files = readCssDir("src/styles/components");
    expect(Object.keys(files).length).toBe(9);
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

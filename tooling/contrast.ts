/**
 * Contraste de color (WCAG 2) entre tokens de `theme.css`. Sin dependencias
 * de Node ni del DOM: lo usan los tests.
 */

/** Propiedades personalizadas declaradas en una hoja: nombre (sin `--`) → valor. */
export function cssCustomProperties(css: string): Map<string, string> {
  const props = new Map<string, string>();
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of clean.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) props.set(m[1]!.toLowerCase(), m[2]!.trim());
  return props;
}

/** Valor de un token, siguiendo `var(--otro)`. Lanza un error si no existe o hay un ciclo. */
export function resolveToken(props: Map<string, string>, name: string, seen: string[] = []): string {
  if (seen.includes(name)) throw new Error(`ciclo de tokens: ${[...seen, name].join(" → ")}`);
  const value = props.get(name);
  if (value === undefined) throw new Error(`token no definido: --${name}`);
  const ref = /^var\(\s*--([a-z0-9-]+)\s*\)$/i.exec(value);
  return ref ? resolveToken(props, ref[1]!.toLowerCase(), [...seen, name]) : value;
}

/** Color hexadecimal (`#rgb` o `#rrggbb`) a [r, g, b] de 0 a 255. Lanza un error con otro formato. */
export function parseHex(color: string): [number, number, number] {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) throw new Error(`color no hexadecimal: ${color}`);
  const hex = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join("") : m[1]!;
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Relación de contraste WCAG entre dos colores hexadecimales (de 1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(parseHex(a)), luminance(parseHex(b))].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

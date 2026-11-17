import { describe, expect, test } from "vitest";
import { cleanCadernoSegments, facetSegments, postTags } from "../src/lib/text.ts";
import type { Facet, PostRecord } from "../src/lib/types.ts";

const LINK = "app.bsky.richtext.facet#link";
const MENTION = "app.bsky.richtext.facet#mention";
const TAG = "app.bsky.richtext.facet#tag";

/** Rango en bytes UTF-8 de la primera aparición de `part` en `text`. */
function range(text: string, part: string) {
  const enc = new TextEncoder();
  const byteStart = enc.encode(text.slice(0, text.indexOf(part))).length;
  return { byteStart, byteEnd: byteStart + enc.encode(part).length };
}
const tag = (text: string, t: string): Facet => ({ index: range(text, `#${t}`), features: [{ $type: TAG, tag: t }] });
const link = (text: string, uri: string, part = uri): Facet => ({ index: range(text, part), features: [{ $type: LINK, uri }] });

describe("facetSegments", () => {
  test("offsets UTF-8 con emojis y acentos", () => {
    const text = "Olá 👋🏽 @abuela.bsky.social, mira https://ex.example ✨ #Galiza";
    expect(
      facetSegments({
        text,
        facets: [
          tag(text, "Galiza"),
          { index: range(text, "@abuela.bsky.social"), features: [{ $type: MENTION, did: "did:plc:x" }] },
          link(text, "https://ex.example"),
        ],
      }),
    ).toEqual([
      { text: "Olá 👋🏽 " },
      { text: "@abuela.bsky.social", mention: "did:plc:x" },
      { text: ", mira " },
      { text: "https://ex.example", href: "https://ex.example" },
      { text: " ✨ " },
      { text: "#Galiza", tag: "Galiza" },
    ]);
  });

  test("solo enlaces http/https", () => {
    const text = "clic aquí";
    expect(facetSegments({ text, facets: [link(text, "javascript:alert(1)", "aquí")] })).toEqual([{ text: "clic aquí" }]);
    expect(facetSegments({ text, facets: [link(text, "HTTPS://ex.example", "aquí")] })).toEqual([
      { text: "clic " },
      { text: "aquí", href: "HTTPS://ex.example" },
    ]);
  });

  test("descarta facets solapados, vacíos y fuera de rango", () => {
    const text = "uno dos tres";
    expect(
      facetSegments({
        text,
        facets: [
          link(text, "https://a.example", "uno dos"),
          link(text, "https://b.example", "dos tres"),
          { index: { byteStart: 9, byteEnd: 9 }, features: [{ $type: LINK, uri: "https://c.example" }] },
          { index: { byteStart: 10, byteEnd: 99 }, features: [{ $type: LINK, uri: "https://d.example" }] },
        ],
      }),
    ).toEqual([{ text: "uno dos", href: "https://a.example" }, { text: " tres" }]);
  });

  test("texto vacío o sin facets", () => {
    expect(facetSegments({})).toEqual([]);
    expect(facetSegments({ text: "hola" })).toEqual([{ text: "hola" }]);
  });
});

describe("cleanCadernoSegments", () => {
  const clean = (r: PostRecord) => cleanCadernoSegments(r).map((s) => s.text).join("");

  test("tags al final", () => {
    const text = "Na praia con León 🏖️ #caderno #naia";
    expect(clean({ text, facets: [tag(text, "caderno"), tag(text, "naia")] })).toBe("Na praia con León 🏖️");
  });

  test("tags al principio y en medio", () => {
    const text = "#naia pintou   o mar #caderno e o sol";
    expect(clean({ text, facets: [tag(text, "naia"), tag(text, "caderno")] })).toBe("pintou o mar e o sol");
  });

  test("línea solo de tags", () => {
    const text = "Primeira liña\n#caderno #naia\nTerceira";
    expect(clean({ text, facets: [tag(text, "caderno"), tag(text, "naia")] })).toBe("Primeira liña\n\nTerceira");
  });

  test("texto en varias líneas (spec)", () => {
    const text = "Na praia\nco avó #caderno";
    expect(clean({ text, facets: [tag(text, "caderno")] })).toBe("Na praia\nco avó");
  });

  test("conserva todos los saltos de línea, también los seguidos", () => {
    const text = "a\n\n\n\nb #caderno";
    expect(clean({ text, facets: [tag(text, "caderno")] })).toBe("a\n\n\n\nb");
  });

  test("conserva enlaces y menciones", () => {
    const text = "Mira https://example.org #caderno";
    const segs = cleanCadernoSegments({ text, facets: [link(text, "https://example.org"), tag(text, "caderno")] });
    expect(segs).toEqual([{ text: "Mira " }, { text: "https://example.org", href: "https://example.org" }]);
  });

  test("solo tags da texto vacío", () => {
    const text = "#caderno #naia";
    expect(cleanCadernoSegments({ text, facets: [tag(text, "caderno"), tag(text, "naia")] })).toEqual([]);
  });
});

describe("postTags", () => {
  test("facets y tags[], en minúsculas y sin repetir", () => {
    const text = "Ola #Caderno #NAIA";
    expect(postTags({ text, facets: [tag(text, "Caderno"), tag(text, "NAIA")], tags: ["naia", "Leon", 3 as never] })).toEqual([
      "caderno",
      "naia",
      "leon",
    ]);
    expect(postTags(undefined)).toEqual([]);
  });
});

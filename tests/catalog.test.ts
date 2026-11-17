import { describe, expect, test } from "vitest";
import { attributeName, buildCatalog, isDrawing } from "../src/catalog.ts";
import type { PostRecord, RepoRecord } from "../src/lib/types.ts";
import pdsPosts from "./fixtures/pds-posts.json";

const TAG = "app.bsky.richtext.facet#tag";
const DID = "did:plc:cuaderno";
const NOMBRES = [
  { tag: "naia", nombre: "Naia" },
  { tag: "leon", nombre: "León" },
];

/** Post con facets de tag para cada `#tag` del texto. */
function post(text: string, extra: Partial<PostRecord> = {}): PostRecord {
  const enc = new TextEncoder();
  const facets = [...text.matchAll(/#(\S+)/g)].map((m) => {
    const byteStart = enc.encode(text.slice(0, m.index)).length;
    return { index: { byteStart, byteEnd: byteStart + enc.encode(m[0]).length }, features: [{ $type: TAG, tag: m[1] }] };
  });
  return { text, facets, createdAt: "2026-03-01T10:00:00Z", ...extra };
}
const rec = (rkey: string, value: PostRecord): RepoRecord<PostRecord> => ({
  uri: `at://${DID}/app.bsky.feed.post/${rkey}`,
  cid: `cid-${rkey}`,
  value,
});

describe("isDrawing", () => {
  test("tag en el texto", () => {
    expect(isDrawing(post("Na praia #caderno #naia"))).toBe(true);
  });
  test("tag solo en tags[], sin distinguir mayúsculas", () => {
    expect(isDrawing({ text: "Na praia", tags: ["Caderno"] })).toBe(true);
  });
  test("post sin el tag", () => {
    expect(isDrawing(post("Na praia #naia"))).toBe(false);
  });
  test("respuesta del cuaderno con el tag", () => {
    expect(isDrawing(post("Obrigada #caderno", { reply: { root: { uri: "x" }, parent: { uri: "x" } } }))).toBe(false);
  });
  test("datos raros", () => {
    expect(isDrawing(undefined)).toBe(false);
    expect(isDrawing({ text: "#caderno sen facet" })).toBe(false);
  });
});

describe("attributeName", () => {
  test("tag en la lista, sin distinguir mayúsculas", () => {
    expect(attributeName(post("Ola #caderno #NAIA"), NOMBRES)).toBe("Naia");
  });
  test("tag fuera de la lista", () => {
    expect(attributeName(post("Ola #caderno #naya"), NOMBRES)).toBeNull();
  });
  test("si coincide más de uno, el que aparece antes en la lista", () => {
    expect(attributeName(post("#caderno #leon #naia"), NOMBRES)).toBe("Naia");
  });
  test("tag con tilde, compuesto o descompuesto (NFC)", () => {
    const lista = [{ tag: "uxía", nombre: "Uxía" }];
    expect(attributeName(post("#caderno #Uxía"), lista)).toBe("Uxía");
    expect(attributeName(post("#caderno #Uxi\u0301a"), lista)).toBe("Uxía");
    expect(attributeName(post("#caderno #Uxía"), [{ tag: "uxi\u0301a", nombre: "Uxía" }])).toBe("Uxía");
  });
  test("tag de la lista en tags[]", () => {
    expect(attributeName({ text: "x", tags: ["Naia"] }, NOMBRES)).toBe("Naia");
  });
});

describe("buildCatalog", () => {
  test("orden por createdAt descendente", () => {
    const cat = buildCatalog(
      [
        rec("a", post("uno #caderno", { createdAt: "2026-03-01T10:00:00Z" })),
        rec("b", post("tres #caderno", { createdAt: "2026-03-03T10:00:00Z" })),
        rec("c", post("dous #caderno", { createdAt: "2026-03-02T10:00:00Z" })),
      ],
      NOMBRES,
    );
    expect(cat.map((d) => d.rkey)).toEqual(["b", "c", "a"]);
  });

  test("a igual fecha, rkey descendente; sin fecha válida, al final", () => {
    const cat = buildCatalog(
      [
        rec("3aaa", post("#caderno")),
        rec("3ccc", post("#caderno")),
        rec("3zzz", post("#caderno", { createdAt: "nope" })),
        rec("3bbb", post("#caderno")),
      ],
      NOMBRES,
    );
    expect(cat.map((d) => d.rkey)).toEqual(["3ccc", "3bbb", "3aaa", "3zzz"]);
  });

  test("filtra y atribuye", () => {
    const cat = buildCatalog(
      [rec("a", post("Na praia #caderno #naia")), rec("b", post("sen tag")), rec("c", post("#caderno #naya"))],
      NOMBRES,
    );
    expect(cat.map((d) => [d.rkey, d.nombre])).toEqual([
      ["c", null],
      ["a", "Naia"],
    ]);
  });

  test("con los posts reales del PDS de pruebas", () => {
    const cat = buildCatalog((pdsPosts as { records: RepoRecord<PostRecord>[] }).records, NOMBRES);
    expect(cat.map((d) => [d.rkey, d.nombre])).toEqual([
      ["3n2hlw4u4k22y", "León"],
      ["3n2hlsmfo5k2w", "Naia"],
    ]);
  });
});

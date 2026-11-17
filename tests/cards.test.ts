import { describe, expect, test } from "vitest";
import { buildCards } from "../src/cards.ts";
import type { ThreadNode } from "../src/lib/types.ts";
import { moderateThread } from "../src/moderation.ts";

const DID = "did:plc:cuaderno";
const NOW = Date.parse("2026-11-16T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString();

/** Respuesta del cuaderno (visible sin like), publicada hace `h` horas. */
function node(name: string, h: number, replies: ThreadNode[] = []): ThreadNode {
  return {
    $type: "app.bsky.feed.defs#threadViewPost",
    post: { uri: `at://${DID}/app.bsky.feed.post/${name}`, cid: name, author: { did: DID }, record: { text: name, createdAt: hoursAgo(h) } },
    replies,
  };
}
const cards = (replies: ThreadNode[]) =>
  buildCards(moderateThread({ replies }, { did: DID, likes: new Map(), hidden: new Set() }).replies).map((c) => [
    c.reply.record?.text,
    c.followups.map((f) => f.record?.text),
  ]);

describe("buildCards", () => {
  test("dos respuestas directas, la más antigua primero", () => {
    expect(cards([node("b", 3), node("a", 16)])).toEqual([
      ["a", []],
      ["b", []],
    ]);
  });

  test("conversación de tres niveles: A y, al mismo nivel, B y C", () => {
    expect(cards([node("A", 3, [node("B", 2, [node("C", 1)])])])).toEqual([["A", ["B", "C"]]]);
  });

  test("ramas mezcladas por createdAt", () => {
    expect(cards([node("A", 10, [node("B1", 8, [node("C1", 2)]), node("B2", 5)])])).toEqual([["A", ["B1", "B2", "C1"]]]);
  });

  test("hilo de veinte niveles, sin cortes", () => {
    let deep: ThreadNode = node("n20", 1);
    for (let i = 19; i >= 2; i--) deep = node(`n${i}`, 21 - i + 1, [deep]);
    const out = cards([node("n1", 30, [deep])]);
    expect(out).toHaveLength(1);
    expect(out[0]?.[1]).toEqual(Array.from({ length: 19 }, (_, i) => `n${i + 2}`));
  });

  test("sin respuestas visibles, sin tarjetas", () => {
    expect(cards([])).toEqual([]);
  });
});

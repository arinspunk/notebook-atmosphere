import { describe, expect, test } from "vitest";
import type { LikeRecord, RepoRecord, ThreadgateRecord, ThreadNode } from "../src/lib/types.ts";
import { hiddenUris, moderateThread, type LikeMap, type ModerationInput } from "../src/moderation.ts";
import threadBsky from "./fixtures/drawing-thread-bsky.json";
import threadBlacksky from "./fixtures/drawing-thread-blacksky.json";
import pdsLikes from "./fixtures/pds-likes.json";
import pdsThreadgate from "./fixtures/pds-threadgate.json";

const DID = "did:plc:t3q3ylsnsser3o74xz42sdqk";
const XULIO = "did:plc:myufvpeutlocqv3tpnzsvwoe";
const uri = (did: string, rkey: string) => `at://${did}/app.bsky.feed.post/${rkey}`;

// Respuestas reales del dibujo 3n2hlsmfo5k2w (ver tests/fixtures).
const OCULTADA = uri(XULIO, "3n2hma6m3ak25"); // con like y en hiddenReplies
const PENDIENTE = uri(XULIO, "3n2hm6i2xik25"); // 😍, sin like
const CUMU = uri(DID, "3n2hm7ey7vc2r"); // respuesta del cuaderno a la pendiente
const CHULO = uri(XULIO, "3n2hlyc7pv225"); // con like
const CAVEIRA = uri(XULIO, "3n2hlzjt2l225"); // con like, responde a CHULO
const DEMO = uri(XULIO, "3n2hm4byxe225"); // con like, responde a CAVEIRA
const OBRIGADA = uri(DID, "3n2hm4uuazc2l"); // del cuaderno, responde a DEMO

function likeMap(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const r of (pdsLikes as { records: RepoRecord<LikeRecord>[] }).records) {
    const { uri: u, cid } = r.value.subject ?? {};
    if (u && cid) map.set(u, (map.get(u) ?? new Set()).add(cid));
  }
  return map;
}
const HIDDEN = hiddenUris((pdsThreadgate as { value: ThreadgateRecord }).value);
const thread = (src: unknown = threadBsky): ThreadNode => structuredClone((src as { thread: ThreadNode }).thread);
const input = (over: Partial<ModerationInput> = {}): ModerationInput => ({ did: DID, likes: likeMap(), hidden: HIDDEN, ...over });

/** Busca un nodo por URI en el árbol. */
function find(node: ThreadNode, u: string): ThreadNode {
  if (node.post?.uri === u) return node;
  for (const c of node.replies ?? []) {
    try {
      return find(c, u);
    } catch {
      /* sigue */
    }
  }
  throw new Error(`no está ${u}`);
}

describe("moderateThread con el hilo real", () => {
  for (const [name, src] of [
    ["bsky", threadBsky],
    ["blacksky", threadBlacksky],
  ] as const) {
    test(`clasificación (${name})`, () => {
      const { statuses } = moderateThread(thread(src), input());
      expect(statuses.get(OCULTADA)).toBe("hidden"); // like + ocultada
      expect(statuses.get(PENDIENTE)).toBe("pending"); // sin like
      expect(statuses.has(CUMU)).toBe(false); // cuelga de una pendiente: ni se clasifica
      expect(statuses.get(CHULO)).toBe("visible"); // like
      expect(statuses.get(CAVEIRA)).toBe("visible");
      expect(statuses.get(DEMO)).toBe("visible");
    });
  }

  test("solo la rama aprobada queda en el árbol visible", () => {
    const { replies } = moderateThread(thread(), input());
    expect(replies.map((r) => r.post.uri)).toEqual([CHULO]);
    expect(replies[0]?.replies[0]?.replies[0]?.replies[0]?.post.uri).toBe(OBRIGADA);
  });

  test("respuesta del cuaderno a una pendiente: ninguna se ve", () => {
    const { replies } = moderateThread(thread(), input());
    const all = JSON.stringify(replies);
    expect(all).not.toContain(PENDIENTE);
    expect(all).not.toContain(CUMU);
  });

  test("lista hiddenReplies con valores no válidos", () => {
    const hidden = hiddenUris({ hiddenReplies: [3, null, { uri: CHULO }, OCULTADA, ""] });
    expect([...hidden]).toEqual([OCULTADA]);
    expect(moderateThread(thread(), input({ hidden })).statuses.get(CHULO)).toBe("visible");
  });

  test("AppView sin threadgate: manda el del PDS", () => {
    const t = thread();
    expect((t.post as Record<string, unknown>).threadgate).toBeDefined();
    delete (t.post as Record<string, unknown>).threadgate;
    expect(moderateThread(t, input()).statuses.get(OCULTADA)).toBe("hidden");
  });

  test("respuesta del cuaderno en hiddenReplies: oculta", () => {
    const hidden = new Set([...HIDDEN, OBRIGADA]);
    expect(moderateThread(thread(), input({ hidden })).statuses.get(OBRIGADA)).toBe("hidden");
  });
});

describe("etiquetas", () => {
  test("cuenta etiquetada después del like", () => {
    const t = thread();
    find(t, CHULO).post!.author!.labels = [{ val: "porn", uri: XULIO }];
    const { statuses, replies } = moderateThread(t, input());
    expect(statuses.get(CHULO)).toBe("hidden");
    expect(replies).toEqual([]);
  });

  test("etiqueta del record de perfil (no de la cuenta) no oculta", () => {
    const t = thread();
    find(t, CHULO).post!.author!.labels = [{ val: "porn", uri: `at://${XULIO}/app.bsky.actor.profile/self` }];
    expect(moderateThread(t, input()).statuses.get(CHULO)).toBe("visible");
  });

  test("etiqueta en el post de la respuesta", () => {
    const t = thread();
    find(t, CAVEIRA).post!.labels = [{ val: "!hide" }];
    const { statuses } = moderateThread(t, input());
    expect(statuses.get(CAVEIRA)).toBe("hidden");
    expect(statuses.has(DEMO)).toBe(false);
  });

  test("dibujo con falso positivo: no afecta", () => {
    const t = thread();
    t.post!.labels = [{ val: "nudity" }];
    expect(moderateThread(t, input()).statuses.get(CHULO)).toBe("visible");
  });
});

describe("padre no visible", () => {
  test("padre borrado", () => {
    const t = thread();
    const chulo = find(t, CHULO);
    chulo.replies = [{ $type: "app.bsky.feed.defs#notFoundPost", replies: chulo.replies?.[0]?.replies } as ThreadNode];
    const { statuses, replies } = moderateThread(t, input());
    expect(statuses.has(DEMO)).toBe(false);
    expect(replies[0]?.replies).toEqual([]);
  });

  test("bloqueado o sin datos", () => {
    const t = thread();
    t.replies = [{ $type: "app.bsky.feed.defs#blockedPost" }, { $type: THREAD, post: { cid: "x" } }] as ThreadNode[];
    expect(moderateThread(t, input()).replies).toEqual([]);
  });
});
const THREAD = "app.bsky.feed.defs#threadViewPost";

describe("aprobación", () => {
  test("respuesta del cuaderno sin like", () => {
    const t = thread();
    const own = structuredClone(find(t, OBRIGADA));
    t.replies = [own];
    expect(moderateThread(t, input({ likes: new Map() })).statuses.get(OBRIGADA)).toBe("visible");
  });

  test("seguir al autor no aprueba (sin like queda pendiente)", () => {
    const t = thread();
    (find(t, CHULO).post!.author as Record<string, unknown>).viewer = { following: "at://x" };
    expect(moderateThread(t, input({ likes: new Map() })).statuses.get(CHULO)).toBe("pending");
  });

  test("post reescrito después del like: cid distinto, pendiente", () => {
    const t = thread();
    find(t, CHULO).post!.cid = "bafyreicambiado";
    expect(moderateThread(t, input()).statuses.get(CHULO)).toBe("pending");
  });

  test("AppView sin rootAuthorLike: aprueba igual", () => {
    const t = thread();
    const strip = (n: ThreadNode) => {
      delete (n as Record<string, unknown>).threadContext;
      n.replies?.forEach(strip);
    };
    strip(t);
    expect(moderateThread(t, input()).statuses.get(CHULO)).toBe("visible");
  });

  test("like retirado (mapa sin ese like): pendiente", () => {
    const likes: LikeMap = new Map([...likeMap()].filter(([u]) => u !== CHULO));
    expect(moderateThread(thread(), input({ likes })).statuses.get(CHULO)).toBe("pending");
  });
});

describe("fallo cerrado", () => {
  test("PDS caído sin caché: solo las del cuaderno", () => {
    const t = thread();
    t.replies = [structuredClone(find(t, OBRIGADA)), find(t, CHULO)];
    const { statuses, replies } = moderateThread(t, input({ likes: null }));
    expect(statuses.get(CHULO)).toBe("pending");
    expect(replies.map((r) => r.post.uri)).toEqual([OBRIGADA]);
  });

  test("threadgate no disponible: solo las del cuaderno", () => {
    const t = thread();
    t.replies = [structuredClone(find(t, OBRIGADA)), find(t, CHULO), find(t, OCULTADA)];
    const { replies } = moderateThread(t, input({ hidden: null }));
    expect(replies.map((r) => r.post.uri)).toEqual([OBRIGADA]);
  });
});

describe("cortes del AppView", () => {
  test("marca como cortadas las respuestas visibles sin la clave replies", () => {
    const { truncated } = moderateThread(thread(threadBlacksky), input());
    expect(truncated.map((r) => r.post.uri)).toEqual([OBRIGADA]);
    expect(moderateThread(thread(threadBsky), input()).truncated).toEqual([]);
  });
});

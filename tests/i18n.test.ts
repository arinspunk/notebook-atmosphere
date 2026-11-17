import { describe, expect, test } from "vitest";
import { createI18n, pickStrings } from "../src/lib/i18n.ts";

describe("i18n", () => {
  test("gl por defecto, con plural de likes", () => {
    const i = createI18n(undefined);
    expect(i.lang).toBe("gl");
    expect(i.tn("likes", 1)).toBe("Fiz feliz a 1 amiga");
    expect(i.tn("likes", 2)).toBe("Fiz feliz a 2 amigas");
    expect(i.tn("likes", 20)).toBe("Fiz feliz a 20 amigas");
    expect(i.t("genericName")).toBe("o caderno");
  });

  test("cadena sobrescrita", () => {
    const i = createI18n("gl", { genericName: "a casa" });
    expect(i.t("genericName")).toBe("a casa");
    expect(i.t("now")).toBe("agora");
  });

  test("plural sobrescrito", () => {
    const i = createI18n("gl", { likes: { one: "{n} like", other: "{n} likes" } });
    expect(i.tn("likes", 1)).toBe("1 like");
    expect(i.tn("likes", 3)).toBe("3 likes");
  });

  test("idioma desconocido cae a gl", () => {
    const i = createI18n("xx");
    expect(i.lang).toBe("gl");
    expect(i.tn("likes", 2)).toBe("Fiz feliz a 2 amigas");
  });

  test("descarta claves desconocidas y tipos incorrectos", () => {
    expect(pickStrings({ nope: "x", now: 3, likes: "plano", genericName: "a casa", shared: { one: "1" } })).toEqual({
      genericName: "a casa",
    });
    expect(pickStrings(null)).toEqual({});
    expect(pickStrings(["a"])).toEqual({});
  });
});

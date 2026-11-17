import { describe, expect, test } from "vitest";
import { formatAbsoluteDate, formatRelativeTime, isValidDate } from "../src/lib/date.ts";
import { createI18n } from "../src/lib/i18n.ts";

// Mediodía local del 2 de enero de 2020: así el día es el mismo en cualquier zona horaria.
const OLD = new Date(2020, 0, 2, 12).toISOString();
const NOW = Date.parse("2026-10-24T12:00:00Z");
const ago = (s: number) => new Date(NOW - s * 1000).toISOString();
const gl = createI18n("gl");
const rel = (iso: string | undefined) => formatRelativeTime(iso, gl, NOW);

describe("formatRelativeTime", () => {
  test("umbrales", () => {
    expect(rel(ago(0))).toBe("agora");
    expect(rel(ago(59))).toBe("agora");
    expect(rel(ago(60))).toBe("há 1 m");
    expect(rel(ago(59 * 60))).toBe("há 59 m");
    expect(rel(ago(3600))).toBe("há 1 h");
    expect(rel(ago(16 * 3600 + 20 * 60))).toBe("há 16 h");
    expect(rel(ago(86400))).toBe("há 1 d");
    expect(rel(ago(29 * 86400))).toBe("há 29 d");
    expect(rel(ago(30 * 86400))).toBe("há 1 me");
    expect(rel(ago(364 * 86400))).toBe("há 12 me");
  });

  test("fecha corta a partir de 365 días, sin el patrón relativo", () => {
    const out = rel(ago(400 * 86400));
    expect(out).not.toContain("há");
    expect(out).not.toContain("me");
    expect(out).toMatch(/\d/);
    expect(rel(ago(365 * 86400))).not.toContain("há");
  });

  test("fecha corta en el formato del locale", () => {
    expect(formatRelativeTime(OLD, createI18n("gl"), NOW)).toBe("02/01/20");
  });

  test("fecha no válida", () => {
    expect(rel("nope")).toBe("");
    expect(rel(undefined)).toBe("");
    expect(isValidDate("nope")).toBe(false);
    expect(isValidDate(OLD)).toBe(true);
  });
});

describe("formatAbsoluteDate", () => {
  test("fecha y hora del tooltip", () => {
    const out = formatAbsoluteDate(OLD, "gl");
    expect(out).toBe("02/01/20, 12:00");
  });

  test("locale no válido devuelve el ISO; fecha no válida, vacío", () => {
    expect(formatAbsoluteDate(OLD, "%%")).toBe(OLD);
    expect(formatAbsoluteDate("nope", "gl")).toBe("");
  });
});

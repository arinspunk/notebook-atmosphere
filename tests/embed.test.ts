import { describe, expect, test } from "vitest";
import { pageImageUrl, viewerImageUrl } from "../src/embed.ts";
import { isWebUrl } from "../src/lib/url.ts";
import { isWebUrl as isWebUrlFromDom } from "../src/ui/dom.ts";

const THUMB = "https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:x/cid";
const FULL = "https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:x/cid";

describe("image URLs (image-viewer 1.1)", () => {
  test("the page uses thumb; fullsize only when there is no thumb", () => {
    expect(pageImageUrl({ thumb: THUMB, fullsize: FULL })).toBe(THUMB);
    expect(pageImageUrl({ fullsize: FULL })).toBe(FULL);
    expect(pageImageUrl({ thumb: "javascript:alert(1)", fullsize: FULL })).toBe(FULL);
  });

  test("the viewer uses fullsize; thumb only when there is no fullsize", () => {
    expect(viewerImageUrl({ thumb: THUMB, fullsize: FULL })).toBe(FULL);
    expect(viewerImageUrl({ thumb: THUMB })).toBe(THUMB);
  });

  test("no web URL gives null", () => {
    for (const img of [null, undefined, {}, { thumb: "data:image/png;base64,x", fullsize: "javascript:x" }]) {
      expect(pageImageUrl(img)).toBeNull();
      expect(viewerImageUrl(img)).toBeNull();
    }
  });

  test("isWebUrl lives in lib/url.ts and dom.ts re-exports it", () => {
    expect(isWebUrlFromDom).toBe(isWebUrl);
    expect(isWebUrl("https://example.org")).toBe(true);
    expect(isWebUrl("javascript:alert(1)")).toBe(false);
  });
});

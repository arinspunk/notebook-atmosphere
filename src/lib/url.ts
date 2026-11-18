/**
 * URL helpers without DOM code, so pure modules can use them.
 */

/** Whether a URL is `http:` or `https:`. */
export function isWebUrl(href: string | undefined): href is string {
  if (!href) return false;
  try {
    const u = new URL(href);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

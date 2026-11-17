/**
 * Configuración del cuaderno. Para usar otro cuaderno o AppView, cambia estos
 * valores y vuelve a publicar.
 */

/** Asociación entre un hashtag (sin `#`, sin distinguir mayúsculas) y el nombre que se muestra. */
export interface NombreTag {
  tag: string;
  nombre: string;
}

export interface Config {
  /** DID de la cuenta del cuaderno. */
  did: string;
  /** PDS del cuaderno (records: posts, likes, threadgates). */
  pdsUrl: string;
  /** AppView para hilos, perfiles, contadores e imágenes. */
  appviewUrl: string;
  /** Idioma de la interfaz; sin diccionario propio se usa `gl`. */
  lang: string;
  /** Cadenas sueltas que sobrescriben las del diccionario. */
  strings?: Record<string, string | Record<string, string>>;
  /** Lista de tags de nombre; el primero que coincida da el nombre del dibujo o la respuesta. */
  nombres: NombreTag[];
}

export const APPVIEW_BLUESKY = "https://public.api.bsky.app";
export const APPVIEW_BLACKSKY = "https://api.blacksky.community";

/**
 * Cuenta de pruebas (usoritual.com en Eurosky). No es la definitiva: cambia
 * `did` y `pdsUrl` cuando exista la cuenta del cuaderno.
 */
export const config: Config = {
  did: "did:plc:t3q3ylsnsser3o74xz42sdqk",
  pdsUrl: "https://eurosky.social",
  appviewUrl: APPVIEW_BLUESKY,
  lang: "gl",
  nombres: [
    { tag: "naia", nombre: "Naia" },
    { tag: "leon", nombre: "León" },
  ],
};

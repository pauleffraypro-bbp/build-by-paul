// Stockage persistant des bilans, des réglages et des fichiers de la galerie.
// Netlify Blobs : rien à créer à la main, l'espace se crée tout seul au premier enregistrement.

import { getStore } from "@netlify/blobs";

const CLES_AUTORISEES = ["bbp-bilans", "bbp-edits", "bbp-notion-cache"];
const PREFIXES_AUTORISES = ["bbp-media-", "bbp-fichier-"];
const TAILLE_MAX = 900_000;
const TAILLE_MAX_MEDIA = 6_000_000;

const cleValide = (k) =>
  CLES_AUTORISEES.includes(k) ||
  PREFIXES_AUTORISES.some((p) => k.startsWith(p) && k.length < 120);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export default async (request) => {
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !cleValide(key)) return json({ error: "clé non autorisée" }, 400);

  let store;
  try {
    store = getStore("build-by-paul");
  } catch (e) {
    return json({ error: "stockage indisponible" }, 500);
  }

  try {
    if (request.method === "GET") {
      const value = await store.get(key, { type: "text" });
      return json({ key, value: value ?? null });
    }

    if (request.method === "PUT" || request.method === "POST") {
      const body = await request.json();
      const value =
        typeof body.value === "string" ? body.value : JSON.stringify(body.value ?? null);
      const plafond = key.startsWith("bbp-fichier-") ? TAILLE_MAX_MEDIA : TAILLE_MAX;
      if (value.length > plafond) return json({ error: "données trop volumineuses" }, 413);
      await store.set(key, value);
      return json({ key, ok: true });
    }

    if (request.method === "DELETE") {
      await store.delete(key);
      return json({ key, ok: true });
    }
  } catch (e) {
    return json({ error: "opération impossible" }, 500);
  }

  return json({ error: "méthode non autorisée" }, 405);
};

export const config = { path: "/api/store" };

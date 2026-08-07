// Réception des candidatures envoyées depuis la page méthode.
// POST : enregistre une candidature.  GET : renvoie la liste (onglet Prospects).

import { getStore } from "@netlify/blobs";

const CLE = "bbp-prospects";
const MAX = 300;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const propre = (v, max = 600) =>
  typeof v === "string" ? v.slice(0, max).replace(/[\u0000-\u001f]/g, " ").trim() : "";

export default async (request) => {
  let store;
  try {
    store = getStore("build-by-paul");
  } catch (e) {
    return json({ error: "stockage indisponible" }, 500);
  }

  if (request.method === "GET") {
    const brut = await store.get(CLE, { type: "text" });
    return json({ prospects: brut ? JSON.parse(brut) : [] });
  }

  if (request.method === "POST") {
    let b;
    try {
      b = await request.json();
    } catch {
      return json({ error: "corps invalide" }, 400);
    }

    const c = {
      prenom: propre(b.prenom, 60),
      nom: propre(b.nom, 60),
      age: propre(b.age, 10),
      tel: propre(b.tel, 30),
      mail: propre(b.mail, 120),
      insta: propre(b.insta, 60),
      taille: propre(b.taille, 10),
      poids: propre(b.poids, 10),
      objectif: propre(b.objectif, 120),
      anciennete: propre(b.anciennete, 60),
      seances: propre(b.seances, 30),
      bilan: propre(b.bilan, 60),
      canal: propre(b.canal, 30),
      bloque: propre(b.bloque, 1200),
      dispo: propre(b.dispo, 200),
      date: new Date().toISOString(),
      ts: Date.now(),
      statut: "Nouveau",
    };

    if (!c.prenom || !c.nom || (!c.tel && !c.mail))
      return json({ error: "prénom, nom et un moyen de contact requis" }, 400);

    const brut = await store.get(CLE, { type: "text" });
    const liste = brut ? JSON.parse(brut) : [];

    // Anti-doublon : même personne envoyée deux fois en moins de deux minutes
    const recent = liste.find(
      (x) => (x.tel === c.tel || x.mail === c.mail) && c.ts - x.ts < 120000
    );
    if (!recent) {
      liste.unshift(c);
      await store.set(CLE, JSON.stringify(liste.slice(0, MAX)));
    }

    return json({ ok: true });
  }

  return json({ error: "méthode non autorisée" }, 405);
};

export const config = { path: "/api/prospects" };

/**
 * Inventaire Gambetta : passerelle entre l'appli et le Google Sheet « Inventaire Gambetta ».
 *
 * INSTALLATION (une fois) :
 *  1. Dans le Sheet : Extensions > Apps Script. Efface le contenu, colle ce fichier, enregistre.
 *  2. Choisis la fonction "setup" dans la barre du haut, clique Exécuter, autorise l'accès.
 *     Les onglets produits / inventaires / lignes / config apparaissent avec la liste de départ.
 *  3. Déployer > Nouveau déploiement > Application web
 *       Exécuter en tant que : Moi · Qui a accès : Tout le monde
 *     Copie l'URL (…/exec) et colle-la dans index.html, constante API_URL.
 *  4. Onglet config : ligne "emails" = adresses qui reçoivent le récap (séparées par des virgules).
 *     Code responsable (pour modifier la liste depuis l'appli) : 1234 au départ, ligne "pin" de l'onglet config.
 *
 * Après une modification de ce code : Déployer > Gérer les déploiements > crayon > Nouvelle version > Déployer.
 */

const SHEETS = {
  produits: ["id", "categorie", "ordre_categorie", "consigne_categorie", "produit", "unite", "type", "pas", "choix", "avertissement", "actif", "ordre"],
  inventaires: ["id", "horodatage", "date", "prenom", "commentaire", "nb_comptes", "nb_produits", "recap"],
  lignes: ["inventaire_id", "date", "prenom", "categorie", "produit", "unite", "valeur"],
  config: ["cle", "valeur"]
};

const NPR = "Ne pas recommander, voir avec Gambetta";
const BESOIN = "Pas besoin|Oui, bientôt|Oui, URGENT";
// [catégorie, consigne catégorie, produit, unité, type, pas, choix, avertissement]
const DEFAULT_PRODUCTS = [
  ["Boissons", "Attention à bien remplir le frigo avant !", "Eau plate Abatilles", "pack de 24", "qty", 1, "", ""],
  ["Boissons", "", "Bière Dodo", "pack de 24", "qty", 1, "", ""],
  ["Boissons", "", "Sirop de canne Canadou", "bouteille de 2 L", "qty", 0.5, "", ""],
  ["Boissons", "", "Coca normal", "pack de 24", "qty", 1, "", ""],
  ["Boissons", "", "Coca zéro", "pack de 24", "qty", 1, "", ""],
  ["Boissons", "", "Fuzetea thé noir pêche", "pack de 24", "qty", 1, "", ""],
  ["Boissons", "", "Fuzetea thé vert menthe citron vert", "pack de 24", "qty", 1, "", ""],
  ["Boissons", "", "Bière Phœnix", "pack de 18", "qty", 0.5, "", ""],
  ["Boissons", "", "Jus de goyave", "bouteille", "qty", 1, "", ""],
  ["Boissons", "", "Jus de mangue", "bouteille", "qty", 2, "", ""],
  ["Boissons", "", "Jus multifruits", "bouteille", "qty", 2, "", ""],
  ["Boissons", "", "Eau gazeuse San Pellegrino", "pack de 24", "qty", 1, "", ""],
  ["Épicerie", "", "Sachets curcuma", "sachet 500 g", "qty", 1, "", ""],
  ["Épicerie", "", "Jus de citron vert", "Bouteille de 1L", "qty", 1, "", ""],
  ["Épicerie", "", "Vinaigre blanc", "bidon de 10L", "qty", 1, "", ""],
  ["Épicerie", "", "Sel fin", "Seau 5kg", "qty", 0.5, "", "Sur le stand, sous le plan de travail"],
  ["Épicerie", "", "Cannelle moulue", "pot de 450 g", "qty", 1, "", ""],
  ["Épicerie", "", "Huile de friture", "Bidon de 10L", "qty", 0.5, "", ""],
  ["Épicerie", "", "Bidon de Siave (sauce soja)", "bidon 4,5 L", "qty", 0.5, "", ""],
  ["Épicerie", "", "Sac de riz", "sac 20 kg", "qty", 1, "", ""],
  ["Épicerie", "", "Bidon sauce aigre-douce", "bidon 2 L", "qty", 1, "", ""],
  ["Épicerie", "", "Crème coco Vietcoco", "Conserve 400ml", "qty", 3, "", "Sur le stand, dans la grande vitrine"],
  ["Épicerie", "", "Lait de coco Vietcoco", "Brique 1 L", "qty", 1, "", ""],
  ["Épicerie", "", "Arôme vanille pour le punch", "Bouteille 1 L", "qty", 1, "", "Ne pas confondre avec l'extrait de vanille pour les rhums et les gâteaux"],
  ["Épicerie", "", "Nestlé lait concentré sucré", "Conserve 1 kg", "qty", 1, "", ""],
  ["Épicerie", "", "Saint Louis Cassonade", "Brique 650g", "qty", 1, "", "Sur le stand, dans la grande vitrine"],
  ["Piments", "", "Piment chinois", "bocal en verre", "qty", 1, "", ""],
  ["Piments", "", "Pâte de piment DOANA", "Bocal en verre", "qty", 1, "", ""],
  ["Mangues, Frites, Herbes", "", "Mangues surgelées", "Sachet 1kg", "qty", 1, "", "Vérifier dans les 2 congélos en chambre froide"],
  ["Mangues, Frites, Herbes", "", "Frites de patate douce surgelées", "Sachets 2,5kg", "qty", 1, "", "Vérifier dans les 2 congélos en chambre froide"],
  ["Mangues, Frites, Herbes", "", "Ciboulette en bon état", "botte de 20 g", "qty", 1, "", "Sur le stand et en chambre froide"],
  ["Mangues, Frites, Herbes", "", "Coriandre en bon état", "botte de 30 g", "qty", 1, "", "Sur le stand et en chambre froide"],
  ["Alcools", "Jamais pendant le service", "Bouteille rhum blanc Charrette", "Bouteille 1L", "qty", 1, "", ""],
  ["Alcools", "", "BIB Rhum blanc Charrette", "Bib Carton 3L", "qty", 1, "", ""],
  ["Alcools", "", "Rhum ambré Saint James", "bouteille 70 cl", "qty", 1, "", ""],
  ["Alcools", "", "Rhum ambré Saint James", "BIB 2L", "qty", 1, "", ""],
  ["Bureautique", "", "Bobines imprimante", "", "qty", 2, "", "C'est les gros rouleaux"],
  ["Bureautique", "", "Sigma Bobines TPE", "", "qty", 5, "", "C'est les petits rouleaux"],
  ["Bureautique", "", "Agrafeuse", "", "qty", 1, "", ""],
  ["Bureautique", "", "Agrafes SP19", "Petits paquets de 5000", "qty", 1, "", ""],
  ["Hygiène", "", "Paille de fer", "pack de 10", "qty", 1, "", ""],
  ["Hygiène", "", "Produit sol", "bidon de 5 L", "qty", 1, "", ""],
  ["Hygiène", "", "Bobines essuie-tout pour distributeur", "", "qty", 1, "", ""],
  ["Hygiène", "", "Savon mains", "1 L", "qty", 1, "", ""],
  ["Hygiène", "", "Produit vitre", "Spray", "qty", 1, "", ""],
  ["Hygiène", "", "Liquide vaisselle", "bidon 5 L", "qty", 1, "", ""],
  ["Hygiène", "", "Rouleaux sacs poubelle 50L", "", "qty", 1, "", ""],
  ["Hygiène", "", "Éponges", "pack de 10", "qty", 0.5, "", ""],
  ["Hygiène", "", "Solicuisine", "Spray", "qty", 1, "", "À n'utiliser que pour la hotte"],
  ["Hygiène", "", "Soligerm dégraissant désinfectant", "Spray", "qty", 1, "", ""],
  ["Consommables", "", "Couvercles pots bouchons / pilou-pilou", "sachet de 50", "qty", 2, "", ""],
  ["Consommables", "", "Petits pots à sauce kraft/fibre 5 cl", "sachet de 100", "qty", 1, "", ""],
  ["Consommables", "", "Barquettes pour Plats 75cl", "sachet de 50", "qty", 1, "", ""],
  ["Consommables", "", "Couvercles plastiques pour pots à sauce 3 cl", "sachet de 250", "qty", 1, "", ""],
  ["Consommables", "", "Sachets pour samoussas kraft brun", "Paquets de 250", "qty", 1, "", ""],
  ["Consommables", "", "Barquettes gâteaux kraft", "Paquets de 50", "qty", 1, "", ""],
  ["Consommables", "", "Bols ronds blancs pour bolinettes 250ml", "Paquets de 100", "qty", 1, "", ""],
  ["Consommables", "", "Couteaux en bois", "sachet de 100", "qty", 1, "", ""],
  ["Consommables", "", "Couvercles des barquettes 75cl pour plats", "sachet de 50", "qty", 1, "", "Attention sachets fragiles"],
  ["Consommables", "", "Grandes cuillères en bois", "sachet de 100", "qty", 1, "", ""],
  ["Consommables", "", "Piques à bouchons", "petit carton de 1000", "qty", 1, "", ""],
  ["Consommables", "", "Film alimentaire", "rouleau en carton", "qty", 1, "", ""],
  ["Consommables", "", "Fourchettes en bois", "sachet de 100", "qty", 1, "", ""],
  ["Consommables", "", "Gobelets kraft pour punch 20cl", "sachet de 50", "qty", 1, "", ""],
  ["Consommables", "", "Petites cuillères en bois", "sachet de 100", "qty", 1, "", ""],
  ["Consommables", "", "Sacs congélation 6 L pour les entrées", "carton de 50", "qty", 1, "", ""],
  ["Consommables", "", "Serviettes blanches", "sachet de 200 ou 250", "qty", 1, "", ""],
  ["Consommables", "", "Pots kraft brun 15cl pour bouchons et pilou-pilou", "sachet de 50", "qty", 1, "", ""],
  ["Consommables", "", "Petits pots à sauce 3 cl transparents", "sachet de 250", "qty", 1, "", ""],
  ["Consommables", "", "Petits sacs à emporter kraft", "Paquets de 50", "qty", 1, "", ""],
  ["Consommables", "", "Grands sacs à emporter kraft", "Paquets de 50", "qty", 1, "", ""],
  ["Consommables", "", "Piques en bambou 15cm pour brochettes bouchons", "Paquet de 500", "qty", 1, "", ""],
  ["Consommables", "", "Verres à shooter 50 ml", "pack de 50", "qty", 1, "", ""],
  ["Entrées surgelées", "BIEN REGARDER DESSOUS SVP", "Sachets samoussas poulet", "25 sachets par carton", "qty", 5, "", ""],
  ["Entrées surgelées", "", "Sachets samoussas légumes", "25 sachets par carton", "qty", 5, "", ""],
  ["Entrées surgelées", "", "Sachets samoussas fromage", "25 sachets par carton", "qty", 5, "", ""],
  ["Entrées surgelées", "", "Sachets bonbons piment", "25 sachets par carton", "qty", 5, "", ""],
  ["Entrées surgelées", "", "Sachets bouchons", "poches de 20, 60 ou 100", "qty", 2, "", ""],
  ["Entrées surgelées", "", "Format des poches de bouchons", "", "choice", "", "par 20|par 60|par 100", ""],
  ["Partie gérée en direct", "", "Torchons à carreaux", "", "choice", "", "Pas besoin|Oui, bientôt|Oui, URGENT", ""],
  ["Partie gérée en direct", "", "Lavettes vertes pour surfaces", "", "choice", "", "Pas besoin|Oui, bientôt|Oui, URGENT", ""],
  ["Partie gérée en direct", "", "Lavettes bleues pour vitres", "", "choice", "", "Pas besoin|Oui, bientôt|Oui, URGENT", ""],
  ["Partie gérée en direct", "", "Fonds de caisse", "", "choice", "", "Pas besoin|Oui, bientôt|Oui, URGENT", ""]
];

/* ---------------- Mise en place ---------------- */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) { sh = ss.insertSheet(name); sh.appendRow(SHEETS[name]); sh.setFrozenRows(1); sh.getRange(1, 1, 1, SHEETS[name].length).setFontWeight("bold"); }
  });
  const p = ss.getSheetByName("produits");
  p.getRange("H:I").setNumberFormat("@");
  if (p.getLastRow() < 2) {
    const cats = []; const rows = DEFAULT_PRODUCTS.map((r, i) => {
      if (cats.indexOf(r[0]) < 0) cats.push(r[0]);
      return ["p" + String(i + 1).padStart(3, "0"), r[0], cats.indexOf(r[0]) + 1, r[1], r[2], r[3], r[4], r[5] === "" ? "" : String(r[5]), r[6], r[7], true, i + 1];
    });
    p.getRange(2, 1, rows.length, SHEETS.produits.length).setValues(rows);
  }
  ss.getSheetByName("inventaires").getRange("C:C").setNumberFormat("@");
  ss.getSheetByName("lignes").getRange("B:B").setNumberFormat("@");
  const c = ss.getSheetByName("config");
  if (c.getLastRow() < 2) c.getRange(2, 1, 4, 2).setValues([["site", "Wayo Wayo · Gambetta"], ["emails", "contact@wayowayo.fr, clementdescol@hotmail.com"], ["pin", "1234"], ["rev", "1"]]);
  const def = ss.getSheetByName("Feuille 1") || ss.getSheetByName("Sheet1");
  if (def && ss.getSheets().length > 4) ss.deleteSheet(def);
  Logger.log("Prêt. Récap envoyé à : " + readConfig().emails);
}

/* ---------------- Accès ---------------- */
function sheet(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }
function rows(name) {
  const sh = sheet(name), n = sh.getLastRow();
  if (n < 2) return [];
  const head = SHEETS[name];
  return sh.getRange(2, 1, n - 1, head.length).getValues().map(r => { const o = {}; head.forEach((k, i) => o[k] = r[i]); return o; });
}
function readConfig() { const o = {}; rows("config").forEach(r => o[String(r.cle)] = String(r.valeur)); return o; }
function setConfig(key, value) {
  const sh = sheet("config"), n = sh.getLastRow();
  for (let i = 2; i <= n; i++) if (String(sh.getRange(i, 1).getValue()) === key) { sh.getRange(i, 2).setValue(String(value)); return; }
  sh.appendRow([key, String(value)]);
}
function num(v) { const n = Number(String(v).replace(",", ".")); return isNaN(n) ? 0 : n; }
function isTrue(v) { return v === true || v === "" || String(v).toUpperCase() === "TRUE" || String(v) === "1"; }

/** Liste des produits sous la forme attendue par l'appli : catégories ordonnées, produits ordonnés. */
function readCatalog() {
  const all = rows("produits").filter(r => r.id && isTrue(r.actif));
  all.sort((a, b) => (num(a.ordre_categorie) - num(b.ordre_categorie)) || (num(a.ordre) - num(b.ordre)));
  const sections = [], byName = {};
  all.forEach(r => {
    const name = String(r.categorie || "Divers");
    if (!byName[name]) { byName[name] = { id: "c" + (sections.length + 1), name, note: "", items: [] }; sections.push(byName[name]); }
    if (r.consigne_categorie && !byName[name].note) byName[name].note = String(r.consigne_categorie);
    const type = String(r.type || "qty") === "choice" ? "choice" : "qty";
    byName[name].items.push({
      id: String(r.id), label: String(r.produit), unit: String(r.unite || ""), note: String(r.avertissement || ""), type,
      step: type === "qty" ? (num(r.pas) || 1) : undefined,
      options: type === "choice" ? String(r.choix || "").split("|").map(s => s.trim()).filter(Boolean) : undefined
    });
  });
  return { rev: num(readConfig().rev) || 1, sections };
}

/** Réécrit tout l'onglet produits à partir de la liste envoyée par l'appli (les produits désactivés/supprimés disparaissent). */
function writeCatalog(cfg) {
  const sh = sheet("produits"), n = sh.getLastRow();
  const out = []; let ordre = 0;
  (cfg.sections || []).forEach((s, si) => (s.items || []).forEach((it, ii) => {
    ordre++;
    out.push([String(it.id || ("p" + Date.now() + ordre)), String(s.name || "Divers"), si + 1, ii === 0 ? String(s.note || "") : "", String(it.label || ""), String(it.unit || ""),
      it.type === "choice" ? "choice" : "qty", it.type === "choice" ? "" : String(it.step || 1), it.type === "choice" ? (it.options || []).join("|") : "", String(it.note || ""), true, ordre]);
  }));
  if (n >= 2) sh.getRange(2, 1, n - 1, SHEETS.produits.length).clearContent();
  sh.getRange("H:I").setNumberFormat("@");
  if (out.length) sh.getRange(2, 1, out.length, SHEETS.produits.length).setValues(out);
  const rev = Date.now(); setConfig("rev", rev); return rev;
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function checkPin(pin) { if (String(pin) !== String(readConfig().pin || "1234")) throw new Error("Code responsable incorrect"); }

/* ---------------- Lecture (GET) ---------------- */
function doGet(e) {
  try {
    const p = e.parameter || {};
    if (p.p) return doPost({ postData: { contents: p.p } });
    if (p.action === "catalog") return json({ ok: true, catalog: readCatalog(), site: readConfig().site });
    return json({ ok: true, message: "Inventaire Gambetta : passerelle active." });
  } catch (err) { return json({ ok: false, error: String(err.message || err) }); }
}

/* ---------------- Écriture (POST, corps JSON en text/plain) ---------------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const p = JSON.parse(e.postData.contents);
    switch (p.action) {
      case "submit": return json({ ok: true, result: addInventory(p.inventory, p.catalog) });
      case "checkPin": checkPin(p.pin); return json({ ok: true });
      case "saveCatalog": checkPin(p.pin); { const rev = writeCatalog(p.catalog); return json({ ok: true, rev, catalog: readCatalog() }); }
      case "changePin": checkPin(p.pin); setConfig("pin", String(p.newPin)); return json({ ok: true });
      default: return json({ ok: false, error: "Action inconnue" });
    }
  } catch (err) { return json({ ok: false, error: String(err.message || err) });
  } finally { lock.releaseLock(); }
}

/** Enregistre un inventaire (idempotent : le même id n'est jamais enregistré deux fois) et envoie le récap par mail. */
function addInventory(inv, catalog) {
  const sh = sheet("inventaires"), n = sh.getLastRow();
  if (n >= 2) {
    const ids = sh.getRange(2, 1, n - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(inv.id)) return { id: inv.id, duplicate: true };
  }
  const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  const when = new Date(inv.startedAt || Date.now());
  const date = Utilities.formatDate(when, tz, "yyyy-MM-dd");
  const cat = catalog && catalog.sections ? catalog : readCatalog();
  const lines = []; let counted = 0, total = 0;
  const textLines = ["INVENTAIRE GAMBETTA — " + Utilities.formatDate(when, tz, "EEEE d MMMM yyyy, HH:mm"), inv.who ? "Fait par : " + inv.who : "", ""];
  cat.sections.forEach(s => {
    textLines.push(s.name.toUpperCase());
    s.items.forEach(it => {
      total++;
      const raw = inv.values ? inv.values[it.id] : undefined;
      const has = raw !== undefined && raw !== null && raw !== "";
      if (has) counted++;
      const val = has ? (typeof raw === "number" ? String(raw).replace(".", ",") : String(raw)) : "?";
      lines.push([String(inv.id), date, String(inv.who || ""), s.name, it.label, it.unit || "", has ? (typeof raw === "number" ? raw : String(raw)) : ""]);
      textLines.push("• " + it.label + (it.unit ? " (" + it.unit + ")" : "") + " : " + val);
    });
    textLines.push("");
  });
  if (inv.comment && String(inv.comment).trim()) { textLines.push("COMMENTAIRE"); textLines.push(String(inv.comment).trim()); textLines.push(""); }
  const missing = total - counted;
  if (missing) textLines.push("(" + missing + " produit" + (missing > 1 ? "s" : "") + " non compté" + (missing > 1 ? "s" : "") + ", marqué" + (missing > 1 ? "s" : "") + " « ? »)");
  const recap = textLines.join("\n").trim();
  sh.getRange("C:C").setNumberFormat("@");
  sh.appendRow([String(inv.id), new Date().toISOString(), date, String(inv.who || ""), String(inv.comment || ""), counted, total, recap]);
  const ls = sheet("lignes");
  if (lines.length) { ls.getRange("B:B").setNumberFormat("@"); ls.getRange(ls.getLastRow() + 1, 1, lines.length, SHEETS.lignes.length).setValues(lines); }
  const emails = String(readConfig().emails || "").split(/[,;\s]+/).filter(Boolean);
  let mailed = false;
  if (emails.length) {
    try {
      MailApp.sendEmail({
        to: emails.join(","),
        subject: "Inventaire Gambetta " + Utilities.formatDate(when, tz, "dd/MM/yyyy") + (inv.who ? " — " + inv.who : "") + " (" + counted + "/" + total + ")",
        body: recap + "\n\nFeuille de calcul : " + SpreadsheetApp.getActiveSpreadsheet().getUrl()
      });
      mailed = true;
    } catch (err) { Logger.log("Mail non envoyé : " + err); }
  }
  return { id: inv.id, counted, total, mailed, emails };
}

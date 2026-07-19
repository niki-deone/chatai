// api/chat.js
// Vercel serverless function. The Anthropic API key lives ONLY here,
// in an environment variable - never in the client bundle.
// This is the correct counterpart to LeadFlow's finding #4.

const PERSONAS = {
  handwerk: {
    en: `You are the digital assistant of "Brandt Plumbing & Heating", a German master plumbing company (fictional demo). Services: bathroom renovation (typically 12,000-25,000 EUR, free inspection, fixed-price quotes), annual heating maintenance (from 120 EUR), 24/7 emergency service at 05251 000000. Office hours Mon-Fri 7:30-17:00, address: 12 Main Street, Marsberg. Answer briefly (2-4 sentences), warmly and professionally in English. For emergencies, always give the phone number and practical first-aid advice (e.g. shut off the main water valve). For appointments, ask for the caller's need and phone number. Never invent services or prices beyond the ones listed. If asked something unrelated to the business, politely steer back.`,
    de: `Du bist der digitale Assistent von "Brandt Sanitär & Heizung", einem deutschen Meisterbetrieb (fiktive Demo). Leistungen: Badsanierung (meist 12.000-25.000 EUR, kostenlose Besichtigung, Festpreisangebote), jährliche Heizungswartung (ab 120 EUR), 24/7-Notdienst unter 05251 000000. Bürozeiten Mo-Fr 7:30-17:00, Adresse: Musterstraße 12, Marsberg. Antworte kurz (2-4 Sätze), freundlich und professionell auf Deutsch, siezend. Bei Notfällen immer die Telefonnummer nennen und praktische Soforthilfe geben (z. B. Haupthahn zudrehen). Bei Terminwünschen nach Anliegen und Telefonnummer fragen. Erfinde keine Leistungen oder Preise über die genannten hinaus. Bei fachfremden Fragen höflich zum Thema zurückführen.`,
  },
  praxis: {
    en: `You are the assistant of "Dr. Weber Dental Practice" in Marsberg, Germany (fictional demo). Services: prophylaxis/professional cleaning (60 min, 89 EUR, often subsidized by insurers), implants with 3D planning, special care for anxious patients (extra time, sedation on request). Office hours Mon-Thu 8-18, Fri 8-14, phone 05251 111111. Emergency slots daily; outside office hours the dental emergency line is 01805 986700. Both public and private insurance accepted; transparent cost plans. Answer briefly (2-4 sentences), warmly and professionally in English. Never give medical diagnoses; for pain, always direct to calling the practice. Never invent services or prices. Steer unrelated questions back to the practice.`,
    de: `Du bist der Assistent der "Zahnarztpraxis Dr. Weber" in Marsberg (fiktive Demo). Leistungen: Prophylaxe/professionelle Zahnreinigung (60 Min., 89 EUR, oft bezuschusst), Implantate mit 3D-Planung, besondere Betreuung von Angstpatienten (mehr Zeit, auf Wunsch Sedierung). Sprechzeiten Mo-Do 8-18, Fr 8-14, Telefon 05251 111111. Täglich Notfallzeiten; außerhalb hilft der zahnärztliche Notdienst 01805 986700. Gesetzlich und privat Versicherte willkommen; transparente Kostenpläne. Antworte kurz (2-4 Sätze), warm und professionell auf Deutsch, siezend. Stelle keine medizinischen Diagnosen; bei Schmerzen immer ans Telefon der Praxis verweisen. Erfinde keine Leistungen oder Preise. Führe fachfremde Fragen höflich zurück.`,
  },
  ristorante: {
    en: `You are the assistant of "Trattoria Bella Vista", an Italian restaurant in Marsberg, Germany (fictional demo). Menu: stone-oven pizza (9-15 EUR), handmade pasta (11-18 EUR, house tip: tagliatelle al tartufo), weekly specials, dolci, 60+ Italian wines (house wine 0.2l from 5.50 EUR). Open Tue-Sun from 5 pm, kitchen closes 9:30 pm, Monday closed. Phone 05251 222222, address: 3 Market Square. No delivery, but pickup available (ready in 20-25 min). Vegetarian and vegan dishes available, gluten-free pizza dough for a small extra charge. For reservations collect: date, time, number of guests, name. Answer briefly (2-4 sentences) in English with light Italian warmth (an occasional "prego" or "molto bene" is fine, don't overdo it). Never invent dishes or prices. Steer unrelated questions back to the restaurant.`,
    de: `Du bist der Assistent der "Trattoria Bella Vista", eines italienischen Restaurants in Marsberg (fiktive Demo). Karte: Steinofen-Pizza (9-15 EUR), hausgemachte Pasta (11-18 EUR, Empfehlung: Tagliatelle al Tartufo), wechselnde Wochengerichte, Dolci, über 60 italienische Weine (Hauswein 0,2l ab 5,50 EUR). Geöffnet Di-So ab 17 Uhr, Küche bis 21:30, Montag Ruhetag. Telefon 05251 222222, Adresse: Am Markt 3. Keine Lieferung, aber Abholung möglich (fertig in 20-25 Min.). Vegetarische und vegane Gerichte vorhanden, glutenfreier Pizzateig gegen kleinen Aufpreis. Für Reservierungen erfragen: Datum, Uhrzeit, Personenzahl, Name. Antworte kurz (2-4 Sätze) auf Deutsch mit leichter italienischer Wärme (gelegentliches "prego" oder "molto bene" ist gut, nicht übertreiben). Erfinde keine Gerichte oder Preise. Führe fachfremde Fragen höflich zurück.`,
  },
};

// ── rate limiting ────────────────────────────────────────────
// In-memory per serverless instance: not perfect (instances don't
// share memory), but stops casual abuse. The hard safety nets are
// DAILY_CAP below and the monthly spend limit set in the Anthropic
// console - set one there too.
const ipHits = new Map(); // ip -> { count, windowStart }
const IP_LIMIT = 20;              // max AI calls per IP...
const IP_WINDOW_MS = 60 * 60e3;   // ...per hour
let dayCount = 0;
let dayStart = Date.now();
const DAILY_CAP = 400;            // max AI calls per day, whole endpoint (~$2 worst case)

function rateLimited(ip) {
  const now = Date.now();
  if (now - dayStart > 24 * 60 * 60e3) { dayCount = 0; dayStart = now; }
  if (dayCount >= DAILY_CAP) return 'daily_cap';
  const rec = ipHits.get(ip);
  if (!rec || now - rec.windowStart > IP_WINDOW_MS) {
    ipHits.set(ip, { count: 1, windowStart: now });
  } else {
    if (rec.count >= IP_LIMIT) return 'ip_limit';
    rec.count++;
  }
  if (ipHits.size > 5000) ipHits.clear(); // memory guard
  dayCount++;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // No key configured: the widget silently falls back to demo answers.
    return res.status(503).json({ error: 'not_configured' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const limited = rateLimited(ip);
  if (limited) {
    // Client treats any non-OK as a signal to fall back to demo answers.
    return res.status(429).json({ error: limited });
  }

  // ── validate input strictly: never trust the client ──
  const { theme, lang, messages } = req.body || {};
  const persona = PERSONAS[theme]?.[lang];
  if (!persona || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'bad_request' });
  }
  if (messages.length === 0 || messages.length > 8) {
    return res.status(400).json({ error: 'too_many_messages' });
  }
  const clean = [];
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) {
      return res.status(400).json({ error: 'bad_role' });
    }
    if (typeof m.content !== 'string' || m.content.length === 0) {
      return res.status(400).json({ error: 'bad_content' });
    }
    clean.push({ role: m.role, content: m.content.slice(0, 500) });
  }
  if (clean[clean.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'last_must_be_user' });
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system: persona,
        messages: clean,
      }),
    });

    if (!r.ok) {
      // Out of credits, rate limited, etc. - client falls back to demo.
      return res.status(502).json({ error: 'upstream_' + r.status });
    }

    const data = await r.json();
    const reply = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (!reply) return res.status(502).json({ error: 'empty_reply' });
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(502).json({ error: 'upstream_failed' });
  }
}

# AI Chat Widget — Live Demo

One chat widget, three businesses, two languages. The demo page pretends to be a real small-business website — a plumbing company, a dental practice, an Italian restaurant — and the top bar switches the entire site and widget persona live: colors, typography, content, bot name, quick replies, and answers. An EN/DE toggle localizes everything, including the bot's keyword matching.

**Live demo:** https://chatai-rho-bice.vercel.app

## Why it's built this way

A chat widget sells best in context. Instead of a feature checklist, the demo shows the widget doing its job on a believable website, for the exact kind of local business it's made for. Switching themes and languages demonstrates the real selling points: one widget, fully configurable per business, i18n-ready.

## Features

- Three complete business personas (content, palette, typography, bot behavior) driven by a single config object
- Full EN/DE localization — page content, UI strings, bot responses, and per-language keyword triggers
- Keyword-based demo responses per business, honest fallback message
- Typing indicator with randomized delay, quick replies, unread badge, timestamps
- Enter to send, Escape to close, focus management
- Responsive down to mobile, `prefers-reduced-motion` respected
- Zero dependencies: one HTML file, vanilla JS, no icon fonts (inline SVG)

## Honesty note

Demo responses are predefined. The production version connects the same frontend to an AI model (e.g. Claude API via a serverless endpoint) loaded with the business's real FAQ and data.

## Deploy

Static site — push to GitHub, import on Vercel, framework "Other", deploy.

---

Built by Nikita Danilov · [GitHub](https://github.com/niki-deone)

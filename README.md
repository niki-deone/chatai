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

## Live AI mode

The widget talks to a real AI model (Claude Haiku) through a Vercel serverless function (`api/chat.js`). The API key lives only in a server-side environment variable - never in the client bundle. Each business persona is a server-held system prompt with the business's actual data; the server validates every request (theme, language, message count, length) and the demo is capped at 10 AI messages per session.

If the endpoint is not configured or credits run out, the widget silently falls back to predefined keyword answers - the demo never breaks.

To deploy your own: set `ANTHROPIC_API_KEY` in Vercel project settings (Environment Variables) and redeploy.

## Deploy

Static site — push to GitHub, import on Vercel, framework "Other", deploy.

---

Built by Nikita Danilov · [GitHub](https://github.com/niki-deone)

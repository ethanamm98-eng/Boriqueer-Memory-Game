# Boricuir Memory

An enhanced Vite + React multiplayer memory game celebrating Puerto Rican queer culture with all 80 distinct illustrated pairs from the completed Boricuir Memory deck.

## Card categories

Cards are grouped by the border color printed in the supplied deck. Players can select any combination of one, two, three, or all four categories:

- Asuntos LGBTQIA+ generales: 33 pairs
- Puerto Rico / ser puertorriqueñe: 21 pairs
- Salud sexual Queer/LGBTQIA+: 13 pairs
- Identidades de género y orientaciones sexuales: 13 pairs

These counts follow the border colors printed on the 80 actual card faces, which are the source of truth used by category play.

There is no separate board-size setting. The game automatically includes every pair from the selected categories, updates the card total immediately, and uses the same selection for local bot games and Supabase online rooms.

## Included modes

- Classic Boricuir
- Beat the Clock
- Memory Rush
- Streak Master
- Last Chance

Supports 1-4 players, multiple board sizes, scores, turns, timers, responsive layouts, and the complete Boricuir card collection.

## Add your audio

Add the background song as:

`public/songs/background-music.mp3`

Add the following effects inside `public/sound-effects/`:

- `click.mp3`
- `flip.mp3`
- `match.mp3`
- `mismatch.mp3`
- `win.mp3`
- `lose.mp3`
- `start.mp3`
- `warning.mp3`
- `cheer.mp3`
- `clap.mp3`

The in-game Sound settings panel controls music and effects independently, includes separate volume sliders, and remembers each player's preferences in the browser.

## Online multiplayer with Supabase

The online mode includes email/password accounts, player profiles and stats, private six-character room codes, ready states, live presence, synchronized cards, database-authoritative turns and scoring, and realtime room notifications.

Private-room lobbies also include branded Resend email invitations. Invitations contain the sender's display name, the six-character room code, and a complete join link. Native sharing and SMS remain available as fallbacks.

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Copy `.env.example` to `.env` and add your public project URL and anon key.
4. Run `npm install` and `npm run dev`.

See `supabase/SETUP.md` for the full setup checklist. Never place a service-role key in the frontend.

The Resend API key is stored only as a Supabase Edge Function secret. Deploy `supabase/functions/send-room-invite` after configuring the secrets described in `supabase/SETUP.md`. Supabase Auth confirmation and recovery messages can use Resend through the custom SMTP settings documented there.

For an existing project, run `supabase/upgrade_card_categories.sql` to add category-aware private rooms, then apply any other upgrade files you have not previously installed.

## Bots and mobile card previews

Local games support up to three bot opponents:

- Easy: mostly random choices with limited memory.
- Medium: remembers a portion of revealed cards.
- Hard: remembers every revealed card and prioritizes known pairs.

On mobile, tapping a card opens an animated full-screen artwork preview. Tap the preview to close it immediately; otherwise it closes automatically. Face-down cards use a pink glow, revealed cards use a cyan glow, and matched cards use a green glow.

## Fixing an existing Supabase installation

If you installed a previous database schema, run `supabase/upgrade_card_categories.sql` once. The complete schema is available in `supabase/schema.sql` for new projects.

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in Terminal, normally `http://localhost:5173`.

## Production build

```bash
npm run build
npm run preview
```

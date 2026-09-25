# Sound effects

Place your sound effects in this folder using these exact filenames:

- `click.mp3` - ordinary buttons and controls
- `flip.mp3` - revealing a card
- `match.mp3` - finding a matching pair
- `mismatch.mp3` - selecting two different cards
- `win.mp3` - completing the board
- `lose.mp3` - running out of time or lives
- `start.mp3` - starting or restarting a game
- `warning.mp3` - final ten timer seconds

Recommended format: mp3, 44.1 kHz, 16-bit. Keep interface effects short, generally 0.05-0.4 seconds. Win and lose effects can be 1-3 seconds.

If you prefer MP3 effects, change the extensions in `src/audio/AudioProvider.tsx` to match your files.


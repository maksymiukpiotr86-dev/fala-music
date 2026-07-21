# Fala Music — Polska Fala Wave Six

A polished personal music-library prototype built around official provider playback.

## Included

- Custom playlists and automatic **Polubione** playlist
- Compact playlist picker without blocking full-screen dialogs
- Clickable artwork with play/pause overlays
- Clear **PODGLĄD / PEŁNY UTWÓR / BRAK PODGLĄDU** badges
- Persistent bottom player with seek time, duration, volume and mute
- Polished synchronized lyrics through LRCLIB when available
- YouTube OAuth-ready search and playlist importing
- Anonymous SoundCloud playback through the official widget
- Local JSON export/import
- Animated Polska Fala interface and particle background

## YouTube connection

Create a Google OAuth Web Client and enable **YouTube Data API v3**. Add the final GitHub Pages URL to the OAuth client's authorized JavaScript origins, then paste the Client ID inside Fala settings.

Fala never asks for or stores your Google password. The access token remains in the active browser tab and is not saved to the local library.

## Playback limitations

Some providers or video owners disallow embedded playback. Fala falls back to an available preview where possible, but does not bypass ads, regional restrictions or embedding permissions.

# MRanking

A ranking app that turns playlists and collections into private tournaments, tier lists and other comparison modes.

## Start

From PowerShell in this folder:

```powershell
.\start-local.ps1
```

Open [http://localhost:3000](http://localhost:3000). The first launch can take a few seconds while the local database starts.

For a fresh database, configure `MRANKING_ADMIN_NICKNAME` and `MRANKING_ADMIN_PASSWORD` as runtime values before the first request. Keep the real values out of Git; [`.dev.vars.example`](.dev.vars.example) contains blank local placeholders. Passwords are stored as PBKDF2 hashes, never as plain text.

## Current flow

1. Sign in with an account created by the administrator.
2. Open **Packs** and choose YouTube or YouTube Music.
3. Paste a public/unlisted playlist link, or a public profile link and choose one of its playlists.
4. Review the imported videos, edit the pack name or cover, and select the items that should stay.
5. Save a private pack and start **King of the Hill**.

At least 16 playable videos are required. Duplicate, private, deleted and unavailable entries are skipped and reported. Imported packs, in-progress games and final results persist in local SQLite storage.

The admin screen creates users, resets passwords, soft-deletes accounts without deleting their packs, and lists all private packs. Tier List, Blind Ranking and the other rating formats are visual placeholders for later development.

## Sites deployment

The project already uses the Sites-compatible Vinext layout. The build emits the worker bundle, D1 migrations and [`.openai/hosting.json`](.openai/hosting.json) with the `DB` and `AVATARS` bindings.

Before opening a fresh deployment, configure these runtime values in Sites:

- `MRANKING_ADMIN_NICKNAME` — the first administrator's nickname.
- `MRANKING_ADMIN_PASSWORD` — the first administrator's password (at least 6 characters; store it as a secret).

Run `pnpm test` before publishing. The generated `/dist` directory and local Wrangler state are intentionally ignored by Git.

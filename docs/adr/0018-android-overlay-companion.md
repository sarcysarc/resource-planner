# 0018 - An Android companion app that reads the game screen from a floating button

**Status:** proposed
**Date:** 2026-11-04
**Spec:** N/A (scoping discussion, 2026-11-04)
**Deciders:** project owner, Claude

## Context

Today a player gets a Pokémon into the planner in four steps: take a screenshot in the
game, open the gallery, share it to the installed app (ADR 0010), and switch back to the
game. ADR 0017 expects batches of 10–50 Pokémon, so those steps are repeated many times.
Apps like Calcy IV skip them. A floating button sits over the game, a tap captures the
screen, and the result shows up over the game and is saved automatically.

A web app can't do that. A browser page can't draw over other apps, and mobile Chrome
and Safari don't offer screen capture to a page. ADR 0001 ruled out a native app for v1
("store distribution, far more work").

Most of the work Calcy does is already built and tested. OCR and bar reading run on the
device (ADR 0008), screens are read by their labels (ADR 0009), screenshots are sorted into
Pokémon and lines (ADR 0017), and the stress test checked all of it on 229 real
screenshots (ADR 0016). What is missing is a native shell that floats the button and
captures the screen.

## Decision

### An Android app that wraps the existing web app

- Package the built `dist/` as an Android app with **Capacitor**. The page, the OCR
  files and the game data ship inside the APK, so nothing is downloaded on first use.
  `base: './'` already keeps paths relative.
- The core, the OCR code and the UI stay unchanged and shared. The GitHub Pages site
  (ADR 0004) and the share target (ADR 0010) stay as they are for iPhone and desktop.
- **Android only.** iOS doesn't allow drawing over other apps. Its only capture method,
  recording the whole screen with Apple's screen-recording API (ReplayKit), gives no
  button and has a tight memory limit. iPhone players keep the file picker.

### One native plugin: the bubble and the capture

A small Kotlin Capacitor plugin (`android/` and a plugin folder) that:

- Shows a **floating bubble** over other apps. This needs the "draw over other apps"
  permission (`SYSTEM_ALERT_WINDOW`), which the app asks for once and sends the player
  to Settings to grant.
- Asks for **screen capture** (MediaProjection) when the player starts a session. While
  the session lasts, Android 14+ requires a foreground service with the
  `mediaProjection` type and a notification.
- On a bubble tap, **captures one frame** at full resolution and keeps it as a PNG. It
  never records video and never captures on its own.
- Does **no** taps, swipes, text entry or accessibility-service automation in the game.
  A nickname, if one is offered later, goes to the clipboard.

### Frames go down the path shared screenshots already use

- The plugin hands frames to the page as `File`s. The page reads them with the same
  `openReader()` / `read()` code as an upload, and sorts them into lines as ADR 0017
  does. On the web side there is one new entry point next to `receiveShared`, and no
  new parser.
- The bridge on the TypeScript side is written against a small plugin interface, so it
  is tested in Vitest with a fake, like `src/share/stash.ts` (ADR 0010). The Kotlin code
  is left out of coverage, like `src/sw.ts`, and checked on a real phone.

### Two phases

1. **Capture now, read when the app opens.** Each tap adds a frame to a queue on the
   phone, and the bubble shows the count. When the player opens the planner, the
   queue is read as one batch and then deleted. This replaces screenshot, gallery and
   share, and it doesn't need the page to run in the background.
2. **Result over the game** (only if a spike shows it works). After a tap, the bubble
   shows the IVs and the verdict for that Pokémon's line. This needs the WebView to run
   OCR while Pokémon GO is in front. Android may pause or throttle a WebView in the
   background, so a spike on the phone must confirm the read finishes in about 2 s
   before phase 2 is built. If it can't, phase 1 is the whole feature.

### Distribution

- **Sideloaded APK first,** signed with a key kept outside the repo. The signing key and
  its password never go into git or into CI variables that pull requests can read.
- Publishing on Google Play is a separate decision. It adds a foreground-service
  declaration with a demo video, a privacy policy and review rounds.

### Amends ADR 0001

ADR 0001 keeps its stack. Native code is added only for the bubble and the capture, and
everything else stays in TypeScript.

## Consequences

- On Android, one tap per Pokémon replaces four steps, and the player stays in the game.
- Frames stay on the phone, as ADR 0008 requires. The queue is deleted once it is
  read, as shared files are (ADR 0010).
- The OCR files are in the APK. Phone speed is unchanged: about 1–2 s per appraisal
  (ADR 0008).
- **Android 14+ asks for capture permission every session.** That is one tap per
  session, and it can't be avoided.
- On Android 15, a player who picks "share one app" must pick Pokémon GO.
- The project gains Kotlin, Gradle and the Android SDK, a second build (APK) and
  testing on a real device. Quality gates (ADR 0001) apply to the Kotlin code too, but
  ESLint can't check them there. They are checked by hand, or with detekt set to the
  same limits.
- Reading pixels from a screen capture doesn't touch the game. Calcy IV and Poke Genie
  have done this for years. Automation would be riskier, and it is ruled out above.
- Bar colours and layout were measured on one phone (ADR 0008). A live frame looks the
  same as a screenshot, so this adds no new risk, but the app should be tried on more
  than one phone.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Keep the web app, screenshot and share (ADR 0010) | Nothing new to build | Four steps per Pokémon | It's the fallback, not the goal |
| Fully native Android app (Kotlin parser) | No WebView, fastest | Rewrites and re-tests ADRs 0008–0017 twice over | Parser already proven in TypeScript |
| Trusted Web Activity (TWA) | Simple wrapper, Play friendly | No native plugins, so no bubble or capture | Can't do the one thing needed |
| Google's text recognition (ML Kit) instead of tesseract.js | About 0.1 s, maybe better on stylised digits | A second text path whose output differs from what ADR 0016 tested | Revisit only if phase 2 is too slow |
| Accessibility service (reads the screen, auto-renames) | No capture prompt, can paste nicknames | Play restricts it to accessibility uses, and it looks like automation | Risk to the player's account and to Play approval |
| iOS screen recording (ReplayKit) | Reaches iPhone | No bubble, tight memory limit, player must switch apps | Little gain over the picker |

## Open questions

- Phase 2 spike: does OCR finish in the WebView while the game is in front?
- Should a bubble tap check the screen type first (ADR 0009) and ignore frames that
  show no Pokémon, or should the batch reader drop them, as it does for menus?
- Should the APK be built in CI (ADR 0004) as an unsigned artifact, or only on the
  owner's machine?

## Links

- Supersedes: N/A (amends 0001)
- Related: 0001, 0004, 0008, 0009, 0010, 0016, 0017

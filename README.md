# GIF Preview — a Penpot plugin

Penpot's canvas renders an animated GIF as a still frame, so an animation you
imported looks frozen while you design. This plugin gives it back: select a shape
and its animated fill plays in the panel, at full size and at the right speed.

![panel](proba.png)

## What it does

- plays **GIF, animated WebP and APNG** image fills;
- follows the selection — pick another shape and the preview switches;
- **Fit / 1:1** view modes and a **Restart** button to replay from the first frame;
- shows the fill's format and pixel size, with a link to the original file;
- follows the Penpot light/dark theme; UI in English or Russian, by browser locale.

Nothing is uploaded anywhere: the image is fetched from your own Penpot instance
by its media id, using the session you are already signed in with.

## Install

Open the plugin manager (`Ctrl/⌘ + Alt + P`) and paste the manifest URL:

```
https://<your-user>.github.io/penpot-gif-preview/manifest.json
```

## Permissions

`content:read` only — the plugin reads the name and fills of the selected shape.
It never writes to your file.

## Development

Plain HTML and JS, no build step. Serve the folder over http and load
`http://localhost:<port>/manifest.json` in the plugin manager.

`test.js` is a Playwright check that runs the panel without Penpot: it fakes the
selection messages and serves a local GIF in place of the server response.

## License

MIT

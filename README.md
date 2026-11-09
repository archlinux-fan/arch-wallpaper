# arch-wallpaper

Make an Arch Linux wallpaper in your browser: pick a colour, shape the gradient, size the logo and
download a PNG. The preview updates as you drag. Presets use the [Nord](https://www.nordtheme.com/) palette.

Everything runs in the browser: nothing is uploaded and there is no build step.
To try it, open `docs/index.html`.

## Publish

GitHub: Settings → Pages → Deploy from a branch → `main`, `/docs`.

## Files

- `docs/index.html`, `docs/style.css`: the page.
- `docs/app.js`: the drawing, 8x8 Bayer dithering and the controls.
- `docs/logo.js`: the logo paths, from `archlinux-logo-text.svg` in Arch's `filesystem` package.

The Arch Linux name and logo are trademarks of their owner. This is not an official Arch Linux project.

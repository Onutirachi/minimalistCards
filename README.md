# Minimalist Cards

A minimalist web wallpaper for [Wallpaper Engine](https://store.steampowered.com/app/431960/Wallpaper_Engine/).

**Clock**
+ 12H or 24H format
+ Optional seconds display

**Localized Date**
+ Automatically formats weekday and date based on your system language

**Track Info**
+ Dynamically updates song details and background color from the album cover
+ Animated frequency bars and peak dots
+ Beat-reactive to bass, mid, and treble frequencies
+ Timeline showing current playback position and total track length

[Steam Workshop](https://steamcommunity.com/sharedfiles/filedetails/?id=3596377391)

## Development

```sh
npm run dev     # serves the folder on http://localhost:8080 (needs Python)
npm test        # unit tests (Node 22+)
```

Open <http://localhost:8080/dev/> to run the wallpaper in a browser with a mocked Wallpaper Engine API (add `?debug` for the data overlay). Keys: `Space` play/pause, `N` next track, `S` stop, `P` pause wallpaper, `M` toggle media integration.

Specs live in [`docs/`](docs/README.md); contribution rules in [`CONTRIBUTING.md`](CONTRIBUTING.md).

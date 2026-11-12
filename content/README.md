# Exhibition pages

Each show gets its own page at `nitagallery.com.au/exhibitions/<slug>`, listed on `/exhibitions`,
with event data Google can read (dates, opening night, artists, free entry) and an entry in the
sitemap and llms.txt. Past shows stay up as an archive, so links from listings keep working.

## Add a show

1. Put the images in `img/ex/<slug>/` (landscape, about 2400 px wide, JPG).
2. Add an entry to `content/exhibitions.json` (copy one from `exhibitions.example.json`).
3. Run `node tools/build-exhibitions.mjs`.
4. Open `exhibitions/<slug>.html` locally to check it, then commit and push.

Use the page's URL in the ATDW listing, the media release and every outlet you send it to.

## Fields

| Field | Required | Notes |
| --- | --- | --- |
| `slug` | yes | lowercase-and-hyphens; becomes the URL. Never change it once announced |
| `title` | yes | the show's name |
| `artists` | yes | `["Ritushka"]`, `["Nick Brand"]`, or any other name (guest artists get a plain name) |
| `medium` | yes | "large abstract seascapes in acrylic" |
| `count` | no | number of works |
| `start`, `end` | yes | `YYYY-MM-DD` |
| `opening` | no | `{ "date": "YYYY-MM-DD", "start": "18:00", "end": "20:00" }` |
| `announced` | no | date the show was announced; used for the sitemap date |
| `summary` | yes | under 155 characters; the Google snippet and index card text |
| `body` | yes | list of paragraphs |
| `quote` | no | `{ "text": "...", "by": "Ritushka" }` |
| `priceFrom` | no | number, in AUD |
| `hero` | yes | `{ "src": "img/ex/<slug>/hero.jpg", "alt": "...", "caption": "...", "width": 2400, "height": 1600 }` |
| `images` | no | more images, same shape as `hero` |
| `works` | no | `[{ "title": "...", "url": "https://www.ritushka.com/artwork/...", "details": "acrylic on canvas, 120 x 90 cm" }]` |
| `artistNotes` | no | `{ "Guest Name": "One line about them" }` |
| `draft` | no | `true` keeps a show out of the build |

`node tools/build-exhibitions.mjs --example` builds the example shows for a local look; run the
plain command afterwards so the example pages are removed before you commit.

# Anatomy Dev

Interactive visual explanations built with the [Anatomy](https://github.com/wheresryan22/anatomy) isometric SVG kit. No framework, package install, or build service required.

## Field notes

| Page | Light | Dark |
| --- | --- | --- |
| Hill climbing | `/` | `/dark` |
| Load balancing | `/load-balancer` | `/load-balancer/dark` |
| Cache | `/cache` | White canvas |
| CDN | `/cdn` | White canvas |
| City | `/city` | Night scene |
| Keyboard | `/keyboard` | White canvas |

### Load balancer

Follow HTTP requests from a client, through a load balancer, to three backend servers, then watch responses return. Compare round robin, least connections, and smooth weighted round robin (3:2:1). Start automatic traffic at 1–6 requests per second or send one request at a time, and switch servers A, B and C off and on to explore failure and recovery.

Server B deliberately takes longer. New requests skip unhealthy servers; in-flight requests that lose their server fail without an automatic retry. With all backends down, new requests return a simulated 503. The counters and per-server request counts use the actual simulation state.

This is an educational model: one request per connection, immediate health detection, fixed processing times, no capacity queue, and no automatic retry. It is not a benchmark or a production proxy. Production systems can use health-check intervals, connection reuse, timeouts, retries, and redundant load balancers.

Reference: [NGINX HTTP load balancing](https://nginx.org/en/docs/http/load_balancing.html).

### Cache

A compact cache-aside illustration: choose Product A or B, request it twice to compare a miss with a hit, and clear the cache to try again. The application reads the database only on a miss, stores a copy, and returns cached data on subsequent reads. Entries last until cleared; no TTL is simulated.

Reference: [Microsoft cache-aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside).

### CDN

Choose Jakarta or Frankfurt to route a request for `hero.webp` to its illustrative regional edge. The first request fetches and caches the asset from origin; another request in that region hits its local copy. Each edge has an independent cache. Purge clears both copies without resetting the total origin-read count. Region mapping and animation times are illustrative; TTL, revalidation, cache hierarchies and non-cacheable responses are outside this model.

Reference: [Cloudflare CDN overview](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/).

### City

An Anatomy miniature city viewed at the same 30-degree isometric elevation as the other Anatomy illustrations, with inherited neutral tones: 135 varied buildings, small snowy groves on the lots left unbuilt, six parks, a central square, a two-way street grid and 25 cars. The view opens at 220% zoom; use wheel/pinch or the zoom buttons to move closer/further, drag to pan, or fit the entire city. Keyboard: +/−, arrows, and 0/Home. The cars animate on their own, with no playback controls for the traffic. Cars follow tangent-continuous rounded loops around the city blocks. The map is a standalone SVG (`city/map.svg`) that the page draws once into bitmap tiles at the screen's resolution, so dragging only moves finished bitmaps. Cars are drawn on a canvas above it, and each car is cut away behind every nearer object using outlines from `city/props.json`, so occlusion remains correct. Cars and snow share one animation loop at 30 frames per second that sleeps between frames; cars driving straight are stamped from small cached images and only turning cars are drawn as paths. The city stands on a frozen lake, gusts of wind sweep the snow, and the central square holds a giant snowman in scarf and Santa hat beside a gilded reindeer statue. The sidebar starts minimised on this page and opens with a button; the choice is remembered on the device. Settled snow on roofs, trees, parks, kerbs and car roofs is part of the built SVG and the car shapes; falling snow drifts with a slowly changing breeze in three depths. The scene is set on Christmas night: a midnight-blue palette, warm lit windows, fairy lights under roof edges, glowing street lamps, car headlight beams, and Christmas-tree lights that twinkle on the car canvas so the map itself still never repaints. The animation pauses off-screen and respects the device’s reduced-motion setting. A public-domain Jingle Bells chorus (James Lord Pierpont, 1857) is synthesized in the browser; no recording is shipped (`city/MUSIC.md`). The button beside the menu starts or mutes it and the choice is remembered. The first drag or key press starts playback when music is left on, and the loop pauses while the tab is hidden. Reduced motion leaves it muted until that button is used. This is a visual city scene, not a traffic simulation.

## Development

The readable source is `load-balancer/build.mjs`, `load-balancer/app.mjs`, `load-balancer/model.mjs`, and `load-balancer/style.css`. Shared full-width layout and typography live in `scripts/chrome.mjs`. Titles use IBM Plex Sans, and body text uses Manrope at 14px. Fonts are loaded through Google Fonts with system fallbacks.

```sh
node hill-climbing/build.mjs
node hill-climbing/build.mjs --light
node load-balancer/build.mjs
node load-balancer/build.mjs --dark
node cache/build.mjs
node cdn/build.mjs
node city/build.mjs
node --test city/routes.test.mjs city/camera.test.mjs city/music.test.mjs
node --test cdn/model.test.mjs
node --test load-balancer/model.test.mjs
```

Serve the repository root with any static HTTP server and open `/load-balancer/index.html`. Clean URLs use the rewrites in `vercel.json`.

Generated HTML files (and for the city, `city/map.svg` and `city/props.json`) are committed so Vercel can serve the project directly. When changing a builder or shared layout, rebuild its HTML files before committing. The city addition is on `feature/city-zoom-pan`, based on the latest shared layout.

Anatomy is MIT licensed; see `LICENSE-anatomy`.

### Keyboard

A blank 104-key ANSI mechanical keyboard built with the Anatomy SVG kit. Before scrolling, an automatic typing rhythm presses individual keys, covering all 104 keys in each cycle. Typing stops and releases all keys when scrolling begins, resumes after full reassembly, and pauses for hidden tabs or reduced-motion preferences. Scroll down to separate keycaps, switches, plate, PCB, foam and case; scroll back to reassemble. Component labels and leader lines fade in as the layers separate, and disappear when reassembled. There are no playback controls. Motion uses projected layer translations and respects reduced-motion preferences.

Rebuild with `node keyboard/build.mjs`. Validate with `node --test keyboard/keyboard.test.mjs`.

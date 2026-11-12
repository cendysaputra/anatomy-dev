# Anatomy Dev

Interactive visual explanations built with the [Anatomy](https://github.com/wheresryan22/anatomy) isometric SVG kit. No framework, package install, or build service required.

## Field notes

| Page | Light | Dark |
| --- | --- | --- |
| Hill climbing | `/` | `/dark` |
| Load balancing | `/load-balancer` | `/load-balancer/dark` |
| Cache | `/cache` | White canvas |

### Load balancer

Follow HTTP requests from a client, through a load balancer, to three backend servers, then watch responses return. Compare round robin, least connections, and smooth weighted round robin (3:2:1). Send single requests, a burst of 12, or automatic traffic at 1–6 requests per second. Pause, resume, reset, and toggle individual servers to explore failure and recovery.

Server B deliberately takes longer. New requests skip unhealthy servers; in-flight requests that lose their server fail without an automatic retry. With all backends down, new requests return a simulated 503. Metrics and distribution use the actual simulation state.

This is an educational model: one request per connection, immediate health detection, fixed processing times, no capacity queue, and no automatic retry. It is not a benchmark or a production proxy. Production systems can use health-check intervals, connection reuse, timeouts, retries, and redundant load balancers.

Reference: [NGINX HTTP load balancing](https://nginx.org/en/docs/http/load_balancing.html).

### Cache

A compact cache-aside illustration: choose Product A or B, request it twice to compare a miss with a hit, and clear the cache to try again. The application reads the database only on a miss, stores a copy, and returns cached data on subsequent reads. Entries last until cleared; no TTL is simulated.

Reference: [Microsoft cache-aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside).

## Development

The readable source is `load-balancer/build.mjs`, `load-balancer/app.mjs`, `load-balancer/model.mjs`, and `load-balancer/style.css`. Shared layout and typography live in `scripts/chrome.mjs`. Titles use IBM Plex Sans, and body text uses Manrope at 16px. Fonts are loaded through Google Fonts with system fallbacks.

```sh
node hill-climbing/build.mjs
node hill-climbing/build.mjs --light
node load-balancer/build.mjs
node load-balancer/build.mjs --dark
node cache/build.mjs
node --test load-balancer/model.test.mjs
```

Serve the repository root with any static HTTP server and open `/load-balancer/index.html`. Clean URLs use the rewrites in `vercel.json`.

Generated HTML files are committed so Vercel can serve the project directly. When changing a builder or shared layout, rebuild its HTML files before committing. All work for this revision is on `main`.

Anatomy is MIT licensed; see `LICENSE-anatomy`.

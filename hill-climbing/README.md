# Hill Climbing — ilustrasi Anatomy

Ilustrasi isometrik interaktif tentang algoritma **Hill Climbing**, dibuat dengan skill [Anatomy](https://github.com/wheresryan22/anatomy) (MIT, lihat `LICENSE-anatomy`).

- 21 pin ukur = ruang state; tinggi pin = nilai f(x).
- Pendaki (bagian yang menyala) berdiri di satu pin, mengukur dua tetangga dengan sungutnya, lalu pindah ke tetangga yang lebih tinggi selama masih lebih tinggi dari posisinya.
- Kalau tak ada tetangga yang lebih tinggi, ia berhenti dan mengibarkan bendera: mulai di x 0–9 → puncak lokal x=5 (f=46); mulai di x 10–20 → puncak global x=16 (f=70).

Buka `hill-climbing-light.html` (tema terang) atau `hill-climbing.html` (gelap). Halaman selebar 1200px, tanpa kartu di sekeliling gambar. Menu di atas berpindah ke Load Balancer Process. Arahkan kursor untuk memilih titik awal, klik/Enter untuk mengulang, panah kiri/kanan untuk keyboard.

Build ulang: `node hill-climbing/build.mjs` dan `node hill-climbing/build.mjs --light`.

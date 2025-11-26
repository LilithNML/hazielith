// Nombre del caché (cámbialo cuando modifique archivos estáticos)
const CACHE_NAME = "hazielith-cache-v1";

// Archivos que quieres cachear para offline
const FILES_TO_CACHE = [
  "/hazielith/",
  "/hazielith/index.html",
  "/hazielith/manifest.json",
  "/hazielith/script.js",
  "/hazielith/style.css",
  "/hazielith/data.js",

  // Audio
  "/hazielith/assets/audio/correct.mp3",
  "/hazielith/assets/audio/incorrect.mp3",
  "/hazielith/assets/audio/musica-fondo.mp3",
  "/hazielith/assets/audio/playlist/music1.mp3",
  "/hazielith/assets/audio/playlist/music2.mp3",
  "/hazielith/assets/audio/playlist/music3.mp3",
  "/hazielith/assets/audio/playlist/music4.mp3",
  "/hazielith/assets/audio/playlist/music5.mp3",
  "/hazielith/assets/audio/playlist/music6.mp3",
  "/hazielith/assets/audio/playlist/music7.mp3",
  "/hazielith/assets/audio/playlist/music8.mp3",
  "/hazielith/assets/audio/playlist/music9.mp3",
  "/hazielith/assets/audio/playlist/music10.mp3",

  // Imágenes
  "/hazielith/assets/images/fondo-romantico.jpg",
  "/hazielith/assets/images/moon.png",

  // Contenidos desbloqueados
  "/hazielith/assets/unlocked_content/images/a01.jpg.enc",
  "/hazielith/assets/unlocked_content/images/a02.jpg.enc",
  "/hazielith/assets/unlocked_content/images/cafesito.webp",
  "/hazielith/assets/unlocked_content/images/cartita_25_jun.webp",
  "/hazielith/assets/unlocked_content/images/cupon_jugar.webp",
  "/hazielith/assets/unlocked_content/images/fondo_de_pantalla.webp",
  "/hazielith/assets/unlocked_content/images/mapa_de_estrellas.jpg",
  "/hazielith/assets/unlocked_content/images/me_gustas.webp",
  "/hazielith/assets/unlocked_content/images/mi_diario.webp",
  "/hazielith/assets/unlocked_content/images/mi_mayor_sueno.png",
  "/hazielith/assets/unlocked_content/images/mi_mente.webp",
  "/hazielith/assets/unlocked_content/images/paimon_xd.jpg",
  "/hazielith/assets/unlocked_content/images/qr_code.png",
  "/hazielith/assets/unlocked_content/images/qr_new.png",
  "/hazielith/assets/unlocked_content/images/ramonxmiku.jpg",
  "/hazielith/assets/unlocked_content/images/soy_tuya.jpg.enc"
];


// Instalación: precache inicial
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting(); // Activa el SW inmediatamente
});

// Activación: borra cachés viejos automáticamente
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim(); // Toma control sin recargar
});


// Fetch: estrategia "Stale-While-Revalidate"
self.addEventListener("fetch", event => {
  // Solo manejar GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Intenta obtener la versión más nueva en segundo plano
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          // Si la respuesta es válida, actualiza en caché
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse); // Sin internet → usa caché

      // Devuelve: si hay caché, úsalo; si no, espera a la red
      return cachedResponse || fetchPromise;
    })
  );
});

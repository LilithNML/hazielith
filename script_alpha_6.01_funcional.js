/***************************************************************
 * script.js
 * Versión final unificada — compatibilidad con data.js en raíz
 * - Normalización robusta de entrada
 * - Limpieza de caracteres invisibles
 * - Detección de "cercanía" a códigos
 * - Reproductor lateral con playlist
 * - Export / Import / Reset
 * - Comentarios y buenas prácticas
 *
 * Supone:
 * - Existe un objeto global `mensajes` definido en data.js
 * - (Opcional) Existe un arreglo `logros` en data.js si manejas logros
 ***************************************************************/

/* ===========================
   Referencias DOM (defensivas)
   =========================== */
const codeInput = document.getElementById("codeInput");
const submitCodeBtn = document.getElementById("submitCodeBtn");
const contenidoDiv = document.getElementById("contenido");
const correctSound = document.getElementById("correctSound");
const incorrectSound = document.getElementById("incorrectSound");
const bgMusic = document.getElementById("bgMusic");
const codeAudio = document.getElementById("codeAudio");
const progresoParrafo = document.getElementById("progreso");
const progressBarFill = document.querySelector(".progress-bar-fill");

const toggleUnlockedCodesBtn = document.getElementById("toggleUnlockedCodes");
const unlockedCodesPanel = document.getElementById("unlockedCodesPanel");
const unlockedCodesList = document.getElementById("unlockedCodesList");
const searchUnlockedCodesInput = document.getElementById("searchUnlockedCodes");
const categoryFilterSelect = document.getElementById("categoryFilter");

const imageModal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImg");
const modalCaption = document.getElementById("modalCaption");

const menuButton = document.getElementById("menuButton");
const dropdownMenu = document.getElementById("dropdownMenu");
const achievementToastContainer = document.getElementById("achievement-toast-container");

const darkModeToggle = document.getElementById("darkModeToggle");
const showFavoritesBtn = document.getElementById("showFavoritesBtn");
const filterFavoritesBtn = document.getElementById("filterFavoritesBtn");

/* Reproductor lateral */
const audioPanel = document.getElementById("audioPanel");
const audioSettingsBtn = document.getElementById("audioSettingsBtn");
const closeAudioPanel = document.getElementById("closeAudioPanel");

const playPauseBtn = document.getElementById("playPauseBtn");
const nextTrackBtn = document.getElementById("nextTrackBtn");
const prevTrackBtn = document.getElementById("prevTrackBtn");
const muteBtn = document.getElementById("muteBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const audioVolume = document.getElementById("audioVolume");
const currentTrackName = document.getElementById("currentTrackName");

/* ===========================
   Estado y almacenamiento
   =========================== */
let failedAttempts = parseInt(localStorage.getItem("failedAttempts") || "0", 10);
const MAX_FAILED_ATTEMPTS = 5;

let desbloqueados = new Set(JSON.parse(localStorage.getItem("desbloqueados") || "[]"));
let logrosAlcanzados = new Set(JSON.parse(localStorage.getItem("logrosAlcanzados") || "[]"));
let favoritos = new Set(JSON.parse(localStorage.getItem("favoritos") || "[]"));

let showingFavorites = false;
const HINT_MESSAGE = "Parece que no es el código correcto... sigue intentando.";

/* Playlist (10 pistas) */
const playlist = [
  "assets/audio/playlist/music1.mp3",
  "assets/audio/playlist/music2.mp3",
  "assets/audio/playlist/music3.mp3",
  "assets/audio/playlist/music4.mp3",
  "assets/audio/playlist/music5.mp3",
  "assets/audio/playlist/music6.mp3",
  "assets/audio/playlist/music7.mp3",
  "assets/audio/playlist/music8.mp3",
  "assets/audio/playlist/music9.mp3",
  "assets/audio/playlist/music10.mp3"
];

let currentTrack = parseInt(localStorage.getItem("currentTrack") || "0", 10);
if (isNaN(currentTrack) || currentTrack < 0 || currentTrack >= playlist.length) currentTrack = 0;

let isShuffling = localStorage.getItem("isShuffling") === "true";
let savedVolume = parseFloat(localStorage.getItem("bgMusicVolume"));
if (isNaN(savedVolume)) savedVolume = 0.35; // volumen por defecto pedido
let isMusicPlayingState = localStorage.getItem("isMusicPlaying") || "paused";

/* ===========================
   UTILIDADES: limpieza y normalización
   =========================== */

/**
 * limpiarEntradaCodigo(texto)
 * - Elimina caracteres invisibles/BOM/NBSP y trim
 * - Útil si el navegador/autocompletado inserta caracteres raros
 */
function limpiarEntradaCodigo(texto) {
  if (!texto) return "";
  return texto
    .replace(/\u200B/g, "")   // zero-width space
    .replace(/\u200C/g, "")   // zero-width non-joiner
    .replace(/\u200D/g, "")   // zero-width joiner
    .replace(/\uFEFF/g, "")   // byte order mark
    .replace(/\u00A0/g, " ")  // NBSP -> espacio normal
    .trim();
}

/**
 * normalizarTexto(texto)
 * - Convierte a minúsculas
 * - Quita tildes y diacríticos
 * - Convierte ñ -> n
 * - Quita espacios y guiones y underscores para coincidencias permisivas
 */
function normalizarTexto(texto) {
  if (!texto) return "";
  return texto
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")    // quitar acentos
    .replace(/ñ/g, "n")
    .replace(/[_\-\s]+/g, "")           // quitar guiones/espacios/underscores
    .replace(/[^\w\d]/g, "");           // quitar caracteres no alfanuméricos restantes
}

/* ===========================
   UTILIDAD: Levenshtein distance (para cercanía)
   =========================== */

/**
 * levenshtein(a, b)
 * - Retorna la distancia de Levenshtein entre strings a y b
 * - Implementación iterativa O(n*m)
 */
function levenshtein(a, b) {
  a = a || "";
  b = b || "";
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let v0 = new Array(bl + 1);
  let v1 = new Array(bl + 1);

  for (let j = 0; j <= bl; j++) v0[j] = j;

  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(
        v1[j] + 1,
        v0[j + 1] + 1,
        v0[j] + cost
      );
    }
    // swap v0 and v1
    const tmp = v0;
    v0 = v1;
    v1 = tmp;
  }
  return v0[bl];
}

/* ===========================
   Detección de cercanía (reglas)
   =========================== */

/**
 * isCloseMatch(inputRaw, targetRaw)
 * - Devuelve true si la entrada está "realmente cerca" del objetivo
 * - Estrategia:
 *   1) Normalizamos ambas cadenas.
 *   2) Si input es substring del target -> muy cerca (ej. "sofia" dentro de "sofiayekaterina")
 *   3) Si la distancia de Levenshtein es pequeña según longitud -> cerca
 *   4) Si input comparte prefijo largo (>= 60% del input) -> cerca
 *
 * - Diseñado para evitar falsas pistas: solo devuelve true cuando hay evidencia fuerte
 */
function isCloseMatch(inputRaw, targetRaw) {
  const input = normalizarTexto(limpiarEntradaCodigo(inputRaw));
  const target = normalizarTexto(targetRaw);

  if (!input || !target) return false;

  // 1) substring directo
  if (target.includes(input)) return true;

  // 2) distancia de Levenshtein con umbral dinámico
  // Umbral = floor( max(1, 20% * longitud target) ), pero también relativo a longitud input
  const distance = levenshtein(input, target);
  const maxLen = Math.max(target.length, input.length);
  const threshold = Math.max(1, Math.floor(maxLen * 0.18)); // ~18% tolerancia

  if (distance <= threshold) return true;

  // 3) prefijo significativo
  const minPrefix = Math.max(2, Math.ceil(input.length * 0.6)); // al menos 60% del input o 2 chars
  if (target.startsWith(input.slice(0, minPrefix))) return true;

  return false;
}

/* ===========================
   Guardado local (helpers)
   =========================== */
function guardarDesbloqueados() {
  try { localStorage.setItem("desbloqueados", JSON.stringify(Array.from(desbloqueados))); } catch (e) {}
}
function guardarFavoritos() {
  try { localStorage.setItem("favoritos", JSON.stringify(Array.from(favoritos))); } catch (e) {}
}
function guardarLogrosAlcanzados() {
  try { localStorage.setItem("logrosAlcanzados", JSON.stringify(Array.from(logrosAlcanzados))); } catch (e) {}
}

/* ===========================
   Toast de logro (visual)
   =========================== */
function showAchievementToast(message) {
  if (!achievementToastContainer) return;
  const toast = document.createElement("div");
  toast.className = "achievement-toast";
  toast.textContent = message;
  achievementToastContainer.appendChild(toast);
  toast.addEventListener("animationend", () => toast.remove());
}

/* ===========================
   Actualizar Progreso y Barra
   =========================== */
function actualizarProgreso() {
  if (!progresoParrafo || !progressBarFill) return;

  // Si mensajes no está definido, evitamos NaN y mostramos 0
  const totalCodigos = (typeof mensajes === "object" && mensajes) ? Object.keys(mensajes).length : 0;
  const codigosDesbloqueados = desbloqueados.size;

  const porcentaje = totalCodigos > 0 ? Math.round((codigosDesbloqueados / totalCodigos) * 100) : 0;

  progresoParrafo.textContent = `Has desbloqueado ${codigosDesbloqueados} de ${totalCodigos} códigos.`;
  progressBarFill.style.width = `${porcentaje}%`;
  progressBarFill.setAttribute("aria-valuenow", String(porcentaje));

  // Procesar logros si existe la variable global logros
  if (Array.isArray(window.logros)) {
    try {
      window.logros.forEach(logro => {
        if (codigosDesbloqueados >= logro.codigo_requerido && !logrosAlcanzados.has(logro.id)) {
          logrosAlcanzados.add(logro.id);
          guardarLogrosAlcanzados();
          showAchievementToast(`Logro desbloqueado: ${logro.mensaje}`);
        }
      });
    } catch (e) {
      // no interrumpir si la estructura de logros es inesperada
    }
  }
}

/* ===========================
   Lista de desbloqueados y favoritos (UI)
   =========================== */
function actualizarListaDesbloqueados() {
  if (!unlockedCodesList) return;
  unlockedCodesList.innerHTML = "";

  const searchVal = searchUnlockedCodesInput ? normalizarTexto(limpiarEntradaCodigo(searchUnlockedCodesInput.value)) : "";
  const selectedCategory = categoryFilterSelect ? categoryFilterSelect.value : "";

  const lista = showingFavorites ? Array.from(favoritos) : Array.from(desbloqueados);
  const categorias = new Set();

  lista.sort().forEach(codigo => {
    const entry = (typeof mensajes === "object" && mensajes) ? mensajes[codigo] : null;
    if (!entry) return;

    const categoria = entry.categoria || "General";
    categorias.add(categoria);

    const normalizedCodigo = normalizarTexto(codigo);
    const normalizedCategoria = normalizarTexto(categoria);

    const matchesSearch = !searchVal || normalizedCodigo.includes(searchVal);
    const matchesCategory = !selectedCategory || normalizarTexto(selectedCategory) === normalizedCategoria;

    if (!matchesSearch || !matchesCategory) return;

    const li = document.createElement("li");
    li.className = "lista-codigo-item";
    li.setAttribute("tabindex", "0");
    li.setAttribute("role", "button");
    li.innerHTML = `<span class="codigo-text">${codigo}</span><span class="category">${categoria}</span>`;

    // boton favorito
    const favBtn = document.createElement("button");
    favBtn.className = "favorite-toggle-btn";
    const isFav = favoritos.has(codigo);
    favBtn.innerHTML = `<i class="${isFav ? "fas" : "far"} fa-heart" aria-hidden="true"></i>`;
    if (isFav) favBtn.classList.add("active");
    favBtn.setAttribute("aria-pressed", String(isFav));
    favBtn.setAttribute("aria-label", isFav ? `Quitar ${codigo} de favoritos` : `Añadir ${codigo} a favoritos`);

    favBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (favoritos.has(codigo)) {
        favoritos.delete(codigo);
      } else {
        favoritos.add(codigo);
      }
      guardarFavoritos();
      actualizarListaDesbloqueados();
    });

    li.appendChild(favBtn);

    // click muestra contenido
    li.addEventListener("click", () => mostrarContenido(codigo));
    li.addEventListener("keypress", (ev) => { if (ev.key === "Enter") mostrarContenido(codigo); });

    unlockedCodesList.appendChild(li);
  });

  // actualizar select de categorías
  if (categoryFilterSelect) {
    const prev = categoryFilterSelect.value || "";
    categoryFilterSelect.innerHTML = `<option value="">Todas las categorías</option>`;
    Array.from(categorias).sort().forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      if (cat === prev) opt.selected = true;
      categoryFilterSelect.appendChild(opt);
    });
  }
}

/* ===========================
   Mostrar contenido de un código
   =========================== */
function mostrarContenido(codigo) {
  if (!contenidoDiv) return;
  const entry = (typeof mensajes === "object" && mensajes) ? mensajes[codigo] : null;
  if (!entry) return;

  contenidoDiv.hidden = false;
  contenidoDiv.classList.remove("fade-in");
  void contenidoDiv.offsetWidth;
  contenidoDiv.classList.add("fade-in");

  // limpiar contenido previo
  contenidoDiv.innerHTML = "";

  // Video embed
  if (entry.videoEmbed) {
    contenidoDiv.innerHTML = `
      <h2>Video Especial</h2>
      <p>${entry.texto || ""}</p>
      <div class="video-wrapper">
        <iframe src="${entry.videoEmbed}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="Video"></iframe>
      </div>
      <p><button id="resumeMusicBtn" class="button small-button">Reanudar Música</button></p>
    `;
    // pausar música de fondo si estaba sonando
    try { if (bgMusic && !bgMusic.paused) { bgMusic.pause(); if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; } } catch(e){}
    const resume = document.getElementById("resumeMusicBtn");
    if (resume) resume.addEventListener("click", () => { try { bgMusic.play(); if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; } catch(e){} });
    return;
  }

  // Imagen -> modal
  if (entry.imagen) {
    if (modalImg) {
      modalImg.src = entry.imagen;
      modalImg.alt = entry.texto ? entry.texto.replace(/<[^>]+>/g, "") : "Imagen";
    }
    if (modalCaption) modalCaption.textContent = entry.texto ? entry.texto.replace(/<[^>]+>/g, "") : "";
    if (imageModal) imageModal.style.display = "flex";
    try { if (bgMusic && !bgMusic.paused) { bgMusic.pause(); if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; } } catch(e) {}
    return;
  }

  // Audio del código
  if (entry.audio) {
    contenidoDiv.innerHTML = `
      <h2>Audio Secreto</h2>
      <p>${entry.texto || ""}</p>
      <p><button id="playCodeAudioBtn" class="button">Reproducir</button></p>
    `;
    if (codeAudio) {
      codeAudio.src = entry.audio;
      const btn = document.getElementById("playCodeAudioBtn");
      if (btn) btn.addEventListener("click", () => { codeAudio.play().catch(()=>{}); btn.disabled = true; });
    }
    return;
  }

  // Link
  if (entry.link) {
    contenidoDiv.innerHTML = `
      <h2>Enlace Especial</h2>
      <p>${entry.texto || ""}</p>
      <p><a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="button">Ir al enlace</a></p>
    `;
    return;
  }

  // Descarga
  if (entry.descarga) {
    contenidoDiv.innerHTML = `
      <h2>Archivo Especial</h2>
      <p>${entry.texto || ""}</p>
      <p><a href="${entry.descarga.url}" download="${entry.descarga.nombre}" class="button">Descargar ${entry.descarga.nombre}</a></p>
    `;
    return;
  }

  // Texto
  if (entry.texto) {
    contenidoDiv.innerHTML = `<h2>Mensaje</h2>${entry.texto}`;
    return;
  }

  // Default
  contenidoDiv.innerHTML = `<p>Este código existe pero no tiene contenido asociado.</p>`;
}

/* ===========================
   Modal: cerrar & accesibilidad
   =========================== */
function cerrarModal() {
  if (imageModal) imageModal.style.display = "none";
  try {
    if (bgMusic && localStorage.getItem("isMusicPlaying") === "playing") {
      bgMusic.play().catch(()=>{});
      if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
  } catch (e) {}
}
if (imageModal) {
  imageModal.addEventListener("click", (ev) => { if (ev.target === imageModal) cerrarModal(); });
}
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && imageModal && imageModal.style.display === "flex") cerrarModal();
});

/* ===========================
   Fade helpers para audio (suaves)
   =========================== */
function fadeInAudio(audioEl, step = 0.05, duration = 500) {
  if (!audioEl) return;
  try {
    audioEl.volume = 0;
    audioEl.play().catch(()=>{});
  } catch (e) {}
  const steps = Math.max(1, Math.round(duration / (step * 1000)));
  const increment = 1 / steps;
  const id = setInterval(() => {
    if (audioEl.volume < 1 - increment) {
      audioEl.volume = Math.min(1, audioEl.volume + increment);
    } else {
      audioEl.volume = 1;
      clearInterval(id);
    }
  }, Math.max(10, Math.round(step * 1000)));
}
function fadeOutAudio(audioEl, step = 0.05, duration = 500) {
  if (!audioEl) return;
  const steps = Math.max(1, Math.round(duration / (step * 1000)));
  const decrement = 1 / steps;
  const id = setInterval(() => {
    if (audioEl.volume > decrement) {
      audioEl.volume = Math.max(0, audioEl.volume - decrement);
    } else {
      audioEl.volume = 0;
      try { audioEl.pause(); } catch(e){}
      clearInterval(id);
    }
  }, Math.max(10, Math.round(step * 1000)));
}

/* ===========================
   Procesar código ingresado (entrada del usuario)
   =========================== */
function procesarCodigo() {
  if (!codeInput) return;

  // limpiar y normalizar entrada
  const raw = limpiarEntradaCodigo(codeInput.value || "");
  const codigoNormalizado = normalizarTexto(raw);

  // evitar procesar input vacío
  if (!codigoNormalizado) {
    codeInput.classList.remove("success");
    codeInput.classList.add("error");
    contenidoDiv.innerHTML = `<h2>Código Incorrecto</h2><p>Introduce un código válido.</p>`;
    contenidoDiv.hidden = false;
    return;
  }

  // reset UI
  if (contenidoDiv) contenidoDiv.hidden = true;
  codeInput.classList.remove("success", "error");

  // si mensajes no existe -> evitar crash y avisar
  if (typeof mensajes !== "object" || !mensajes) {
    contenidoDiv.hidden = false;
    contenidoDiv.innerHTML = `<h2>Error</h2><p>Los datos no están cargados (data.js). Intenta recargar la página.</p>`;
    return;
  }

  // buscar coincidencia exacta en claves (las claves en data.js pueden no estar normalizadas,
  // así que comparamos normalizado de la clave)
  let matchedKey = null;
  for (const key of Object.keys(mensajes)) {
    if (normalizarTexto(key) === codigoNormalizado) {
      matchedKey = key;
      break;
    }
  }

  // si no hay coincidencia exacta, verificar si la entrada es cercana a algún código
  if (!matchedKey) {
    // 1) subcadena: si la entrada es substring de una clave normalizada -> sugerencia
    // 2) Levenshtein cercano -> sugerencia
    // Buscamos la "mejor" coincidencia cercana (si existe)
    let best = { key: null, score: Infinity };
    for (const key of Object.keys(mensajes)) {
      const tNorm = normalizarTexto(key);
      const distance = levenshtein(codigoNormalizado, tNorm);
      // menor distancia = mejor
      if (distance < best.score) {
        best = { key, score: distance, targetNorm: tNorm };
      }
    }

    const candidate = best.key;
    const isClose = candidate ? isCloseMatch(raw, candidate) : false;

    if (isClose && candidate) {
      // respuesta suave indicando cercanía
      contenidoDiv.hidden = false;
      contenidoDiv.innerHTML = `
        <h2>Vas por buen camino</h2>
        <p>Parece que estás cerca del código correcto. Revisa si falta alguna parte o letra.</p>
        <p class="hint-small">Sugerencia: prueba completarlo (por ejemplo: "${candidate}").</p>
      `;
      // no consumir intento en este caso (o sí, según preferencia)
      // aquí decidimos NO incrementar failedAttempts para que la experiencia sea amable
      codeInput.classList.add("error");
      codeInput.value = raw; // mantener entrada para que el usuario edite
      return;
    }
  }

  // si encontramos matchedKey -> correcto
  if (matchedKey) {
    // reproducir sonido de correcto (defensivo)
    try { correctSound && correctSound.play().catch(()=>{}); } catch(e){}
    codeInput.classList.add("success");

    // mostrar contenido, marcar como desbloqueado y guardar
    mostrarContenido(matchedKey);

    if (!desbloqueados.has(matchedKey)) {
      desbloqueados.add(matchedKey);
      guardarDesbloqueados();
      actualizarProgreso();
      showAchievementToast(`Código desbloqueado: ${matchedKey}`);
    }

    actualizarListaDesbloqueados();
    failedAttempts = 0;
    localStorage.setItem("failedAttempts", "0");
    codeInput.value = "";
    return;
  }

  // si llegamos aquí -> incorrecto (ni exacto ni cercano)
  try { incorrectSound && incorrectSound.play().catch(()=>{}); } catch(e){}
  codeInput.classList.add("error");

  failedAttempts++;
  localStorage.setItem("failedAttempts", String(failedAttempts));

  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    // elegir pista aleatoria entre códigos no desbloqueados que tengan pista
    const candidatos = Object.keys(mensajes).filter(k => !desbloqueados.has(k) && mensajes[k].pista);
    let pista = HINT_MESSAGE;
    if (candidatos.length > 0) {
      const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
      pista = mensajes[elegido].pista || pista;
      localStorage.setItem("ultimoCodigoPista", elegido);
    }
    contenidoDiv.hidden = false;
    contenidoDiv.innerHTML = `<h2>Pista</h2><p>${pista}</p>`;
    failedAttempts = 0;
    localStorage.setItem("failedAttempts", "0");
  } else {
    contenidoDiv.hidden = false;
    contenidoDiv.innerHTML = `<h2>Código Incorrecto</h2><p>Intentos fallidos: ${failedAttempts} de ${MAX_FAILED_ATTEMPTS}</p><p>Sigue intentando.</p>`;
  }

  codeInput.value = "";
}

/* ===========================
   Listeners para input / envío
   =========================== */
if (submitCodeBtn) submitCodeBtn.addEventListener("click", procesarCodigo);
if (codeInput) {
  codeInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      procesarCodigo();
    }
  });
  // prevenir autofill visual en algunos navegadores: atributo autocomplete="off" + limpiar invisibles al focus
  codeInput.addEventListener("focus", () => {
    codeInput.value = limpiarEntradaCodigo(codeInput.value);
  });
}

/* ===========================
   Reproductor: helpers y controles
   =========================== */

function friendlyTrackName(path) {
  try {
    const file = path.split("/").pop();
    return file.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
  } catch (e) { return path; }
}

function loadTrack(index, autoplay = true) {
  if (!bgMusic) return;
  currentTrack = (index + playlist.length) % playlist.length;
  localStorage.setItem("currentTrack", String(currentTrack));
  bgMusic.src = playlist[currentTrack];
  bgMusic.load();
  if (currentTrackName) currentTrackName.textContent = friendlyTrackName(playlist[currentTrack]);
  bgMusic.volume = parseFloat(audioVolume ? audioVolume.value || savedVolume : savedVolume);
  if (autoplay) {
    bgMusic.play().then(() => {
      if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      localStorage.setItem("isMusicPlaying", "playing");
    }).catch(() => {
      if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      localStorage.setItem("isMusicPlaying", "paused");
    });
  } else {
    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
  }
}

function playPause() {
  if (!bgMusic) return;
  if (bgMusic.paused) {
    bgMusic.play().then(()=> { if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; localStorage.setItem("isMusicPlaying","playing"); }).catch(()=>{});
  } else {
    bgMusic.pause();
    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    localStorage.setItem("isMusicPlaying","paused");
  }
}

function nextTrack() {
  if (isShuffling) currentTrack = Math.floor(Math.random() * playlist.length);
  else currentTrack = (currentTrack + 1) % playlist.length;
  loadTrack(currentTrack, true);
}
function prevTrack() {
  if (isShuffling) currentTrack = Math.floor(Math.random() * playlist.length);
  else currentTrack = (currentTrack - 1 + playlist.length) % playlist.length;
  loadTrack(currentTrack, true);
}

if (bgMusic) bgMusic.addEventListener("ended", nextTrack);
if (playPauseBtn) playPauseBtn.addEventListener("click", playPause);
if (nextTrackBtn) nextTrackBtn.addEventListener("click", nextTrack);
if (prevTrackBtn) prevTrackBtn.addEventListener("click", prevTrack);

if (muteBtn) {
  muteBtn.addEventListener("click", () => {
    if (!bgMusic) return;
    bgMusic.muted = !bgMusic.muted;
    if (muteBtn) muteBtn.innerHTML = bgMusic.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
    localStorage.setItem("bgMusicMuted", bgMusic.muted ? "true" : "false");
  });
}

if (shuffleBtn) {
  shuffleBtn.addEventListener("click", () => {
    isShuffling = !isShuffling;
    localStorage.setItem("isShuffling", isShuffling ? "true" : "false");
    shuffleBtn.style.color = isShuffling ? "var(--highlight-pink)" : "";
  });
}

if (audioVolume) {
  audioVolume.value = String(savedVolume);
  audioVolume.addEventListener("input", () => {
    savedVolume = parseFloat(audioVolume.value);
    if (bgMusic) bgMusic.volume = savedVolume;
    localStorage.setItem("bgMusicVolume", String(savedVolume));
  });
}

/* Panel lateral musica */
if (audioSettingsBtn) {
  audioSettingsBtn.addEventListener("click", () => {
    if (!audioPanel) return;
    audioPanel.classList.add("show");
    audioPanel.setAttribute("aria-hidden","false");
    setTimeout(()=> { if (playPauseBtn) playPauseBtn.focus(); }, 150);
    cerrarMenu();
  });
}
if (closeAudioPanel) {
  closeAudioPanel.addEventListener("click", () => {
    if (!audioPanel) return;
    audioPanel.classList.remove("show");
    audioPanel.setAttribute("aria-hidden","true");
    audioSettingsBtn && audioSettingsBtn.focus();
  });
}

/* Iniciar playback tras primera interacción (política de autoplay) */
let interactionStarted = false;
function startOnInteraction() {
  if (interactionStarted) return;
  interactionStarted = true;
  const wasPlaying = localStorage.getItem("isMusicPlaying") === "playing";
  // configurar volumen y muted
  if (bgMusic) {
    bgMusic.volume = savedVolume;
    bgMusic.muted = localStorage.getItem("bgMusicMuted") === "true";
    if (wasPlaying) loadTrack(currentTrack, true);
    else loadTrack(currentTrack, false);
  }
  document.removeEventListener("click", startOnInteraction);
  document.removeEventListener("keydown", startOnInteraction);
}
document.addEventListener("click", startOnInteraction, { once: true, passive: true });
document.addEventListener("keydown", startOnInteraction, { once: true, passive: true });

/* ===========================
   Export / Import / Reset
   =========================== */
const exportBtn = document.getElementById("exportProgressBtn");
const importBtn = document.getElementById("importProgressBtn");
const importInput = document.getElementById("importProgressInput");
const resetBtn = document.getElementById("resetProgressBtn");

function exportarProgreso() {
  const data = {
    desbloqueados: Array.from(desbloqueados),
    favoritos: Array.from(favoritos),
    logrosAlcanzados: Array.from(logrosAlcanzados),
    fecha: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `progreso_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showAchievementToast("Progreso exportado");
}

function importarProgreso(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const obj = JSON.parse(e.target.result);
      desbloqueados = new Set(obj.desbloqueados || []);
      favoritos = new Set(obj.favoritos || []);
      logrosAlcanzados = new Set(obj.logrosAlcanzados || []);
      guardarDesbloqueados();
      guardarFavoritos();
      guardarLogrosAlcanzados();
      actualizarProgreso();
      actualizarListaDesbloqueados();
      showAchievementToast("Progreso importado");
    } catch (err) {
      alert("Archivo inválido o con formato incorrecto.");
    }
  };
  reader.readAsText(file);
}

if (exportBtn) exportBtn.addEventListener("click", () => { exportarProgreso(); cerrarMenu(); });
if (importBtn && importInput) {
  importBtn.addEventListener("click", () => { importInput.click(); cerrarMenu(); });
  importInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) importarProgreso(e.target.files[0]);
    importInput.value = "";
  });
}

/* Resetear progreso con confirmación suave (mensaje diseñado para tono cercano y profesional) */
function resetearProgreso() {
  const confirmar = confirm(
    "Restablecer progreso\n\n" +
    "Antes de continuar, considera exportar una copia de seguridad si crees que podrías querer recuperar tus avances más tarde.\n\n" +
    "Al restablecer se eliminará lo siguiente:\n" +
    "- Códigos descubiertos\n" +
    "- Favoritos\n" +
    "- Logros\n" +
    "- Configuración de tema\n" +
    "- Preferencias de audio (pista, volumen, mute, shuffle)\n" +
    "- Registro de intentos\n\n" +
    "Esta acción no se puede deshacer. ¿Deseas continuar?"
  );

  if (!confirmar) return;

  // Limpiar almacenamiento específico (no todo localStorage si prefieres mantener otras cosas)
  try {
    localStorage.removeItem("desbloqueados");
    localStorage.removeItem("favoritos");
    localStorage.removeItem("logrosAlcanzados");
    localStorage.removeItem("failedAttempts");
    localStorage.removeItem("ultimoCodigoPista");
    localStorage.removeItem("isMusicPlaying");
    localStorage.removeItem("currentTrack");
    localStorage.removeItem("bgMusicVolume");
    localStorage.removeItem("bgMusicMuted");
    localStorage.removeItem("theme");
    localStorage.removeItem("isShuffling");
  } catch (e) {}

  // Reset variables en memoria
  desbloqueados = new Set();
  favoritos = new Set();
  logrosAlcanzados = new Set();
  failedAttempts = 0;

  // Reset UI y audio
  document.body.classList.remove("dark-mode");
  if (darkModeToggle) darkModeToggle.innerHTML = '<i class="fas fa-moon"></i> Modo Oscuro';
  if (bgMusic) { try { bgMusic.pause(); bgMusic.src = ""; } catch(e) {} }
  if (contenidoDiv) contenidoDiv.hidden = true;

  actualizarProgreso();
  actualizarListaDesbloqueados();
  showAchievementToast("Progreso restablecido");
  cerrarMenu();
}

if (resetBtn) resetBtn.addEventListener("click", resetearProgreso);

/* ===========================
   Toggle panel desbloqueados / favoritos
   =========================== */
if (toggleUnlockedCodesBtn) toggleUnlockedCodesBtn.addEventListener("click", toggleUnlockedCodes);
function toggleUnlockedCodes() {
  if (!unlockedCodesPanel || !toggleUnlockedCodesBtn) return;
  const isHidden = unlockedCodesPanel.hidden;
  unlockedCodesPanel.hidden = !isHidden;
  toggleUnlockedCodesBtn.setAttribute("aria-expanded", String(!isHidden));
  toggleUnlockedCodesBtn.textContent = isHidden ? "Ocultar Códigos Desbloqueados" : "Mostrar Códigos Desbloqueados";

  showingFavorites = false;
  if (filterFavoritesBtn) { filterFavoritesBtn.classList.remove("active"); filterFavoritesBtn.setAttribute("aria-pressed","false"); }
  actualizarListaDesbloqueados();
}

if (showFavoritesBtn) {
  showFavoritesBtn.addEventListener("click", () => {
    if (unlockedCodesPanel && unlockedCodesPanel.hidden) toggleUnlockedCodes();
    showingFavorites = true;
    if (filterFavoritesBtn) { filterFavoritesBtn.classList.add("active"); filterFavoritesBtn.setAttribute("aria-pressed","true"); }
    if (searchUnlockedCodesInput) searchUnlockedCodesInput.value = "";
    if (categoryFilterSelect) categoryFilterSelect.value = "";
    actualizarListaDesbloqueados();
    cerrarMenu();
  });
}
if (filterFavoritesBtn) {
  filterFavoritesBtn.addEventListener("click", () => {
    showingFavorites = !showingFavorites;
    filterFavoritesBtn.classList.toggle("active", showingFavorites);
    filterFavoritesBtn.setAttribute("aria-pressed", String(showingFavorites));
    actualizarListaDesbloqueados();
  });
}
if (searchUnlockedCodesInput) searchUnlockedCodesInput.addEventListener("input", actualizarListaDesbloqueados);
if (categoryFilterSelect) categoryFilterSelect.addEventListener("change", actualizarListaDesbloqueados);

/* ===========================
   Menú desplegable (header)
   =========================== */
if (menuButton) {
  menuButton.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
    if (dropdownMenu) {
      dropdownMenu.classList.toggle("show");
      dropdownMenu.setAttribute("aria-hidden", String(expanded));
      if (!expanded) dropdownMenu.querySelector("a, button")?.focus();
    }
  });
}
// cerrar al click fuera
document.addEventListener("click", (ev) => {
  if (!menuButton || !dropdownMenu) return;
  if (!menuButton.contains(ev.target) && !dropdownMenu.contains(ev.target)) {
    if (dropdownMenu.classList.contains("show")) cerrarMenu();
  }
});
// teclado accesible para dropdown
if (dropdownMenu) {
  dropdownMenu.addEventListener("keydown", (ev) => {
    const focusables = dropdownMenu.querySelectorAll("a, button");
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (ev.key === "Escape") { cerrarMenu(); menuButton.focus(); ev.preventDefault(); }
    else if (ev.key === "Tab") {
      if (ev.shiftKey && document.activeElement === first) { last.focus(); ev.preventDefault(); }
      else if (!ev.shiftKey && document.activeElement === last) { first.focus(); ev.preventDefault(); }
    }
  });
}

function cerrarMenu() {
  if (!dropdownMenu || !menuButton) return;
  dropdownMenu.classList.remove("show");
  dropdownMenu.setAttribute("aria-hidden", "true");
  menuButton.setAttribute("aria-expanded", "false");
}

/* ===========================
   Tema (dark mode)
   =========================== */
(function initTheme() {
  try {
    const theme = localStorage.getItem("theme");
    if (theme === "dark-mode") {
      document.body.classList.add("dark-mode");
      if (darkModeToggle) darkModeToggle.innerHTML = '<i class="fas fa-sun"></i> Modo Claro';
    } else {
      if (darkModeToggle) darkModeToggle.innerHTML = '<i class="fas fa-moon"></i> Modo Oscuro';
    }
    if (darkModeToggle) {
      darkModeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("theme", isDark ? "dark-mode" : "light-mode");
        darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i> Modo Claro' : '<i class="fas fa-moon"></i> Modo Oscuro';
      });
    }
  } catch (e) {}
})();

/* ===========================
   Inicialización final al cargar DOM
   =========================== */
document.addEventListener("DOMContentLoaded", () => {
  // seguridad: si no hay data.js cargada, avisar suavemente en UI
  if (typeof mensajes !== "object" || !mensajes) {
    if (progresoParrafo) progresoParrafo.textContent = "Los datos no están disponibles. data.js no cargado.";
    if (contenidoDiv) {
      contenidoDiv.hidden = false;
      contenidoDiv.innerHTML = `<h2>Atención</h2><p>Parece que los contenidos (data.js) no están cargados. Revisa la consola o recarga la página.</p>`;
    }
    return;
  }

  // inicializar controles del reproductor
  if (audioVolume) audioVolume.value = String(savedVolume);
  if (shuffleBtn) shuffleBtn.style.color = isShuffling ? "var(--highlight-pink)" : "";
  if (muteBtn) {
    const muted = localStorage.getItem("bgMusicMuted") === "true";
    if (bgMusic) bgMusic.muted = muted;
    muteBtn.innerHTML = muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
  }
  if (playPauseBtn) playPauseBtn.innerHTML = (localStorage.getItem("isMusicPlaying") === "playing") ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';

  // cargar pista actual (sin autoplay si no hubo interacción)
  if (bgMusic) {
    bgMusic.src = playlist[currentTrack];
    if (currentTrackName) currentTrackName.textContent = friendlyTrackName(playlist[currentTrack]);
    bgMusic.volume = savedVolume;
  }

  actualizarProgreso();
  actualizarListaDesbloqueados();
});

/* ===========================
   Exponer funciones útiles al scope para debugging
   =========================== */
window.procesarCodigo = procesarCodigo;
window.mostrarContenido = mostrarContenido;
window.cerrarModal = cerrarModal;
window.loadTrack = loadTrack;
window.playPause = playPause;

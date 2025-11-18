/******************************************************
 *  SCRIPT.JS — VERSIÓN COMPLETA, ORDENADA Y CORREGIDA
 *  PARTE 1 / 3
 ******************************************************/

/* ----------------------------------------------------
   Referencias al DOM (defensivas)
---------------------------------------------------- */
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

/* ----------------------------------------------------
   Estado / almacenamiento local
---------------------------------------------------- */
let failedAttempts = parseInt(localStorage.getItem("failedAttempts") || "0", 10);
const MAX_FAILED_ATTEMPTS = 5;

let desbloqueados = new Set(JSON.parse(localStorage.getItem("desbloqueados") || "[]"));
let logrosAlcanzados = new Set(JSON.parse(localStorage.getItem("logrosAlcanzados") || "[]"));
let favoritos = new Set(JSON.parse(localStorage.getItem("favoritos") || "[]"));

let showingFavorites = false;
const HINT_MESSAGE = "Parece que no es el código correcto... sigue intentando.";

/* ----------------------------------------------------
   Playlist
---------------------------------------------------- */
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
if (isNaN(currentTrack) || currentTrack < 0 || currentTrack >= playlist.length)
  currentTrack = 0;

let isShuffling = localStorage.getItem("isShuffling") === "true";

let savedVolume = parseFloat(localStorage.getItem("bgMusicVolume"));
if (isNaN(savedVolume)) savedVolume = 0.35; // ← tu valor solicitado

let isMusicPlayingState = localStorage.getItem("isMusicPlaying") || "paused";

/* ----------------------------------------------------
   Funciones utilitarias
---------------------------------------------------- */
function normalizarTexto(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/\s+/g, "");
}

function guardarDesbloqueados() {
  localStorage.setItem("desbloqueados", JSON.stringify([...desbloqueados]));
}
function guardarFavoritos() {
  localStorage.setItem("favoritos", JSON.stringify([...favoritos]));
}
function guardarLogrosAlcanzados() {
  localStorage.setItem("logrosAlcanzados", JSON.stringify([...logrosAlcanzados]));
}

function showAchievementToast(text) {
  const toast = document.createElement("div");
  toast.className = "achievement-toast";
  toast.textContent = text;
  achievementToastContainer.appendChild(toast);
  toast.addEventListener("animationend", () => toast.remove());
}

/* ----------------------------------------------------
   PROGRESO
---------------------------------------------------- */
function actualizarProgreso() {
  if (!progresoParrafo) return;
  const total = Object.keys(mensajes).length;
  const desbloq = desbloqueados.size;
  const porcentaje = total > 0 ? (desbloq / total) * 100 : 0;

  progresoParrafo.textContent = `Has desbloqueado ${desbloq} de ${total} códigos.`;
  progressBarFill.style.width = `${porcentaje}%`;

  if (Array.isArray(logros)) {
    logros.forEach(logro => {
      if (desbloq >= logro.codigo_requerido && !logrosAlcanzados.has(logro.id)) {
        logrosAlcanzados.add(logro.id);
        guardarLogrosAlcanzados();
        showAchievementToast(`🏆 Logro desbloqueado: ${logro.mensaje}`);
      }
    });
  }
}

/* ----------------------------------------------------
   Favoritos
---------------------------------------------------- */
function toggleFavorite(codigo) {
  if (favoritos.has(codigo)) {
    favoritos.delete(codigo);
    showAchievementToast(`❤️ Quitado de favoritos: ${codigo}`);
  } else {
    favoritos.add(codigo);
    showAchievementToast(`❤️ Añadido a favoritos: ${codigo}`);
  }
  guardarFavoritos();
  actualizarListaDesbloqueados();
}

/* ----------------------------------------------------
   LISTA DE CÓDIGOS DESBLOQUEADOS
---------------------------------------------------- */
function actualizarListaDesbloqueados() {
  unlockedCodesList.innerHTML = "";

  const search = normalizarTexto(searchUnlockedCodesInput.value);
  const filtro = categoryFilterSelect.value;

  const lista = showingFavorites ? [...favoritos] : [...desbloqueados];

  const categorias = new Set([""]);

  lista.sort().forEach(codigo => {
    const data = mensajes[codigo];
    if (!data) return;

    categorias.add(data.categoria || "General");

    const matchSearch = search === "" || normalizarTexto(codigo).includes(search);
    const matchCat =
      filtro === "" ||
      normalizarTexto(data.categoria || "") === normalizarTexto(filtro);

    if (!matchSearch || !matchCat) return;

    const li = document.createElement("li");
    li.innerHTML = `
      <span>${codigo}</span>
      <span class="category">${data.categoria || "General"}</span>
    `;
    li.addEventListener("click", () => mostrarContenido(codigo));

    const favBtn = document.createElement("button");
    favBtn.className = "favorite-toggle-btn";
    const isFav = favoritos.has(codigo);
    favBtn.innerHTML = `<i class="${isFav ? "fas" : "far"} fa-heart"></i>`;
    favBtn.addEventListener("click", e => {
      e.stopPropagation();
      toggleFavorite(codigo);
    });

    li.appendChild(favBtn);
    unlockedCodesList.appendChild(li);
  });

  categoryFilterSelect.innerHTML = `<option value="">Todas</option>`;
  [...categorias]
    .filter(c => c !== "")
    .sort()
    .forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categoryFilterSelect.appendChild(opt);
    });
}

/* ----------------------------------------------------
   MOSTRAR CONTENIDO POR CÓDIGO
---------------------------------------------------- */
function mostrarContenido(codigo) {
  const data = mensajes[codigo];
  if (!data) return;

  contenidoDiv.hidden = false;
  contenidoDiv.classList.remove("fade-in");
  void contenidoDiv.offsetWidth;
  contenidoDiv.classList.add("fade-in");

  let html = "";

  /* VIDEO EMBED */
  if (data.videoEmbed) {
    html += `
      <h2>Video Especial</h2>
      <p>${data.texto || ""}</p>
      <div class="video-wrapper">
        <iframe src="${data.videoEmbed}" frameborder="0" allowfullscreen></iframe>
      </div>
      <button id="resumeMusicBtn" class="button small-button">
        <i class="fas fa-music"></i> Reanudar música
      </button>
    `;

    if (!bgMusic.paused) {
      bgMusic.pause();
      playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      localStorage.setItem("isMusicPlaying", "paused");
    }

    contenidoDiv.innerHTML = html;

    document.getElementById("resumeMusicBtn").onclick = () => {
      bgMusic.play();
      playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      localStorage.setItem("isMusicPlaying", "playing");
    };

    return;
  }

  /* IMAGEN (modal) */
  if (data.imagen) {
    modalImg.src = data.imagen;
    modalCaption.textContent = data.texto || "";
    imageModal.style.display = "flex";

    if (!bgMusic.paused) {
      bgMusic.pause();
      playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      localStorage.setItem("isMusicPlaying", "paused");
    }
    return;
  }

  /* AUDIO */
  if (data.audio) {
    html += `
      <h2>Audio Secreto</h2>
      <p>${data.texto || ""}</p>
      <button id="playCodeAudioBtn" class="button"><i class="fas fa-play"></i> Reproducir</button>
    `;

    contenidoDiv.innerHTML = html;

    codeAudio.src = data.audio;
    document.getElementById("playCodeAudioBtn").onclick = () => {
      codeAudio.play();
    };
    return;
  }

  /* LINK */
  if (data.link) {
    html += `
      <h2>Enlace Especial</h2>
      <p>${data.texto || ""}</p>
      <a href="${data.link}" target="_blank" class="button">Abrir <i class="fas fa-external-link-alt"></i></a>
    `;
    contenidoDiv.innerHTML = html;
    return;
  }

  /* DESCARGA */
  if (data.descarga) {
    html += `
      <h2>Archivo Especial</h2>
      <p>${data.texto || ""}</p>
      <a href="${data.descarga.url}" download="${data.descarga.nombre}" class="button">
        Descargar ${data.descarga.nombre} <i class="fas fa-download"></i>
      </a>
    `;
    contenidoDiv.innerHTML = html;
    return;
  }

  /* TEXTO */
  if (data.texto) {
    html += `<h2>Mensaje Desbloqueado</h2><p>${data.texto}</p>`;
  }

  contenidoDiv.innerHTML = html;
}

/* ----------------------------------------------------
   CERRAR MODAL
---------------------------------------------------- */
function cerrarModal() {
  imageModal.style.display = "none";

  if (localStorage.getItem("isMusicPlaying") === "playing") {
    bgMusic.play();
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
  }
}

imageModal.addEventListener("click", e => {
  if (e.target === imageModal) cerrarModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && imageModal.style.display === "flex") cerrarModal();
});
/******************************************************
 *  SCRIPT.JS — PARTE 2 / 3
 ******************************************************/

/* ----------------------------------------------------
   FUNCIONES DE AUDIO
---------------------------------------------------- */

/* Nombre amigable de la pista */
function friendlyTrackName(path) {
  try {
    const file = path.split("/").pop();
    return file.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
  } catch {
    return path;
  }
}

/* Cargar pista */
function loadTrack(index, autoplay = true) {
  currentTrack = (index + playlist.length) % playlist.length;
  localStorage.setItem("currentTrack", currentTrack);

  bgMusic.src = playlist[currentTrack];
  bgMusic.load();

  if (currentTrackName) {
    currentTrackName.textContent = friendlyTrackName(playlist[currentTrack]);
  }

  bgMusic.volume = savedVolume;

  if (autoplay) {
    bgMusic.play().then(() => {
      playPauseBtn.innerHTML = `<i class="fas fa-pause"></i>`;
      localStorage.setItem("isMusicPlaying", "playing");
      isMusicPlayingState = "playing";
    }).catch(() => {
      playPauseBtn.innerHTML = `<i class="fas fa-play"></i>`;
      localStorage.setItem("isMusicPlaying", "paused");
      isMusicPlayingState = "paused";
    });
  } else {
    playPauseBtn.innerHTML = `<i class="fas fa-play"></i>`;
  }
}

/* Play/Pause */
function playPause() {
  if (bgMusic.paused) {
    bgMusic.play();
    playPauseBtn.innerHTML = `<i class="fas fa-pause"></i>`;
    localStorage.setItem("isMusicPlaying", "playing");
  } else {
    bgMusic.pause();
    playPauseBtn.innerHTML = `<i class="fas fa-play"></i>`;
    localStorage.setItem("isMusicPlaying", "paused");
  }
}

/* Siguiente pista */
function nextTrack() {
  if (isShuffling) {
    currentTrack = Math.floor(Math.random() * playlist.length);
  } else {
    currentTrack = (currentTrack + 1) % playlist.length;
  }
  loadTrack(currentTrack, true);
}

/* Pista anterior */
function prevTrack() {
  if (isShuffling) {
    currentTrack = Math.floor(Math.random() * playlist.length);
  } else {
    currentTrack = (currentTrack - 1 + playlist.length) % playlist.length;
  }
  loadTrack(currentTrack, true);
}

/* Cuando termina la música */
bgMusic.addEventListener("ended", nextTrack);

/* Botones */
playPauseBtn.addEventListener("click", playPause);
nextTrackBtn.addEventListener("click", nextTrack);
prevTrackBtn.addEventListener("click", prevTrack);

/* Mute */
muteBtn.addEventListener("click", () => {
  bgMusic.muted = !bgMusic.muted;
  muteBtn.innerHTML = bgMusic.muted
    ? `<i class="fas fa-volume-mute"></i>`
    : `<i class="fas fa-volume-up"></i>`;
  localStorage.setItem("bgMusicMuted", bgMusic.muted);
});

/* Shuffle */
shuffleBtn.addEventListener("click", () => {
  isShuffling = !isShuffling;
  shuffleBtn.style.color = isShuffling ? "var(--highlight-pink)" : "";
  localStorage.setItem("isShuffling", isShuffling);
});

/* Volumen */
audioVolume.value = savedVolume;
audioVolume.addEventListener("input", () => {
  savedVolume = parseFloat(audioVolume.value);
  bgMusic.volume = savedVolume;
  localStorage.setItem("bgMusicVolume", savedVolume);
});

/* ----------------------------------------------------
   PANEL LATERAL (SLIDE-IN)
---------------------------------------------------- */
audioSettingsBtn.addEventListener("click", () => {
  audioPanel.classList.add("show");
  audioPanel.setAttribute("aria-hidden", "false");

  // Accesibilidad
  setTimeout(() => playPauseBtn.focus(), 150);

  cerrarMenu();
});

closeAudioPanel.addEventListener("click", () => {
  audioPanel.classList.remove("show");
  audioPanel.setAttribute("aria-hidden", "true");
});

/* ----------------------------------------------------
   AUTOPLAY ON FIRST INTERACTION
---------------------------------------------------- */
let interactionStarted = false;
function startOnInteraction() {
  if (interactionStarted) return;
  interactionStarted = true;

  const wasPlaying = localStorage.getItem("isMusicPlaying") === "playing";

  /* Cargar pista actual */
  loadTrack(currentTrack, wasPlaying);

  /* Recuperar estado */
  bgMusic.muted = localStorage.getItem("bgMusicMuted") === "true";
  muteBtn.innerHTML = bgMusic.muted
    ? `<i class="fas fa-volume-mute"></i>`
    : `<i class="fas fa-volume-up"></i>`;

  document.removeEventListener("click", startOnInteraction);
  document.removeEventListener("keydown", startOnInteraction);
}
document.addEventListener("click", startOnInteraction, { once: true, passive: true });
document.addEventListener("keydown", startOnInteraction, { once: true, passive: true });

/* ----------------------------------------------------
   PROCESAR CÓDIGO INGRESADO
---------------------------------------------------- */
function procesarCodigo() {
  const codigoIngresado = codeInput.value || "";
  const codigo = normalizarTexto(codigoIngresado);
  const data = mensajes[codigo];

  contenidoDiv.hidden = true;
  codeInput.classList.remove("success", "error");

  if (data) {
    /* CORRECTO */
    correctSound.play().catch(() => {});
    codeInput.classList.add("success");

    mostrarContenido(codigo);

    if (!desbloqueados.has(codigo)) {
      desbloqueados.add(codigo);
      guardarDesbloqueados();
      actualizarProgreso();
      showAchievementToast(`✨ Código desbloqueado: ${codigo}`);
    }

    actualizarListaDesbloqueados();

    failedAttempts = 0;
    localStorage.setItem("failedAttempts", "0");

  } else {
    /* INCORRECTO */
    incorrectSound.play().catch(() => {});
    codeInput.classList.add("error");

    failedAttempts++;
    localStorage.setItem("failedAttempts", failedAttempts);

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      /* DAR PISTA */
      const candidatos = Object.keys(mensajes).filter(
        c => !desbloqueados.has(c) && mensajes[c].pista
      );

      let pista = HINT_MESSAGE;

      if (candidatos.length > 0) {
        const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
        pista = mensajes[elegido].pista;
      }

      contenidoDiv.innerHTML = `
        <h2>💡 Pista:</h2>
        <p>${pista}</p>
      `;
      contenidoDiv.hidden = false;
      failedAttempts = 0;
      localStorage.setItem("failedAttempts", "0");
    } else {
      contenidoDiv.innerHTML = `
        <h2>Código Incorrecto</h2>
        <p>Intentos fallidos: ${failedAttempts} de ${MAX_FAILED_ATTEMPTS}</p>
        <p>Sigue intentando…</p>
      `;
      contenidoDiv.hidden = false;
    }
  }

  codeInput.value = "";
}

submitCodeBtn.addEventListener("click", procesarCodigo);
codeInput.addEventListener("keypress", e => {
  if (e.key === "Enter") procesarCodigo();
});

/* ----------------------------------------------------
   EXPORTAR / IMPORTAR PROGRESO
---------------------------------------------------- */
function exportarProgreso() {
  const datos = {
    desbloqueados: [...desbloqueados],
    favoritos: [...favoritos],
    logrosAlcanzados: [...logrosAlcanzados],
    fecha: new Date().toLocaleString()
  };

  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `progreso_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
  showAchievementToast("📤 Progreso exportado");
}

function importarProgreso(file) {
  const reader = new FileReader();

  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);

      desbloqueados = new Set(data.desbloqueados || []);
      favoritos = new Set(data.favoritos || []);
      logrosAlcanzados = new Set(data.logrosAlcanzados || []);

      guardarDesbloqueados();
      guardarFavoritos();
      guardarLogrosAlcanzados();

      actualizarProgreso();
      actualizarListaDesbloqueados();

      showAchievementToast("📥 Progreso importado");

    } catch (err) {
      alert("Archivo inválido.");
      console.error(err);
    }
  };

  reader.readAsText(file);
}

/* Botones de export / import */
document.getElementById("exportProgressBtn").addEventListener("click", () => {
  exportarProgreso();
  cerrarMenu();
});

const importInput = document.getElementById("importProgressInput");
document.getElementById("importProgressBtn").addEventListener("click", () => {
  importInput.click();
  cerrarMenu();
});

importInput.addEventListener("change", e => {
  if (e.target.files[0]) importarProgreso(e.target.files[0]);
  importInput.value = "";
});
/******************************************************
 *  SCRIPT.JS — PARTE 3 / 3
 ******************************************************/

/* ----------------------------------------------------
   RESETEAR PROGRESO
---------------------------------------------------- */
function resetearProgreso() {
  const confirmar = confirm(
    "¿Seguro que quieres borrar TODO tu progreso?\n\n" +
    "Se eliminarán:\n" +
    "✓ Códigos desbloqueados\n" +
    "✓ Favoritos\n" +
    "✓ Logros\n" +
    "✓ Tema oscuro\n" +
    "✓ Música (volumen, pista, mute, shuffle)\n" +
    "✓ Intentos fallidos\n\n" +
    "Esta acción NO se puede deshacer."
  );

  if (!confirmar) return;

  localStorage.clear();

  desbloqueados = new Set();
  favoritos = new Set();
  logrosAlcanzados = new Set();
  failedAttempts = 0;

  document.body.classList.remove("dark-mode");
  if (darkModeToggle) {
    darkModeToggle.innerHTML = '<i class="fas fa-moon"></i> Modo Oscuro';
  }

  if (bgMusic) {
    bgMusic.pause();
    bgMusic.src = "";
  }

  contenidoDiv.hidden = true;

  actualizarProgreso();
  actualizarListaDesbloqueados();

  showAchievementToast("🔄 Progreso restablecido");
  cerrarMenu();
}

document.getElementById("resetProgressBtn").addEventListener("click", resetearProgreso);


/* ----------------------------------------------------
   MOSTRAR / OCULTAR PANEL DE CÓDIGOS DESBLOQUEADOS
---------------------------------------------------- */

toggleUnlockedCodesBtn.addEventListener("click", toggleUnlockedCodes);

function toggleUnlockedCodes() {
  const isHidden = unlockedCodesPanel.hidden;

  unlockedCodesPanel.hidden = !isHidden;
  toggleUnlockedCodesBtn.textContent = isHidden
    ? "Ocultar Códigos Desbloqueados"
    : "Mostrar Códigos Desbloqueados";

  toggleUnlockedCodesBtn.setAttribute("aria-expanded", String(isHidden));

  showingFavorites = false;
  filterFavoritesBtn.classList.remove("active");
  filterFavoritesBtn.setAttribute("aria-pressed", "false");

  actualizarListaDesbloqueados();
}

/* Ver favoritos desde el menú */
showFavoritesBtn.addEventListener("click", () => {
  if (unlockedCodesPanel.hidden) toggleUnlockedCodes();
  showingFavorites = true;
  filterFavoritesBtn.classList.add("active");
  filterFavoritesBtn.setAttribute("aria-pressed", "true");

  searchUnlockedCodesInput.value = "";
  categoryFilterSelect.value = "";

  actualizarListaDesbloqueados();
  cerrarMenu();
});

/* Favoritos dentro del panel */
filterFavoritesBtn.addEventListener("click", () => {
  showingFavorites = !showingFavorites;

  filterFavoritesBtn.classList.toggle("active", showingFavorites);
  filterFavoritesBtn.setAttribute("aria-pressed", showingFavorites);

  actualizarListaDesbloqueados();
});

/* Filtros del panel */
searchUnlockedCodesInput.addEventListener("input", actualizarListaDesbloqueados);
categoryFilterSelect.addEventListener("change", actualizarListaDesbloqueados);


/* ----------------------------------------------------
   MENÚ DESPLEGABLE DE NAVEGACIÓN
---------------------------------------------------- */

menuButton.addEventListener("click", () => {
  const isExpanded = menuButton.getAttribute("aria-expanded") === "true";

  menuButton.setAttribute("aria-expanded", String(!isExpanded));
  dropdownMenu.classList.toggle("show");
  dropdownMenu.setAttribute("aria-hidden", isExpanded ? "true" : "false");

  if (!isExpanded) dropdownMenu.querySelector("a, button")?.focus();
});

/* Cerrar menú al hacer click fuera */
document.addEventListener("click", e => {
  if (!menuButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
    if (dropdownMenu.classList.contains("show")) cerrarMenu();
  }
});

/* Accesibilidad por teclado */
dropdownMenu.addEventListener("keydown", e => {
  const focusables = dropdownMenu.querySelectorAll("a, button");
  if (!focusables.length) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (e.key === "Escape") {
    cerrarMenu();
    menuButton.focus();
  } else if (e.key === "Tab") {
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }
});

/* Función cerrar menú */
function cerrarMenu() {
  dropdownMenu.classList.remove("show");
  dropdownMenu.setAttribute("aria-hidden", "true");
  menuButton.setAttribute("aria-expanded", "false");
}


/* ----------------------------------------------------
   TEMA OSCURO (DARK MODE)
---------------------------------------------------- */

(function initTheme() {
  const theme = localStorage.getItem("theme");

  if (theme === "dark-mode") {
    document.body.classList.add("dark-mode");
    darkModeToggle.innerHTML = '<i class="fas fa-sun"></i> Modo Claro';
  }

  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark-mode" : "light-mode");

    darkModeToggle.innerHTML = isDark
      ? '<i class="fas fa-sun"></i> Modo Claro'
      : '<i class="fas fa-moon"></i> Modo Oscuro';
  });
})();


/* ----------------------------------------------------
   MODAL DE IMAGENES
---------------------------------------------------- */

function cerrarModal() {
  imageModal.style.display = "none";

  if (bgMusic.paused && localStorage.getItem("isMusicPlaying") === "playing") {
    bgMusic.play().catch(() => {});
    playPauseBtn.innerHTML = `<i class="fas fa-pause"></i>`;
  }
}

imageModal.addEventListener("click", e => {
  if (e.target === imageModal) cerrarModal();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && imageModal.style.display === "flex") {
    cerrarModal();
  }
});


/* ----------------------------------------------------
   MOSTRAR CONTENIDO DE UN CÓDIGO
---------------------------------------------------- */

function mostrarContenido(codigo) {
  const data = mensajes[codigo];
  if (!data) return;

  contenidoDiv.innerHTML = "";
  contenidoDiv.hidden = false;
  contenidoDiv.classList.remove("fade-in");
  void contenidoDiv.offsetWidth;
  contenidoDiv.classList.add("fade-in");

  let html = "";

  /* VIDEO */
  if (data.videoEmbed) {
    html += `
      <h2>Video Especial</h2>
      <p>${data.texto || ""}</p>
      <div class="video-wrapper">
        <iframe src="${data.videoEmbed}" frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          allowfullscreen></iframe>
      </div>
      <button id="resumeMusicBtn" class="button small-button">
        <i class="fas fa-music"></i> Reanudar Música
      </button>
    `;

    bgMusic.pause();
    playPauseBtn.innerHTML = `<i class="fas fa-play"></i>`;

    contenidoDiv.innerHTML = html;

    document.getElementById("resumeMusicBtn").addEventListener("click", () => {
      bgMusic.play();
      playPauseBtn.innerHTML = `<i class="fas fa-pause"></i>`;
      document.getElementById("resumeMusicBtn").remove();
    });

    return;
  }

  /* IMAGEN */
  if (data.imagen) {
    modalImg.src = data.imagen;
    modalCaption.textContent = data.texto || "";
    imageModal.style.display = "flex";
    modalImg.classList.add("fade-in-modal");

    bgMusic.pause();
    playPauseBtn.innerHTML = `<i class="fas fa-play"></i>`;

    return;
  }

  /* AUDIO ESPECIAL DEL CÓDIGO */
  if (data.audio) {
    codeAudio.src = data.audio;
    fadeOutAudio(bgMusic, 0.05, 400);

    html += `
      <h2>Audio Secreto</h2>
      <p>${data.texto || ""}</p>
      <button id="playCodeAudioBtn" class="button">
        <i class="fas fa-play"></i> Reproducir
      </button>
    `;

    contenidoDiv.innerHTML = html;

    document.getElementById("playCodeAudioBtn").addEventListener("click", () => {
      codeAudio.play();
      document.getElementById("playCodeAudioBtn").remove();
    });

    codeAudio.addEventListener("ended", () => fadeInAudio(bgMusic, 0.05, 500));

    return;
  }

  /* ENLACE */
  if (data.link) {
    html += `
      <h2>Enlace Especial</h2>
      <p>${data.texto || ""}</p>
      <a href="${data.link}" target="_blank" class="button">
        Abrir Enlace <i class="fas fa-external-link-alt"></i>
      </a>
    `;
    contenidoDiv.innerHTML = html;
    return;
  }

  /* DESCARGA */
  if (data.descarga) {
    html += `
      <h2>Descarga Especial</h2>
      <p>${data.texto || ""}</p>
      <a href="${data.descarga.url}" download="${data.descarga.nombre}" class="button">
        Descargar ${data.descarga.nombre} <i class="fas fa-download"></i>
      </a>
    `;
    contenidoDiv.innerHTML = html;
    return;
  }

  /* TEXTO NORMAL */
  if (data.texto) {
    html += `
      <h2>Mensaje Especial</h2>
      <p>${data.texto}</p>
    `;
    contenidoDiv.innerHTML = html;
    return;
  }

  /* DEFAULT */
  contenidoDiv.innerHTML = `
    <p>Este código existe pero no tiene contenido asociado.</p>
  `;
}


/* ----------------------------------------------------
   INICIALIZACIÓN FINAL AL CARGAR LA PÁGINA
---------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  audioVolume.value = savedVolume;

  shuffleBtn.style.color = isShuffling ? "var(--highlight-pink)" : "";

  const muted = localStorage.getItem("bgMusicMuted") === "true";
  bgMusic.muted = muted;
  muteBtn.innerHTML = muted
    ? `<i class="fas fa-volume-mute"></i>`
    : `<i class="fas fa-volume-up"></i>`;

  bgMusic.src = playlist[currentTrack];
  currentTrackName.textContent = friendlyTrackName(playlist[currentTrack]);

  actualizarProgreso();
  actualizarListaDesbloqueados();
});


/* ----------------------------------------------------
   EXPONER FUNCIONES PARA DEPURACIÓN OPCIONAL
---------------------------------------------------- */
window.procesarCodigo = procesarCodigo;
window.mostrarContenido = mostrarContenido;
window.cerrarModal = cerrarModal;
window.loadTrack = loadTrack;
window.playPause = playPause;

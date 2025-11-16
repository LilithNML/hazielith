// script.js (versión completa, defensiva y con pistas aleatorias)
// Requiere que data.js defina globalmente:
// const mensajes = { ... }
// const logros = [ ... ]

// --- Referencias al DOM (defensivas) ---
const codeInput = document.getElementById("codeInput");
const submitCodeBtn = document.getElementById("submitCodeBtn");
const contenidoDiv = document.getElementById("contenido");
const correctSound = document.getElementById("correctSound");
const incorrectSound = document.getElementById("incorrectSound");
const bgMusic = document.getElementById("bgMusic");
const codeAudio = document.getElementById("codeAudio");
const progresoParrafo = document.getElementById("progreso");
const progressBarFill = document.querySelector(".progress-bar-fill");
const musicToggleBtn = document.getElementById("musicToggle");
const musicToggleIcon = musicToggleBtn ? musicToggleBtn.querySelector('i') : null;
const toggleUnlockedCodesBtn = document.getElementById("toggleUnlockedCodes");
const unlockedCodesPanel = document.getElementById("unlockedCodesPanel");
const unlockedCodesList = document.getElementById("unlockedCodesList");
const searchUnlockedCodesInput = document.getElementById("searchUnlockedCodes");
const categoryFilterSelect = document.getElementById("categoryFilter");
const imageModal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImg");
const modalCaption = document.getElementById("modalCaption");
const menuButton = document.getElementById('menuButton');
const dropdownMenu = document.getElementById('dropdownMenu');
const achievementToastContainer = document.getElementById('achievement-toast-container');
const darkModeToggle = document.getElementById('darkModeToggle');
const showFavoritesBtn = document.getElementById('showFavoritesBtn');
const filterFavoritesBtn = document.getElementById('filterFavoritesBtn');

// --- Variables de estado ---
let failedAttempts = parseInt(localStorage.getItem("failedAttempts") || "0", 10);
const MAX_FAILED_ATTEMPTS = 5;
const HINT_MESSAGE = "Parece que no es el código correcto... te daré una pista si fallas más veces.";
let showingFavorites = false;

let desbloqueados = new Set(JSON.parse(localStorage.getItem("desbloqueados") || "[]"));
let logrosAlcanzados = new Set(JSON.parse(localStorage.getItem("logrosAlcanzados") || "[]"));
let favoritos = new Set(JSON.parse(localStorage.getItem("favoritos") || "[]"));

// --- Utilidades ---
function normalizarTexto(texto) {
  if (typeof texto !== 'string') return "";
  return texto.toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/ñ/g, "n")
              .replace(/\s+/g, "");
}

function guardarDesbloqueados() {
  try {
    localStorage.setItem("desbloqueados", JSON.stringify(Array.from(desbloqueados)));
  } catch (e) { console.warn("guardarDesbloqueados:", e); }
}

function guardarLogrosAlcanzados() {
  try {
    localStorage.setItem("logrosAlcanzados", JSON.stringify(Array.from(logrosAlcanzados)));
  } catch (e) { console.warn("guardarLogrosAlcanzados:", e); }
}

function guardarFavoritos() {
  try {
    localStorage.setItem("favoritos", JSON.stringify(Array.from(favoritos)));
  } catch (e) { console.warn("guardarFavoritos:", e); }
}

function showAchievementToast(message) {
  if (!achievementToastContainer) return;
  const toast = document.createElement('div');
  toast.classList.add('achievement-toast');
  toast.textContent = message;
  achievementToastContainer.appendChild(toast);
  toast.addEventListener('animationend', () => toast.remove());
}

// Actualiza la barra de progreso y verifica logros
function actualizarProgreso() {
  if (!progresoParrafo || !progressBarFill) return;
  const totalCodigos = (typeof mensajes === 'object' && mensajes) ? Object.keys(mensajes).length : 0;
  const codigosDesbloqueadosCount = desbloqueados.size;
  const porcentaje = totalCodigos > 0 ? (codigosDesbloqueadosCount / totalCodigos) * 100 : 0;

  progresoParrafo.textContent = `Has desbloqueado ${codigosDesbloqueadosCount} de ${totalCodigos} códigos.`;
  progressBarFill.style.width = `${porcentaje}%`;
  progressBarFill.setAttribute('aria-valuenow', Math.round(porcentaje));

  if (Array.isArray(logros)) {
    logros.forEach(logro => {
      if (codigosDesbloqueadosCount >= logro.codigo_requerido && !logrosAlcanzados.has(logro.id)) {
        logrosAlcanzados.add(logro.id);
        showAchievementToast(`¡Logro: ${logro.mensaje}!`);
        guardarLogrosAlcanzados();
      }
    });
  }
}

// Favoritos
function toggleFavorite(codigo) {
  if (!codigo) return;
  if (favoritos.has(codigo)) {
    favoritos.delete(codigo);
    showAchievementToast(`"${codigo}" eliminado de favoritos.`);
  } else {
    favoritos.add(codigo);
    showAchievementToast(`"${codigo}" añadido a favoritos.`);
  }
  guardarFavoritos();
  actualizarListaDesbloqueados();
}

// --- Render lista de desbloqueados ---
function actualizarListaDesbloqueados() {
  if (!unlockedCodesList || typeof mensajes !== 'object') return;
  unlockedCodesList.innerHTML = "";
  const searchTerm = normalizarTexto(searchUnlockedCodesInput ? searchUnlockedCodesInput.value : "");
  const selectedCategory = categoryFilterSelect ? categoryFilterSelect.value : "";

  const categoriasUnicas = new Set();
  categoriasUnicas.add("");

  const codigosParaMostrar = showingFavorites ? Array.from(favoritos) : Array.from(desbloqueados);

  codigosParaMostrar.sort().forEach(codigo => {
    const mensaje = mensajes[codigo];
    if (!mensaje) return;
    categoriasUnicas.add(mensaje.categoria || "Sin Categoría");

    const normalizedCategoria = normalizarTexto(mensaje.categoria || "Sin Categoría");
    const normalizedCodigo = normalizarTexto(codigo);

    const matchesSearch = searchTerm === "" || normalizedCodigo.includes(searchTerm);
    const matchesCategory = selectedCategory === "" || normalizedCategoria === normalizarTexto(selectedCategory);
    const isFavorite = favoritos.has(codigo);

    if (matchesSearch && matchesCategory) {
      const li = document.createElement("li");
      li.innerHTML = `<span>${codigo}</span> <span class="category">${mensaje.categoria || "Genérico"}</span>`;
      li.setAttribute("tabindex", "0");
      li.setAttribute("aria-label", `Código desbloqueado: ${codigo}, categoría ${mensaje.categoria || "Genérico"}`);

      const favoriteBtn = document.createElement("button");
      favoriteBtn.classList.add("favorite-toggle-btn");
      favoriteBtn.innerHTML = `<i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>`;
      favoriteBtn.setAttribute("aria-label", isFavorite ? `Quitar ${codigo} de favoritos` : `Añadir ${codigo} a favoritos`);
      if (isFavorite) favoriteBtn.classList.add('active');

      favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(codigo);
      });
      li.appendChild(favoriteBtn);

      li.addEventListener('click', () => mostrarContenido(codigo));
      unlockedCodesList.appendChild(li);
    }
  });

  // Actualizar filtro de categoría (si existe)
  if (categoryFilterSelect) {
    categoryFilterSelect.innerHTML = '<option value="">Todas las categorías</option>';
    Array.from(categoriasUnicas).sort().forEach(cat => {
      if (cat !== "") {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        if (cat === selectedCategory) option.selected = true;
        categoryFilterSelect.appendChild(option);
      }
    });
  }
}

// --- Mostrar contenido para un código ---
function mostrarContenido(codigo) {
  const mensaje = (typeof mensajes === 'object' && mensajes) ? mensajes[codigo] : null;
  if (!mensaje) return;

  if (!contenidoDiv) return;
  contenidoDiv.innerHTML = "";
  contenidoDiv.hidden = false;
  contenidoDiv.classList.remove('fade-in');
  void contenidoDiv.offsetWidth;
  contenidoDiv.classList.add('fade-in');

  let contentHTML = "";

  // VIDEO
  if (mensaje.videoEmbed) {
    contentHTML += `
      <h2>Video Especial</h2>
      <p>${mensaje.texto || '¡Disfruta de este momento!'}</p>
      <div class="video-wrapper">
        <iframe
          src="${mensaje.videoEmbed}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          title="Video especial para ti">
        </iframe>
      </div>
    `;

    if (bgMusic && !bgMusic.paused) {
      try { bgMusic.pause(); } catch (e) { console.warn("bgMusic.pause:", e); }
      contentHTML += `<button id="resumeMusicBtn" class="button small-button"><i class="fas fa-music"></i> Reanudar Música de Fondo</button>`;
      setTimeout(() => {
        const resumeBtn = document.getElementById('resumeMusicBtn');
        if (resumeBtn) {
          resumeBtn.addEventListener('click', () => {
            if (bgMusic) bgMusic.play().catch(e => console.error("Error al reanudar la música:", e));
            if (musicToggleIcon) {
              musicToggleIcon.classList.add('fa-volume-up');
              musicToggleIcon.classList.remove('fa-volume-mute');
            }
            if (musicToggleBtn) musicToggleBtn.classList.add('playing');
            resumeBtn.remove();
          });
        }
      }, 100);
    }

  // IMAGEN (modal)
  } else if (mensaje.imagen) {
    if (modalImg) modalImg.src = mensaje.imagen;
    if (modalImg) modalImg.alt = mensaje.texto || "Imagen desbloqueada";
    if (modalCaption) modalCaption.textContent = mensaje.texto || "";
    if (imageModal) imageModal.style.display = "flex";
    if (modalImg) {
      modalImg.classList.remove('fade-in-modal');
      void modalImg.offsetWidth;
      modalImg.classList.add('fade-in-modal');
    }

    if (bgMusic && !bgMusic.paused) {
      try { bgMusic.pause(); } catch (e) { console.warn(e); }
      if (musicToggleIcon) {
        musicToggleIcon.classList.remove('fa-volume-up');
        musicToggleIcon.classList.add('fa-volume-mute');
      }
      if (musicToggleBtn) musicToggleBtn.classList.remove('playing');
      localStorage.setItem('isMusicPlaying', 'paused');
    }
    return;

  // AUDIO
  } else if (mensaje.audio) {
    if (codeAudio) {
      if (codeAudio.src !== mensaje.audio) codeAudio.src = mensaje.audio;
      fadeInAudio(codeAudio, 0.1, 2000);
      if (bgMusic && !bgMusic.paused) {
        fadeOutAudio(bgMusic, 0.05, 500);
        try { bgMusic.setAttribute('data-was-playing', 'true'); } catch (e) {}
      }
    }
    contentHTML += `<h2>Audio Secreto Desbloqueado</h2><p>${mensaje.texto || 'Haz clic para escuchar el mensaje de audio.'}</p><button id="playCodeAudioBtn" class="button"><i class="fas fa-play"></i> Reproducir Audio</button>`;

  // LINK
  } else if (mensaje.link) {
    contentHTML += `<h2>Enlace Especial</h2><p>${mensaje.texto || 'Haz clic para ir al enlace.'}</p><a href="${mensaje.link}" target="_blank" class="button" rel="noopener noreferrer">Ir al Enlace <i class="fas fa-external-link-alt"></i></a>`;

  // DESCARGA
  } else if (mensaje.descarga) {
    contentHTML += `<h2>Archivo Secreto</h2><p>${mensaje.texto || 'Haz clic para descargar tu regalo.'}</p><a href="${mensaje.descarga.url}" download="${mensaje.descarga.nombre}" class="button">Descargar ${mensaje.descarga.nombre} <i class="fas fa-download"></i></a>`;

  // TEXTO
  } else if (mensaje.texto) {
    contentHTML += `<h2>Mensaje Desbloqueado</h2><p>${mensaje.texto}</p>`;

  } else {
    contentHTML += `<p>Contenido especial, pero no hay texto, imagen, video o audio asociado directamente.</p>`;
  }

  contenidoDiv.innerHTML = contentHTML;

  // Bind botones de audio si existen
  if (mensaje.audio && codeAudio) {
    const playCodeAudioBtn = document.getElementById("playCodeAudioBtn");
    if (playCodeAudioBtn) {
      playCodeAudioBtn.addEventListener('click', () => {
        codeAudio.play().catch(e => console.error("Error al reproducir audio del código:", e));
        playCodeAudioBtn.hidden = true;
      });
    }
  }
}

// --- Cerrar modal (única versión) ---
function cerrarModal() {
  if (imageModal) imageModal.style.display = "none";

  if (bgMusic && bgMusic.paused && localStorage.getItem('isMusicPlaying') === 'playing') {
    bgMusic.play().catch(e => console.error("Error al reanudar la música desde el modal:", e));
    if (musicToggleIcon) {
      musicToggleIcon.classList.add('fa-volume-up');
      musicToggleIcon.classList.remove('fa-volume-mute');
    }
    if (musicToggleBtn) musicToggleBtn.classList.add('playing');
  }
}

// Cerrar modal al hacer clic fuera de la imagen
if (imageModal) {
  imageModal.addEventListener('click', (event) => {
    if (event.target === imageModal) cerrarModal();
  });
}

// Cerrar modal con Escape
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && imageModal && imageModal.style.display === 'flex') {
    cerrarModal();
  }
});

// --- Fade audio helpers ---
function fadeInAudio(audioElement, increment, duration) {
  if (!audioElement) return;
  try {
    audioElement.volume = 0;
    audioElement.play().catch(e => console.error("Error al iniciar fade-in audio:", e));
  } catch (e) { console.warn(e); }

  const steps = Math.max(1, Math.round(duration / (increment * 1000)));
  const stepIncrement = 1 / steps;

  const fadeInInterval = setInterval(() => {
    if (audioElement.volume < 1 - stepIncrement) {
      audioElement.volume = Math.min(1, audioElement.volume + stepIncrement);
    } else {
      audioElement.volume = 1;
      clearInterval(fadeInInterval);
    }
  }, Math.max(10, Math.round(increment * 1000)));
}

function fadeOutAudio(audioElement, decrement, duration) {
  if (!audioElement) return;
  const steps = Math.max(1, Math.round(duration / (decrement * 1000)));
  const stepDecrement = 1 / steps;

  const fadeOutInterval = setInterval(() => {
    if (audioElement.volume > stepDecrement) {
      audioElement.volume = Math.max(0, audioElement.volume - stepDecrement);
    } else {
      audioElement.volume = 0;
      try { audioElement.pause(); } catch (e) {}
      clearInterval(fadeOutInterval);
    }
  }, Math.max(10, Math.round(decrement * 1000)));
}

// --- Procesar código (entrada de usuario) ---
function procesarCodigo() {
  const codigoIngresado = codeInput ? (codeInput.value || "") : "";
  const codigo = normalizarTexto(codigoIngresado);
  const mensaje = (typeof mensajes === 'object' && mensajes) ? mensajes[codigo] : null;

  if (!contenidoDiv || !codeInput) return;

  contenidoDiv.hidden = true;
  codeInput.classList.remove("success", "error");

  if (mensaje) {
    try { if (correctSound) correctSound.play(); } catch (e) { console.warn("correctSound:", e); }
    codeInput.classList.add("success");
    mostrarContenido(codigo);

    if (!desbloqueados.has(codigo)) {
      desbloqueados.add(codigo);
      guardarDesbloqueados();
      actualizarProgreso();
      showAchievementToast(`¡Código desbloqueado: ${codigo}! 🎉`);
    }

    actualizarListaDesbloqueados();
    failedAttempts = 0;
    localStorage.setItem("failedAttempts", "0");

  } else {
    try { if (incorrectSound) incorrectSound.play(); } catch (e) { console.warn("incorrectSound:", e); }
    codeInput.classList.add("error");
    failedAttempts++;
    localStorage.setItem("failedAttempts", failedAttempts.toString());

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      let codigosNoDesbloqueados = (typeof mensajes === 'object') ? Object.keys(mensajes).filter(c =>
        !desbloqueados.has(c) && mensajes[c].pista
      ) : [];

      let pistaMostrar = HINT_MESSAGE;
      let ultimoCodigoPista = localStorage.getItem("ultimoCodigoPista");

      if (codigosNoDesbloqueados.length > 0) {
        if (codigosNoDesbloqueados.length > 1 && ultimoCodigoPista) {
          codigosNoDesbloqueados = codigosNoDesbloqueados.filter(c => c !== ultimoCodigoPista);
        }
        const codigoAleatorio = codigosNoDesbloqueados[Math.floor(Math.random() * codigosNoDesbloqueados.length)];
        pistaMostrar = mensajes[codigoAleatorio].pista;
        localStorage.setItem("ultimoCodigoPista", codigoAleatorio);
      }

      contenidoDiv.innerHTML = `
        <h2>💡 Pista para ti:</h2>
        <p>${pistaMostrar}</p>
      `;
      contenidoDiv.hidden = false;

      failedAttempts = 0;
      localStorage.setItem("failedAttempts", "0");
    } else {
      contenidoDiv.innerHTML = `
        <h2>Código Incorrecto</h2>
        <p>Intentos fallidos: ${failedAttempts} de ${MAX_FAILED_ATTEMPTS}</p>
        <p>Sigue intentando, quizás una pista aparezca pronto...</p>
      `;
      contenidoDiv.hidden = false;
    }
  }

  codeInput.value = "";
}

// --- Listeners: entrada de código ---
if (submitCodeBtn) submitCodeBtn.addEventListener("click", procesarCodigo);
if (codeInput) {
  codeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") procesarCodigo();
  });
}

// --- Música de fondo toggle ---
let isMusicPlaying = localStorage.getItem('isMusicPlaying');
if (bgMusic) {
  if (isMusicPlaying === 'playing') {
    bgMusic.play().catch(e => console.error("Error al iniciar música de fondo:", e));
    if (musicToggleIcon) {
      musicToggleIcon.classList.add('fa-volume-up');
      musicToggleIcon.classList.remove('fa-volume-mute');
    }
    if (musicToggleBtn) musicToggleBtn.classList.add('playing');
  } else {
    if (musicToggleIcon) {
      musicToggleIcon.classList.remove('fa-volume-up');
      musicToggleIcon.classList.add('fa-volume-mute');
    }
    if (musicToggleBtn) musicToggleBtn.classList.remove('playing');
  }

  if (musicToggleBtn) {
    musicToggleBtn.addEventListener("click", () => {
      if (bgMusic.paused) {
        bgMusic.play().catch(e => console.error("Error al reanudar música:", e));
        if (musicToggleIcon) {
          musicToggleIcon.classList.add('fa-volume-up');
          musicToggleIcon.classList.remove('fa-volume-mute');
        }
        musicToggleBtn.classList.add('playing');
        localStorage.setItem('isMusicPlaying', 'playing');
      } else {
        bgMusic.pause();
        if (musicToggleIcon) {
          musicToggleIcon.classList.remove('fa-volume-up');
          musicToggleIcon.classList.add('fa-volume-mute');
        }
        musicToggleBtn.classList.remove('playing');
        localStorage.setItem('isMusicPlaying', 'paused');
      }
    });
  }
}

// Cuando termina el audio del código, reanudar fondo si corresponde
if (codeAudio) {
  codeAudio.addEventListener('ended', () => {
    if (bgMusic && bgMusic.getAttribute && bgMusic.getAttribute('data-was-playing') === 'true') {
      fadeInAudio(bgMusic, 0.05, 500);
      try { bgMusic.removeAttribute('data-was-playing'); } catch (e) {}
    }
  });
}

// Toggle panel desbloqueados
if (toggleUnlockedCodesBtn) toggleUnlockedCodesBtn.addEventListener("click", toggleUnlockedCodes);
function toggleUnlockedCodes() {
  if (!unlockedCodesPanel || !toggleUnlockedCodesBtn) return;
  const isHidden = unlockedCodesPanel.hidden;
  unlockedCodesPanel.hidden = !isHidden;
  toggleUnlockedCodesBtn.setAttribute("aria-expanded", (!isHidden).toString());
  toggleUnlockedCodesBtn.textContent = isHidden ? "Ocultar Códigos Desbloqueados" : "Mostrar Códigos Desbloqueados";

  showingFavorites = false;
  if (filterFavoritesBtn) {
    filterFavoritesBtn.classList.remove('active');
    filterFavoritesBtn.setAttribute('aria-pressed', 'false');
  }
  actualizarListaDesbloqueados();
}

// Mostrar favoritos desde menú
if (showFavoritesBtn) {
  showFavoritesBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (toggleUnlockedCodesBtn && unlockedCodesPanel && unlockedCodesPanel.hidden) toggleUnlockedCodes();
    showingFavorites = true;
    if (filterFavoritesBtn) {
      filterFavoritesBtn.classList.add('active');
      filterFavoritesBtn.setAttribute('aria-pressed', 'true');
    }
    if (searchUnlockedCodesInput) searchUnlockedCodesInput.value = '';
    if (categoryFilterSelect) categoryFilterSelect.value = '';
    actualizarListaDesbloqueados();
    cerrarMenu();
  });
}

// Filtro favoritos dentro del panel
if (filterFavoritesBtn) {
  filterFavoritesBtn.addEventListener('click', () => {
    showingFavorites = !showingFavorites;
    filterFavoritesBtn.classList.toggle('active', showingFavorites);
    filterFavoritesBtn.setAttribute('aria-pressed', showingFavorites.toString());
    actualizarListaDesbloqueados();
  });
}

// Búsqueda y filtro categoría
if (searchUnlockedCodesInput) searchUnlockedCodesInput.addEventListener("input", actualizarListaDesbloqueados);
if (categoryFilterSelect) categoryFilterSelect.addEventListener("change", actualizarListaDesbloqueados);

// Menú desplegable
if (menuButton) {
  menuButton.addEventListener('click', () => {
    const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', (!isExpanded).toString());
    if (dropdownMenu) {
      dropdownMenu.classList.toggle('show');
      dropdownMenu.setAttribute('aria-hidden', isExpanded ? 'true' : 'false');
      if (!isExpanded) dropdownMenu.querySelector('a, button')?.focus();
    }
  });
}

// --- Exportar e Importar progreso ---
const exportProgressBtn = document.getElementById('exportProgressBtn');
const importProgressBtn = document.getElementById('importProgressBtn');
const importProgressInput = document.getElementById('importProgressInput');

// Función para exportar progreso
function exportarProgreso() {
  const datos = {
    desbloqueados: Array.from(desbloqueados),
    favoritos: Array.from(favoritos),
    logrosAlcanzados: Array.from(logrosAlcanzados),
    fecha: new Date().toLocaleString()
  };

  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `progreso_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showAchievementToast("Progreso exportado correctamente");
}

// Función para importar progreso desde un archivo JSON
function importarProgreso(archivo) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const datos = JSON.parse(e.target.result);
      if (!datos || typeof datos !== "object") throw new Error("Archivo no válido");

      desbloqueados = new Set(datos.desbloqueados || []);
      favoritos = new Set(datos.favoritos || []);
      logrosAlcanzados = new Set(datos.logrosAlcanzados || []);

      guardarDesbloqueados();
      guardarFavoritos();
      guardarLogrosAlcanzados();
      actualizarProgreso();
      actualizarListaDesbloqueados();

      showAchievementToast("Progreso importado correctamente");
    } catch (err) {
      alert("El archivo no es válido o está dañado.");
      console.error("Error al importar progreso:", err);
    }
  };
  reader.readAsText(archivo);
}

// --- Resetear progreso ---
const resetProgressBtn = document.getElementById('resetProgressBtn');

function resetearProgreso() {
  if (!confirm("¿Seguro que quieres borrar todo tu progreso?\nSe eliminarán:\n✔ Códigos desbloqueados\n✔ Favoritos\n✔ Logros\n✔ Pistas usadas\n✔ Intentos fallidos\n✔ Tema oscuro\n\nEsto NO se puede deshacer.")) {
    return;
  }

  try {
    // Borrar almacenamiento local
    localStorage.removeItem("desbloqueados");
    localStorage.removeItem("favoritos");
    localStorage.removeItem("logrosAlcanzados");
    localStorage.removeItem("failedAttempts");
    localStorage.removeItem("ultimoCodigoPista");
    localStorage.removeItem("isMusicPlaying");
    localStorage.removeItem("theme");

    // Borrar variables en memoria
    desbloqueados = new Set();
    logrosAlcanzados = new Set();
    favoritos = new Set();
    failedAttempts = 0;

    // Resetear UI
    document.body.classList.remove("dark-mode");
    if (darkModeToggle) {
      darkModeToggle.innerHTML = '<i class="fas fa-moon"></i> Modo oscuro';
    }

    if (bgMusic) {
      bgMusic.pause();
      bgMusic.currentTime = 0;
    }
    if (musicToggleBtn) musicToggleBtn.classList.remove('playing');
    if (musicToggleIcon) {
      musicToggleIcon.classList.remove('fa-volume-up');
      musicToggleIcon.classList.add('fa-volume-mute');
    }

    if (contenidoDiv) contenidoDiv.hidden = true;

    actualizarProgreso();
    actualizarListaDesbloqueados();

    showAchievementToast("Todo el progreso ha sido restablecido.");
  } catch (e) {
    console.error("Error al resetear progreso:", e);
    alert("Hubo un problema al restablecer el progreso.");
  }

  cerrarMenu();
}

if (resetProgressBtn) {
  resetProgressBtn.addEventListener("click", resetearProgreso);
}

// Listeners
if (exportProgressBtn) {
  exportProgressBtn.addEventListener('click', () => {
    exportarProgreso();
    cerrarMenu(); // Cierra el menú después de exportar
  });
}

if (importProgressBtn && importProgressInput) {
  importProgressBtn.addEventListener('click', () => {
    importProgressInput.click();
    cerrarMenu(); // Cierra el menú después de abrir selector
  });

  importProgressInput.addEventListener('change', (e) => {
    const archivo = e.target.files[0];
    if (archivo) importarProgreso(archivo);
    e.target.value = ""; // limpia el input
  });
}

// Cerrar menú al hacer click fuera
document.addEventListener('click', (event) => {
  if (!menuButton || !dropdownMenu) return;
  if (!menuButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
    if (dropdownMenu.classList.contains('show')) {
      dropdownMenu.classList.remove('show');
      menuButton.setAttribute('aria-expanded', 'false');
      dropdownMenu.setAttribute('aria-hidden', 'true');
    }
  }
});

// Accesibilidad teclado en dropdown
if (dropdownMenu) {
  dropdownMenu.addEventListener('keydown', function(event) {
    const focusableElements = this.querySelectorAll('a, button');
    if (!focusableElements.length) return;
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];

    if (event.key === 'Escape') {
      dropdownMenu.classList.remove('show');
      menuButton.setAttribute('aria-expanded', 'false');
      dropdownMenu.setAttribute('aria-hidden', 'true');
      if (menuButton) menuButton.focus();
      event.preventDefault();
    } else if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (document.activeElement === firstFocusableElement) {
          lastFocusableElement.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusableElement) {
          firstFocusableElement.focus();
          event.preventDefault();
        }
      }
    }
  });
}

// Cerrar menú por función
function cerrarMenu() {
  if (dropdownMenu) dropdownMenu.classList.remove('show');
  if (menuButton) menuButton.setAttribute('aria-expanded', 'false');
  if (dropdownMenu) dropdownMenu.setAttribute('aria-hidden', 'true');
}

// Dark mode toggle (si existe)
(function initTheme() {
  const currentTheme = localStorage.getItem('theme');
  if (!darkModeToggle) return;
  if (currentTheme) {
    document.body.classList.add(currentTheme);
    if (currentTheme === 'dark-mode') {
      darkModeToggle.innerHTML = '<i class="fas fa-sun"></i> Modo Claro';
    } else {
      darkModeToggle.innerHTML = '<i class="fas fa-moon"></i> Modo Oscuro';
    }
  } else {
    darkModeToggle.innerHTML = '<i class="fas fa-moon"></i> Modo Oscuro';
  }

  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    let theme = 'light-mode';
    if (document.body.classList.contains('dark-mode')) {
      theme = 'dark-mode';
      darkModeToggle.innerHTML = '<i class="fas fa-sun"></i> Modo Claro';
    } else {
      darkModeToggle.innerHTML = '<i class="fas fa-moon"></i> Modo Oscuro';
    }
    localStorage.setItem('theme', theme);
  });
})();

// Inicialización al cargar DOM
document.addEventListener("DOMContentLoaded", () => {
  actualizarProgreso();
  actualizarListaDesbloqueados();
});

// Exponer funciones al scope (opcional para debugging)
window.mostrarContenido = mostrarContenido;
window.procesarCodigo = procesarCodigo;
window.cerrarModal = cerrarModal;

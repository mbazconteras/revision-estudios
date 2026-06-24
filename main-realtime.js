// Configuración de Firebase Realtime Database
const firebaseConfig = {
  apiKey: "AIzaSyBoJkBH9a4ErOR4dxH46TBMRlyqa60qBpY",
  authDomain: "planingtable.firebaseapp.com",
  databaseURL: "https://planingtable-default-rtdb.firebaseio.com",
  projectId: "planingtable",
  storageBucket: "planingtable.appspot.com",
  messagingSenderId: "798160298440",
  appId: "1:798160298440:web:4ce04d553eef9fb0b2e0fd"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function estadoBadge(estado) {
  const clases = {
    "Para Revisión": "badge revision",
    "Corregido": "badge corregido",
    "Liberado para impresión": "badge liberado",
    "Impreso": "badge impreso"
  };
  return clases[estado] || "badge";
}

function formatFecha(fechaISO) {
  if (!fechaISO) return "–";
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function prepararUrlDescarga(url) {
  if (!url) return "#";

  let enlace = String(url).trim();

  // Intenta forzar descarga en enlaces tipo OneDrive/SharePoint cuando es posible
  if (enlace.includes("onedrive") || enlace.includes("sharepoint") || enlace.includes("1drv.ms")) {
    if (enlace.includes("?")) {
      if (!enlace.includes("download=1")) enlace += "&download=1";
    } else {
      enlace += "?download=1";
    }
  }

  return enlace;
}

function esUrlValida(url) {
  return /^https?:\/\/.+/i.test(String(url || "").trim());
}

function copiarAlPortapapeles(texto) {
  const valor = String(texto || "").trim();

  if (!valor) {
    alert("No hay enlace para copiar.");
    return;
  }

  navigator.clipboard.writeText(valor)
    .then(() => alert("Enlace copiado."))
    .catch(() => alert("No se pudo copiar el enlace."));
}
function renderPanel(estudios, contenedorId, tipo) {
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML = "";

  estudios.forEach(({ id, data }) => {
    const div = document.createElement("div");
    div.className = `card ${tipo}`;

    const enlaceActual = data.enlace || "";
    const urlDescarga = prepararUrlDescarga(enlaceActual);

    div.innerHTML = `
      <div class="card-header">
        <div class="card-title">${data.nombre || "Sin nombre"}</div>
        <div class="${estadoBadge(data.estado)}">${data.estado || "Sin estado"}</div>
      </div>

      <div style="font-size: 12px; color: #666;">ID: ${data.idEstudio || "–"}</div>
      <div style="margin-top: 4px; font-size: 13px; color: #555;">Publicado por: ${data.encargado || "–"}</div>

      <div class="fechas-info">
        <p>📅 Sometido: ${formatFecha(data.fechaSometido)}</p>
        ${data.fechaLiberado ? `<p>✅ Liberado: ${formatFecha(data.fechaLiberado)}</p>` : ""}
        ${data.fechaImpreso ? `<p>🖨️ Impreso: ${formatFecha(data.fechaImpreso)}</p>` : ""}
      </div>

      <div class="documento-box">
        <div class="documento-titulo">Documento</div>

        <div class="documento-actions">
          <a class="btn-doc" href="${enlaceActual}" target="_blank" rel="noopener noreferrer">👁️ Ver</a>
          <a class="btn-doc" href="${urlDescarga}" target="_blank" rel="noopener noreferrer" download>⬇️ Descargar</a>
          ${tipo !== "impreso" ? `<button type="button" class="btn-doc btn-cambiar-enlace">✏️ Cambiar enlace</button>` : ""}
        </div>

        ${
          tipo !== "impreso"
            ? `
              <div class="editar-enlace-box hidden">
                <input type="url" class="input-enlace" value="${enlaceActual}" placeholder="Pega aquí el nuevo enlace del documento" />
                <div class="editar-enlace-actions">
                  <button type="button" class="btn-guardar-enlace">Guardar enlace</button>
                  <button type="button" class="btn-cancelar-enlace">Cancelar</button>
                </div>
              </div>
            `
            : ""
        }
      </div>

      <textarea rows="2" placeholder="Correcciones...">${data.correcciones || ""}</textarea>

      <div class="card-actions">
        <div>
          <select>
            <option ${data.estado === "Para Revisión" ? "selected" : ""}>Para Revisión</option>
            <option ${data.estado === "Corregido" ? "selected" : ""}>Corregido</option>
            <option ${data.estado === "Liberado para impresión" ? "selected" : ""}>Liberado para impresión</option>
            <option ${data.estado === "Impreso" ? "selected" : ""}>Impreso</option>
          </select>
          <button class="boton-actualizar">Actualizar</button>
        </div>
        <button class="boton-eliminar">Eliminar</button>
      </div>
    `;

    const textarea = div.querySelector("textarea");
    const btnActualizar = div.querySelector(".boton-actualizar");
    const btnEliminar = div.querySelector(".boton-eliminar");
    const btnCambiarEnlace = div.querySelector(".btn-cambiar-enlace");
    const editarEnlaceBox = div.querySelector(".editar-enlace-box");
    const inputEnlace = div.querySelector(".input-enlace");
    const btnGuardarEnlace = div.querySelector(".btn-guardar-enlace");
    const btnCancelarEnlace = div.querySelector(".btn-cancelar-enlace");

    if (tipo === "impreso") {
      div.querySelector(".card-actions").remove();
      textarea.setAttribute("readonly", "true");
      textarea.style.backgroundColor = "#f0f0f0";
    } else {
      btnCambiarEnlace.addEventListener("click", () => {
        editarEnlaceBox.classList.remove("hidden");
        inputEnlace.focus();
      });

      btnCancelarEnlace.addEventListener("click", () => {
        inputEnlace.value = data.enlace || "";
        editarEnlaceBox.classList.add("hidden");
      });

      btnGuardarEnlace.addEventListener("click", () => {
        const nuevoEnlace = inputEnlace.value.trim();

        if (!esUrlValida(nuevoEnlace)) {
          alert("El enlace debe iniciar con http:// o https://");
          return;
        }

        db.ref("estudios/" + id).update({
          enlace: nuevoEnlace
        }).then(() => {
          alert("Enlace actualizado.");
          mostrarEstudios();
        });
      });

      btnActualizar.addEventListener("click", () => {
        const nuevoEstado = div.querySelector("select").value;
        const nuevasCorrecciones = textarea.value;

        const actualizaciones = {
          estado: nuevoEstado,
          correcciones: nuevasCorrecciones
        };

        if (nuevoEstado === "Liberado para impresión" && !data.fechaLiberado) {
          actualizaciones.fechaLiberado = new Date().toISOString();
        }

        if (nuevoEstado === "Impreso" && !data.fechaImpreso) {
          actualizaciones.fechaImpreso = new Date().toISOString();
        }

        db.ref("estudios/" + id).update(actualizaciones).then(() => mostrarEstudios());
      });

      btnEliminar.addEventListener("click", () => {
        if (confirm(`¿Eliminar el estudio "${data.nombre}"?`)) {
          db.ref("estudios/" + id).remove().then(() => mostrarEstudios());
        }
      });
    }

    contenedor.appendChild(div);
  });
}

function mostrarEstudios() {
  db.ref("estudios").once("value", (snapshot) => {
    const pendientes = [], historial = [], impresos = [];

    snapshot.forEach(child => {
      const id = child.key;
      const data = child.val();
      if (data.estado === "Impreso") impresos.push({ id, data });
      else if (data.estado === "Liberado para impresión") historial.push({ id, data });
      else pendientes.push({ id, data });
    });

    pendientes.sort((a, b) => new Date(b.data.fechaSometido) - new Date(a.data.fechaSometido));
    historial.sort((a, b) => new Date(b.data.fechaLiberado) - new Date(a.data.fechaLiberado));
    impresos.sort((a, b) => new Date(b.data.fechaImpreso) - new Date(a.data.fechaImpreso));

    renderPanel(pendientes, "estudios-pendientes", "pendiente");
    renderPanel(historial, "historial-estudios", "historial");
    renderPanel(impresos, "impresos-estudios", "impreso");
  });
}

function mostrarSoloPanel(idPanel) {
  document.querySelectorAll("main > section").forEach(p => p.classList.add("hidden"));
  document.getElementById(idPanel).classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  mostrarEstudios();

  document.getElementById("form-nuevo-estudio").addEventListener("submit", function (e) {
    e.preventDefault();
    const idEstudio = document.getElementById("estudio-id").value.trim();
    const nombre = document.getElementById("nombre").value.trim();
    const enlace = document.getElementById("enlace").value.trim();
    const encargado = document.getElementById("encargado").value.trim();

    if (!/^[0-9]{13}$/.test(idEstudio)) {
      alert("El ID debe tener 13 dígitos numéricos.");
      return;
    }

    const nuevo = {
      idEstudio,
      nombre,
      enlace,
      encargado,
      estado: "Para Revisión",
      correcciones: "",
      fechaSometido: new Date().toISOString(),
      fechaLiberado: null,
      fechaImpreso: null
    };

    db.ref("estudios").push(nuevo).then(() => {
      this.reset();
      mostrarEstudios();
    });
  });

  document.getElementById("btnVerPendientes").addEventListener("click", () => mostrarSoloPanel("panel-pendientes"));
  document.getElementById("btnVerHistorial").addEventListener("click", () => mostrarSoloPanel("panel-historial"));
  document.getElementById("btnVerImpresos").addEventListener("click", () => mostrarSoloPanel("panel-impresos"));
  document.getElementById("btnVerPublicar").addEventListener("click", () => mostrarSoloPanel("seccion-formulario"));
  document.getElementById("btnVerBuscar").addEventListener("click", () => mostrarSoloPanel("busqueda-panel"));

  document.getElementById("btnBuscarID").addEventListener("click", () => {
    const inputID = document.getElementById("buscar-id").value.trim();
    const mensaje = document.getElementById("mensajeBusqueda");
    const contenedor = document.getElementById("historial-estudios");
    const panel = document.getElementById("panel-historial");

    if (!/^[0-9]{13}$/.test(inputID)) {
      mensaje.textContent = "Ingresa un ID válido de 13 dígitos.";
      contenedor.innerHTML = "";
      return;
    }

    db.ref("estudios").once("value", (snapshot) => {
      let encontrado = null;
      snapshot.forEach((child) => {
        const data = child.val();
        if (data.idEstudio === inputID) {
          encontrado = { id: child.key, data };
        }
      });

      contenedor.innerHTML = "";
      if (encontrado) {
        mensaje.textContent = "";
        mostrarSoloPanel("panel-historial");
        renderPanel([encontrado], "historial-estudios", "historial");
         document.getElementById("btnVerTodo").style.display = "inline-block";
      } else {
        mensaje.textContent = "No se encontró ningún estudio con ese ID.";
      }
    });
  });

  document.getElementById("btnVerTodo").addEventListener("click", () => {
    document.getElementById("buscar-id").value = "";
    document.getElementById("mensajeBusqueda").textContent = "";
    mostrarEstudios();
    mostrarSoloPanel("panel-historial");
  });
});

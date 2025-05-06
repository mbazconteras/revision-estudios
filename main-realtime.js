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
  if (estado === "Para Revisión") return "badge revision";
  if (estado === "Corregido") return "badge corregido";
  if (estado === "Liberado para impresión") return "badge liberado";
  return "badge";
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

function mostrarEstudios() {
  const pendientes = document.getElementById("estudios-pendientes");
  const historial = document.getElementById("historial-estudios");

  db.ref("estudios").once("value", (snapshot) => {
    pendientes.innerHTML = "";
    historial.innerHTML = "";

    const items = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, data: child.val() });
    });

    // Ordenamos por fechaLiberado (más nuevo primero)
    items.sort((a, b) => {
      const fa = a.data.fechaLiberado || "1970-01-01";
      const fb = b.data.fechaLiberado || "1970-01-01";
      return new Date(fb) - new Date(fa);
    });

    items.forEach(({ id, data }) => {
      const div = document.createElement("div");
      div.className = "card " + (data.estado === "Liberado para impresión" ? "historial" : "pendiente");

      div.innerHTML = `
        <div class="card-header">
          <div class="card-title">${data.nombre}</div>
          <div class="${estadoBadge(data.estado)}">${data.estado}</div>
        </div>
        <div><a href="${data.enlace}" target="_blank">Ver Estudio</a></div>
        <div style="font-size: 12px; color: #666;">ID: ${data.idEstudio || "–"}</div>
        <div style="margin-top: 4px; font-size: 13px; color: #555;">Publicado por: ${data.encargado}</div>
        <div class="fechas-info" style="margin-top: 8px; font-size: 13px; color: #444;">
          <p>📅 Sometido: ${formatFecha(data.fechaSometido)}</p>
          ${data.estado === "Liberado para impresión" && data.fechaLiberado
            ? `<p>✅ Liberado: ${formatFecha(data.fechaLiberado)}</p>` : ""}
        </div>
        <textarea rows="2" placeholder="Correcciones...">${data.correcciones || ""}</textarea>
        <div class="card-actions">
          <div>
            <select>
              <option ${data.estado === "Para Revisión" ? "selected" : ""}>Para Revisión</option>
              <option ${data.estado === "Corregido" ? "selected" : ""}>Corregido</option>
              <option ${data.estado === "Liberado para impresión" ? "selected" : ""}>Liberado para impresión</option>
            </select>
            <button class="boton-actualizar">Actualizar</button>
          </div>
          <button class="boton-eliminar">Eliminar</button>
        </div>
      `;

      const textarea = div.querySelector("textarea");
      const actions = div.querySelector(".card-actions");
      const btn = div.querySelector(".boton-actualizar");
      const botonEliminar = div.querySelector(".boton-eliminar");

      if (data.estado === "Liberado para impresión") {
        actions.remove();
        textarea.setAttribute("readonly", "true");
        textarea.style.backgroundColor = "#f0f0f0";
        historial.appendChild(div);
      } else {
        btn.addEventListener("click", () => {
          const nuevoEstado = div.querySelector("select").value;
          const nuevasCorrecciones = textarea.value;

          const actualizaciones = {
            estado: nuevoEstado,
            correcciones: nuevasCorrecciones
          };

          if (nuevoEstado === "Liberado para impresión" && !data.fechaLiberado) {
            actualizaciones.fechaLiberado = new Date().toISOString();
          }

          db.ref("estudios/" + id).update(actualizaciones).then(() => mostrarEstudios());
        });

        botonEliminar.addEventListener("click", () => {
          const confirmar = confirm(`¿Deseas eliminar el estudio "${data.nombre}"?`);
          if (confirmar) {
            db.ref("estudios/" + id).remove().then(() => mostrarEstudios());
          }
        });

        pendientes.appendChild(div);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // Agregar nuevo estudio
  document.getElementById("form-nuevo-estudio").addEventListener("submit", function (e) {
    e.preventDefault();

    const idEstudio = document.getElementById("estudio-id").value.trim();
    const nombre = document.getElementById("nombre").value.trim();
    const enlace = document.getElementById("enlace").value.trim();
    const encargado = document.getElementById("encargado").value.trim();

    if (idEstudio.length !== 13 || !/^\d{13}$/.test(idEstudio)) {
      alert("El ID del estudio debe tener exactamente 13 dígitos numéricos.");
      return;
    }

    if (nombre && enlace && encargado) {
      const nuevoEstudio = {
        idEstudio,
        nombre,
        enlace,
        encargado,
        estado: "Para Revisión",
        correcciones: "",
        fechaSometido: new Date().toISOString(),
        fechaLiberado: null
      };

      db.ref("estudios").push(nuevoEstudio, () => {
        document.getElementById("form-nuevo-estudio").reset();
        mostrarEstudios();
      });
    }
  });

  mostrarEstudios();

  // Búsqueda por ID
  document.getElementById("btnBuscarID").addEventListener("click", () => {
    const inputID = document.getElementById("buscar-id").value.trim();
    const mensaje = document.getElementById("mensajeBusqueda");
    const historial = document.getElementById("historial-estudios");
    const botonVerTodo = document.getElementById("btnVerTodo");

    if (inputID.length !== 13 || !/^\d{13}$/.test(inputID)) {
      mensaje.textContent = "Ingresa un ID válido de 13 dígitos.";
      historial.innerHTML = "";
      botonVerTodo.style.display = "none";
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

      historial.innerHTML = "";
      if (encontrado) {
        mensaje.textContent = "";
        const div = document.createElement("div");
        div.className = "card historial";
        div.innerHTML = `
          <div class="card-header">
            <div class="card-title">${encontrado.data.nombre}</div>
            <div class="${estadoBadge(encontrado.data.estado)}">${encontrado.data.estado}</div>
          </div>
          <div><a href="${encontrado.data.enlace}" target="_blank">Ver Estudio</a></div>
          <div style="font-size: 12px; color: #666;">ID: ${encontrado.data.idEstudio}</div>
          <div style="margin-top: 4px; font-size: 13px; color: #555;">Encargado: ${encontrado.data.encargado}</div>
          <div class="fechas-info" style="margin-top: 8px; font-size: 13px; color: #444;">
            <p>📅 Sometido: ${formatFecha(encontrado.data.fechaSometido)}</p>
            ${encontrado.data.fechaLiberado
              ? `<p>✅ Liberado: ${formatFecha(encontrado.data.fechaLiberado)}</p>` : ""}
          </div>
          <textarea rows="2" readonly style="background-color:#f0f0f0;">${encontrado.data.correcciones || ""}</textarea>
        `;
        historial.appendChild(div);
        document.getElementById("panel-historial").classList.remove("hidden");

        botonVerTodo.style.display = "inline-block";
      } else {
        mensaje.textContent = "No se encontró ningún estudio con ese ID.";
        botonVerTodo.style.display = "none";
      }
    });
  });

  // 🔁 Ver todo nuevamente
  document.getElementById("btnVerTodo").addEventListener("click", () => {
    document.getElementById("buscar-id").value = "";
    document.getElementById("mensajeBusqueda").textContent = "";
    document.getElementById("btnVerTodo").style.display = "none";
    mostrarEstudios();
  });
});

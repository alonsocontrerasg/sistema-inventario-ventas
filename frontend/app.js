const API_URL = "[https://sistema-inventario-ventas.vercel.app/api](https://sistema-inventario-ventas.vercel.app/api)"; // Cambiar por tu URL de Render al desplegar
let chartTopProductos = null;
let todosLosProductos = [];

document.addEventListener("DOMContentLoaded", () => {
    inicializarNavegacion();
    cargarDashboard();
    cargarProductos();
    cargarTopProductos();

    document.getElementById("form-producto").addEventListener("submit", crearProducto);
    document.getElementById("form-venta").addEventListener("submit", registrarVenta);
    document.getElementById("input-busqueda").addEventListener("input", filtrarProductos);
});

// 1. Lógica de cambio de Pestañas (Tabs)
function inicializarNavegacion() {
    const navButtons = document.querySelectorAll(".nav-link");
    const tabContents = document.querySelectorAll(".tab-content");
    const pageTitle = document.getElementById("page-title");

    const titulos = {
        "tab-dashboard": "Dashboard General",
        "tab-inventario": "Gestión de Inventario",
        "tab-ventas": "Punto de Venta"
    };

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");

            navButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            document.getElementById(targetTab).classList.add("active");
            pageTitle.textContent = titulos[targetTab];
        });
    });
}

// 2. Cargar KPIs Dashboard
async function cargarDashboard() {
    try {
        const res = await fetch(`${API_URL}/reportes/dashboard`);
        const data = await res.json();

        document.getElementById("kpi-ingresos").textContent = `$${data.ingresos_totales.toLocaleString()}`;
        document.getElementById("kpi-ganancia").textContent = `$${data.ganancia_neta.toLocaleString()}`;
        document.getElementById("kpi-ventas").textContent = data.total_transacciones;
        document.getElementById("kpi-stock-critico").textContent = data.productos_stock_critico;
    } catch (err) {
        console.error("Error al cargar dashboard:", err);
    }
}

// 3. Cargar y Guardar Lista de Productos
async function cargarProductos() {
    try {
        const res = await fetch(`${API_URL}/productos`);
        todosLosProductos = await res.json();
        renderizarTablaProductos(todosLosProductos);
        actualizarSelectVentas(todosLosProductos);
    } catch (err) {
        console.error("Error al cargar productos:", err);
    }
}

// Renderizar Tabla con filtro
function renderizarTablaProductos(productos) {
    const tbody = document.getElementById("tabla-productos");
    tbody.innerHTML = "";

    productos.forEach(p => {
        const esCritico = p.stock <= p.stock_minimo;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>#${p.id}</td>
            <td><strong>${p.nombre}</strong></td>
            <td>$${p.precio_compra.toLocaleString()}</td>
            <td>$${p.precio_venta.toLocaleString()}</td>
            <td>${p.stock} u.</td>
            <td>
                <span class="badge ${esCritico ? 'badge-critico' : 'badge-ok'}">
                    ${esCritico ? 'Stock Crítico' : 'OK'}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function actualizarSelectVentas(productos) {
    const select = document.getElementById("select-producto");
    select.innerHTML = '<option value="">-- Seleccionar Producto --</option>';
    productos.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = `${p.nombre} - $${p.precio_venta} (Stock: ${p.stock})`;
        select.appendChild(option);
    });
}

// Buscador en Tiempo Real
function filtrarProductos(e) {
    const texto = e.target.value.toLowerCase();
    const filtrados = todosLosProductos.filter(p => p.nombre.toLowerCase().includes(texto));
    renderizarTablaProductos(filtrados);
}

// 4. Crear Producto
async function crearProducto(e) {
    e.preventDefault();
    const mensajeDiv = document.getElementById("mensaje-producto");

    const payload = {
        nombre: document.getElementById("prod-nombre").value,
        precio_compra: parseFloat(document.getElementById("prod-costo").value),
        precio_venta: parseFloat(document.getElementById("prod-precio").value),
        stock: parseInt(document.getElementById("prod-stock").value),
        stock_minimo: parseInt(document.getElementById("prod-minimo").value)
    };

    try {
        const res = await fetch(`${API_URL}/productos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            mensajeDiv.className = "mensaje exito";
            mensajeDiv.textContent = "¡Producto creado con éxito!";
            document.getElementById("form-producto").reset();
            cargarProductos();
            cargarDashboard();
        } else {
            mensajeDiv.className = "mensaje error";
            mensajeDiv.textContent = "Error al guardar producto";
        }
    } catch (err) {
        mensajeDiv.className = "mensaje error";
        mensajeDiv.textContent = "Error de conexión";
    }
}

// 5. Registrar Venta
async function registrarVenta(e) {
    e.preventDefault();
    const mensajeDiv = document.getElementById("mensaje-venta");
    const productoId = parseInt(document.getElementById("select-producto").value);
    const cantidad = parseInt(document.getElementById("input-cantidad").value);

    try {
        const res = await fetch(`${API_URL}/ventas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: [{ producto_id: productoId, cantidad: cantidad }] })
        });

        const data = await res.json();
        if (res.ok) {
            mensajeDiv.className = "mensaje exito";
            mensajeDiv.textContent = `Venta #${data.venta_id} confirmada ($${data.total.toLocaleString()})`;
            document.getElementById("form-venta").reset();
            cargarProductos();
            cargarDashboard();
            cargarTopProductos();
        } else {
            mensajeDiv.className = "mensaje error";
            mensajeDiv.textContent = data.detail || "Error al procesar la venta";
        }
    } catch (err) {
        mensajeDiv.className = "mensaje error";
        mensajeDiv.textContent = "Error de conexión";
    }
}

// 6. Gráfico Chart.js
async function cargarTopProductos() {
    try {
        const res = await fetch(`${API_URL}/reportes/top-productos`);
        const data = await res.json();

        const labels = data.map(item => item.nombre);
        const valores = data.map(item => item.total_unidades);
        const ctx = document.getElementById("chart-top-productos").getContext("2d");

        if (chartTopProductos) chartTopProductos.destroy();

        chartTopProductos = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Unidades Vendidas",
                    data: valores,
                    backgroundColor: "#0f172a",
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: "#e2e8f0" } },
                    x: { grid: { display: false } }
                }
            }
        });
    } catch (err) {
        console.error("Error al cargar gráfico:", err);
    }
}
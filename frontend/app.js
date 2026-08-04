const API_URL = "http://127.0.0.1:8000/api";
let chartTopProductos = null;

document.addEventListener("DOMContentLoaded", () => {
    cargarDashboard();
    cargarProductos();
    cargarTopProductos();

    document.getElementById("form-venta").addEventListener("submit", registrarVenta);
    document.getElementById("form-producto").addEventListener("submit", crearProducto);
});

// 1. Cargar KPIs del Dashboard
async function cargarDashboard() {
    try {
        const res = await fetch(`${API_URL}/reportes/dashboard`);
        const data = await res.json();

        document.getElementById("kpi-ingresos").textContent = `$${data.ingresos_totales.toLocaleString()}`;
        document.getElementById("kpi-ganancia").textContent = `$${data.ganancia_neta.toLocaleString()}`;
        document.getElementById("kpi-ventas").textContent = data.total_transacciones;
        document.getElementById("kpi-stock-critico").textContent = `${data.productos_stock_critico} productos`;
    } catch (err) {
        console.error("Error al cargar el dashboard:", err);
    }
}

// 2. Cargar Lista de Productos en Tabla y Select
async function cargarProductos() {
    try {
        const res = await fetch(`${API_URL}/productos`);
        const productos = await res.json();

        const select = document.getElementById("select-producto");
        const tbody = document.getElementById("tabla-productos");

        select.innerHTML = '<option value="">-- Seleccionar Producto --</option>';
        tbody.innerHTML = "";

        productos.forEach(p => {
            // Opción en el select del formulario
            const option = document.createElement("option");
            option.value = p.id;
            option.textContent = `${p.nombre} - $${p.precio_venta} (Stock: ${p.stock})`;
            select.appendChild(option);

            // Fila en la tabla de inventario
            const esCritico = p.stock <= p.stock_minimo;
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>#${p.id}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>$${p.precio_compra.toLocaleString()}</td>
                <td>$${p.precio_venta.toLocaleString()}</td>
                <td>${p.stock} unidades</td>
                <td>
                    <span class="badge ${esCritico ? 'badge-critico' : 'badge-ok'}">
                        ${esCritico ? 'Stock Crítico' : 'Normal'}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error("Error al cargar productos:", err);
    }
}

// 3. Registrar Venta vía POST
async function registrarVenta(e) {
    e.preventDefault();

    const productoId = parseInt(document.getElementById("select-producto").value);
    const cantidad = parseInt(document.getElementById("input-cantidad").value);
    const mensajeDiv = document.getElementById("mensaje-venta");

    if (!productoId || cantidad <= 0) return;

    try {
        const res = await fetch(`${API_URL}/ventas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: [{ producto_id: productoId, cantidad: cantidad }]
            })
        });

        const data = await res.json();

        if (res.ok) {
            mensajeDiv.className = "mensaje exito";
            mensajeDiv.textContent = `¡Venta #${data.venta_id} realizada con éxito! Total: $${data.total.toLocaleString()}`;
            document.getElementById("form-venta").reset();
            
            // Recargar datos en tiempo real
            cargarDashboard();
            cargarProductos();
            cargarTopProductos();
        } else {
            mensajeDiv.className = "mensaje error";
            mensajeDiv.textContent = data.detail || "Error al procesar la venta";
        }
    } catch (err) {
        mensajeDiv.className = "mensaje error";
        mensajeDiv.textContent = "Error de conexión con el servidor";
    }
}

// 4. Renderizar Gráfico de Top Productos Vendidos
async function cargarTopProductos() {
    try {
        const res = await fetch(`${API_URL}/reportes/top-productos`);
        const data = await res.json();

        const labels = data.map(item => item.nombre);
        const valores = data.map(item => item.total_unidades);

        const ctx = document.getElementById("chart-top-productos").getContext("2d");

        if (chartTopProductos) {
            chartTopProductos.destroy(); // Destruir gráfico previo para actualizar
        }

        chartTopProductos = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Unidades Vendidas",
                    data: valores,
                    backgroundColor: "#2563eb",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    } catch (err) {
        console.error("Error al cargar gráfico:", err);
    }
}

// 5. Crear Nuevo Producto vía POST
async function crearProducto(e) {
    e.preventDefault();

    const nombre = document.getElementById("prod-nombre").value;
    const costo = parseFloat(document.getElementById("prod-costo").value);
    const precio = parseFloat(document.getElementById("prod-precio").value);
    const stock = parseInt(document.getElementById("prod-stock").value);
    const minimo = parseInt(document.getElementById("prod-minimo").value);
    const mensajeDiv = document.getElementById("mensaje-producto");

    try {
        const res = await fetch(`${API_URL}/productos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre: nombre,
                precio_compra: costo,
                precio_venta: precio,
                stock: stock,
                stock_minimo: minimo
            })
        });

        const data = await res.json();

        if (res.ok) {
            mensajeDiv.className = "mensaje exito";
            mensajeDiv.textContent = `¡Producto "${data.nombre}" creado exitosamente!`;
            document.getElementById("form-producto").reset();

            // Recargar la tabla y el select automáticamente
            cargarProductos();
            cargarDashboard();
        } else {
            mensajeDiv.className = "mensaje error";
            mensajeDiv.textContent = data.detail?.[0]?.msg || "Error al crear producto";
        }
    } catch (err) {
        mensajeDiv.className = "mensaje error";
        mensajeDiv.textContent = "Error de conexión con el servidor";
    }
}
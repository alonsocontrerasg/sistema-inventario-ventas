from fastapi import APIRouter
from app.database import get_db

router = APIRouter(prefix="/api/reportes", tags=["Reportes"])

@router.get("/dashboard")
def obtener_resumen_dashboard():
    """
    Entrega métricas clave (KPIs) para la toma de decisiones:
    - Total de ventas ($)
    - Ganancia Neta ($)
    - Total de transacciones
    - Productos con stock crítico
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Total Ingresos y N° de Ventas
    cursor.execute("SELECT COUNT(*) as total_ventas, COALESCE(SUM(total), 0) as ingresos_totales FROM ventas")
    resumen_ventas = cursor.fetchone()
    
    # 2. Cálculo de Costos y Ganancia Neta
    cursor.execute("""
        SELECT COALESCE(SUM(dv.cantidad * p.precio_compra), 0) as costo_total
        FROM detalle_ventas dv
        JOIN productos p ON dv.producto_id = p.id
    """)
    resumen_costos = cursor.fetchone()
    
    ingresos = resumen_ventas["ingresos_totales"]
    costos = resumen_costos["costo_total"]
    ganancia_neta = ingresos - costos
    
    # 3. Cantidad de productos con stock crítico
    cursor.execute("SELECT COUNT(*) as stock_critico_count FROM productos WHERE stock <= stock_minimo")
    stock_critico = cursor.fetchone()["stock_critico_count"]
    
    conn.close()
    
    return {
        "ingresos_totales": ingresos,
        "costo_total": costos,
        "ganancia_neta": ganancia_neta,
        "total_transacciones": resumen_ventas["total_ventas"],
        "productos_stock_critico": stock_critico
    }

@router.get("/top-productos")
def top_productos_mas_vendidos():
    """Retorna los 5 productos más vendidos agrupados por cantidad."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT p.nombre, SUM(dv.cantidad) as total_unidades
        FROM detalle_ventas dv
        JOIN productos p ON dv.producto_id = p.id
        GROUP BY p.id
        ORDER BY total_unidades DESC
        LIMIT 5
    """)
    filas = cursor.fetchall()
    conn.close()
    
    return [dict(f) for f in filas]

@router.get("/alertas-stock")
def alertas_stock_critico():
    """Retorna el listado de productos cuyo stock es menor o igual al mínimo."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, nombre, stock, stock_minimo FROM productos WHERE stock <= stock_minimo")
    filas = cursor.fetchall()
    conn.close()
    
    return [dict(f) for f in filas]
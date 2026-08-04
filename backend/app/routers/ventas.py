from fastapi import APIRouter, HTTPException
from typing import List
from app.database import get_db
from app.models import VentaCrear, VentaRespuesta

router = APIRouter(prefix="/api/ventas", tags=["Ventas"])

@router.get("", response_model=List[dict])
def listar_ventas():
    """Obtiene el historial de ventas registradas."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ventas ORDER BY fecha DESC")
    ventas = cursor.fetchall()
    conn.close()
    return [dict(v) for v in ventas]

@router.post("", status_code=201)
def registrar_venta(venta: VentaCrear):
    """
    Registra una nueva venta, calcula el total y descuenta el stock automáticamente.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    total_venta = 0.0
    items_procesados = []
    
    try:
        # 1. Validar stock y calcular total de cada producto
        for item in venta.items:
            cursor.execute("SELECT * FROM productos WHERE id = ?", (item.producto_id,))
            prod = cursor.fetchone()
            
            if not prod:
                raise HTTPException(status_code=404, detail=f"Producto con ID {item.producto_id} no encontrado")
            
            if prod["stock"] < item.cantidad:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Stock insuficiente para '{prod['nombre']}'. Disponible: {prod['stock']}, Solicitado: {item.cantidad}"
                )
            
            subtotal = prod["precio_venta"] * item.cantidad
            total_venta += subtotal
            items_procesados.append({
                "producto_id": item.producto_id,
                "cantidad": item.cantidad,
                "precio_unitario": prod["precio_venta"],
                "stock_actual": prod["stock"]
            })
            
        # 2. Registrar la Venta (Cabecera)
        cursor.execute("INSERT INTO ventas (total) VALUES (?)", (total_venta,))
        venta_id = cursor.lastrowid
        
        # 3. Registrar los Detalles y Actualizar el Stock
        for item in items_procesados:
            cursor.execute("""
                INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario)
                VALUES (?, ?, ?, ?)
            """, (venta_id, item["producto_id"], item["cantidad"], item["precio_unitario"]))
            
            nuevo_stock = item["stock_actual"] - item["cantidad"]
            cursor.execute("UPDATE productos SET stock = ? WHERE id = ?", (nuevo_stock, item["producto_id"]))
            
        conn.commit() # Confirmamos la transacción
        return {"mensaje": "Venta realizada con éxito", "venta_id": venta_id, "total": total_venta}

    except Exception as e:
        conn.rollback() # Si algo falla, revertimos cualquier cambio
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error al procesar la venta: {str(e)}")
    finally:
        conn.close()
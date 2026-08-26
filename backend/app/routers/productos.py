from fastapi import APIRouter, HTTPException
from typing import List
from app.database import get_db
from app.models import ProductoCrear, ProductoRespuesta
from pydantic import BaseModel, Field
router = APIRouter(prefix="/api/productos", tags=["Productos"])

@router.get("", response_model=List[ProductoRespuesta])
def listar_productos():
    """Obtiene el listado completo de productos en inventario."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM productos")
    filas = cursor.fetchall()
    conn.close()
    
    # Convertimos cada fila de SQLite a un diccionario para Pydantic
    return [dict(f) for f in filas]

@router.post("", response_model=ProductoRespuesta, status_code=201)
def crear_producto(producto: ProductoCrear):
    """Registra un nuevo producto en el sistema."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO productos (nombre, precio_compra, precio_venta, stock, stock_minimo)
        VALUES (?, ?, ?, ?, ?)
    """, (producto.nombre, producto.precio_compra, producto.precio_venta, producto.stock, producto.stock_minimo))
    
    conn.commit()
    nuevo_id = cursor.lastrowid
    conn.close()
    
    return {**producto.model_dump(), "id": nuevo_id}

class ReabastecerStock(BaseModel):
    cantidad: int = Field(..., gt=0, description="Cantidad de unidades a sumar")

@router.patch("/{producto_id}/reabastecer")
def reabastecer_stock(producto_id: int, datos: ReabastecerStock):
    """Suma unidades al stock actual de un producto existente."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT stock, nombre FROM productos WHERE id = ?", (producto_id,))
    prod = cursor.fetchone()
    
    if not prod:
        conn.close()
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    nuevo_stock = prod["stock"] + datos.cantidad
    cursor.execute("UPDATE productos SET stock = ? WHERE id = ?", (nuevo_stock, producto_id))
    conn.commit()
    conn.close()
    
    return {"mensaje": f"Stock de '{prod['nombre']}' actualizado", "nuevo_stock": nuevo_stock}
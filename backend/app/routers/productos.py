from fastapi import APIRouter, HTTPException
from typing import List
from app.database import get_db
from app.models import ProductoCrear, ProductoRespuesta

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
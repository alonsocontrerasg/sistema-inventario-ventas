from pydantic import BaseModel, Field
from typing import Optional, List

class ProductoBase(BaseModel):
    nombre: str = Field(..., min_length=1, description="Nombre del producto")
    precio_compra: float = Field(..., gt=0, description="Costo del producto (debe ser mayor a 0)")
    precio_venta: float = Field(..., gt=0, description="Precio de venta al público")
    stock: int = Field(..., ge=0, description="Cantidad disponible en inventario")
    stock_minimo: int = Field(default=5, ge=0, description="Umbral para alerta de stock crítico")

class ProductoCrear(ProductoBase):
    pass # Hereda todos los campos de ProductoBase para crear

class ProductoRespuesta(ProductoBase):
    id: int # Es igual a ProductoBase pero incluye el ID asignado por la BD

    class Config:
        from_attributes = True

# --- MODELOS PARA VENTAS ---

class ItemVentaCrear(BaseModel):
    producto_id: int = Field(..., gt=0, description="ID del producto a vender")
    cantidad: int = Field(..., gt=0, description="Cantidad a vender (debe ser mayor a 0)")

class VentaCrear(BaseModel):
    items: List[ItemVentaCrear] = Field(..., min_items=1, description="Lista de productos en la venta")

class ItemVentaRespuesta(BaseModel):
    producto_id: int
    cantidad: int
    precio_unitario: float

class VentaRespuesta(BaseModel):
    id: int
    fecha: str
    total: float
    items: List[ItemVentaRespuesta]

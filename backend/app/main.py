from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import productos, ventas, reportes

# Inicializamos la base de datos al arrancar
init_db()

app = FastAPI(
    title="SaaS Control de Inventario y Métricas API",
    description="Backend para gestión de stock, registro de ventas e informes financieros.",
    version="1.0.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluimos los módulos de rutas
app.include_router(productos.router)
app.include_router(ventas.router)
app.include_router(reportes.router)

@app.get("/")
def home():
    return {"status": "API activa", "docs": "/docs"}
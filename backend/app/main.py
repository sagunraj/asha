from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import auth, donations, donors, tax_receipts

app = FastAPI(title="Asha API", version="2.0.0", docs_url="/api/docs", redoc_url="/api/redoc")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(donors.router)
app.include_router(donations.router)
app.include_router(tax_receipts.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}

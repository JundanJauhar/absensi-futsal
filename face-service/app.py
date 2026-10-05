import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException, UploadFile, File

app = FastAPI(title="FTMS Face Service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, object]:
    return {"success": True, "data": {"service": "face-service", "status": "healthy", "model_loaded": False, "mode": "contract-only"}, "meta": {}}


def require_token(authorization: str | None) -> None:
    expected = os.getenv("FACE_SERVICE_TOKEN")
    if expected and authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Token layanan tidak valid."})


@app.post("/v1/enroll")
async def enroll(player_id: int, image: UploadFile = File(...), authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_token(authorization)
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail={"code": "INVALID_IMAGE", "message": "File harus berupa gambar."})
    return {"success": True, "data": {"player_id": player_id, "embedding_id": f"pending-{player_id}", "quality": "pending"}, "meta": {}}


@app.post("/v1/recognize")
async def recognize(image: UploadFile = File(...), authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_token(authorization)
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail={"code": "INVALID_IMAGE", "message": "File harus berupa gambar."})
    return {"success": True, "data": {"faces": [], "service_status": "ready"}, "meta": {"recognition": "not_configured"}}

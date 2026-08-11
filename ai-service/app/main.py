from io import BytesIO

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
from transformers import (
    AutoProcessor,
    CLIPVisionModelWithProjection,
)

app = FastAPI(
    title="FLOGRAM Computer Vision Service",
    version="1.0.0",
)

MODEL_NAME = "openai/clip-vit-base-patch32"

print("Loading CLIP vision model...")

processor = AutoProcessor.from_pretrained(
    MODEL_NAME
)

model = CLIPVisionModelWithProjection.from_pretrained(
    MODEL_NAME
)

model.eval()

print("CLIP vision model loaded successfully.")


@app.get("/")
def root():
    return {
        "success": True,
        "message": "FLOGRAM Computer Vision Service is running.",
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "service": "computer-vision",
        "status": "healthy",
        "model": MODEL_NAME,
    }


@app.post("/embed-image")
async def embed_image(
    image: UploadFile = File(...)
):
    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, and WEBP images are allowed.",
        )

    try:
        contents = await image.read()

        pil_image = Image.open(
            BytesIO(contents)
        ).convert("RGB")

        inputs = processor(
            images=pil_image,
            return_tensors="pt",
        )

        with torch.inference_mode():
            outputs = model(
                pixel_values=inputs["pixel_values"]
            )

        image_features = outputs.image_embeds

        image_features = (
            image_features
            / image_features.norm(
                p=2,
                dim=-1,
                keepdim=True,
            )
        )

        embedding = (
            image_features[0]
            .cpu()
            .tolist()
        )

        return {
            "success": True,
            "message": "Image embedding generated successfully.",
            "data": {
                "filename": image.filename,
                "model": MODEL_NAME,
                "dimensions": len(embedding),
                "embedding": embedding,
            },
        }

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to process image: {str(error)}",
        )
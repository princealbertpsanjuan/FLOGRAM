# FLOGRAM AI service (CLIP image embeddings)
# Runs on Hugging Face Spaces (Docker, free CPU) or any Docker host.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/.cache/huggingface \
    PORT=7860

RUN useradd -m -u 1000 user
WORKDIR /app

# CPU-only PyTorch keeps the image small (no CUDA).
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Download the CLIP model during the build so the first request is fast.
RUN python -c "from transformers import AutoProcessor, CLIPVisionModelWithProjection as M; n='openai/clip-vit-base-patch32'; AutoProcessor.from_pretrained(n); M.from_pretrained(n)" \
    && chown -R user:user /app

USER user

EXPOSE 7860
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]

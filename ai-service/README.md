---
title: FLOGRAM AI
emoji: 🌸
colorFrom: green
colorTo: pink
sdk: docker
app_port: 7860
pinned: false
---

# FLOGRAM AI service

FastAPI + CLIP (`openai/clip-vit-base-patch32`) used by the FLOGRAM server for
image search (customer uploads a photo → similar bouquets).

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Health check |
| `POST /embed-image` | Returns the normalized CLIP embedding of an uploaded image |
| `POST /compare-images` | Cosine similarity of two images |

## Run locally

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

## Deploy on Hugging Face Spaces (free)

1. Create a new Space → SDK **Docker** → Blank → Public.
2. Upload the contents of this folder (`Dockerfile`, `README.md`,
   `requirements.txt`, `app/`) to the Space root.
3. Wait for the build to finish, then open
   `https://<username>-<space-name>.hf.space/health`.
4. Put that base URL in the server's `AI_SERVICE_URL`.

import os
import google.generativeai as genai
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

# ── Gemini setup ──────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("Missing required environment variable: GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("models/gemini-2.5-flash")

EXTRACTION_PROMPT = (
    "Extract the full readable text from this PDF. "
    "Exclude footer text. "
    "Return clean plain text only."
)

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="Smart Study Buddy — AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/extract")
async def extract_text(file: UploadFile = File(...)):
    # 1. Validate mimetype
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # 2. Read bytes
    try:
        pdf_bytes = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read uploaded file")

    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # 3. Send to Gemini
    try:
        response = model.generate_content([
            {"mime_type": "application/pdf", "data": pdf_bytes},
            EXTRACTION_PROMPT,
        ])
        extracted_text = response.text
        extracted_text = " ".join(extracted_text.split())
    except Exception as e:
        return JSONResponse(
            status_code=502,
            content={"success": False, "message": f"Gemini error: {str(e)}"},
        )

    return {"success": True, "text": extracted_text}
import os
import fitz  # PyMuPDF
from groq import Groq
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

# ── Groq setup ────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("Missing required environment variable: GROQ_API_KEY")

groq_client = Groq(api_key=GROQ_API_KEY)

CLEANING_PROMPT = """You are an expert academic text processor.

You will receive raw text extracted from a lecture PDF slide. Your job is to:
1. Remove page numbers (standalone numbers like "1", "2", "13", etc.)
2. Remove footer text (e.g. "These slides are designed to accompany...", publisher names, author names, copyright lines)
3. Remove "Thank You" slides or filler content
4. Remove lone bullet symbols with no content (◼, •, ◦ alone on a line)
5. Fix broken sentences caused by slide formatting (join split lines that belong together)
6. Preserve ALL actual educational content — do not summarize, shorten, or remove any real information
7. Return the result as clean, flowing plain text with no bullet points, no slide titles formatting, just readable academic content

Return ONLY the cleaned text. No explanations, no comments, no markdown.
"""

# ── Chunking ──────────────────────────────────────────────────────────────────

def split_into_chunks(text: str, chunk_size: int = 3000) -> list[str]:
    """Split text into chunks by word count to stay under token limits."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks


def clean_with_groq(text: str) -> str:
    """Clean text using Groq, chunking if necessary."""
    chunks = split_into_chunks(text, chunk_size=3000)
    cleaned_chunks = []

    for chunk in chunks:
        try:
            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": CLEANING_PROMPT},
                    {"role": "user", "content": chunk},
                ],
                temperature=0.1,
                max_tokens=4000,
            )
            cleaned_chunks.append(response.choices[0].message.content.strip())
        except Exception as e:
            print(f"GROQ ERROR on chunk: {repr(e)}")
            cleaned_chunks.append(chunk)

    return " ".join(cleaned_chunks)


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

    # 3. Extract raw text using PyMuPDF
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        raw_text = ""
        for page in doc:
            raw_text += page.get_text()
        doc.close()

        if not raw_text.strip():
            raise HTTPException(status_code=422, detail="No text found in PDF")

    except HTTPException:
        raise
    except Exception as e:
        print(f"PDF EXTRACTION ERROR: {repr(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Failed to extract text: {str(e)}"},
        )

    # 4. Clean text using Groq (with chunking)
    cleaned_text = clean_with_groq(raw_text)

    return {"success": True, "text": cleaned_text}
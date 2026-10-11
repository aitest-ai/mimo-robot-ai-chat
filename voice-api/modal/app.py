"""Mimo voice inference (research prototype). Not production-validated on children's voices.

Deploy: modal secret create mimo-voice-secrets BACKEND_TOKEN=<random-long-value>
        modal deploy voice-api/modal/app.py
Returns: {text, emotion, language, event}.
No storage of student audio or transcript. The model cache volume contains MODEL FILES only.
"""
import hmac
import io
import os
import re
import subprocess
import threading

import modal

APP_NAME = "mimo-voice-sensevoice"
MODEL_ID = "iic/SenseVoiceSmall"
MAX_AUDIO_BYTES = 2_500_000
MAX_SECONDS = 12.5

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libsndfile1")
    .pip_install(
        "fastapi>=0.115,<1", "soundfile>=0.12,<1",
        "numpy>=1.24,<2", "funasr==1.4.14", "modelscope>=1.17,<2",
    )
)
app = modal.App(APP_NAME)
cache = modal.Volume.from_name("mimo-sensevoice-cache", create_if_missing=True)


def unpack_audio(blob: bytes):
    """Decode unknown tablet MediaRecorder audio in RAM; enforce max duration."""
    import numpy as np
    import soundfile as sf

    decoded = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin",
         "-i", "pipe:0", "-vn", "-ac", "1", "-ar", "16000",
         "-f", "wav", "pipe:1"],
        input=blob, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        timeout=20, check=True,
    ).stdout
    waveform, sample_rate = sf.read(io.BytesIO(decoded), dtype="float32")
    if sample_rate != 16000 or waveform.ndim != 1:
        raise ValueError("Invalid audio waveform")
    seconds = waveform.size / sample_rate
    if not (0.25 <= seconds <= MAX_SECONDS):
        raise ValueError("Record between 1 and 12 seconds")
    if not np.all(np.isfinite(waveform)):
        raise ValueError("Invalid audio samples")
    return waveform


def clean_prediction(raw: str):
    """Keep the checkpoint's separate tags and do not claim confidence values."""
    tags = re.findall(r"<\\|([A-Za-z_]+)\\|>", raw)
    all_tags = [x.upper() for x in tags]
    emotions = {"HAPPY", "SAD", "ANGRY", "NEUTRAL", "FEARFUL", "DISGUSTED", "SURPRISED"}
    events = {"SPEECH", "LAUGHTER", "CRY", "SNEEZE", "BREATH", "COUGH", "APPLAUSE", "BGM"}
    language = next((x.lower() for x in all_tags if x.lower() in {"zh", "en", "yue", "ja", "ko"}), "unknown")
    emotion = next((x for x in all_tags if x in emotions), "UNKNOWN")
    event = next((x for x in all_tags if x in events), "")
    text = re.sub(r"<\\|[^|]+\\|>", "", raw).strip()
    return {"text": text[:400], "emotion": emotion, "language": language, "event": event}


@app.function(
    image=image,
    volumes={"/root/.cache/modelscope": cache},
    secrets=[modal.Secret.from_name("mimo-voice-secrets")],
    cpu=4,
    memory=8192,
    timeout=120,
    scaledown_window=120,
    max_containers=2,
)
@modal.asgi_app()
def serve():
    from fastapi import FastAPI, HTTPException, Request
    from fastapi.responses import JSONResponse
    from funasr import AutoModel

    api = FastAPI(title="Mimo SenseVoice Private Inference", docs_url=None, redoc_url=None, openapi_url=None)
    model_lock = threading.Lock()
    model = None

    def infer(waveform):
        nonlocal model
        with model_lock:
            if model is None:
                model = AutoModel(
                    model=MODEL_ID,
                    trust_remote_code=True,
                    device="cpu",
                    disable_update=True,
                )
                # Persist model weights only; no student recordings.
                cache.commit()
            result = model.generate(
                input=waveform, fs=16000,
                language="zh", use_itn=True, batch_size=1,
            )
        if not result or not isinstance(result, list):
            raise ValueError("Missing transcription")
        return clean_prediction(str(result[0].get("text", "")))

    @api.post("/transcribe")
    async def transcribe(req: Request):
        bearer = req.headers.get("authorization", "")
        expected = os.getenv("BACKEND_TOKEN", "")
        if not expected or not hmac.compare_digest(bearer, "Bearer " + expected):
            raise HTTPException(status_code=401, detail="Unauthorized")
        mime = req.headers.get("content-type", "").split(";")[0].strip().lower()
        if mime not in {"audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/x-wav", "audio/mpeg"}:
            raise HTTPException(status_code=415, detail="Unsupported audio format")
        try:
            length = int(req.headers.get("content-length") or 0)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid audio length")
        if length > MAX_AUDIO_BYTES:
            raise HTTPException(status_code=413, detail="Audio too large")
        blob = bytearray()
        async for chunk in req.stream():
            blob.extend(chunk)
            if len(blob) > MAX_AUDIO_BYTES:
                raise HTTPException(status_code=413, detail="Audio too large")
        try:
            waveform = unpack_audio(bytes(blob))
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, ValueError, RuntimeError):
            raise HTTPException(status_code=422, detail="Unable to decode supported short audio")
        finally:
            # Only the temporary RAM buffer was used; no audio files were created.
            blob.clear()
        try:
            from starlette.concurrency import run_in_threadpool
            output = await run_in_threadpool(infer, waveform)
        except Exception:
            # Never log the student waveform or transcription.
            raise HTTPException(status_code=503, detail="Voice inference temporarily unavailable")
        return JSONResponse(output, headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})

    return api

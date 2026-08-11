import uvicorn
import json
import io
import asyncio
import re
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

from services.data_pipeline import get_feedback_column, build_feedback_by_question
from services.llm_analytics import analyze_feedback

ALLOWED_EXTENSIONS = {"csv", "xlsx", "xls"}


def _as_str_list(value):
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    return []


def _as_point_list(value):
    """Normalize heard_often / also_worth_noting into [{text, sentiment}, ...].

    Accepts legacy plain strings or objects with text/sentiment so older model
    replies still render.
    """
    if isinstance(value, str):
        text = value.strip()
        return [{"text": text, "sentiment": "positive"}] if text else []

    if not isinstance(value, list):
        return []

    points = []
    for item in value:
        if isinstance(item, str):
            text = item.strip()
            if text:
                points.append({"text": text, "sentiment": "positive"})
            continue
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        sentiment = item.get("sentiment")
        if sentiment not in ("positive", "negative"):
            sentiment = "positive"
        points.append({"text": text, "sentiment": sentiment})
    return points


def normalize_analysis_payload(payload):
    """Normalize model output into the shape the frontend renders:
    a handful of overall themes, plus one summary block per question."""
    if not isinstance(payload, dict):
        return {"top_themes": [], "questions": []}

    top_themes = _as_point_list(payload.get("top_themes"))

    raw_questions = payload.get("questions")
    if not isinstance(raw_questions, list):
        raw_questions = []

    questions = []
    for item in raw_questions:
        if not isinstance(item, dict):
            continue
        question_text = item.get("question")
        if not question_text:
            continue

        questions.append({
            "question": str(question_text),
            "summary": str(item.get("summary") or ""),
            "heard_often": _as_point_list(item.get("heard_often")),
            "also_worth_noting": _as_point_list(item.get("also_worth_noting")),
        })

    return {"top_themes": top_themes, "questions": questions}


# initialize app
app = FastAPI(
    title="Feedback Column Identifier API",
    description="API to identify and merge feedback columns from uploaded CSV files.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"message": "API is running successfully!"}

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):

    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV, XLSX, or XLS file.")

    try:
        contents = await file.read()
        if extension == "csv":
            df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    try:
        # ======================================================
        # call column parser and per-question grouping functions
        # ======================================================

        feedback_columns = get_feedback_column(df)
        feedback_by_question = build_feedback_by_question(df, feedback_columns)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process the file's feedback columns: {str(e)}")

    max_retries = 5

    for attempt in range(max_retries):

        # ======================================================
        # call LLM analytics function
        # ======================================================

        try:
            llm_analysis_results = analyze_feedback(feedback_by_question)
        except Exception as e:
            # CRITICAL FIX: Catch backend initialization errors properly
            raise HTTPException(status_code=500, detail=f"Server Configuration Error: {str(e)}")

        # ======================================================
        # Bulletproof Regex Extractor
        # ======================================================

        match = re.search(r'\{.*\}', llm_analysis_results, re.DOTALL)
        
        if match:
            clean_json_string = match.group(0)
        else:
            # If there are no curly braces at all, default to an empty JSON string
            clean_json_string = "{}" 
            print("WARNING: No JSON brackets found in the LLM response.")
            
        # ======================================================

        try:
            final_results_dict = json.loads(clean_json_string) 
            print("SUCCESSFULLY PARSED DICT:", final_results_dict)

        except json.JSONDecodeError:
            print(f"FAILED TO PARSE on attempt {attempt + 1} of {max_retries}:", clean_json_string)
            if attempt < max_retries - 1:
                await asyncio.sleep(1)
                continue
            raise HTTPException(status_code=500, detail="The LLM failed to return a valid JSON format.")

        if "error" in final_results_dict:
            error_message = final_results_dict["error"]
        
            if "429" in error_message:
                print(f"Server busy. Retrying attempt {attempt + 1} of {max_retries}...")
                await asyncio.sleep(5)
                continue
            else:
                # If it's a different error (like a bad API key), fail immediately
                raise HTTPException(status_code=502, detail=error_message)

        analysis_source = final_results_dict.get("analysis", final_results_dict)
        normalized_analysis = normalize_analysis_payload(analysis_source)

        # The model occasionally replies without valid JSON braces at all (caught above
        # as an empty "{}"). That doesn't look like an "error" so it wouldn't otherwise
        # be retried — but it's not usable either, so treat it as a failed attempt.
        if not normalized_analysis["questions"]:
            print(f"WARNING: Empty analysis on attempt {attempt + 1} of {max_retries}. Retrying...")
            continue

        return {
            "status": "success",
            "filename": file.filename,
            "rows_detected": len(df),
            "analysis": normalized_analysis
        }

    raise HTTPException(
        status_code=502,
        detail="The analysis engine did not return a usable result after multiple attempts. Please try again."
    )
    
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
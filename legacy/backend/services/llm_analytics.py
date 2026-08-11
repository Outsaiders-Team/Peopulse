import os
import json
from openai import OpenAI
from dotenv import load_dotenv, find_dotenv

# load API keys from env file
load_dotenv(find_dotenv())

# initialize OpenAI client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY")
)

def analyze_feedback(feedback_by_question: dict) -> str:
    """
    Analyzes the feedback data using a large language model (LLM) to extract a
    per-question summary (summary, heard often, also worth noting) plus overall
    top themes.

    Parameters:
    feedback_by_question: { question_text: [list of response strings] }
    """

    # ======================================================
    # 1. Prepare the feedback data for LLM analysis
    # ======================================================

    sections = []
    for question, responses in feedback_by_question.items():
        joined_responses = " | ".join(responses)
        sections.append(f"Question: {question}\nResponses: {joined_responses}")
    feedback_string = "\n\n".join(sections)
    
    # ======================================================
    # 2. Locate the prompt file
    # ======================================================

    current_dir = os.path.dirname(__file__)
    prompt_file_path = os.path.join(current_dir, "prompts", "llm_prompt.md")

    # ======================================================
    # 3. Load prompt file
    # ======================================================

    try:
        with open(prompt_file_path, "r", encoding="utf-8") as file:
            system_prompt = file.read()
    except FileNotFoundError:
        # CRITICAL FIX: Raise the exception so it doesn't get passed to the regex parser
        raise FileNotFoundError(f"Prompt file not found at path: {prompt_file_path}")
    
    # ======================================================
    # 4. API call to the LLM
    # ======================================================

    try:
        # Speed pick for MVP demos: ling-3.0-flash (free) — noticeably faster
        # on OpenRouter's free queue than Gemma / gpt-oss in our testing.
        # Keep max_tokens high; ling previously truncated mid-JSON at 1500.
        # Note: ling has no response_format / structured_outputs — rely on the
        # prompt + regex JSON extractor in main.py.
        #
        # Prefer for free-tier accuracy (esp. Tagalog/Taglish + themes):
        #   model="google/gemma-4-26b-a4b-it:free"
        #   + response_format={"type": "json_object"}
        response = client.chat.completions.create(
            model="inclusionai/ling-3.0-flash:free",
            max_tokens=4096,
            temperature=0.3,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here is the raw citizen feedback, grouped by question:\n\n{feedback_string}"}
            ]
        )

        return response.choices[0].message.content

    except Exception as e:
        error_dict = {"error": f"(llm_analytics.py) API connection failed: {str(e)}"}
        return json.dumps(error_dict)
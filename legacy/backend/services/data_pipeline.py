import pandas as pd
import ast

def get_feedback_column(df) -> list:
    """
    Automatically identifies the most likely 'feedback' column(s) in an input file (CSV).
    
    Parameters:
    df: The messy dataset in DataFrame format.
    
    Returns:
    list: The list of name of columns that reached the scoring threshold.
    """

    feedback_cols = []

    # target keywords for the column name
    keywords = ["feedback", "comment", "remark", "suggestion", "description", "message"]

    # drop numerical columns because they're unneccesary
    text_cols = df.select_dtypes(include=["object", "string"]).columns

    for col in text_cols:
        score = 0

        # Sample up to 100 random rows to keep it fast
        sample = df[col].dropna().astype(str).sample(min(100, len(df[col].dropna())))

        # filter 1: Metadata Scoring
        col_lower = col.lower()
        if any(keyword in col_lower for keyword in keywords):
            score += 50  # Huge bonus for obvious names
        
        # filter 2: Statistical Scoring ---
        # A. Average String Length (Feedback is usually > 30 chars)
        avg_len = sample.str.len().mean()
        if avg_len > 30:
            score += 20
        elif avg_len < 15:
            score -= 20 # Penalize likely names/IDs
            
        # B. Cardinality / Uniqueness (Feedback is highly unique)
        uniqueness_ratio = sample.nunique() / len(sample)
        if uniqueness_ratio > 0.9:
            score += 20
        elif uniqueness_ratio < 0.2:
            score -= 30 # Penalize categorical data (e.g., "Male/Female", "Barangay")
            
        # C. Word Count / Spaces (Feedback has sentence structure)
        avg_spaces = sample.str.count(' ').mean()
        if avg_spaces > 5:
            score += 10
            
        # --- Keep track of the winner ---
        if score >= 40:
            feedback_cols.append(col)

    return feedback_cols

def build_feedback_by_question(orig_df, feedback_cols) -> dict:
    """
    Groups responses by question (one identified feedback column = one question),
    instead of flattening everything into a single blob. This preserves the
    per-question structure the frontend renders (summary, heard often, also
    worth noting for EACH question).

    Parameters:
    orig_df: The original DataFrame containing the identified feedback columns.
    feedback_cols: List of identified feedback column names.

    Returns:
    dict: { question_column_name: [list of non-empty response strings] }
    """

    if isinstance(feedback_cols, str):
        feedback_cols = ast.literal_eval(feedback_cols)

    if not feedback_cols:
        raise ValueError("No feedback columns identified to analyze.")

    blank_values = {"", "n/a", "na", "none", "nil"}
    by_question = {}

    for col in feedback_cols:
        responses = orig_df[col].dropna().astype(str).str.strip()
        responses = [r for r in responses if r.lower() not in blank_values]
        if responses:
            by_question[str(col)] = responses

    if not by_question:
        raise ValueError("Feedback columns were found, but all responses were empty.")

    return by_question


def merge_feedback_columns(orig_df, feedback_cols) -> pd.DataFrame:
    """
    Merges multiple identified feedback columns into a single column.
    
    Parameters:
    orig_df: The original DataFrame containing the identified feedback columns.
    feedback_cols: List of identified feedback column names.
    
    Returns:
    DataFrame: The DataFrame with an added 'Merged Feedback' column.
    """

    if isinstance(feedback_cols, str):
        feedback_cols = ast.literal_eval(feedback_cols)  # Convert string representation of list back to list

    if not feedback_cols:
        raise ValueError("No feedback columns identified to merge.")

    # create a new DataFrame with only the merged feeback columns
    new_df = pd.DataFrame()
    
    # Create a new column by concatenating the identified feedback columns
    new_df['Merged Feedback'] = orig_df[feedback_cols].apply(lambda row: ' | '.join(row.dropna().astype(str)), axis=1)
    
    return new_df
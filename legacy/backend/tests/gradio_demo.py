"""
Gradio UI to smoke-test feedback column identification and merging.

Run from the backend directory:
  cd backend && python -m tests.gradio_demo

Or:
  cd backend && python tests/gradio_demo.py
"""

import gradio as gr
from services.data_pipeline import get_feedback_column, merge_feedback_columns

with gr.Blocks() as demo:
    gr.Markdown("## Feedback Column Identifier")
    with gr.Row():
        with gr.Column():
            csv_input = gr.File(label="Upload your CSV file")
        with gr.Column():
            analyze_button = gr.Button("Analyze Button")

    with gr.Row():
        with gr.Column(scale=2):
            columns_output = gr.Textbox(label="Identified Feedback Column", lines=1)
        with gr.Column(scale=3):
            df_output = gr.DataFrame(label="Merged Feedback DataFrame", headers=["Merged Feedback"])

    analyze_button.click(
        fn=get_feedback_column,
        inputs=csv_input,
        outputs=[columns_output],
    ).then(
        fn=merge_feedback_columns,
        inputs=[csv_input, columns_output],
        outputs=[df_output],
    )

if __name__ == "__main__":
    demo.launch()

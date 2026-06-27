import os
import fitz # PyMuPDF
from pathlib import Path

source_dir = r"C:\Users\soura\Working_Folder\resume history"
dest_dir = r"c:\Users\soura\antigravity_project\ask-sourabh\data\resume_history"

os.makedirs(dest_dir, exist_ok=True)

for file in os.listdir(source_dir):
    if file.lower().endswith(".pdf"):
        pdf_path = os.path.join(source_dir, file)
        md_path = os.path.join(dest_dir, file.replace(".pdf", ".md"))
        
        try:
            doc = fitz.open(pdf_path)
            text = ""
            for page in doc:
                text += page.get_text()
                
            with open(md_path, "w", encoding="utf-8") as f:
                f.write(f"# {file.replace('.pdf', '')}\n\n")
                f.write(text)
            print(f"Extracted {file}")
        except Exception as e:
            print(f"Failed to extract {file}: {e}")

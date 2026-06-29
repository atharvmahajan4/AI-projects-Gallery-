# ResumeGenius AI

An AI-powered resume analysis dashboard. Upload a resume (or paste the text)
and get back an ATS score, a summary, your strengths and weaknesses, missing
skills, prioritized improvement suggestions, and likely interview questions —
all in one clean dashboard.

![Dashboard](screenshots/dashboard.png)
<!-- Replace the line above with a real screenshot once you've run the app. -->

## Features

- **ATS Score (0–100)** — how well an Applicant Tracking System would parse and rank the resume
- **Resume Summary** — a short, neutral overview of the candidate
- **Missing Skills** — relevant skills the resume doesn't mention
- **Strengths & Weaknesses** — specific, resume-grounded observations
- **Improvement Suggestions** — a prioritized, actionable checklist
- **Interview Questions** — questions a recruiter would likely ask based on this exact resume
- Drag-and-drop PDF/DOCX upload, or paste text directly
- Optional target role for more relevant skill-gap and question suggestions
- Exportable `.txt` report
- Local analysis history (stored in your browser, not on a server)

## Tech stack

- **Backend:** Python (Flask), `pdfplumber` + `python-docx` for text extraction, Google's Gemini API for the analysis
- **Frontend:** Plain HTML, CSS, and JavaScript — no framework, no build step

## 1. Install

Requires Python 3.10+.

```bash
cd resume-analyzer
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Add your Gemini API key

Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey).

```bash
cp .env.example .env
```

Open `.env` and paste your key in:

```
GEMINI_API_KEY=your-key-here
```

The free tier is generous enough for personal/portfolio use, but it does have
real limits — both a per-minute and a per-day request cap. If you hit one,
the app's error message will say which (look for "PerMinute" vs "PerDay");
waiting ~60 seconds only helps with the per-minute one.

> **Note on key restrictions:** Google now requires Gemini API keys to have
> at least one restriction set (e.g. "Restrict to Gemini API"). If you get an
> auth error, open your key in AI Studio and add a restriction.

## 3. Run it

```bash
python app.py
```

Open **http://localhost:5000** in your browser.

## Screenshots

| Landing page | Upload | Results dashboard |
|---|---|---|
| ![Hero](screenshots/hero.png) | ![Upload](screenshots/upload.png) | ![Dashboard](screenshots/dashboard.png) |

<!-- Add your own screenshots to the screenshots/ folder and update the paths above. -->

## Project layout

```
resume-analyzer/
├── app.py              # Flask backend: routes, file parsing, Gemini API call
├── requirements.txt
├── .env.example
├── screenshots/         # put your README screenshots here
├── templates/
│   └── index.html      # page structure
└── static/
    ├── style.css        # all visual design (blue/white theme)
    └── app.js           # upload handling, rendering, history, loading state
```

## How it works

1. `templates/index.html` + `static/app.js` render the upload form and send
   a `FormData` request to `POST /api/analyze` when you click **Analyze resume**.
2. In `app.py`, `extract_text()` pulls plain text out of the uploaded PDF
   (`pdfplumber`) or DOCX (`python-docx`) — or uses the pasted text if you
   typed/edited it instead.
3. `call_gemini()` sends that text, plus your optional target role, to the
   Gemini API with a system prompt that requests a strict JSON report (see
   `SYSTEM_PROMPT` in `app.py`). Gemini's `responseMimeType: "application/json"`
   setting keeps the output clean and parseable.
4. The JSON comes back to the frontend, and `app.js` fills in the score ring
   and dashboard cards. Past analyses are kept in your browser's
   `localStorage` — nothing is stored server-side.

## Customizing

- **Model:** change `GEMINI_MODEL` in `.env`.
- **Report fields:** edit the JSON schema in `SYSTEM_PROMPT` inside `app.py`,
  then update `static/app.js`'s `renderReport()` to match.
- **Look:** every color/font is a CSS variable at the top of `static/style.css`.

## Limitations

- No login/accounts — this is a single-user local tool.
- History is per-browser (`localStorage`), not a shared database.
- Very long resumes are truncated to ~18,000 characters before being sent.
- If text extraction fails on a scanned/image-only PDF, paste the resume text
  into the textarea instead.

## License

Personal portfolio project — use and adapt freely.

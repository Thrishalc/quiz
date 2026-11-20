# The Curious Quiz

A small, responsive multiple-choice quiz with timed questions, instant answer feedback, and a final score/review screen.

## Run locally

The app loads its question pool from `questions.json`, so serve the project over HTTP rather than opening `index.html` directly. For example, with Python installed:

```sh
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Customize the quiz

The quiz randomly selects six questions from `questions.json` each time you start or retry. Each question needs a `question`, four answer fields (`A` through `D`), and an `answer` containing the correct letter. The app converts those fields for the quiz; questions without a category use “General Knowledge.” You can optionally provide a category and explanation. The quiz checks the data when it loads and reports an error if it is invalid.

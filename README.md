# The Curious Quiz

A small, responsive multiple-choice quiz with timed questions, instant answer feedback, and a final score/review screen.

## Run locally

The app loads its question set from `questions.json`, so serve the project over HTTP rather than opening `index.html` directly. For example, with Python installed:

```sh
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Customize the quiz

Edit `questions.json` to change the timer or questions. Each question needs a `category`, `question`, an `options` array, an `answer` index (zero-based), and an `explanation`. The quiz checks this structure when it loads and reports an error if it is invalid.
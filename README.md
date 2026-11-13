# language-learning-visualization

Word Map helps English speakers learning another language see how similar words differ. Choose a language, search an English word, pick the meaning you intend, and explore the words for it on a map of formality and emotion.

## Getting started

You need [Node.js](https://nodejs.org) version 20.19+ or 22.12+, and an [Anthropic API key](https://platform.claude.com/settings/keys).

The app is in the `language-visualization` folder. To install its dependencies and create your settings file, run:

```bash
cd language-visualization
npm install
cp .env.example .env
```

Add your API key to `.env`. Git ignores this file, so don't commit the key or share it anywhere else.

Then start the app:

```bash
npm run dev
```

This starts the web app and the API server together. Open the local URL shown in the terminal, usually http://localhost:5173. The page updates when you save a file.

## Other commands

Run these from the `language-visualization` folder:

| Command           | What it does                                                      |
| ----------------- | ----------------------------------------------------------------- |
| `npm run build`   | Type-checks and builds the app into `dist/`                       |
| `npm run preview` | Serves the production build locally                               |
| `npm run server`  | Runs only the API server, which `preview` needs for word lookups  |
| `npm run lint`    | Runs the linter (Oxlint)                                          |

See the [app README](language-visualization/README.md) for how the code is organized.

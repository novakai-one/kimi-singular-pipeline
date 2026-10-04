// Where the notebooks live on GitHub. Change BRANCH in one place if needed.
export const REPO = 'novakai-one/claude-ai-demo';
export const BRANCH = 'main';

export const colabUrl = (path: string) =>
  `https://colab.research.google.com/github/${REPO}/blob/${BRANCH}/${path}`;
export const githubUrl = (path: string) => `https://github.com/${REPO}/blob/${BRANCH}/${path}`;

/** Relative path from the current page to the site root ("./" or "../"). */
export const ROOT: string =
  document.querySelector('meta[name="afe-root"]')?.getAttribute('content') ?? './';
export const url = (path: string) => ROOT + path;

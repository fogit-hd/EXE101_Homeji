# Issue tracker: GitHub

Issues and PRDs for this repository live in [fogit-hd/EXE101_Homeji](https://github.com/fogit-hd/EXE101_Homeji/issues). Use the `gh` CLI from this clone, or pass `--repo fogit-hd/EXE101_Homeji` explicitly.

## Conventions

- Create: `gh issue create --repo fogit-hd/EXE101_Homeji --title "..." --body-file <file>`.
- Read: `gh issue view <number> --repo fogit-hd/EXE101_Homeji --comments`.
- List: `gh issue list --repo fogit-hd/EXE101_Homeji --state open --json number,title,body,labels`. Read comments for issues being evaluated.
- Comment: `gh issue comment <number> --repo fogit-hd/EXE101_Homeji --body-file <file>`.
- Apply or remove labels: `gh issue edit <number> --repo fogit-hd/EXE101_Homeji --add-label <label>` or `--remove-label <label>`.
- Close: `gh issue close <number> --repo fogit-hd/EXE101_Homeji` after documenting the resolution.

For multiline bodies, write UTF-8 text to a temporary file and use `--body-file`. Check CLI authentication and existing labels before remote writes; do not claim a remote change succeeded without verifying it.

When a skill says "publish to the issue tracker", create a GitHub issue. When it says "fetch the relevant ticket", read the issue and its comments.

## Pull requests as a triage surface

**PRs as a request surface: no.** Only issues enter the triage queue. Keep external PRs and collaborators' development PRs outside that queue.

GitHub shares issue and PR numbers. Confirm a referenced number is an issue before applying issue triage.

## Repository scope

Frontend work belongs in this repository; backend work belongs in `thanhduykx/Homeji_BE`. For a change spanning both, create linked issues in the respective repositories and record dependencies explicitly.


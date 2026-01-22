---
description: How to release a new version of the App (Bump Version & Tag)
---

# Release Process

Follow this workflow to release a new version of the Prompt Squad app.

## 1. Determine the New Version
Decide on the new version number based on **Semantic Versioning**:
- **MAJOR** (e.g., `1.0.0` -> `2.0.0`): Breaking changes.
- **MINOR** (e.g., `1.0.0` -> `1.1.0`): New features (backward compatible).
- **PATCH** (e.g., `1.0.0` -> `1.0.1`): Bug fixes.

## 2. Run the Version Bump Script
We have a script to automate updating `app.json`.

```bash
# Usage: node scripts/bump-version.js <major|minor|patch>
node scripts/bump-version.js patch
```

This script will:
1.  Increment `expo.version` in `app.json`.
2.  Increment `expo.android.versionCode`.
3.  Update `expo.ios.buildNumber`.
4.  Git commit the change: `chore: release v1.0.1`.
5.  Git tag the commit: `v1.0.1`.

## 3. Push to Remote
Push the commits and tags to the repository.

```bash
git push && git push --tags
```

## 4. (Optional) Generate Release Notes
Review the commits since the last tag to generate release notes.

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

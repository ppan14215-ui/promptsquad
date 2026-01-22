const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APP_JSON_PATH = path.join(__dirname, '../app.json');
const type = process.argv[2];

if (!['major', 'minor', 'patch'].includes(type)) {
    console.error('Usage: node scripts/bump-version.js <major|minor|patch>');
    process.exit(1);
}

// Read app.json
const appJsonRaw = fs.readFileSync(APP_JSON_PATH, 'utf8');
const appJson = JSON.parse(appJsonRaw);

// Current version
const currentVersion = appJson.expo.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

let newVersion;
if (type === 'major') newVersion = `${major + 1}.0.0`;
if (type === 'minor') newVersion = `${major}.${minor + 1}.0`;
if (type === 'patch') newVersion = `${major}.${minor}.${patch + 1}`;

console.log(`Bumping version: ${currentVersion} -> ${newVersion}`);

// Update version
appJson.expo.version = newVersion;

// Update Android Version Code (Increment)
const currentVersionCode = appJson.expo.android.versionCode || 1;
appJson.expo.android.versionCode = currentVersionCode + 1;

// Update iOS Build Number (Use version string or increment logic)
// For simplicity, we sync it with android version code or use the version string.
// Let's use the version string for iOS build number as it is often preferred to match.
// OR purely incremental. Let's stick to version string for now to match `version`.
appJson.expo.ios.buildNumber = newVersion;

// Write back to app.json
fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n');

try {
    // Stage app.json
    execSync(`git add "${APP_JSON_PATH}"`);

    // Commit
    const commitMsg = `chore: release v${newVersion}`;
    execSync(`git commit -m "${commitMsg}"`);

    // Tag
    execSync(`git tag v${newVersion}`);

    console.log(`Successfully bumped to ${newVersion}, committed, and tagged.`);
} catch (error) {
    console.error('Error during git operations:', error.message);
    console.log('Changes to app.json were saved. Please commit manually.');
}

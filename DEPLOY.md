# Deploy Guide

## Quick Deploy

```bash
# Patch version (1.0.7 → 1.0.8)
./deploy.sh

# Minor version (1.0.7 → 1.1.0)
./deploy.sh minor

# Major version (1.0.7 → 2.0.0)
./deploy.sh major
```

## What the script does

1. ✅ Checks for uncommitted changes
2. ✅ Bumps version in `package.json`
3. ✅ Updates version in all documentation
4. ✅ Creates git commit
5. ✅ Creates git tag (e.g., `v1.0.8`)
6. ✅ Pushes to GitHub (main branch + tags)
7. ✅ Publishes to npm

## Codex plugin pin

`plugins/zalo/mcp.json` runs `npx -y https://codeload.github.com/hiro-pna/zalo-connector/tar.gz/<commit-sha> stdio`
(a tarball URL: immutable, and no git needed on the user's machine; `github:…#<sha>` fails in npm 10 with `GitFetcher requires an Arborist constructor`).
After changing code:

1. Commit and push the code change.
2. Set the SHA in `plugins/zalo/mcp.json` to that commit.
3. Bump `version` in `plugins/zalo/plugin.json` (Codex caches plugins by version).
4. Commit and push; users re-run `npx -y github:hiro-pna/zalo-connector setup`.

## Before deploying

Make sure:
- [ ] All changes are committed
- [ ] Tests pass (if any)
- [ ] Documentation is up to date
- [ ] Logged into npm (`npm whoami`)
- [ ] Logged into git (`git remote -v`)

## Version bump rules

- **Patch** (default): Bug fixes, doc updates, minor changes
  - Example: 1.0.7 → 1.0.8
- **Minor**: New features (backward compatible)
  - Example: 1.0.7 → 1.1.0
- **Major**: Breaking changes
  - Example: 1.0.7 → 2.0.0

## Manual deploy (if script fails)

```bash
# 1. Bump version
npm version patch  # or minor, major

# 2. Update docs manually
# Edit version numbers in README.md, QUICK-REFERENCE.vi.md

# 3. Commit
git add .
git commit -m "Release vX.X.X"

# 4. Tag
git tag -a vX.X.X -m "Release vX.X.X"

# 5. Push
git push origin main
git push origin --tags

# 6. Publish
npm publish
```

## Verify deployment

```bash
# Check npm
npm view zalo-personal version
npm info zalo-personal

# Check GitHub
git log --oneline -5
git tag | tail -5
```

## Rollback (if needed)

```bash
# Unpublish from npm (within 72 hours)
npm unpublish zalo-personal@X.X.X

# Delete git tag
git tag -d vX.X.X
git push origin :refs/tags/vX.X.X

# Revert commit
git reset --hard HEAD~1
git push -f origin main  # ⚠️ Use with caution
```

## Notes

- The `deploy.sh` script is NOT published to npm (in `.npmignore`)
- Always use the script for consistency
- Script ensures GitHub and npm are always in sync

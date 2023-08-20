###
# Bump the extension version.
#
# Usage:
#   ./scripts/bump_extension_version.sh 2023.33.0-dev 2023.34.0
###

set -euxo pipefail

FROM=$1
TO=$2

# Create a branch.
git checkout -B v$TO main

# Update the version in-place.
rg $FROM --files-with-matches | xargs sed -i "" "s/$FROM/$TO/g"

# Re-lock dependencies.
rm requirements.txt
rm requirements-dev.txt
pip-compile --generate-hashes --resolver=backtracking -o ./requirements.txt ./pyproject.toml
pip-compile --generate-hashes --resolver=backtracking --upgrade --extra dev -o ./requirements-dev.txt ./pyproject.toml
npm install --package-lock-only

# Commit the change.
git commit -am "Bump extension version to $TO"

# Push.
git push origin HEAD

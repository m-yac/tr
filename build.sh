#!/bin/bash

# Download jquery
curl -o jquery.min.js https://code.jquery.com/jquery-3.6.0.min.js

# Clear out the `dist` directory
rm -rf dist
mkdir dist

# Build
node ./src/main.js

# Move the source files
cp *.js dist
cp *.html dist
cp *.css dist
cp *.ttf dist
cp favicons/* dist
cp .nojekyll dist

#!/bin/sh
# newfilm.sh <folder name> "<Title>": a new film folder in the films folder, from the template + the shared engine
E="$(cd "$(dirname "$0")" && pwd)"; D="/c/Users/Musa/Documents/VideoHub/films/$1"
[ -e "$D" ] && { echo "exists: $D"; exit 1; }
mkdir -p "$D/voice" "$D/audio" "$D/tex" "$D/hdri"; cp -r "$E/template/." "$D/"; cp "$E/base.js" "$D/"
sed -i "s#<title>FILM TITLE</title>#<title>$2</title>#" "$D/index.html"; echo "$D"

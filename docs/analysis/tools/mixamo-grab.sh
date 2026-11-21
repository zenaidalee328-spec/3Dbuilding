# grab.sh "<Name1>" ...: moves Mixamo downloads of the last 5 minutes (oldest first) from Downloads into the castle film's mixamo folder.
# Only files inside Downloads are ever touched.
D=${FILM:-.}/mixamo
L=$(find C:/Users/Musa/Downloads -maxdepth 1 \( -name '*.tmp' -o -name '*.fbx' \) -mmin -5 -printf '%T@ %p\n' | sort -n | cut -d' ' -f2-)
[ -z "$L" ] && { echo "no new download"; exit 1; }
echo "$L" | while read f; do [ $# -gt 0 ] || break; mv "$f" "$D/$1.fbx"; echo "$1 <- $(basename "$f") $(stat -c %s "$D/$1.fbx")"; shift; done

#!/bin/sh
set -eu
templates=$(CDPATH='' cd -- "$(dirname -- "$0")/../templates" && pwd)
output=$(mktemp -d)
trap 'rm -rf "$output"' EXIT HUP INT TERM
for fish in clown butterfly puffer shark; do
  inkscape "$templates/$fish.svg" --export-type=pdf --export-text-to-path --export-filename="$output/$fish.pdf"
done
pdfunite "$output/clown.pdf" "$output/butterfly.pdf" "$output/puffer.pdf" "$output/shark.pdf" "$output/aquarium-v3-a4.pdf"
mv "$output/aquarium-v3-a4.pdf" "$templates/aquarium-v3-a4.pdf"

#!/bin/sh
set -eu
templates=$(CDPATH='' cd -- "$(dirname -- "$0")/../templates" && pwd)
output=$(mktemp -d)
trap 'rm -rf "$output"' EXIT HUP INT TERM

build_pdf() {
  name=$1
  shift
  count=$#
  for fish in "$@"; do
    inkscape "$templates/$fish.svg" --export-type=pdf --export-text-to-path --export-filename="$output/$fish.pdf"
    set -- "$@" "$output/$fish.pdf"
  done
  shift "$count"
  pdfunite "$@" "$output/$name.pdf"
  mv "$output/$name.pdf" "$templates/$name.pdf"
}

if [ "${1:-}" != ocean ]; then build_pdf aquarium-v3-a4 clown butterfly puffer shark; fi
build_pdf aquarium-ocean-a4 jelly ray octopus

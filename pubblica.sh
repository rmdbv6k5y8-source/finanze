#!/bin/sh
# Pubblica la cartella app/ sul ramo gh-pages (GitHub Pages). Uso: ./pubblica.sh
set -e
cd "$(dirname "$0")"
npm test
git push origin main
git push origin "$(git subtree split --prefix app main)":refs/heads/gh-pages --force
echo "Pubblicato. Ricorda di aumentare VERSIONE in app/sw.js a ogni modifica."

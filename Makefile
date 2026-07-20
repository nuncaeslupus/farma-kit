# Project tasks. Day-to-day dev/build/test live in package.json (npm run …);
# this holds jobs that shell out beyond Vite.
.PHONY: og-cards

# Regenerate the localized OpenGraph link-preview cards into public/.
# Needs google-chrome or chromium on PATH. Commit the resulting PNGs.
og-cards:
	bash scripts/gen-og-cards.sh

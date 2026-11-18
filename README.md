# Itemoheng Primary School website

This repository contains the redesigned Itemoheng Primary School website.

## Website files
- `index.html` — public school website.
- `content.json` — initial content for notices, news, gallery, calendar, staff, achievements, parent information and FAQs.
- `editor.html` — private content editor (open only with the private link).
- `api/content.js` — content API. Public visitors can read content; only the private editor bearer token can publish updates.
- Existing school photographs and PDF files are kept in the repository and referenced by the site.

## Vercel configuration
Deploy the repository root as a static website with Node.js serverless functions. The project uses `@vercel/blob` for persistent content storage.

Required Vercel environment variables:
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob storage access.
- `ITEMOHENG_EDITOR_TOKEN` — long random secret used by the private editor link.

Do not commit either secret to GitHub or place the token in public page source. The editor receives its token from the URL fragment (after `#`), then sends it to the API as a Bearer authorization header.

## Editing
Open the private editor link, choose a content section, add or update entries, and select **Save and publish changes**. The public homepage reads the latest published content from `/api/content`.

# GoldenPupCare AI try-on — implementation, not deployed

Node 22+ service and responsive uploader using the real OpenAI Images Edits endpoint. No mock image generation. Single product: navy Senior Pup Mobility Sling. Source photos are sent to OpenAI, held in memory and not written to disk by this app. Review the provider's retention policy before enabling it for shoppers.

## Run
Copy `.env.example` to `.env`, configure all values, run `node --env-file=.env server.mjs`. Run checks with `node --test` and `node --check server.mjs`. The app deliberately refuses generation with missing configuration.

## Deploy
Deploy the Dockerfile to a container host with HTTPS and at least 240-second request timeouts. Use ONE instance. Set secrets in the hosting dashboard, never GitHub or Liquid. Set PUBLIC_ORIGIN to the exact HTTPS service origin, TURNSTILE_HOSTNAME to its hostname, and configure the corresponding Cloudflare Turnstile widget. Set PRODUCT_IMAGE_URL to the exact Shopify CDN image of the navy sling, ideally a clear product-only reference. OPENAI_API_KEY requires Images API access and billing. IMAGE_MODEL defaults to gpt-image-1.5.

DAILY_LIMIT is a process-local request limit and resets on restart: it is not a reliable monetary cap. Before a public launch, replace counters with a durable atomic store and add per-customer quotas. Configure provider usage alerts; run real-photo accuracy and spend tests. CAPTCHA alone is not customer authentication. Current upload validation checks size/MIME/magic bytes; add image decode/re-encode validation before public launch.

## Shopify
`shopify-block.liquid` is a theme block source. Add it under theme `blocks/` where the target section supports theme blocks, or adapt the link to an existing Custom Liquid block. Configure its URL only after the service passes end-to-end tests. This code is not yet installed in theme 191133876418. Current preview app is single-product and does not offer size prediction or automatic cart changes. Existing product-page cart remains authoritative.

## Required acceptance checks
Real dog + exact product reference generates plausible image; mobile upload and download work; oversized/disguised uploads rejected; failed verification and origin rejected; quota exhaustion handled; generation failures expose no provider error or key; shopper consent visible; original cart flow unaffected. Browser UI, live AI call and deployment have NOT been verified yet.

Reference: https://developers.openai.com/api/reference/resources/images/methods/edit

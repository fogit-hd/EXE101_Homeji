# Header logo asset

Tracking: [FE #19](https://github.com/fogit-hd/EXE101_Homeji/issues/19).

GlobalHeader used /bar/homeji-logo2.png while the tracked asset is public/brand/homeji-logo2.png. The missing static file received SPA fallback HTML, so browsers displayed a broken image. Correcting the reference preserves the existing brand asset and dimensions.

Verification: production build passes; Edge local production host resolves the header image to /brand/homeji-logo2.png with complete=true and naturalWidth=1256. No business or API behavior changes.

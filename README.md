# After Dark — Halloween Photo Booth

A four-shot black-and-white vintage photobooth web app designed for an older 9.7-inch iPad Pro. Each finished strip is uploaded immediately to a **private** Supabase Storage bucket. The app also includes a **password-protected shared guest gallery** at `/gallery`. The Supabase bucket stays private.

## 1. Run locally

Install Node.js (18+; Node 20+ recommended), then:

```sh
npm install
npm run dev
```

Open the localhost URL on your **Mac** to test the UI and camera. **Local Vite doesn't run `/api/upload`**, so uploads will fail until deployed to Vercel (or run with Vercel CLI).

## 2. Set up Supabase

1. Create a project at https://supabase.com.
2. Under **Storage**, create a bucket with the exact name `photo-strips` and leave it **private**.
3. Find **Project URL** and **service_role** secret (under project API settings). Keep the service_role key secret.
4. You can find and download saved photos inside **Storage > photo-strips > strips/** in the Supabase dashboard.

The server-side function uses the service role key. Never place it in code committed to Git or in a `VITE_` environment variable.

## 3. Deploy via Vercel

1. Push this folder to a GitHub repository.
2. Import the repository at https://vercel.com/new.
3. Vercel should detect **Vite**: build command `npm run build`, output folder `dist`.
4. In **Project Settings > Environment Variables**, create:
   - `SUPABASE_URL`: Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase secret service-role key
   - `BOOTH_UPLOAD_KEY`: a long separate passphrase you choose
5. Redeploy after saving environment variables.
6. Open the resulting **HTTPS** site on the iPad. Tap **Admin settings**, enter the same `BOOTH_UPLOAD_KEY` passphrase, and save it for that browser tab.
7. Grant Safari camera permission, shoot four photos, wait for **Uploaded successfully!**, and verify the image appears in the Supabase private bucket.

**Security note:** The passphrase is stored in Safari `sessionStorage` for that tab. Anyone using the unlocked device can access uploads, and a shared passphrase is not suitable for an internet-scale public photobooth. Use a long unique password, do not share it, and disable/remove the deployment after the party if it is no longer needed. The function does not include server-side rate limiting. Supabase Storage access is private, but Vercel function invocations and storage have free-tier limits.

## 4. Using an older iPad

- Use the **front camera**, with the iPad in **portrait** orientation and strong, diffuse lighting.
- Camera access requires **HTTPS** (localhost is permitted for local development). On an old iPad, test with the actual iPad Safari version ahead of the event. iPadOS 16 compatibility is a target, not a guarantee.
- Turn off Auto-Lock or keep the iPad awake, keep it plugged in, and enable **Guided Access** if desired.
- Don't switch apps mid-session; Safari may stop the video feed.
- This starter keeps an image in memory for retry if upload fails; **it is not offline-durable**. Use **SAVE THIS STRIP** before starting over if Wi-Fi is down. A production version should persist pending uploads to IndexedDB.

## Customization

- Customize title/footer in `src/strip.ts` (currently "ALL HALLOWS’ EVE").
- Customize camera count, crop, style and output JPEG quality in `src/App.tsx` and `src/strip.ts`.
- Customize interface in `src/styles.css`.

## Test checklist

- [ ] Camera permission prompt works in Safari over HTTPS
- [ ] Front-facing preview and captured photos are mirrored consistently
- [ ] All four photo countdowns work
- [ ] Image has four frames with readable footer
- [ ] Supabase contains a newly uploaded image after the success message
- [ ] Wrong passphrase shows a helpful error and retry works
- [ ] Download works if Wi-Fi is temporarily unavailable (before leaving the screen)
- [ ] Reset returns to a clean welcome screen

## Important boundary

Only take and store guests' photos with their consent. Tell guests they'll be uploaded privately and how long you plan to keep them.

## 5. Shared guest gallery

1. Add one more Vercel **Production** environment variable: `(not needed — gallery has no password)`, with a **different** strong passphrase from `BOOTH_UPLOAD_KEY`. Redeploy after saving it.
2. Keep the Supabase `photo-strips` bucket **private**. The new endpoints `api/gallery.js` and `api/photo.js` use the server-side service-role key to retrieve images after checking the gallery passphrase.
3. Share `https://YOUR-VERCEL-URL/gallery` and the gallery passphrase with your guests. They can browse and download the 60 most recent photo strips. Tap Refresh to see new uploads.
4. The gallery URL by itself does not provide access: the visitor must enter the passphrase. Anyone with the passphrase can view all 60 newest strips, so share it only with invited guests. Change or remove `(not needed — gallery has no password)` after the event to revoke access.
5. `npm run dev` serves the page but **does not run Vercel APIs**. Test the full gallery on your deployed Vercel URL (or with `vercel dev`).

The gallery loads the full JPEGs, so guests with weak mobile connections might see slower loading. The API uses basic shared-passphrase protection, not individual accounts or rate limiting. The passphrase is saved in sessionStorage until the tab is closed or the guest locks the gallery.

**Date displayed throughout app:** October 24, 2026.


### Gallery link (404-safe)
Share `https://YOUR-VERCEL-DOMAIN/#gallery` with guests. The `#gallery` fragment loads through the main app page, avoiding a server-side `/gallery` route. The backend still requires `(not needed — gallery has no password)`.


## Open guest gallery (no password)
Open `https://YOUR-VERCEL-DOMAIN/#gallery`. Guests can view and download the newest 60 uploaded strips without logging in. **Anyone who has or discovers the gallery URL can access the photos**, even though the Supabase bucket remains private. Keep `SUPABASE_SERVICE_ROLE_KEY` only in server-side Vercel environment variables. Remove the unused old `GALLERY_ACCESS_KEY` environment variable if desired.

# GWMCode Hub Desktop

Desktop version of the Hub, built with Tauri, React, and TypeScript.

## Update System Strategy

To implement a professional "Click to Update" feature in GWMCode Hub Desktop, we will use the official Tauri v2 Updater plugin.

### 1. Tauri Updater Plugin
We will use `@tauri-apps/plugin-updater`.

**Steps to enable:**
1. Install the plugin: `pnpm tauri add updater` (requires Rust environment).
2. Configure `tauri.conf.json`:
   - Enable `createUpdaterArtifacts`: `true`.
   - Add `pubkey` (generated via `tauri signer generate`).
   - Add update `endpoints` (e.g., a static JSON on GitHub or a dedicated release server).
3. Grant permissions in `src-tauri/capabilities/default.json`:
   ```json
   {
     "permissions": [
       "updater:default"
     ]
   }
   ```

### 2. Implementation Logic
The "Click to Update" feature will follow this flow in the React frontend:

```typescript
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

async function handleUpdate() {
  const update = await check();
  if (update) {
    console.log(`Found update ${update.version}`);
    
    // Optional: Show a progress bar or modal
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          console.log('Download started');
          break;
        case 'Progress':
          console.log(`Downloaded ${event.data.chunkLength} bytes`);
          break;
        case 'Finished':
          console.log('Download finished');
          break;
      }
    });

    // Relaunch to apply changes
    await relaunch();
  } else {
    console.log('No updates available');
  }
}
```

### 3. Release Process
1. **Sign Artifacts:** Use `TAURI_SIGNING_PRIVATE_KEY` during the build process.
2. **Host Manifest:** Publish a `latest.json` file to the endpoint specified in `tauri.conf.json`.
3. **Distribution:** Upload the generated `.msi`, `.AppImage`, or `.app.tar.gz` and their `.sig` signatures to the release hosting provider.

### 4. Alternative: Asset Swapping (Micro-frontend Style)
If we want to update the UI without a full binary update (since the desktop app is essentially a shell for the web version):
- We can configure Tauri to load the UI from a remote URL in production.
- Alternatively, we can use a custom logic to download a `dist.zip`, extract it to the local data directory, and point the Tauri webview to that local index file.
- However, using the official Updater is safer and handles binary/dependency updates.

## Development

```bash
cd projects/hub-desktop
pnpm install
pnpm tauri dev
```

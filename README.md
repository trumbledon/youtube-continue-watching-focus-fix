# YouTube Continue Watching Focus Fix

A small Tampermonkey userscript that keeps YouTube's **Continue watching** popup from interrupting your typing in the search box.

When YouTube loads a previously watched video in the lower-right corner, it can automatically focus the Resume/Play control. This script protects the search field while you're using it, so you can finish typing without losing your place.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. [Install the userscript](https://raw.githubusercontent.com/trumbledon/youtube-continue-watching-focus-fix/main/youtube-continue-watching-focus-fix.user.js) and confirm the installation in Tampermonkey.
3. Refresh any open YouTube tabs.

If your browser displays the source instead of an installation prompt, save the `.user.js` file and import it through **Tampermonkey → Dashboard → Utilities → Import from file**.

If you installed an earlier local version, replace or disable that copy before installing this one. The GitHub version uses a new namespace, so Tampermonkey may otherwise keep both copies enabled.

## How it works

While YouTube's search field is active, the script blocks page-initiated `focus()` and `blur()` calls that would move focus away. Focus events provide a fallback that restores the field and its text selection if another focus mechanism is used.

A deliberate click outside the search field, Tab, or a supported browser-navigation shortcut releases the protection. The Continue watching popup stays visible and clickable.

The protection applies to page-initiated focus changes generally while the search field is active; it does not depend on the popup's label, position, or appearance.

## Privacy and scope

- Runs only on `https://www.youtube.com/*` and `https://youtube.com/*`, in the top-level page.
- No external dependencies, analytics, data storage, or network requests in the script.
- No privileged userscript API grants. It runs in the page context to intercept focus calls.
- Tampermonkey may check this GitHub repository for script updates using the metadata URLs.

## Compatibility and troubleshooting

The working version was confirmed by its original user in Brave with Tampermonkey. Other browsers and userscript managers have not been confirmed.

If the script does not run, confirm that it is enabled for YouTube and that your browser allows Tampermonkey to run userscripts. Refresh the page after any script change.

YouTube's interface can change. If an issue appears, [open an issue](https://github.com/trumbledon/youtube-continue-watching-focus-fix/issues) with your browser, Tampermonkey version, script version, and steps to reproduce it.

## Credits

Published and maintained by [trumbledon](https://github.com/trumbledon). Created with OpenAI Codex, with testing and feedback from trumbledon.

Independent project; not affiliated with YouTube or Google.

## License

[MIT](LICENSE).

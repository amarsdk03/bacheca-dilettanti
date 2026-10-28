import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

/** Attach the CLI and these missing capabilities to ONE owned Chrome instance. */
export async function launchAnnunciBrowser({ toolDir, chrome, workspace, env }) {
  const { puppeteer } = await import(pathToFileURL(join(toolDir, "build/src/third_party/index.js")).href);
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, defaultViewport: null, env,
    userDataDir: join(workspace.run, "chrome-profile"), handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false,
    // Supplying a remote-debugging-address suppresses Puppeteer's automatic
    // port flag, so specify both. Never attach to a personal Chrome profile.
    args: ["--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1", "--no-first-run", "--no-default-browser-check"] });
  try {
    const endpoint = new URL(browser.wsEndpoint()); assert.equal(endpoint.hostname, "127.0.0.1");
    const downloadsPath = join(realpathSync(workspace.evidence), "downloads"); mkdirSync(downloadsPath);
    const cdp = await browser.target().createCDPSession(), downloads = [];
    await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloadsPath, eventsEnabled: true });
    cdp.on("Browser.downloadWillBegin", event => {
      downloads.push({ guid: event.guid, filename: event.suggestedFilename, state: "pending" });
    });
    cdp.on("Browser.downloadProgress", event => { const item = downloads.find(item => item.guid === event.guid); if (item) item.state = event.state; });
    const page = async origin => {
      const matches = (await browser.pages()).filter(p => p.url().startsWith(origin + "/")); assert.equal(matches.length, 1); return matches[0];
    };
    return { browserUrl: endpoint.origin.replace("ws:", "http:"),
      get downloads() { return downloads.map(item => ({ ...item })); },
      async downloadAfter(count) {
        for (let i = 0; i < 600; i++) {
          const item = downloads[count];
          if (item?.state === "completed") {
            assert(/^annunci-pagina-\d{8}-\d{6}\.csv$/.test(item.filename));
            const path = resolve(downloadsPath, item.filename); assert(path.startsWith(downloadsPath + sep));
            assert(existsSync(path)); return { filename: item.filename, path, bytes: readFileSync(path) };
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        throw new Error("ANNUNCI_DOWNLOAD_TIMEOUT");
      },
      async modifiedClick(origin, selector, mode) {
        assert(["middle", "control"].includes(mode)); const target = await page(origin);
        if (mode === "control") await target.keyboard.down("Control");
        try { await target.click(selector, { button: mode === "middle" ? "middle" : "left" }); }
        finally { if (mode === "control") await target.keyboard.up("Control"); }
      },
      async externalPages(origin) { return (await browser.pages()).filter(p => p.url().startsWith(origin + "/external/announcement")); },
      async failAsset(origin, asset) {
        assert(/^\/_next\/static\/chunks\/[a-zA-Z0-9_./-]+\.js$/.test(asset));
        const target = await page(origin), session = await target.createCDPSession(), failures = [];
        await session.send("Fetch.enable", { patterns: [{ urlPattern: origin + asset, requestStage: "Request" }] });
        session.on("Fetch.requestPaused", event => {
          if (event.request.url !== origin + asset) { void session.send("Fetch.continueRequest", { requestId: event.requestId }); return; }
          failures.push({ path: asset, reason: "Failed" });
          void session.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "Failed" });
        });
        return { failures, async release() { await session.send("Fetch.disable"); await session.detach(); } };
      },
      async observeBfcache(origin) {
        const target = await page(origin), session = await target.createCDPSession(), reasons = [];
        await session.send("Page.enable");
        session.on("Page.backForwardCacheNotUsed", event => {
          reasons.push(...event.notRestoredExplanations.map(item => ({ type: item.type, reason: item.reason })));
        });
        return { reasons, async close() { await session.detach(); } };
      },
      close: () => browser.close(),
    };
  } catch (error) { await browser.close(); throw error; }
}

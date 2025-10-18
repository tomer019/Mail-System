export async function waitForServerReady(maxMs = 15000) {
  const start = Date.now();
  let attempt = 0;

  while (Date.now() - start < maxMs) {
    attempt++;
    try {
      console.log(`[waitForServerReady] Attempt #${attempt}`);
      const r = await fetch("/api/health", { cache: "no-store" });
      if (r.ok) {
        console.log("[waitForServerReady] Server is ready ✅");
        return true;
      } else {
        console.log(
          `[waitForServerReady] Got response but not OK: ${r.status} ${r.statusText}`
        );
      }
    } catch (err) {
      console.log(`[waitForServerReady] Network error on attempt #${attempt}:`, err);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("[waitForServerReady] Timeout expired ❌");
  return false;
}

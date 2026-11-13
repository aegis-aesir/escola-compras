import path from "node:path";
import {readModuleWorkspace} from "./module-workspace.mjs";

// Shared defaults for Vite and standalone Wrangler commands. Managed Linux
// supplies its own checkout-local paths before these defaults are applied.
export function configureToolEnvironment(projectRoot) {
  const moduleWorkspace=readModuleWorkspace(projectRoot);
  const runtimeRoot = moduleWorkspace?path.join(projectRoot, ".sites-runtime"):
    process.env.SITES_RUNTIME_ROOT || path.join(projectRoot, ".sites-runtime");
  const defaults = {
    CLOUDFLARE_CF_FETCH_ENABLED: "false",
    WRANGLER_SEND_METRICS: "false",
    WRANGLER_WRITE_LOGS: "false",
    WRANGLER_LOG_PATH: path.join(runtimeRoot, "wrangler/logs"),
    WRANGLER_REGISTRY_PATH: path.join(runtimeRoot, "wrangler/dev-registry"),
    MINIFLARE_REGISTRY_PATH: path.join(runtimeRoot, "wrangler/registry"),
  };
  for (const [name, value] of Object.entries(defaults)) {
    if(moduleWorkspace)process.env[name]=value;else process.env[name] ??= value;
  }
}

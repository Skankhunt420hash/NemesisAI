import type { CapacitorConfig } from "@capacitor/cli";

const appId = process.env.CAP_APP_ID || "com.nemesisai.creator";
const appName = process.env.CAP_APP_NAME || "NemesisAI";
const serverUrl = process.env.CAP_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId,
  appName,
  webDir: "dist/public",
  bundledWebRuntime: false,
};

if (serverUrl) {
  config.server = {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  };
}

export default config;

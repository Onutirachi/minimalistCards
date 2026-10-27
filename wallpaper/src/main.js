import App from "./core/App.js";
import { connectWallpaperEngine } from "./core/wallpaperBridge.js";

// Module scripts run after the document is parsed, so the UI can be built and the
// Wallpaper Engine listeners registered right away, without waiting or retrying.
const app = new App(document.getElementById("app"));
connectWallpaperEngine(app);
app.start();

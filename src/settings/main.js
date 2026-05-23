import "../styles/scrollbars.css";
import { createApp } from "vue";
import App from "./App.vue";
import { applyDocumentLocale, t } from "../lib/i18n.js";

applyDocumentLocale();
document.title = t("settingsTitle");
createApp(App).mount("#app");

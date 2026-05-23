import { createApp } from "vue";
import "../styles/controls.css";
import "../styles/scrollbars.css";
import App from "./App.vue";
import { applyDocumentLocale } from "../lib/i18n.js";

applyDocumentLocale();
createApp(App).mount("#app");

import "./styles/main.css";
import { startApp } from "./app.ts";
import { config } from "./config.ts";
import { safeLocalStorage } from "./likes.ts";

const root = document.getElementById("app");
if (root) {
  document.documentElement.lang = config.lang;
  const app = startApp(root, { config, fetchFn: (input, init) => fetch(input, init), storage: safeLocalStorage() });
  void app.render();
}

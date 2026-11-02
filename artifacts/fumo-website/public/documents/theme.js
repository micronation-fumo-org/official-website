(() => {
  const STORAGE_KEY = "fumo_theme";
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  let preference = "system";

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") preference = stored;
  } catch {
    // Keep following the system setting when browser storage is unavailable.
  }

  const isDark = () => preference === "dark" || (preference === "system" && Boolean(media?.matches));
  const updateButtons = () => {
    const dark = isDark();
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#17191c" : "#ffffff");

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const label = dark ? "切換至淺色模式" : "切換至深色模式";
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      button.setAttribute("aria-pressed", String(dark));
      const icon = button.querySelector("[data-theme-icon]");
      if (icon) icon.textContent = dark ? "☀" : "☾";
    });
  };

  updateButtons();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", updateButtons, { once: true });
  if (media?.addEventListener) media.addEventListener("change", updateButtons);
  else media?.addListener?.(updateButtons);

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-theme-toggle]");
    if (!button) return;
    preference = isDark() ? "light" : "dark";
    try { localStorage.setItem(STORAGE_KEY, preference); } catch { /* visual toggle still works */ }
    updateButtons();
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    preference = event.newValue === "dark" || event.newValue === "light" ? event.newValue : "system";
    updateButtons();
  });
})();

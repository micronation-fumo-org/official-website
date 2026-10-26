(() => {
  const button = document.getElementById("copyShare");
  if (!button) return;
  const originalText = button.textContent;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      button.textContent = "已複製";
      window.setTimeout(() => { button.textContent = originalText; }, 1800);
    } catch {
      window.prompt("複製唯讀分享連結：", window.location.href);
    }
  });
})();

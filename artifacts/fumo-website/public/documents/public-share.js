(() => {
  const $ = id => document.getElementById(id);
  const dialog = $('shareDialog');
  const shareUrl = $('shareUrl');
  const feedback = $('shareFeedback');
  const slugInput = $('shareSlug');
  const createShareBtn = $('createShareBtn');
  const PAGE_LIMIT = 24000;
  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function decodePayload(encoded) {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!payload || payload.v !== 1 || typeof payload.title !== 'string' || typeof payload.content !== 'string' || payload.title.length > 200 || payload.content.length > PAGE_LIMIT) {
      throw new Error('invalid payload');
    }
    return payload;
  }

  function validatePayload(payload) {
    if (!payload || typeof payload.title !== 'string' || typeof payload.content !== 'string' || payload.title.length > 200 || payload.content.length > PAGE_LIMIT) {
      throw new Error('invalid payload');
    }
    return payload;
  }

  function currentPublicUrl() {
    return location.origin + location.pathname + location.search + location.hash;
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const temporary = document.createElement('textarea');
    temporary.value = text;
    temporary.setAttribute('readonly', '');
    temporary.style.position = 'fixed';
    temporary.style.opacity = '0';
    document.body.appendChild(temporary);
    temporary.select();
    const copied = document.execCommand('copy');
    temporary.remove();
    if (!copied) throw new Error('copy unavailable');
  }

  function showPayload(payload) {
    validatePayload(payload);
    document.title = `${payload.title}｜FUMO 公開文件`;
    $('publicTitle').textContent = payload.title;
    const date = payload.created ? new Date(payload.created) : null;
    $('publicMeta').textContent = `FUMO 文件工作區 · 唯讀公開頁面${date && !Number.isNaN(date.valueOf()) ? ` · 建立於 ${date.toLocaleString('zh-TW')}` : ''}`;
    $('publicArticle').innerHTML = window.FUMO_RENDER_MARKDOWN(payload.content);
    $('publicArticle').setAttribute('aria-label', `${payload.title} 文件內容`);
    $('publicCopyBtn').addEventListener('click', async () => {
      const button = $('publicCopyBtn');
      const original = button.textContent;
      try {
        await copyText(currentPublicUrl());
        button.textContent = '已複製';
        setTimeout(() => { button.textContent = original; }, 1800);
      } catch (_) {
        button.textContent = '複製失敗';
        setTimeout(() => { button.textContent = original; }, 1800);
      }
    });
  }

  async function showPublicPage() {
    const legacy = location.hash.match(/^#public=(.*)$/);
    const shortPath = location.pathname.match(/^\/share\/([^/]+)\/?$/);
    if (!legacy && !shortPath) return false;

    document.body.classList.add('public-mode');
    $('publicPage').classList.remove('hidden');
    const error = $('publicError');
    try {
      let payload;
      if (legacy) {
        payload = decodePayload(legacy[1]);
      } else {
        const id = shortPath[1];
        if (!(/^[A-Za-z0-9_-]{16}$/.test(id) || (id.length >= 3 && id.length <= 48 && SLUG_RE.test(id)))) throw new Error('invalid id');
        const response = await fetch(`/api/shares/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('share unavailable');
        payload = await response.json();
      }
      showPayload(payload);
    } catch (_) {
      $('publicHeading').classList.add('hidden');
      $('publicDocument').classList.add('hidden');
      error.classList.remove('hidden');
      error.textContent = '這個公開連結無效或內容目前無法讀取。請向分享者索取新的連結。';
      document.title = '無效的公開連結｜FUMO 文件工作區';
    }
    return true;
  }

  $('sharePublicBtn').addEventListener('click', () => {
    const doc = window.FUMO_GET_ACTIVE_DOCUMENT();
    if (!doc) return;
    shareUrl.value = '';
    slugInput.value = '';
    slugInput.removeAttribute('aria-invalid');
    createShareBtn.disabled = false;
    createShareBtn.textContent = '建立短連結';
    if (doc.content.length > PAGE_LIMIT) {
      feedback.textContent = `文件超過 ${PAGE_LIMIT.toLocaleString()} 個字元，請縮短後再分享。`;
      createShareBtn.disabled = true;
      dialog.showModal();
      return;
    }
    feedback.textContent = '可輸入自訂尾碼，例如 meeting-notes；留空則使用隨機代號。';
    dialog.showModal();
    slugInput.focus();
  });

  createShareBtn.addEventListener('click', async () => {
    const doc = window.FUMO_GET_ACTIVE_DOCUMENT();
    if (!doc) return;
    if (doc.content.length > PAGE_LIMIT) {
      feedback.textContent = `文件超過 ${PAGE_LIMIT.toLocaleString()} 個字元，請縮短後再分享。`;
      return;
    }
    const slug = slugInput.value.trim().toLowerCase();
    if (slug && (slug.length < 3 || slug.length > 48 || !SLUG_RE.test(slug))) {
      slugInput.setAttribute('aria-invalid', 'true');
      feedback.textContent = '尾碼需為 3–48 個小寫英數字或以連字號分隔的文字，例如 meeting-notes。';
      slugInput.focus();
      return;
    }
    slugInput.removeAttribute('aria-invalid');
    shareUrl.value = '';
    feedback.textContent = '正在保存文件快照並建立短連結…';
    createShareBtn.disabled = true;
    try {
      const payload = { title: doc.title, content: doc.content, documentId: doc.id };
      if (slug) payload.slug = slug;
      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.status === 409) {
        feedback.textContent = '這個尾碼已被使用，請換一個後再建立。';
        slugInput.focus();
        return;
      }
      if (response.status === 400) {
        feedback.textContent = '尾碼格式無效，請使用 3–48 個小寫英數字或連字號。';
        slugInput.focus();
        return;
      }
      if (!response.ok) throw new Error('share creation failed');
      const result = await response.json();
      if (typeof result.id !== 'string' || !(/^[A-Za-z0-9_-]{16}$/.test(result.id) || (result.id.length <= 48 && SLUG_RE.test(result.id)))) throw new Error('invalid response');
      shareUrl.value = new URL(`/share/${result.id}`, location.origin).href;
      feedback.textContent = '已建立唯讀快照短連結。文件快照會保存於雲端；任何持有連結的人都能閱讀，文件修改後需重新分享。';
      createShareBtn.textContent = '已建立';
      shareUrl.focus();
      shareUrl.select();
    } catch (_) {
      feedback.textContent = '目前無法建立短連結，請檢查網路後重試。';
    } finally {
      if (!shareUrl.value) createShareBtn.disabled = false;
    }
  });

  $('copyShareBtn').addEventListener('click', async () => {
    if (!shareUrl.value) return;
    try {
      await copyText(shareUrl.value);
      feedback.textContent = '已複製公開連結。任何持有連結的人都能查看這份快照。';
    } catch (_) {
      shareUrl.focus();
      shareUrl.select();
      feedback.textContent = '無法自動複製，請長按或使用瀏覽器選單複製連結。';
    }
  });

  $('openShareBtn').addEventListener('click', () => {
    if (shareUrl.value) window.open(shareUrl.value, '_blank', 'noopener,noreferrer');
  });

  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });

  const sidebar = $('sidebar');
  const mobileMenu = $('mobileMenu');
  const backdrop = $('mobileBackdrop');
  const setSidebarOpen = open => {
    sidebar.classList.toggle('open', open);
    backdrop.classList.toggle('active', open);
    document.body.classList.toggle('sidebar-open', open);
    mobileMenu.setAttribute('aria-expanded', String(open));
  };
  mobileMenu.onclick = () => setSidebarOpen(!sidebar.classList.contains('open'));
  backdrop.addEventListener('click', () => setSidebarOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sidebar.classList.contains('open')) setSidebarOpen(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 850 && sidebar.classList.contains('open')) setSidebarOpen(false);
  });
  $('newDoc').addEventListener('click', () => setSidebarOpen(false));
  $('docList').addEventListener('click', () => setSidebarOpen(false));

  showPublicPage();
})();

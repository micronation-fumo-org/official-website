(() => {
  const seed = [
    { id: "guide", title: "FUMO 成員工作手冊", kind: "指南", updated: "剛剛", starred: true, content: `# FUMO 成員工作手冊\n\n> 以和平、合作與尊重主權，讓各微國家在平等基礎上對話。\n\n## 歡迎來到成員工作區\n\n這裡是整理 FUMO 組織文件的共同起點。你可以把議案、會議紀錄、制度文件與工作報告寫成 Markdown，方便閱讀、修訂與匯出。\n\n## 會議與表決\n\n1. 先記錄議題背景與提案內容。\n2. 清楚標示討論結論、表決方式與結果。\n3. 將通過的決議連結至相關紀錄或法規。\n\n## 組織機構\n\nFUMO 公開網站介紹三個常設機構：\n\n- **議事中心**：成員代表參與提案、表決與重大方針討論。\n- **秘書處**：維持日常運作、檔案管理與憲章執行。\n- **理事會**：協助維持議事秩序，處理緊急事務。\n\n## 建議文件分類\n\n- 憲章、法規與修正草案\n- 投票提案、議事資料與表決紀錄\n- 出席簽到與會議紀錄\n- 職位報告與工作交接\n- 合作組織與交流資料\n\n## 編輯原則\n\n使用明確標題、日期與文件狀態；如內容尚未定案，請在標題或開頭註明「草案」。\n\n---\n\n*本文件為工作區示範內容，請依 FUMO 正式規範更新。*` },
    { id: "minutes", title: "議事中心｜會議紀錄範本", kind: "範本", updated: "今天", starred: false, content: `# 議事中心｜會議紀錄\n\n> 會議狀態：草案　·　請於確認後更新\n\n## 基本資料\n\n- **日期與時間：** YYYY-MM-DD HH:MM\n- **主席：** 姓名／代表\n- **出席代表：** 國家或組織名單\n- **紀錄：** 姓名\n\n## 議程\n\n1. 上次會議紀錄確認\n2. 提案與討論事項\n3. 表決與決議\n4. 臨時動議\n\n## 討論摘要\n\n### 議題一：\n\n補充背景、發言摘要及待釐清事項。\n\n## 表決結果\n\n| 提案 | 贊成 | 反對 | 棄權 | 結果 |\n| --- | ---: | ---: | ---: | --- |\n| 提案標題 | — | — | — | 待表決 |\n\n## 待辦事項\n\n- [ ] 待辦內容｜負責人｜期限\n\n## 下次會議\n\n- 日期：待確認\n- 議題：待補充` },
    { id: "law", title: "憲章與法規整理", kind: "治理", updated: "昨天", starred: false, content: `# 憲章與法規整理\n\n> 用於彙整正式制度文件、修訂歷程與相關討論。\n\n## 文件索引\n\n- **憲章：** 請加入正式版本連結或內容。\n- **現行法規：** 請依正式公布版本逐項列出。\n- **修正草案：** 標記提出日期、提案人與審議狀態。\n\n## 修訂紀錄\n\n| 日期 | 文件 | 修訂摘要 | 狀態 |\n| --- | --- | --- | --- |\n| YYYY-MM-DD | 文件名稱 | 請補充 | 草案 |\n\n## 編輯提醒\n\n正式條文請以組織公告版本為準；討論稿與已通過版本應分開保存。` },
    { id: "report", title: "職位報告｜月報範本", kind: "範本", updated: "10 月 22 日", starred: false, content: `# 職位報告｜月報\n\n- **職位：**\n- **報告人：**\n- **報告期間：** YYYY-MM\n- **提交日期：** YYYY-MM-DD\n\n## 本期工作摘要\n\n請以條列方式整理已完成事項與重要進度。\n\n## 進行中事項\n\n| 工作項目 | 目前狀態 | 預計完成 | 需要協助 |\n| --- | --- | --- | --- |\n| 待補充 | 進行中 | YYYY-MM-DD | 待確認 |\n\n## 下期計畫\n\n1. 計畫一\n2. 計畫二\n\n## 需要討論或決議\n\n請列出需要其他機構或成員協作的事項。` },
    { id: "attendance", title: "出席簽到與會議追蹤", kind: "行政", updated: "10 月 20 日", starred: false, content: `# 出席簽到與會議追蹤\n\n> 請依正式會議安排更新；避免在公開文件放入不必要的個人資料。\n\n## 會議資訊\n\n- **會議名稱：**\n- **日期：** YYYY-MM-DD\n- **簽到截止：** HH:MM\n\n## 出席紀錄\n\n| 代表／成員 | 狀態 | 備註 |\n| --- | --- | --- |\n| 待補充 | 待確認 | — |\n\n## 會後追蹤\n\n- [ ] 會議紀錄整理\n- [ ] 決議事項通知\n- [ ] 待辦事項指派` },
    { id: "vote", title: "投票提案與決議紀錄", kind: "議事", updated: "10 月 18 日", starred: false, content: `# 投票提案與決議紀錄\n\n> 狀態：草案　·　請依正式投票程序更新\n\n## 提案資料\n\n- **提案名稱：**\n- **提案人：**\n- **提出日期：** YYYY-MM-DD\n- **投票期間：** YYYY-MM-DD 至 YYYY-MM-DD\n\n## 提案內容\n\n請在此說明背景、目的、具體條文或預期成果。\n\n## 表決摘要\n\n| 選項 | 票數 |\n| --- | ---: |\n| 贊成 | — |\n| 反對 | — |\n| 棄權 | — |\n\n**結果：** 待公布\n\n## 後續執行\n\n- 負責機構：\n- 預計時程：\n- 相關文件：` }
  ];

  const $ = id => document.getElementById(id);
  const input = $("markdownInput");
  const preview = $("previewBody");
  const docList = $("docList");
  const editorBody = $("editorBody");
  const syncedSignatures = new Map();
  let docs = [];
  let activeId = "";
  let filter = "recent";
  let query = "";
  let editorReady = false;
  let authenticated = false;
  let canEdit = false;
  let currentUser = null;
  window.FUMO_CAN_EDIT_DOCUMENTS = false;
  let saveQueue = Promise.resolve();

  const safe = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const signature = doc => JSON.stringify({ id: doc.id, title: doc.title, kind: doc.kind, starred: Boolean(doc.starred), content: doc.content });
  const normalizeDocument = doc => ({
    id: String(doc.id),
    title: String(doc.title || "未命名文件"),
    kind: typeof doc.kind === "string" && doc.kind ? doc.kind : "文件",
    updated: doc.updatedAt || doc.updated_at || doc.updated || "剛剛",
    starred: Boolean(doc.starred),
    content: String(doc.content || "")
  });
  const formatDate = value => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.valueOf()) ? date.toLocaleString("zh-TW") : (value || "剛剛");
  };
  const loginUrl = () => `/login?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`;

  async function requestWorkspaceJson(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options, signal: controller.signal });
      const data = response.ok ? await response.json() : null;
      return { response, data };
    } finally {
      window.clearTimeout(timer);
    }
  }

  function setBootStatus(title, detail, failed = false) {
    $("workspaceBoot").hidden = false;
    $("workspaceBoot").setAttribute("aria-busy", String(!failed));
    $("workspaceBootTitle").textContent = title;
    $("workspaceBootDetail").textContent = detail;
  }

  function setAccessMode(user, allowEdits = Number(user?.adminLevel) >= 2) {
    currentUser = user || null;
    canEdit = Boolean(allowEdits);
    window.FUMO_CAN_EDIT_DOCUMENTS = canEdit;
    document.body.classList.toggle("read-only", !canEdit);
    const level = Number(currentUser?.adminLevel) || 0;
    $("profileName").textContent = currentUser?.voterName || "FUMO 成員";
    $("profileRole").textContent = level >= 9
      ? (canEdit ? "最高管理員 · 可編輯" : "最高管理員 · 唯讀")
      : level >= 2
        ? (canEdit ? "二級管理員 · 可編輯" : "二級管理員 · 唯讀")
        : level >= 1
          ? "一級管理員 · 唯讀"
          : "一般成員 · 唯讀";
    for (const id of ["newDoc", "importDocBtn", "deleteDocBtn", "editBtn", "sharePublicBtn"]) $(id).hidden = !canEdit;
    $("saveShortcutRow").hidden = !canEdit;
    $("syncLabel").textContent = canEdit ? "Markdown　·　自動同步至共用 D1" : "唯讀檢視　·　二級管理員以上可編輯";
    input.readOnly = !canEdit;
    document.querySelectorAll("[data-wrap], [data-prefix]").forEach(button => { button.disabled = !canEdit; });
    if (!canEdit) $("docTitle").removeAttribute("contenteditable");
  }

  function revokeEditAccess() {
    setAccessMode(currentUser, false);
  }

  window.FUMO_REVOKE_DOCUMENT_EDIT = revokeEditAccess;

  function inline(value) {
    let text = safe(value);
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return text;
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown).replace(/\r/g, "").split("\n");
    let output = "";
    let mode = "";
    const closeList = () => {
      if (mode) {
        output += mode === "ul" ? "</ul>" : "</ol>";
        mode = "";
      }
    };
    const cells = row => row.trim().replace(/^\||\|$/g, "").split("|").map(cell => cell.trim());
    const divider = row => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(row.trim());

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      let match;
      if (!line) {
        closeList();
        continue;
      }
      if (line.startsWith("```")) {
        closeList();
        const code = [];
        while (++index < lines.length && !lines[index].trim().startsWith("```")) code.push(lines[index]);
        output += `<pre><code>${safe(code.join("\n"))}</code></pre>`;
        continue;
      }
      if (line.includes("|") && index + 1 < lines.length && divider(lines[index + 1])) {
        closeList();
        const headers = cells(line);
        output += `<div class="table-scroll"><table><thead><tr>${headers.map(cell => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>`;
        index += 1;
        while (index + 1 < lines.length && lines[index + 1].trim().includes("|")) {
          index += 1;
          output += `<tr>${cells(lines[index]).map(cell => `<td>${inline(cell)}</td>`).join("")}</tr>`;
        }
        output += "</tbody></table></div>";
        continue;
      }
      if ((match = line.match(/^(#{1,6})\s+(.+)$/))) {
        closeList();
        const level = match[1].length;
        output += `<h${level}>${inline(match[2])}</h${level}>`;
        continue;
      }
      if (/^---+$/.test(line)) {
        closeList();
        output += "<hr>";
        continue;
      }
      if ((match = line.match(/^>\s?(.*)$/))) {
        closeList();
        output += `<blockquote>${inline(match[1])}</blockquote>`;
        continue;
      }
      if ((match = line.match(/^[-*]\s+(.+)$/))) {
        if (mode !== "ul") {
          closeList();
          output += "<ul>";
          mode = "ul";
        }
        const task = match[1].match(/^\[([ xX])\]\s+(.+)$/);
        output += task
          ? `<li class="task-item"><span class="task-check">${task[1].toLowerCase() === "x" ? "✓" : ""}</span>${inline(task[2])}</li>`
          : `<li>${inline(match[1])}</li>`;
        continue;
      }
      if ((match = line.match(/^\d+\.\s+(.+)$/))) {
        if (mode !== "ol") {
          closeList();
          output += "<ol>";
          mode = "ol";
        }
        output += `<li>${inline(match[1])}</li>`;
        continue;
      }
      closeList();
      output += `<p>${inline(line)}</p>`;
    }
    closeList();
    return output || '<p style="color:#98a2b1">開始輸入 Markdown，預覽會即時顯示。</p>';
  }

  function active() {
    return docs.find(doc => doc.id === activeId) || docs[0];
  }

  function persist() {
    if (!authenticated || !canEdit) return Promise.resolve(false);
    const operation = saveQueue.then(async () => {
      const pending = docs.filter(doc => signature(doc) !== syncedSignatures.get(doc.id)).map(doc => ({ ...doc }));
      if (!pending.length) return true;
      $("saveStatus").textContent = "同步中…";
      const { response, data: result } = await requestWorkspaceJson("/api/documents", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documents: pending })
      }, 30000);
      if (response.status === 401) {
        location.replace(loginUrl());
        throw new Error("unauthorized");
      }
      if (response.status === 403) {
        revokeEditAccess();
        $("saveStatus").textContent = "需要二級管理員以上權限才能修改文件";
        throw new Error("admin_required");
      }
      if (!response.ok) throw new Error("document_sync_failed");
      const saved = Array.isArray(result.documents) ? result.documents : pending;
      for (const doc of saved) {
        const savedDoc = pending.find(item => item.id === doc.id);
        if (!savedDoc) continue;
        syncedSignatures.set(savedDoc.id, signature(savedDoc));
        const liveDoc = docs.find(item => item.id === savedDoc.id);
        if (liveDoc && signature(liveDoc) === signature(savedDoc)) {
          liveDoc.updated = doc.updatedAt || new Date().toISOString();
        }
      }
      $("saveStatus").textContent = "已同步至 FUMO 共用 D1";
      $("updatedAt").textContent = "最近編輯：剛剛";
      return true;
    });
    saveQueue = operation.catch(() => false);
    return operation.catch(error => {
      if (error.message !== "unauthorized" && error.message !== "admin_required") $("saveStatus").textContent = "同步失敗，請檢查網路後重試";
      return false;
    });
  }

  function renderList() {
    docList.innerHTML = "";
    let visible = docs.filter(doc => {
      const matches = `${doc.title} ${doc.kind} ${doc.content}`.toLowerCase().includes(query.toLowerCase());
      if (!matches) return false;
      if (filter === "starred") return doc.starred;
      if (filter === "templates") return doc.kind === "範本";
      return true;
    });
    if (filter === "recent") visible = visible.slice(0, 6);
    if (!visible.length) {
      docList.innerHTML = docs.length ? '<div class="empty-state">沒有符合條件的文件</div>' : '<div class="empty-state">目前尚無共用文件</div>';
      return;
    }
    for (const doc of visible) {
      const button = document.createElement("button");
      button.className = `doc-link${doc.id === activeId ? " selected" : ""}`;
      button.innerHTML = `<span class="doc-dot"></span><span class="doc-name">${safe(doc.title)}</span>`;
      button.title = doc.title;
      button.onclick = () => selectDoc(doc.id);
      docList.appendChild(button);
    }
  }

  function selectDoc(id) {
    const current = active();
    if (canEdit && editorReady && current && input.value !== current.content) {
      current.content = input.value;
      void persist();
    }
    activeId = id;
    const doc = active();
    if (!doc) return;
    $("docTitle").textContent = doc.title;
    $("docTypeLabel").textContent = `${doc.kind} · Markdown 文件`;
    input.value = doc.content;
    editorReady = true;
    preview.innerHTML = renderMarkdown(doc.content);
    $("updatedAt").textContent = `最近編輯：${formatDate(doc.updated)}`;
    count();
    renderList();
    $("sidebar").classList.remove("open");
  }

  function showEmptyWorkspace() {
    activeId = "";
    editorReady = false;
    $("docTitle").textContent = "尚無共用文件";
    $("docTypeLabel").textContent = "文件工作區";
    $("updatedAt").textContent = "等待文件建立";
    input.value = "";
    preview.innerHTML = '<p>目前尚無共用文件。二級管理員以上可新增或匯入文件。</p>';
    count();
    renderList();
  }

  function count() {
    const text = input.value;
    const words = (text.match(/[\u3400-\u9fff]|[A-Za-z0-9_]+/g) || []).length;
    $("wordCount").textContent = `${words} 字 · ${text.length} 字元`;
  }

  let saveTimer;
  function update() {
    if (!canEdit) return;
    const doc = active();
    if (!doc) return;
    doc.content = input.value;
    preview.innerHTML = renderMarkdown(input.value);
    $("saveStatus").textContent = "等待同步…";
    count();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { void persist(); }, 350);
  }
  input.addEventListener("input", update);

  function selectMode(mode) {
    editorBody.classList.remove("preview-only", "edit-only");
    $("splitMode").classList.toggle("active", mode === "split");
    $("editMode").classList.toggle("active", mode === "edit");
    $("readMode").classList.toggle("active", mode === "read");
    if (mode === "edit") editorBody.classList.add("edit-only");
    if (mode === "read") editorBody.classList.add("preview-only");
  }
  $("splitMode").onclick = () => selectMode("split");
  $("editMode").onclick = () => selectMode("edit");
  $("readMode").onclick = () => selectMode("read");
  $("previewBtn").onclick = () => { selectMode("read"); preview.scrollIntoView({ behavior: "smooth", block: "center" }); };
  $("editBtn").onclick = () => { selectMode("edit"); input.focus(); };
  $("search").addEventListener("input", event => { query = event.target.value; renderList(); });
  document.querySelectorAll(".nav-btn").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    filter = button.dataset.section;
    renderList();
  }));

  $("newDoc").onclick = () => {
    if (!canEdit) return;
    const id = `doc-${crypto.randomUUID()}`;
    const doc = { id, title: "未命名文件", kind: "新文件", updated: "剛剛", starred: false, content: "# 未命名文件\n\n在此開始撰寫 Markdown…" };
    docs.unshift(doc);
    void persist();
    renderList();
    selectDoc(id);
    $("docTitle").setAttribute("contenteditable", "true");
    $("docTitle").focus();
    toast("已建立新文件；可點擊標題重新命名");
  };

  $("importDocBtn").onclick = () => $("importDocInput").click();
  $("importDocInput").addEventListener("change", async event => {
    if (!canEdit) { event.target.value = ""; return; }
    const files = [...event.target.files];
    event.target.value = "";
    if (!files.length) return;
    const accepted = files.filter(file => /\.(md|markdown|txt)$/i.test(file.name));
    const skipped = files.length - accepted.length;
    if (!accepted.length) { toast("只支援匯入 .md、.markdown 或 .txt 檔案"); return; }
    try {
      const imported = await Promise.all(accepted.map(async (file, index) => {
        const content = (await file.text()).replace(/^\uFEFF/, "");
        const title = file.name.replace(/\.(md|markdown|txt)$/i, "").slice(0, 200).trim() || `匯入文件 ${index + 1}`;
        return { id: `import-${crypto.randomUUID()}`, title, kind: "匯入", updated: "剛剛", starred: false, content };
      }));
      const previousId = activeId;
      docs.unshift(...imported);
      activeId = imported[0].id;
      editorReady = false;
      if (!await persist()) {
        docs = docs.filter(doc => !imported.some(item => item.id === doc.id));
        activeId = previousId;
        editorReady = false;
        renderList();
        if (activeId) selectDoc(activeId);
        toast("同步失敗，未能完成匯入；請檢查網路後重試");
        return;
      }
      renderList();
      selectDoc(activeId);
      toast(`${imported.length} 個檔案已匯入共用工作區${skipped ? `；已略過 ${skipped} 個不支援格式` : ""}`);
    } catch (_) {
      toast("匯入失敗，請確認檔案可讀後再試");
    }
  });

  $("docTitle").addEventListener("blur", () => {
    if (!canEdit || !$("docTitle").isContentEditable) return;
    const doc = active();
    if (!doc) return;
    const name = $("docTitle").textContent.trim();
    if (name) doc.title = name.slice(0, 200);
    $("docTitle").removeAttribute("contenteditable");
    $("docTitle").textContent = doc.title;
    renderList();
    void persist();
  });
  $("docTitle").addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); $("docTitle").blur(); }
  });

  $("downloadBtn").onclick = () => {
    const doc = active();
    if (!doc) return;
    const blob = new Blob([input.value], { type: "text/markdown;charset=utf-8" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${doc.title.replace(/[\\/:*?"<>|]/g, "-") || "fumo-document"}.md`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
    toast("Markdown 檔案已匯出");
  };

  $("deleteDocBtn").onclick = async () => {
    if (!canEdit) return;
    const doc = active();
    if (!doc) return;
    if (!window.confirm(`確定要刪除「${doc.title}」嗎？這會從 FUMO 所有成員共用工作區刪除，且無法復原。`)) return;
    const oldIndex = docs.findIndex(item => item.id === doc.id);
    if (oldIndex < 0) return;
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(doc.id)}`, { method: "DELETE", credentials: "same-origin" });
      if (response.status === 401) { location.replace(loginUrl()); return; }
      if (response.status === 403) { revokeEditAccess(); throw new Error("admin_required"); }
      if (!response.ok) throw new Error("delete_failed");
      syncedSignatures.delete(doc.id);
      docs.splice(oldIndex, 1);
      if (!docs.length) docs.push({ id: `doc-${crypto.randomUUID()}`, title: "未命名文件", kind: "新文件", updated: "剛剛", starred: false, content: "# 未命名文件\n\n在此開始撰寫 Markdown…" });
      activeId = docs[Math.min(Math.max(oldIndex, 0), docs.length - 1)].id;
      editorReady = false;
      await persist();
      selectDoc(activeId);
      toast("文件已從共用工作區刪除");
    } catch (error) {
      toast(error.message === "admin_required" ? "需要二級管理員以上權限" : "刪除失敗，請檢查網路後重試");
    }
  };

  document.querySelectorAll("[data-wrap]").forEach(button => button.onclick = () => {
    if (!canEdit) return;
    const mark = button.dataset.wrap;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = input.value.slice(start, end);
    input.setRangeText(mark + selected + mark, start, end, "select");
    update();
    input.focus();
  });
  document.querySelectorAll("[data-prefix]").forEach(button => button.onclick = () => {
    if (!canEdit) return;
    const start = input.selectionStart;
    const lineStart = input.value.lastIndexOf("\n", start - 1) + 1;
    input.setRangeText(button.dataset.prefix, lineStart, lineStart, "end");
    update();
    input.focus();
  });

  function toast(message) {
    const element = $("toast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove("show"), 2200);
  }
  $("mobileMenu").onclick = () => $("sidebar").classList.toggle("open");
  document.addEventListener("click", event => {
    if (window.innerWidth <= 850 && $("sidebar").classList.contains("open") && !$("sidebar").contains(event.target) && !$("mobileMenu").contains(event.target)) $("sidebar").classList.remove("open");
  });
  document.addEventListener("keydown", event => {
    if (canEdit && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      clearTimeout(saveTimer);
      void persist().then(ok => toast(ok ? "文件已同步至共用工作區" : "同步失敗，請稍後重試"));
    }
    if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      event.preventDefault();
      $("search").focus();
    }
  });
  $("logoutBtn").onclick = async () => {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); } catch (_) { /* Continue to the main sign-in page. */ }
    location.replace("/login");
  };

  window.FUMO_RENDER_MARKDOWN = renderMarkdown;
  window.FUMO_GET_ACTIVE_DOCUMENT = () => {
    const doc = active();
    if (!doc) return null;
    if (canEdit) {
      doc.content = input.value;
      void persist();
    }
    return { id: doc.id, title: doc.title, content: input.value };
  };

  async function refreshDocuments() {
    if (!authenticated || document.hidden) return;
    try {
      const response = await fetch("/api/documents", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) { location.replace(loginUrl()); return; }
      if (!response.ok) return;
      const result = await response.json();
      const remoteDocs = Array.isArray(result.documents) ? result.documents.map(normalizeDocument) : [];
      const remoteIds = new Set(remoteDocs.map(doc => doc.id));
      const changedActive = new Set();
      let changed = false;
      for (const remote of remoteDocs) {
        const local = docs.find(doc => doc.id === remote.id);
        if (!local) {
          docs.push(remote);
          syncedSignatures.set(remote.id, signature(remote));
          changed = true;
          if (remote.id === activeId) changedActive.add(remote.id);
          continue;
        }
        const known = syncedSignatures.get(remote.id);
        const localIsClean = known !== undefined && signature(local) === known;
        if (localIsClean && signature(remote) !== known) {
          Object.assign(local, remote);
          syncedSignatures.set(remote.id, signature(remote));
          changed = true;
          changedActive.add(remote.id);
        } else if (known === undefined) {
          syncedSignatures.set(remote.id, signature(remote));
        }
      }
      for (const local of [...docs]) {
        const known = syncedSignatures.get(local.id);
        if (!remoteIds.has(local.id) && known !== undefined && signature(local) === known) {
          docs = docs.filter(doc => doc.id !== local.id);
          syncedSignatures.delete(local.id);
          changed = true;
          if (local.id === activeId) activeId = docs[0]?.id || "";
        }
      }
      if (changed) {
        docs.sort((left, right) => String(right.updated).localeCompare(String(left.updated)));
        if (!docs.length) {
          if (canEdit) {
            const fresh = { id: `doc-${crypto.randomUUID()}`, title: "未命名文件", kind: "新文件", updated: "剛剛", starred: false, content: "# 未命名文件\n\n在此開始撰寫 Markdown…" };
            docs.push(fresh);
            activeId = fresh.id;
            void persist();
          }
        }
        renderList();
        if (!docs.length) {
          showEmptyWorkspace();
        } else {
          if (!docs.some(doc => doc.id === activeId)) activeId = docs[0].id;
        }
        if (docs.length && (changedActive.has(activeId) || !editorReady)) {
          const doc = active();
          $("docTitle").textContent = doc.title;
          input.value = doc.content;
          preview.innerHTML = renderMarkdown(doc.content);
          $("updatedAt").textContent = `最近編輯：${formatDate(doc.updated)}`;
          count();
          editorReady = true;
        }
      }
      if (canEdit && docs.some(doc => signature(doc) !== syncedSignatures.get(doc.id))) void persist();
      else $("saveStatus").textContent = docs.length ? "已同步至 FUMO 共用 D1" : "目前尚無共用文件";
    } catch (_) {
      $("saveStatus").textContent = canEdit ? "暫時無法同步；本頁修改仍會重試" : "目前無法載入共用文件，請稍後重試";
    }
  }

  async function bootWorkspace() {
    const publicRoute = location.pathname.startsWith("/share/") || location.pathname === "/share-legacy" || location.hash.startsWith("#public=");
    if (publicRoute) {
      document.querySelector(".shell")?.classList.add("hidden");
      $("workspaceBoot").hidden = true;
      return;
    }
    document.querySelector(".shell")?.classList.add("hidden");
    let stage = "登入驗證";
    setBootStatus("正在載入文件工作區", "正在確認登入狀態與文件權限，請稍候。");
    try {
      const { response: authResponse, data: user } = await requestWorkspaceJson("/api/auth/me");
      if (authResponse.status === 401 || authResponse.status === 403) { location.replace(loginUrl()); return; }
      if (!authResponse.ok) throw new Error("authentication_service_unavailable");
      authenticated = true;
      setAccessMode(user);
      stage = "共用文件讀取";
      setBootStatus("正在讀取共用文件", "登入已確認，正在從 FUMO 共用 D1 載入文件。");
      const { response, data: result } = await requestWorkspaceJson("/api/documents");
      if (response.status === 401) { location.replace(loginUrl()); return; }
      if (!response.ok) throw new Error("document_load_failed");
      const remoteDocs = Array.isArray(result.documents) ? result.documents.map(normalizeDocument) : [];
      if (remoteDocs.length) {
        docs = remoteDocs;
        for (const doc of docs) syncedSignatures.set(doc.id, signature(doc));
      } else if (canEdit) {
        docs = seed.map(doc => ({ ...doc }));
      } else {
        docs = [];
      }
      activeId = docs[0]?.id || "";
      renderList();
      if (activeId) selectDoc(activeId);
      else showEmptyWorkspace();
      $("workspaceBoot").hidden = true;
      document.querySelector(".shell")?.classList.remove("hidden");
      // A write must never block the authenticated reader/editor from rendering.
      if (!remoteDocs.length && canEdit) void persist();
      else $("saveStatus").textContent = remoteDocs.length ? "已同步至 FUMO 共用 D1" : "目前尚無共用文件，等待二級管理員建立";
      window.setInterval(() => { void refreshDocuments(); }, 15000);
    } catch (error) {
      revokeEditAccess();
      const timedOut = error.name === "AbortError";
      setBootStatus(timedOut ? "文件工作區載入逾時" : "文件工作區暫時無法載入", timedOut
        ? `${stage}超過 15 秒仍未完成。請重新載入；不會跳過登入或權限驗證。`
        : `${stage}未完成，請重新載入或稍後重試。`, true);
      console.error("FUMO workspace initialization failed", { stage, error: error.name, message: error.message });
    }
  }

  void bootWorkspace();
})();

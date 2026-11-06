/* =========================================================
   版权登记服务原型 · 交互脚本
   ========================================================= */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  /* ---------- 顶部导航 ---------- */
  const header = $(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const navToggle = $(".nav__toggle");
  const navLinks = $(".nav__links");
  on(navToggle, "click", () => {
    const open = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "收起导航" : "展开导航");
  });
  on(navLinks, "click", (e) => {
    if (!e.target.closest("a")) return;
    navLinks.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "展开导航");
  });
  on(document, "keydown", (e) => {
    if (e.key === "Escape" && navLinks?.classList.contains("is-open")) {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "展开导航");
      navToggle.focus();
    }
  });

  /* ---------- 入场动效 ---------- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    $$("[data-reveal]").forEach((el) => io.observe(el));
  } else {
    $$("[data-reveal]").forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- 作品对比滑块（支持多个） ---------- */
  $$(".compare").forEach((compare) => {
    const knob = $(".compare__knob", compare);
    if (!knob) return;
    let dragging = false;

    const applyPosition = (value) => {
      const next = Math.max(0, Math.min(100, value));
      compare.style.setProperty("--pos", next + "%");
      knob.setAttribute("aria-valuenow", String(Math.round(next)));
      knob.dataset.edge = next <= 0 ? "start" : next >= 100 ? "end" : "middle";
    };

    const setPos = (clientX) => {
      const rect = compare.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      applyPosition(pct);
    };

    on(knob, "pointerdown", (e) => {
      dragging = true;
      knob.setPointerCapture?.(e.pointerId);
    });
    window.addEventListener("pointerup", () => (dragging = false));
    window.addEventListener("pointermove", (e) => {
      if (dragging) setPos(e.clientX);
    });
    on(compare, "click", (e) => {
      if (e.target.closest(".compare__knob")) return;
      setPos(e.clientX);
    });
    on(knob, "keydown", (e) => {
      const parsed = parseFloat(getComputedStyle(compare).getPropertyValue("--pos"));
      const current = Number.isFinite(parsed) ? parsed : 58;
      if (e.key === "Home") { e.preventDefault(); applyPosition(0); return; }
      if (e.key === "End") { e.preventDefault(); applyPosition(100); return; }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = current + (e.key === "ArrowLeft" ? -5 : 5);
        applyPosition(next);
      }
    });
  });

  /* ---------- FAQ 分组 ---------- */
  const faqTabs = $$('[role="tab"].faq-tab');
  if (faqTabs.length) {
    faqTabs.forEach((tab) => {
      on(tab, "click", () => {
        faqTabs.forEach((t) => { t.setAttribute("aria-selected", "false"); t.tabIndex = -1; });
        tab.setAttribute("aria-selected", "true");
        tab.tabIndex = 0;
        $$(".faq-group").forEach((g) => g.classList.remove("is-active"));
        const target = $('#' + tab.dataset.tab);
        if (target) target.classList.add("is-active");
      });
      on(tab, "keydown", (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const offset = e.key === "ArrowRight" ? 1 : -1;
        const next = (faqTabs.indexOf(tab) + offset + faqTabs.length) % faqTabs.length;
        faqTabs[next].focus();
        faqTabs[next].click();
      });
    });
  }

  /* ---------- Toast ---------- */
  let toastEl = $(".toast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2400);
  };

  /* =========================================================
     登记流程
     ========================================================= */
  const funnel = $("[data-funnel]");
  if (funnel) {
    const STORAGE_KEY = "bq_order_v1";
    const defaults = {
      workName: "",
      type: "",
      region: "",
      school: "",
      phone: "",
      paid: false,
      realname: false,
      formDone: false,
    };
    let order = Object.assign({}, defaults, readJSON(STORAGE_KEY));

    function readJSON(key) {
      try {
        return JSON.parse(localStorage.getItem(key) || "{}");
      } catch (e) {
        return {};
      }
    }
    function saveOrder() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
      } catch (e) {}
    }

    const panels = $$(".funnel-step", funnel);
    const steps = $$(".stepper__item", funnel);
    const showStep = (n) => {
      panels.forEach((p) => {
        const active = p.dataset.panel === String(n);
        p.classList.toggle("is-active", active);
        p.hidden = !active;
      });
      steps.forEach((s) => {
        const i = Number(s.dataset.step);
        s.classList.toggle("is-active", i === n);
        s.classList.toggle("is-done", i < n);
      });
      const target = $(".stepper");
      if (target && n > 1) {
        window.scrollTo({ top: target.offsetTop - 80, behavior: "smooth" });
      }
    };

    /* ---- 步骤 1：必读 ---- */
    const noticeInputs = $$(".notice-input", funnel);
    const progressBar = $(".read-progress__bar i", funnel);
    const progressText = $(".read-progress__text", funnel);
    const toStep2 = $("#toStep2", funnel);
    const noticeTabs = $$("[data-notice-tab]", funnel);
    const notices = $$(".notice", funnel);

    const showNotice = (index) => {
      notices.forEach((notice, i) => {
        const active = i === index;
        notice.classList.toggle("is-current", active);
        notice.hidden = !active;
      });
      noticeTabs.forEach((tab, i) => {
        const active = i === index;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-pressed", String(active));
      });
    };
    const syncNotices = () => {
      const checked = noticeInputs.filter((i) => i.checked).length;
      if (progressBar) progressBar.style.width = (checked / noticeInputs.length) * 100 + "%";
      if (progressText) progressText.textContent = checked + " / " + noticeInputs.length + " 条已阅读";
      if (toStep2) toStep2.disabled = checked !== noticeInputs.length;
      noticeInputs.forEach((input, i) => {
        input.closest(".notice")?.classList.toggle("is-checked", input.checked);
        noticeTabs[i]?.classList.toggle("is-read", input.checked);
      });
    };
    noticeTabs.forEach((tab, i) => on(tab, "click", () => showNotice(i)));
    noticeInputs.forEach((input) => on(input, "change", () => {
      syncNotices();
      if (input.checked) {
        const next = noticeInputs.findIndex((item) => !item.checked);
        if (next !== -1) showNotice(next);
      }
    }));
    showNotice(0);
    syncNotices();

    on(toStep2, "click", () => {
      showStep(2);
      setTimeout(() => $("#workName", funnel)?.focus(), 200);
    });

    /* ---- 步骤 2：基础信息 ---- */
    const typeChips = $$(".type-chip", funnel);
    let selectedType = order.type || "";
    typeChips.forEach((chip) => {
      chip.classList.toggle("is-selected", chip.dataset.type === selectedType);
      chip.setAttribute("aria-pressed", String(chip.dataset.type === selectedType));
      on(chip, "click", () => {
        typeChips.forEach((c) => { c.classList.remove("is-selected"); c.setAttribute("aria-pressed", "false"); });
        chip.classList.add("is-selected");
        chip.setAttribute("aria-pressed", "true");
        selectedType = chip.dataset.type;
        syncSummary();
      });
    });

    const fields = {
      workName: $("#workName", funnel),
      region: $("#region", funnel),
      school: $("#school", funnel),
      phone: $("#phone", funnel),
    };

    const setError = (input, msg) => {
      const err = $('[data-error-for="' + input.id + '"]', funnel);
      if (err) {
        err.textContent = msg;
        err.classList.add("is-visible");
      }
      input.setAttribute("aria-invalid", "true");
    };
    const clearError = (input) => {
      const err = $('[data-error-for="' + input.id + '"]', funnel);
      if (err) err.classList.remove("is-visible");
      input.removeAttribute("aria-invalid");
    };

    Object.values(fields).forEach((input) => {
      on(input, "input", () => {
        clearError(input);
        syncSummary();
      });
    });

    on($("#wechatFill", funnel), "click", () => {
      fields.phone.value = "138 0013 8000";
      clearError(fields.phone);
      syncSummary();
      toast("已填入演示手机号");
    });

    if (order.workName) fields.workName.value = order.workName;
    if (order.region) fields.region.value = order.region;
    if (order.school) fields.school.value = order.school;
    if (order.phone) fields.phone.value = order.phone;
    syncSummary();

    function syncSummary() {
      const get = (el) => (el ? el.value.trim() : "");
      const name = get(fields.workName) || "待填写";
      const region = get(fields.region) || "待选择";
      const phone = get(fields.phone) || "待填写";
      [["#sumWork", name], ["#sumType", selectedType || "待选择"], ["#sumRegion", region], ["#sumPhone", phone], ["#payWork", name], ["#payType", selectedType || "待选择"], ["#payRegion", region], ["#payPhone", phone]].forEach(([sel, val]) => {
        const el = $(sel, funnel);
        if (el) el.textContent = val;
      });
    }

    on($("#basicForm", funnel), "submit", (e) => {
      e.preventDefault();
      let ok = true;
      let firstBad = null;
      const name = fields.workName.value.trim();
      const region = fields.region.value;
      const school = fields.school.value.trim();
      const phone = fields.phone.value.replace(/\s/g, "");

      if (!name) { setError(fields.workName, "请填写作品名称，证书上会使用这个名称"); ok = false; firstBad = firstBad || fields.workName; }
      else if (name.length > 40) { setError(fields.workName, "作品名称最多 40 个字符"); ok = false; firstBad = firstBad || fields.workName; }
      if (!selectedType) { toast("请选择作品类型"); ok = false; }
      if (!region) { setError(fields.region, "请选择参赛赛区"); ok = false; firstBad = firstBad || fields.region; }
      if (!school) { setError(fields.school, "请填写院校名称"); ok = false; firstBad = firstBad || fields.school; }
      if (!/^1[3-9]\d{9}$/.test(phone)) { setError(fields.phone, "请填写 11 位手机号，用于审核通知与退款"); ok = false; firstBad = firstBad || fields.phone; }
      if (!ok) { firstBad?.focus(); return; }

      order.workName = name;
      order.type = selectedType;
      order.region = region;
      order.school = school;
      order.phone = phone;
      saveOrder();
      syncSummary();
      showStep(3);
    });

    /* ---- 步骤 3：支付 ---- */
    const payMethods = $$(".pay-method", funnel);
    payMethods.forEach((m) => {
      on(m, "click", () => {
        payMethods.forEach((x) => x.classList.remove("is-active"));
        m.classList.add("is-active");
      });
    });

    // 生成一个仅用于原型的二维码图形
    const qr = $("#demoQr", funnel);
    if (qr) qr.innerHTML = qrPattern();

    const payConfirm = $("#payConfirm", funnel);
    const simulatePay = $("#simulatePay", funnel);
    on(payConfirm, "change", () => { if (simulatePay) simulatePay.disabled = !payConfirm.checked; });
    on(simulatePay, "click", () => {
      if (!payConfirm?.checked) { toast("请先阅读并确认付款规则"); return; }
      order.paid = true;
      saveOrder();
      renderTaskCenter();
      showStep(4);
      toast("演示流程：已进入资料任务中心（未产生真实支付）");
    });

    /* ---- 步骤 4：任务中心 ---- */
    const deadline = () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.getFullYear() + " 年 " + (d.getMonth() + 1) + " 月 " + d.getDate() + " 日";
    };

    function renderTaskCenter() {
      const wl = $("#tcWork", funnel);
      if (wl) wl.textContent = "《" + (order.workName || "轻盈一夏") + "》 · " + (order.region || "北京赛区") + " · " + (order.type || "平面类");
      const ph = $("#tcPhone", funnel);
      if (ph) ph.textContent = maskPhone(order.phone);
      const dl = $("#tcDeadline", funnel);
      if (dl) dl.textContent = deadline();
      const nameTask = $("#taskRealname", funnel);
      const formTask = $("#taskForm", funnel);
      if (nameTask) {
        nameTask.classList.toggle("is-done", order.realname);
        const act = $(".task__action", nameTask);
        if (act) act.innerHTML = order.realname
          ? '<span class="pill pill--green">已完成</span>'
          : '<button class="btn btn--primary btn--sm" type="button" data-realname>去实名认证</button>';
      }
      if (formTask) {
        formTask.classList.toggle("is-done", order.formDone);
        const act = $(".task__action", formTask);
        if (act) act.innerHTML = order.formDone
          ? '<span class="pill pill--green">资料已完善</span>'
          : '<a class="btn btn--primary btn--sm" href="form.html">去填写</a>';
      }
      const done = (order.realname ? 1 : 0) + (order.formDone ? 1 : 0);
      const bar = $("#tcProgressBar", funnel);
      if (bar) bar.style.width = Math.round((done / 3) * 100) + "%";
      const label = $("#tcProgressText", funnel);
      if (label) label.textContent = done + " / 3 项已完成";
      const submitTask = $("#taskSubmit", funnel);
      if (submitTask) {
        const ready = order.realname && order.formDone;
        submitTask.classList.toggle("is-done", ready);
        const act = $(".task__action", submitTask);
        if (act) act.innerHTML = ready
          ? '<button class="btn btn--dark btn--sm" type="button" id="finalSubmit">提交审核</button>'
          : '<span class="pill pill--amber">待前置任务完成</span>';
      }
      bindTaskActions();
    }

    function bindTaskActions() {
      $$("[data-realname]", funnel).forEach((b) => on(b, "click", openRealname));
      const finalBtn = $("#finalSubmit", funnel);
      on(finalBtn, "click", () => {
        toast("演示流程：资料校验完成（尚未真实提交）");
        finalBtn.textContent = "演示校验完成";
        finalBtn.disabled = true;
      });
    }

    function maskPhone(p) {
      if (!p) return "未填写";
      const s = p.replace(/\s/g, "");
      return s.length === 11 ? s.slice(0, 3) + " **** " + s.slice(-4) : s;
    }

    /* 实名认证弹窗 */
    const rnDialog = $("#realnameDialog");
    const rnSteps = $$(".rn-step", rnDialog);
    const rnDoneBtn = $("#rnDone", rnDialog);
    const syncRn = () => {
      const done = rnSteps.filter((s) => s.classList.contains("is-done")).length;
      if (rnDoneBtn) rnDoneBtn.disabled = done < rnSteps.length;
    };

    function openRealname() {
      rnSteps.forEach((s) => s.classList.remove("is-done"));
      syncRn();
      rnDialog?.showModal();
    }
    rnSteps.forEach((step) => {
      const mark = () => {
        step.classList.add("is-done");
        syncRn();
      };
      on(step, "click", mark);
      on(step, "keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); mark(); }
      });
    });
    on(rnDoneBtn, "click", () => {
      order.realname = true;
      saveOrder();
      rnDialog?.close();
      renderTaskCenter();
      toast("实名认证已完成");
    });
    on($("#rnClose", rnDialog), "click", () => rnDialog?.close());

    // 从资料页返回时刷新任务状态
    order = Object.assign({}, defaults, readJSON(STORAGE_KEY));
    renderTaskCenter();
    if (order.paid && location.hash === "#tasks") showStep(4);
    if (location.hash === "#tasks" && order.paid) renderTaskCenter();

    /* 步骤切换（从资料页返回） */
    window.addEventListener("hashchange", () => {
      if (location.hash === "#tasks") {
        order = Object.assign({}, defaults, readJSON(STORAGE_KEY));
        renderTaskCenter();
        showStep(4);
      }
    });
  }

  /* 二维码图形（原型演示） */
  function qrPattern() {
    let cells = "";
    const N = 21;
    const seed = [
      [0,0,1,1,1,0,0],[0,1,0,0,0,1,0],[1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,1,1,0,1,1,1],[0,1,0,0,0,1,0],[0,0,1,1,1,0,0]
    ];
    const finder = (x, y, ox, oy) => {
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
        if (seed[i][j]) cells += '<rect x="' + ((ox + i) * x) + '" y="' + ((oy + j) * y) + '" width="' + x + '" height="' + y + '"/>';
      }
    };
    const s = 8;
    finder(s, s, 0, 0);
    finder(s, s, 14, 0);
    finder(s, s, 0, 14);
    // 随机但确定的数据点
    let n = 1234567;
    for (let y = 8; y < 14; y++) for (let x = 0; x < 21; x++) {
      n = (n * 1103515245 + 12345) & 0x7fffffff;
      if (n % 3 === 0) cells += '<rect x="' + (x * s) + '" y="' + (y * s) + '" width="' + s + '" height="' + s + '"/>';
    }
    for (let x = 8; x < 14; x++) for (let y = 0; y < 21; y++) {
      n = (n * 1103515245 + 12345) & 0x7fffffff;
      if (n % 3 === 0) cells += '<rect x="' + (x * s) + '" y="' + (y * s) + '" width="' + s + '" height="' + s + '"/>';
    }
    return '<svg viewBox="0 0 168 168" role="img" aria-label="演示支付二维码" fill="#15171c">' + cells + '</svg>';
  }

  /* =========================================================
     资料表单
     ========================================================= */
  const formPage = $("[data-form-page]");
  if (formPage) {
    const KEY = "bq_order_v1";
    let order = {};
    try { order = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}

    const nameInput = $("#workName", formPage);
    const typeChips = $$(".type-chip", formPage);
    const typeBox = $("#formTypeLabel");
    const orderWork = $("#orderWork");
    if (orderWork) orderWork.textContent = order.workName || "轻盈一夏";
    if (order.workName && nameInput) nameInput.value = order.workName;
    if (typeBox && order.type) typeBox.textContent = order.type;
    typeChips.forEach((chip) => {
      chip.setAttribute("aria-pressed", String(Boolean(order.type && chip.dataset.type === order.type)));
      if (order.type && chip.dataset.type === order.type) {
        typeChips.forEach((c) => c.classList.remove("is-selected"));
        chip.classList.add("is-selected");
        if (typeBox) typeBox.textContent = order.type;
      }
      on(chip, "click", () => {
        typeChips.forEach((c) => { c.classList.remove("is-selected"); c.setAttribute("aria-pressed", "false"); });
        chip.classList.add("is-selected");
        chip.setAttribute("aria-pressed", "true");
        order.type = chip.dataset.type;
        try { localStorage.setItem(KEY, JSON.stringify(order)); } catch (e) {}
        if (typeBox) typeBox.textContent = chip.dataset.type;
        configureUpload(chip.dataset.type);
      });
    });

    // 本地文件选择演示；文件不会离开当前浏览器页面。
    const upload = $("#uploadBox", formPage);
    const fileList = $("#fileList", formPage);
    const fileInput = $("#workFiles", formPage);
    const uploadHint = $("#uploadHint", formPage);
    const uploadCount = $("#uploadCount", formPage);
    let uploadLimit = 5;
    let isFlatArtwork = false;
    let selectedFileCount = 0;

    function configureUpload(type) {
      isFlatArtwork = type === "平面类";
      uploadLimit = isFlatArtwork ? 1 : 5;
      if (fileInput) {
        fileInput.multiple = !isFlatArtwork;
        fileInput.accept = isFlatArtwork
          ? ".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
          : ".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.pdf,.doc,.docx";
        fileInput.value = "";
      }
      selectedFileCount = 0;
      if (fileList) { fileList.replaceChildren(); delete fileList.dataset.added; }
      if (uploadHint) {
        uploadHint.textContent = isFlatArtwork
          ? "仅可提交 1 张 JPG / PNG / GIF / WEBP 图片。请将所有原创设计内容拼合到同一张图片中。"
          : "最多选择 5 个文件。请按所选作品类别准备文件；视频类支持 MP4 / MOV。";
      }
      if (uploadCount) uploadCount.textContent = (isFlatArtwork ? "图片 " : "文件 ") + "0/" + uploadLimit;
      if (upload) upload.setAttribute("aria-label", isFlatArtwork ? "选择 1 张平面作品图片" : "选择作品文件，最多 5 个");
    }

    const showSelectedFiles = (fileCollection) => {
      const files = Array.from(fileCollection || []);
      if (!files.length || !fileList) return;
      if (files.length > uploadLimit) {
        toast(isFlatArtwork ? "平面类作品只能选择 1 张图片" : "当前最多选择 5 个文件");
        if (fileInput) fileInput.value = "";
        return;
      }
      if (isFlatArtwork && files.some((file) => {
        const ext = file.name.split(".").pop().toLowerCase();
        return !["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
      })) {
        toast("平面类仅支持图片文件，请重新选择");
        if (fileInput) fileInput.value = "";
        return;
      }
      fileList.replaceChildren();
      files.forEach((file) => {
        const chip = document.createElement("span");
        chip.className = "file-chip";
        chip.textContent = file.name + " · 已在本机选择";
        fileList.appendChild(chip);
      });
      fileList.dataset.added = "1";
      selectedFileCount = files.length;
      if (uploadCount) uploadCount.textContent = (isFlatArtwork ? "图片 " : "文件 ") + files.length + "/" + uploadLimit;
    };
    configureUpload(order.type || "");
    on(fileInput, "click", (e) => e.stopPropagation());
    on(fileInput, "change", () => showSelectedFiles(fileInput.files));
    on(upload, "click", (e) => {
      if (e.target !== fileInput) fileInput?.click();
    });
    on(upload, "keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput?.click(); }
    });
    on(upload, "dragover", (e) => { e.preventDefault(); upload.classList.add("is-dragging"); });
    on(upload, "dragleave", () => upload.classList.remove("is-dragging"));
    on(upload, "drop", (e) => {
      e.preventDefault();
      upload.classList.remove("is-dragging");
      showSelectedFiles(e.dataTransfer?.files);
    });

    // 原创说明模板
    const desc = $("#opDesc", formPage);
    const descCount = $("#descCount", formPage);
    const syncDesc = () => { if (descCount) descCount.textContent = desc.value.length + " / 240"; };
    on(desc, "input", syncDesc);
    syncDesc();
    $$("[data-desc-template]", formPage).forEach((btn) => {
      on(btn, "click", () => {
        desc.value = btn.dataset.descTemplate;
        syncDesc();
        toast("已填入模板，可按实际情况修改");
      });
    });

    // 作者选择
    const identity = $("#identityCard", formPage);
    const selectAuthor = () => {
      identity.classList.add("is-selected");
      identity.setAttribute("aria-pressed", "true");
      const cb = $("#authorSelected", formPage);
      if (cb) cb.checked = true;
    };
    on(identity, "click", selectAuthor);
    on(identity, "keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectAuthor(); }
    });

    // 肖像
    const portraitRadios = $$('input[name="portrait"]', formPage);
    const portraitBox = $("#portraitUpload", formPage);
    portraitRadios.forEach((r) => {
      on(r, "change", () => {
        const isYes = r.value === "yes";
        portraitBox.hidden = !isYes;
        $$(".portrait-opt", formPage).forEach((o) => o.classList.toggle("is-selected", o.contains(r)));
      });
    });
    portraitBox.hidden = true;

    // 权利 chips
    $$(".right-chip", formPage).forEach((chip) => {
      on(chip, "click", () => chip.classList.toggle("is-on"));
      on(chip, "click", () => chip.setAttribute("aria-pressed", String(chip.classList.contains("is-on"))));
    });

    // 自检
    const selfChecks = $$('input[data-selfcheck]', formPage);
    const saveDraft = $("#saveDraft");
    const submitBtn = $("#submitForm");
    const errorBox = $("#errorSummary", formPage);

    on(saveDraft, "click", () => {
      if (nameInput) order.workName = nameInput.value.trim() || order.workName;
      try { localStorage.setItem(KEY, JSON.stringify(order)); } catch (e) {}
      const stamp = $("#saveStamp");
      if (stamp) stamp.textContent = "刚刚已保存到本机草稿";
      toast("草稿已保存在本机浏览器");
    });

    on(submitBtn, "click", (e) => {
      e.preventDefault();
      const missing = [];
      if (!nameInput?.value.trim()) missing.push({ id: "workName", text: "作品名称未填写" });
      if (!$$(".type-chip.is-selected", formPage).length) missing.push({ id: "typeBlock", text: "作品类型未选择" });
      if (!$("#creationDate", formPage)?.value) missing.push({ id: "creationDate", text: "作品创作时间未选择" });
      if (!selectedFileCount) missing.push({ id: "uploadBox", text: "作品文件尚未选择" });
      if (!$("#opDesc", formPage)?.value.trim()) missing.push({ id: "opDesc", text: "原创说明未填写" });
      if (!$("#authorSelected", formPage)?.checked) missing.push({ id: "identityCard", text: "未选择已实名认证的作者" });
      const unchecked = selfChecks.filter((c) => !c.checked).length;
      if (unchecked) missing.push({ id: "selfCheckBlock", text: "还有 " + unchecked + " 项作品自检未确认" });
      if (!$("#rightsAgree", formPage)?.checked) missing.push({ id: "rightsAgree", text: "未勾选权利归属承诺" });

      if (missing.length) {
        if (errorBox) {
          errorBox.innerHTML = '<h4>提交前还需处理 ' + missing.length + ' 项</h4>' +
            missing.map((m) => '<a href="#' + m.id + '">· ' + m.text + '</a>').join("");
          errorBox.classList.add("is-visible");
          errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      if (errorBox) errorBox.classList.remove("is-visible");
      order.formDone = true;
      try { localStorage.setItem(KEY, JSON.stringify(order)); } catch (e) {}
      toast("演示流程：资料已暂存，本地未真实提交");
      setTimeout(() => (location.href = "register.html#tasks"), 900);
    });

    // 侧边导航高亮
    const navAnchors = $$(".form-nav a", formPage);
    if (navAnchors.length && "IntersectionObserver" in window) {
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            navAnchors.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id));
          }
        });
      }, { rootMargin: "-30% 0px -60% 0px" });
      $$(".form-block", formPage).forEach((b) => io2.observe(b));
    }
  }
})();

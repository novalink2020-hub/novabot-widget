/* novabot-loader.js — FULL FILE */
/* NovaBot v6.9.7 – Shadow DOM Loader
   يعمل مع:
   - ui.css
   - ui.html
*/

(function () {
  const scriptEl = document.currentScript;
  if (!scriptEl) return;

  // ==============================
  // NovaBot UI State (Single Source of Truth)
  // ==============================
  const NovaUIState = {
    isOpen: false,
    isSending: false,
    isTyping: false,
    hasSession: false,
    sessionRestored: false,
    lastInteractionAt: null,
  };

  const API_URL = scriptEl.getAttribute("data-novabot-api") || "";

  function reportLoaderStage(stage, status, extra = {}) {
    if (!API_URL) return;

    try {
      fetch(API_URL.replace(/\/+$/, "") + "/telemetry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "novabot-loader",
          stage,
          status, // "success" | "fail"
          extra,
          ts: Date.now(),
        }),
      });
    } catch (e) {}
  }

  const LOCALE = scriptEl.getAttribute("data-novabot-locale") || "ar";

  // ===========================
  // Layer 4 (Client): Turnstile (Invisible)
  // ===========================
  const TURNSTILE_SITE_KEY =
    scriptEl.getAttribute("data-novabot-turnstile-sitekey") || "";

  let turnstileReady = false;
  let turnstileWidgetId = null;
  let lastTsToken = "";
  let lastTsAt = 0;

  const TS_CACHE_MS = 55 * 1000; // 55s cache
  const TS_EXEC_TIMEOUT_MS = 4500;
  const TS_READY_TIMEOUT_MS = 4000;

  const tsWaiters = [];

  function loadTurnstile() {
    if (!TURNSTILE_SITE_KEY) return;

    if (window.turnstile) {
      initTurnstile();
      return;
    }

    if (document.querySelector('script[data-novabot-turnstile="1"]')) return;

    const s = document.createElement("script");
    s.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.setAttribute("data-novabot-turnstile", "1");
    s.onload = initTurnstile;
    document.head.appendChild(s);
  }

  function initTurnstile() {
    if (!TURNSTILE_SITE_KEY) return;
    if (!window.turnstile || turnstileReady) return;

    const container = document.createElement("div");
    container.style.display = "none";
    document.body.appendChild(container);

    turnstileWidgetId = window.turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      size: "invisible",
      callback: function (token) {
        lastTsToken = String(token || "");
        lastTsAt = Date.now();

        if (tsWaiters.length) {
          const q = tsWaiters.slice();
          tsWaiters.length = 0;
          q.forEach((resolve) => {
            try {
              resolve(lastTsToken);
            } catch (e) {}
          });
        }
      },
      "error-callback": function () {
        if (tsWaiters.length) {
          const q = tsWaiters.slice();
          tsWaiters.length = 0;
          q.forEach((resolve) => {
            try {
              resolve("");
            } catch (e) {}
          });
        }
      },
      "expired-callback": function () {
        lastTsToken = "";
        lastTsAt = 0;
      },
    });

    turnstileReady = true;
  }

  function waitForTurnstileReady(timeoutMs = TS_READY_TIMEOUT_MS) {
    return new Promise((resolve) => {
      if (!TURNSTILE_SITE_KEY) return resolve(false);
      if (turnstileReady && window.turnstile && turnstileWidgetId !== null)
        return resolve(true);

      const start = Date.now();
      const t = setInterval(() => {
        if (turnstileReady && window.turnstile && turnstileWidgetId !== null) {
          clearInterval(t);
          resolve(true);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(t);
          resolve(false);
        }
      }, 50);
    });
  }

  async function getTurnstileToken() {
    if (!TURNSTILE_SITE_KEY) return "";

    if (lastTsToken && Date.now() - lastTsAt < TS_CACHE_MS) return lastTsToken;

    const ok = await waitForTurnstileReady(TS_READY_TIMEOUT_MS);
    if (!ok || !window.turnstile || turnstileWidgetId === null) return "";

    return new Promise((resolve) => {
      tsWaiters.push(resolve);

      try {
        window.turnstile.execute(turnstileWidgetId);
      } catch {
        const q = tsWaiters.slice();
        tsWaiters.length = 0;
        q.forEach((r) => {
          try {
            r("");
          } catch (e) {}
        });
      }

      setTimeout(() => {
        const idx = tsWaiters.indexOf(resolve);
        if (idx !== -1) tsWaiters.splice(idx, 1);
        resolve(lastTsToken || "");
      }, TS_EXEC_TIMEOUT_MS);
    });
  }

  // تحميل Turnstile مبكرًا
  loadTurnstile();

  // إنشاء حاوية للشادو
  const host = document.createElement("div");
  host.id = "novabot-shadow-host";
  host.style.position = "fixed";
  host.style.inset = "auto";
  host.style.right = "0";
  host.style.bottom = "0";
  host.style.width = "0";
  host.style.height = "0";
  host.style.zIndex = "9999";
  host.style.pointerEvents = "auto"; // مهم لعمل الضغط داخل الواجهة
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // مسار الملفات ui.css و ui.html
  const baseUrl = scriptEl.src.replace(/[^\/]+$/, "");
  const cssUrl = baseUrl + "ui.css";
  const htmlUrl = baseUrl + "ui.html";

  reportLoaderStage("loader_start", "success");

  Promise.all([
    fetch(cssUrl)
      .then((r) => {
        if (!r.ok) throw new Error("css_fetch_failed");
        return r.text();
      })
      .then((css) => {
        reportLoaderStage("ui_css_loaded", "success");
        return css;
      }),

    fetch(htmlUrl)
      .then((r) => {
        if (!r.ok) throw new Error("html_fetch_failed");
        return r.text();
      })
      .then((html) => {
        reportLoaderStage("ui_html_loaded", "success");
        return html;
      }),
  ])
    .then(([cssText, htmlText]) => {
      shadow.innerHTML = `<style>${cssText}</style>${htmlText}`;
      reportLoaderStage("shadow_injected", "success");

      try {
        initNovaBot(shadow, { apiUrl: API_URL, locale: LOCALE });
        reportLoaderStage("init_novabot", "success");
      } catch (e) {
        reportLoaderStage("init_novabot", "fail", { error: String(e) });
        throw e;
      }
    })
    .catch((err) => {
      reportLoaderStage("loader_failed", "fail", { error: String(err) });
      console.error("NovaBot loader error:", err);
    });

  // ================================
  // NovaBot Loader – Phase 1
  // Cards Stabilization + Autofill
  // ================================
  (function () {
    const NOVA_CONTACT_KEY = "novabot_user_contact";

    /* ======================================
       Helpers – Contact Cache
    ====================================== */

    function saveUserContact(val) {
      if (!val || typeof val !== "string") return;
      const clean = val.trim();
      if (clean.length < 4) return;
      try {
        localStorage.setItem(NOVA_CONTACT_KEY, clean);
      } catch (e) {}
    }

    function getUserContact() {
      try {
        return localStorage.getItem(NOVA_CONTACT_KEY) || "";
      } catch (e) {
        return "";
      }
    }

    function attachAutofill(inputEl) {
      if (!inputEl) return;

      const tryFill = () => {
        if (inputEl.value) return;
        const cached = getUserContact();
        if (cached) {
          inputEl.value = cached;
        }
      };

      inputEl.addEventListener("focus", tryFill);
      inputEl.addEventListener("mousedown", tryFill);
      inputEl.addEventListener("touchstart", tryFill);
    }

    /* ======================================
       Cards
    ====================================== */

    function createBusinessCard() {
      const card = document.createElement("div");
      card.className = "nova-card";

      card.innerHTML = `
      <div class="nova-card-header">📈 طوّر عملك بهدوء</div>
      <div class="nova-card-text">
        نوفا لينك تشاركك خلاصة ما يهم رائد الأعمال فعلًا:
        أدوات، أفكار، وتجارب عملية في الذكاء الاصطناعي للأعمال،
        بدون رسائل تسويقية مزعجة.
      </div>

      <input
        type="text"
        class="nova-card-input"
        placeholder="بريدك الإلكتروني"
      />

      <div class="nova-card-actions">
        <button class="nova-card-btn nova-card-btn-primary">
          اشترك الآن
        </button>
        <button
          class="nova-card-btn nova-card-btn-secondary"
          type="button"
        >
          زيارة صفحة الخدمات
        </button>
      </div>
    `;

      const input = card.querySelector(".nova-card-input");
      const primaryBtn = card.querySelector(".nova-card-btn-primary");
      const secondaryBtn = card.querySelector(".nova-card-btn-secondary");

      attachAutofill(input);

primaryBtn.addEventListener("click", async () => {
  const val = (input.value || "").trim();
  if (!val) {
    alert("يرجى إدخال بريدك الإلكتروني.");
    input.focus();
    return;
  }

  saveUserContact(val);

  // تأكد من وجود Session Token
  await ensureSessionToken();

  const leadPayload = {
    event_type: "lead_capture",
    lead_source: "novabot_ui",

    action: "اشتراك_اعمال",
    card_id: "business_subscribe",

    contact: {
      email: val,
    },

    user_context: {
      language: lang,
      device: isMobileViewport() ? "mobile" : "desktop",
      page_url: window.location.href,
    },

    conversation_context: {
      session_id: sessionToken || "",
    },

    meta: {
      timestamp: Date.now(),
      version: "lead_v1",
    },
  };

  dispatchNovaLeadEvent(leadPayload);

  primaryBtn.textContent = "تم الاشتراك ✓";
  primaryBtn.disabled = true;
});


      secondaryBtn.addEventListener("click", () => {
        window.open(
          "https://novalink-ai.com/services-khdmat-nwfa-lynk",
          "_blank"
        );
      });

      return card;
    }

    function createBotLeadCard() {
      const card = document.createElement("div");
      card.className = "nova-card";

      card.innerHTML = `
      <div class="nova-card-header">🤖 بوت دردشة لعملك</div>
      <div class="nova-card-text">
        كثير من المشاريع تخسر عملاء لأن الرد تأخر أو لم يكن مناسبًا.
        نوفا بوت يمكن تخصيصه لشرح خدماتك، الرد على الأسئلة المتكررة،
        وتوجيه العميل للخطوة الصحيحة بدل أن يضيعه.
      </div>

      <input
        type="text"
        class="nova-card-input"
        placeholder="بريدك الإلكتروني أو رقم واتساب"
      />

      <div class="nova-card-actions">
        <button class="nova-card-btn nova-card-btn-primary">
          احجز استشارة قصيرة
        </button>
      </div>
    `;

      const input = card.querySelector(".nova-card-input");
      const btn = card.querySelector(".nova-card-btn-primary");

      attachAutofill(input);

btn.addEventListener("click", async () => {
  const contact = (input.value || "").trim();
console.log("🟡 CONSULT BTN CLICKED", contact);
   
  if (!contact) {
    alert("يرجى إدخال وسيلة تواصل.");
    input.focus();
    return;
  }

  saveUserContact(contact);

  // ============================
  // 1️⃣ Lead Event (مضمون)
  // ============================
try {
  await ensureSessionToken();

  await dispatchNovaLeadEvent({
    event_type: "lead_capture",
    lead_source: "novabot_ui",

    action: "حجز_استشارة",
    card_id: "bot_consultation",

    contact: {
      value: contact,
      ...(contact.includes("@") ? { email: contact } : {}),
    },

    user_context: {
      language: lang,
      device: isMobileViewport() ? "mobile" : "desktop",
      page_url: window.location.href,
    },

    conversation_context: {
      session_id: sessionToken || "",
    },

    meta: {
      timestamp: Date.now(),
      version: "lead_v1",
    },
  });

  // ⏱️ micro-flush window before mailto
  await new Promise((r) => setTimeout(r, 120));

} catch (e) {
  console.warn("Consultation lead failed:", e);
}


  // ============================
  // 2️⃣ EMAIL — النص الأصلي كما هو
  // ============================
  const subject = encodeURIComponent("طلب استشارة – بوت دردشة لعملي");
  const body = encodeURIComponent(
`مرحبًا فريق نوفا لينك،

لدي مشروع وأفكّر في استخدام بوت دردشة لتخفيف ضغط الاستفسارات
وتحسين تجربة العملاء.

وسيلة التواصل:
${contact}

نوع النشاط:
الجمهور المستهدف:
أكثر تحدٍ أواجهه حاليًا:

تم إرسال هذه الرسالة عبر نوفا بوت.`
  );

  window.location.href =
    "mailto:contact@novalink-ai.com?subject=" +
    subject +
    "&body=" +
    body;
});




      return card;
    }

    function createCollaborationCard() {
      const card = document.createElement("div");
      card.className = "nova-card";

      card.innerHTML = `
      <div class="nova-card-header">🤝 تعاون وشراكات</div>
      <div class="nova-card-text">
        نرحّب بالتعاونات الجادة المرتبطة بالذكاء الاصطناعي للأعمال:
        محتوى، شراكات، ورش عمل، أو مشاريع مشتركة ذات قيمة حقيقية.
      </div>

      <div class="nova-card-actions">
        <button class="nova-card-btn nova-card-btn-primary">
          تواصل عبر البريد
        </button>
      </div>
    `;

      const btn = card.querySelector(".nova-card-btn-primary");

      btn.addEventListener("click", () => {
        const subject = encodeURIComponent("مقترح تعاون مع نوفا لينك");
        const body = encodeURIComponent(
          `مرحبًا فريق نوفا لينك،

أود مناقشة فكرة تعاون معكم.

نوع التعاون:
الجمهور المستهدف:
القيمة المتوقعة للطرفين:

تم إرسال هذه الرسالة عبر نوفا بوت.`
        );

        window.location.href =
          "mailto:contact@novalink-ai.com?subject=" +
          subject +
          "&body=" +
          body;
      });

      return card;
    }

    /* ======================================
       Export to existing switch
    ====================================== */

    window.NovaBotCards = {
      createBusinessCard,
      createBotLeadCard,
      createCollaborationCard,
    };
  })();

  // ============================================================
  //                      NovaBot Logic
  // ============================================================
  function initNovaBot(root, options) {
    const config = {
      BRAND_NAME: "نوفا لينك",
      PRIMARY_COLOR: "#1b577c",
      ACCENT_COLOR: "#fe930e",

      API_PRIMARY: options.apiUrl || "",
      API_FALLBACK: options.apiUrl || "",

      CHANNEL: "web",
      BUSINESS_TYPE: "blog",
      LOCALE: options.locale || "ar",

      SOUND_URL:
        "https://assets.zyrosite.com/YD0w46zZ5ZIrwlP8/new-notification-3-398649-RwIqiPPdJUta0dpV.mp3",

      SUBSCRIBE_URL: "https://novalink-ai.com/ashtrk-alan",
      SERVICES_URL: "https://novalink-ai.com/services-khdmat-nwfa-lynk",
      FEEDBACK_API: "",
      CONTACT_EMAIL: "contact@novalink-ai.com",
    };

    const lang = config.LOCALE === "en" ? "en" : "ar";

    const WELCOME_HTML =
      lang === "en"
        ? "Welcome to NovaLink 👋<br>I'm NovaBot… ready to help you with AI and business growth questions."
        : "مرحباً بك في نوفا لينك 👋<br>أنا نوفا بوت… جاهز لمساعدتك في أي سؤال حول الذكاء الاصطناعي وتطوير أعمالك.";

    const STORAGE_KEY = "novabot_v6.9_conversation";
    const STORAGE_TTL_MS = 12 * 60 * 60 * 1000;
    const EMAIL_STORAGE_KEY = "novabot_user_email"; // لتخزين آخر إيميل أدخله المستخدم
    const SEND_COOLDOWN_MS = 800; // منع الإرسال المتكرر السريع

    // ============================================================
    // Lead Event Dispatcher (Frontend)
    // ============================================================
async function dispatchNovaLeadEvent(payload) {
     console.log("🚨 DISPATCH LEAD CALLED", payload);
   
  if (!config.API_PRIMARY) {
    console.warn("NovaBot Lead: API_PRIMARY missing");
    return;
  }

  const url = config.API_PRIMARY.replace(/\/+$/, "") + "/lead-event";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { "X-NOVABOT-SESSION": sessionToken } : {}),
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("NovaBot Lead FAILED", {
        status: res.status,
        response: text,
        payload,
      });
    } else {
      console.log("NovaBot Lead OK", {
        status: res.status,
        response: text,
        payload,
      });
    }
  } catch (err) {
    console.error("NovaBot Lead ERROR", err);
  }
}



    // عناصر الواجهة
    const fabBtn = root.getElementById("novaFabBtn");
    const backdrop = root.getElementById("novaBackdrop");
    const closeBtn = root.getElementById("novaCloseBtn");
    const chatBody = root.getElementById("novaChatBody");
    const input = root.getElementById("novaInput");
    const sendBtn = root.getElementById("novaSendBtn");

    // ============================================================
    // Mobile/Tablet – Lock footer drag when keyboard is open
    // ============================================================
    (function lockFooterDragOnKeyboard() {
      const footer = root.querySelector(".nova-footer-row");
      if (!footer || !window.visualViewport) return;

      let keyboardOpen = false;
      let lastVVHeight = window.visualViewport.height;

      // نراقب حالة الكيبورد فقط
      window.visualViewport.addEventListener("resize", () => {
        const h = window.visualViewport.height;
        keyboardOpen = h < lastVVHeight - 80;
        lastVVHeight = h;
      });

      // منع سحب الفوتر فقط عند فتح الكيبورد
      footer.addEventListener(
        "touchmove",
        (e) => {
          if (!isMobileViewport()) return;
          if (!keyboardOpen) return;

          const target = e.target;

          // السماح بالتمرير داخل textarea إذا كان قابلًا للتمرير
          if (
            target &&
            target.tagName === "TEXTAREA" &&
            target.scrollHeight > target.clientHeight
          ) {
            return; // ✅ اسمح بالتمرير
          }

          // غير ذلك → اقفل سحب الفوتر
          e.preventDefault();
        },
        { passive: false }
      );
    })();

    if (!fabBtn || !backdrop || !closeBtn || !chatBody || !input || !sendBtn) {
      console.error("NovaBot UI elements missing");
      return;
    }

    /* ============================================================
       Mobile/Tablet Chat Resize – Full Two-Way Behaviour
       ============================================================ */
    (function enableMobileChatResizeFix() {
      if (!window.visualViewport) return;

      const chatShell = root.querySelector(".nova-chat-shell");
      if (!chatShell) return;

      // Snapshot للقيم الأصلية — حتى لا يتغيّر شيء عند إغلاق الكيبورد
      const __kbOriginal = {
        shellMaxHeight: chatShell.style.maxHeight || "",
        shellBottom: chatShell.style.bottom || "",
        bodyMaxHeight: chatBody.style.maxHeight || "",
        bodyOverflowY: chatBody.style.overflowY || "",
      };

      let __kbApplied = false;

      let lastHeight = window.visualViewport.height;

      window.visualViewport.addEventListener("resize", () => {
        const currentHeight = window.visualViewport.height;

        const keyboardOpened = currentHeight < lastHeight - 80;
        const keyboardClosed = currentHeight > lastHeight + 80;

        /* --------------------------------------------------------
           عند فتح لوحة المفاتيح (Android / iOS)
           -------------------------------------------------------- */
        if (keyboardOpened) {
          try {
            const vv = window.visualViewport;

            // مقدار ارتفاع الكيبورد/الجزء المقطوع من أسفل الشاشة
            const bottomGap = Math.max(
              0,
              window.innerHeight - (vv.height + vv.offsetTop)
            );

            // نرفع الشيل للأعلى بحيث يصير الفوتر ملاصق لسقف الكيبورد
            chatShell.style.bottom = `${bottomGap}px`;

            // نقيّد فقط maxHeight (بدون لمس height الأساسي)
            chatShell.style.maxHeight = `${vv.height + vv.offsetTop}px`;

            // الفقاعات: نعطيها سكرول، ونخليها ضمن المساحة المتاحة
            // (الرقم 64 مجرد هامش أمان بسيط — إذا عندك هيدر/فوتر أكبر نعدّله لاحقًا بدقة)
            chatBody.style.maxHeight = `${Math.max(120, vv.height - 64)}px`;
            chatBody.style.overflowY = "auto";

            __kbApplied = true;

            // تثبيت آخر رسالة فوق حقل الكتابة
            setTimeout(() => {
              chatBody.scrollTop = chatBody.scrollHeight;
            }, 0);
          } catch (e) {
            console.warn("Keyboard open error:", e);
          }
        }

        /* --------------------------------------------------------
           عند إغلاق لوحة المفاتيح
           -------------------------------------------------------- */
        if (keyboardClosed) {
          try {
            if (__kbApplied) {
              chatShell.style.maxHeight = __kbOriginal.shellMaxHeight;
              chatShell.style.bottom = __kbOriginal.shellBottom;
              chatBody.style.maxHeight = __kbOriginal.bodyMaxHeight;
              chatBody.style.overflowY = __kbOriginal.bodyOverflowY;
              __kbApplied = false;
            }

            // إعادة النافذة إلى الحجم الكامل
            chatShell.style.height = `${window.innerHeight}px`;
            chatShell.style.maxHeight = `${window.innerHeight}px`;

            // إلغاء أي ضغط تم تطبيقه
            chatBody.style.maxHeight = "";

            // تمرير لأسفل آخر الرسائل
            setTimeout(() => {
              chatBody.scrollTop = chatBody.scrollHeight;
            }, 60);
          } catch (e) {
            console.warn("Keyboard close error:", e);
          }
        }

        lastHeight = currentHeight;
      });
    })();

    // الحالة الداخلية
    let chatHistory = [];
    const SOUND_SESSION_KEY = "novabot_sound_count";

    function getSoundCount() {
      try {
        return Number(sessionStorage.getItem(SOUND_SESSION_KEY) || 0);
      } catch {
        return 0;
      }
    }

    function setSoundCount(val) {
      try {
        sessionStorage.setItem(SOUND_SESSION_KEY, String(val));
      } catch {}
    }

    let novaChatOpen = false;

    // ============================================================
    // Focus Recovery – UX polish (Mobile & Desktop aware)
    // ============================================================
    let wasTypingBeforeBlur = false;

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        // نسجل فقط — لا نفعل شيء
        wasTypingBeforeBlur =
          novaChatOpen && document.activeElement === input;
        return;
      }

      // عند العودة
      if (!novaChatOpen) return;

      // موبايل/تابلت: لا نعيد التركيز تلقائيًا
      if (isMobileViewport()) {
        // فقط نضمن أن آخر رسالة مرئية
        setTimeout(() => {
          chatBody.scrollTop = chatBody.scrollHeight;
        }, 60);
        return;
      }

      // ديسكتوب: نعيد التركيز فقط إذا كان يكتب سابقًا
      if (wasTypingBeforeBlur) {
        setTimeout(() => {
          input.focus({ preventScroll: true });
        }, 80);
      }
    });

    let currentBotRow = null;
    let typingIntervalId = null;
    let isTypingAnimationActive = false;

    const pendingCardCallbacks = [];

    let subscribeCardShown = false;
    let botCardShown = false;
    let businessCardShown = false;
    let collabCardShown = false;
    let devCardShown = false;
    let leadEventSent = false;
     let businessNurtureShown = false;

    // ============================================================
    // Layer 2: Session Token (Short-lived) – client side
    // ============================================================
    let sessionToken = "";
    let sessionExpAt = 0;
    let sessionContext = null;

    function getApiBase(url) {
      return (url || "").replace(/\/+$/, "");
    }

    async function ensureSessionToken() {
      if (!config.API_PRIMARY) return;

      // صالح؟ لا تعيد الطلب
      if (sessionToken && Date.now() < sessionExpAt - 10_000) return;

      try {
        const base = getApiBase(config.API_PRIMARY);
        const res = await fetch(base + "/session", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          sessionToken = "";
          sessionExpAt = 0;
          return;
        }

        const data = await res.json();
        if (data && data.ok && data.token) {
          sessionToken = data.token;
          sessionExpAt = Date.now() + (data.ttl_ms || 600000);
        } else {
          sessionToken = "";
          sessionExpAt = 0;
        }
      } catch {
        sessionToken = "";
        sessionExpAt = 0;
      }
    }

    // ============================================================
    //                     Helpers
    // ============================================================
    function escapeHtml(str) {
      return (str || "").replace(/[&<>"]/g, (c) => {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] || c;
      });
    }

    function scrollToBottom() {
      chatBody.scrollTop = chatBody.scrollHeight;
    }

    function playNovaSound() {
      if (!config.SOUND_URL) return;

      let count = getSoundCount();
      if (count >= 3) return;

      try {
        const a = new Audio(config.SOUND_URL);
        a.play().catch(() => {});
        setSoundCount(count + 1);
      } catch (e) {}
    }

    function clearTypingState() {
      if (typingIntervalId) {
        clearInterval(typingIntervalId);
        typingIntervalId = null;
      }
      isTypingAnimationActive = false;
      pendingCardCallbacks.length = 0;
    }

    // helper بسيط للتمييز بين الموبايل/التابلت والديسكتوب
    function isMobileViewport() {
      return window.innerWidth <= 1024;
    }

    function startThinkingBubble() {
      if (NovaUIState.isTyping) return;
      NovaUIState.isTyping = true;

      clearTypingState();

      currentBotRow = document.createElement("div");
      currentBotRow.className = "nova-msg-row nova-bot";

      currentBotRow.innerHTML = `
        <div class="nova-bubble nova-bubble-bot">
          <div class="nova-bot-header">
            <div class="nova-bot-header-icon">
              <img src="https://assets.zyrosite.com/YD0w46zZ5ZIrwlP8/novabot-2-f081v1SXHunuZjwP.png" alt="NovaBot" />
            </div>
            <div class="nova-bot-name">NOVABOT</div>
          </div>
          <div class="nova-bubble-content">
            <div class="nova-typing">
              <span>${lang === "en" ? "NovaBot is typing" : "نوفا بوت يكتب الآن"}</span>
              <span class="nova-typing-dots">
                <span class="nova-dot-typing"></span>
                <span class="nova-dot-typing"></span>
                <span class="nova-dot-typing"></span>
              </span>
            </div>
          </div>
        </div>
      `;

      chatBody.appendChild(currentBotRow);
      scrollToBottom();
    }

    function computeTypingSpeed(length) {
      if (length <= 80) return 25;
      if (length <= 180) return 18;
      if (length <= 350) return 12;
      return 9;
    }

    function typeReplyInCurrentBubble(html) {
      if (!currentBotRow) startThinkingBubble();

      const contentEl = currentBotRow.querySelector(".nova-bubble-content");
      if (!contentEl) return;

      clearTypingState();

      const full = html.toString();
      const length = full.length || 1;
      const speed = computeTypingSpeed(length);

      let i = 0;
      isTypingAnimationActive = true;

      typingIntervalId = setInterval(() => {
        contentEl.innerHTML = full.slice(0, i);
        i++;
        scrollToBottom();

        if (i > length) {
          clearInterval(typingIntervalId);
          typingIntervalId = null;
          isTypingAnimationActive = false;
          NovaUIState.isTyping = false;

          playNovaSound();

          while (pendingCardCallbacks.length > 0) {
            const cb = pendingCardCallbacks.shift();
            try {
              cb();
            } catch (e) {}
          }
          NovaUIState.lastInteractionAt = Date.now();
        }
      }, speed);
    }

    function addUserMessage(text) {
      const row = document.createElement("div");
      row.className = "nova-msg-row nova-user";
      row.innerHTML = `
        <div class="nova-bubble nova-bubble-user">
          ${escapeHtml(text)}
        </div>
      `;
      chatBody.appendChild(row);
      scrollToBottom();
    }

    function addStaticBotMessage(html) {
      const row = document.createElement("div");
      row.className = "nova-msg-row nova-bot";
      row.innerHTML = `
        <div class="nova-bubble nova-bubble-bot">
          <div class="nova-bot-header">
            <div class="nova-bot-header-icon">
              <img src="https://assets.zyrosite.com/YD0w46zZ5ZIrwlP8/novabot-2-f081v1SXHunuZjwP.png"/>
            </div>
            <div class="nova-bot-name">NOVABOT</div>
          </div>
          <div class="nova-bubble-content">${html}</div>
        </div>
      `;
      currentBotRow = row;
      chatBody.appendChild(row);
      scrollToBottom();
      playNovaSound();
    }

    // Toast / إشعار صغير داخل الفقاعة لعمليات البطاقات
    function showActionToast(message) {
      const botRows = chatBody.querySelectorAll(".nova-msg-row.nova-bot");
      const lastBot = botRows[botRows.length - 1];
      let container = null;

      if (lastBot) {
        container =
          lastBot.querySelector(".nova-bubble-content") ||
          lastBot.querySelector(".nova-bubble") ||
          lastBot;
      } else {
        container = chatBody;
      }

      const notice = document.createElement("div");
      notice.className = "nova-system-msg";
      notice.textContent = message;

      container.appendChild(notice);
      scrollToBottom();

      setTimeout(() => {
        if (notice && notice.parentNode) {
          notice.parentNode.removeChild(notice);
        }
      }, 2500);
    }

    // ============================================================
    //                     API CALL (Layer 4 Turnstile)
    // ============================================================
    async function callNovaApi(message) {
      if (!config.API_PRIMARY) return { ok: false, reply: "" };

      // Layer 2: تأكد من وجود Session Token قبل الطلب
      await ensureSessionToken();

      // Layer 4: Turnstile token قبل الطلب
      // (بهدوء: إذا غير متاح أو لم يوجد Site Key سيتم إرسال الطلب بدون التوكن)
      let tsToken = "";
      try {
        tsToken = await getTurnstileToken();
      } catch {
        tsToken = "";
      }

      try {
        const res = await fetch(config.API_PRIMARY, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sessionToken ? { "X-NOVABOT-SESSION": sessionToken } : {}),
            ...(tsToken ? { "X-NOVABOT-TS-TOKEN": tsToken } : {}),
          },
          body: JSON.stringify({ message }),
        });

        if (!res.ok) return { ok: false, reply: "" };

        const data = await res.json();
        if (data && data.session_context && typeof data.session_context === "object") {
          sessionContext = data.session_context;
        }
        return {
          ok: data.ok,
          reply: data.reply,
          actionCard: data.actionCard || null,
        };
      } catch {
        return { ok: false, reply: "" };
      }
    }

    // ============================================================
    //                   بطاقات نوفا بوت
    // ============================================================
    // تفعيل منطق البطاقات (اشترك / صفحة الاشتراك / خدمات / تعاون)
    function initCardBehavior(cardEl) {
      if (!cardEl) return;

      const headerEl = cardEl.querySelector(".nova-card-header");
      const inputEl = cardEl.querySelector(".nova-card-input");
      const primaryBtn = cardEl.querySelector(".nova-card-btn-primary");
      const secondaryBtn = cardEl.querySelector(".nova-card-btn-secondary");

      const headerText = headerEl ? headerEl.textContent.trim() : "";

      const isSubscribeCard =
        /اشترك|طوّر عملك|طوّر عملك خطوة بخطوة|subscribe/i.test(headerText);

      const isCollabCard = /تعاون|شراكة|collaborat/i.test(headerText);

      // إعداد حقل الإدخال (ايميل غالباً)
      if (inputEl) {
        inputEl.setAttribute("autocomplete", "email");
        inputEl.setAttribute("inputmode", "email");

        try {
          const storedEmail = localStorage.getItem(EMAIL_STORAGE_KEY);
          if (storedEmail && !inputEl.value) {
            inputEl.value = storedEmail;
          }
        } catch (e) {}
      }

      // بطاقة الاشتراك / الأعمال
      if (isSubscribeCard) {
        if (primaryBtn && inputEl) {
          primaryBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            const val = (inputEl.value || "").trim();
            if (!val) {
              const msg =
                lang === "en"
                  ? "Please enter your email first."
                  : "من فضلك أدخل بريدك الإلكتروني أولاً.";
              showActionToast(msg);
              inputEl.focus();
              return;
            }

            // حفظ الإيميل محليًا
            try {
              if (val.includes("@")) {
                localStorage.setItem(EMAIL_STORAGE_KEY, val);
              }
            } catch (e) {}

            // ============================
            // Lead Event (Option B)
            // ============================
            if (leadEventSent) return;
            await ensureSessionToken();
            const currentSessionContext =
              sessionContext && typeof sessionContext === "object"
                ? sessionContext
                : {};
            const leadPayload = {
              event_type: "lead_capture",
              lead_source: "novabot_ui",

              action: "اشتراك",
              card_id: "subscribe",

              contact: {
                email: val,
              },

              user_context: {
                language: lang,
                device: isMobileViewport() ? "mobile" : "desktop",
                page_url: window.location.href,
              },

               conversation_context: {
  session_id: currentSessionContext.session_id || "",

                ...(currentSessionContext.intent !== undefined
                  ? { intent: currentSessionContext.intent }
                  : {}),
                ...(currentSessionContext.stage !== undefined
                  ? { stage: currentSessionContext.stage }
                  : {}),
                ...(currentSessionContext.temperature !== undefined
                  ? { temperature: currentSessionContext.temperature }
                  : {}),
                ...(currentSessionContext.interest !== undefined
                  ? { interest: currentSessionContext.interest }
                  : {}),
                ...(currentSessionContext.business !== undefined
                  ? { business: currentSessionContext.business }
                  : {}),
                ...(currentSessionContext.last_message !== undefined
                  ? { last_message: currentSessionContext.last_message }
                  : {}),
              },

              meta: {
                timestamp: Date.now(),
                version: "lead_v1",
              },
            };

            dispatchNovaLeadEvent(leadPayload);
            leadEventSent = true;

            const successMsg =
              lang === "en"
                ? "Subscribed successfully ✓"
                : "تم الاشتراك بنجاح ✓";
            showActionToast(successMsg);
          });
        }

        if (secondaryBtn) {
          secondaryBtn.addEventListener("click", (e) => {
            e.preventDefault();

            const btnText = secondaryBtn.textContent || "";

            // التمييز بين "صفحة الخدمات" و "صفحة الاشتراك"
            const goServices =
              /الخدمات|services/i.test(btnText) && config.SERVICES_URL;
            const goSubscribe = !goServices && config.SUBSCRIBE_URL;

            if (goServices) {
              window.open(config.SERVICES_URL, "_blank");
              const msg =
                lang === "en" ? "Services page opened." : "تم فتح صفحة الخدمات.";
              showActionToast(msg);
            } else if (goSubscribe) {
              window.open(config.SUBSCRIBE_URL, "_blank");
              const msg =
                lang === "en"
                  ? "Subscribe page opened."
                  : "تم فتح صفحة الاشتراك.";
              showActionToast(msg);
            }
          });
        }
      }

      // بطاقة التعاون / الشراكات
      if (isCollabCard && primaryBtn) {
        primaryBtn.addEventListener("click", (e) => {
          e.preventDefault();

          const contactVal = inputEl ? (inputEl.value || "").trim() : "";

          const subject =
            lang === "en"
              ? "NovaLink - Collaboration Request"
              : "نوفا لينك - طلب تعاون";

          const body =
            lang === "en"
              ? `Visitor contact: ${contactVal || "Not provided"}\n\nMessage:`
              : `بيانات طريقة التواصل:\n${
                  contactVal || "لم يتم كتابة وسيلة تواصل"
                }\n\nتفاصيل إضافية:`;

          const mailto =
            "mailto:" +
            encodeURIComponent(config.CONTACT_EMAIL) +
            "?subject=" +
            encodeURIComponent(subject) +
            "&body=" +
            encodeURIComponent(body);

          window.location.href = mailto;

          const msg =
            lang === "en"
              ? "Email window prepared for collaboration."
              : "تم تجهيز رسالة البريد للتعاون.";
          showActionToast(msg);
        });
      }
    }

    function appendCardInsideLastBotBubble(cardEl) {
      if (!cardEl) return;

      const doAppend = () => {
        const botRows = chatBody.querySelectorAll(".nova-msg-row.nova-bot");
        const lastBot = botRows[botRows.length - 1];

        if (!lastBot) {
          chatBody.appendChild(cardEl);
          scrollToBottom();
          initCardBehavior(cardEl);
          return;
        }

        const contentEl = lastBot.querySelector(".nova-bubble-content");

        if (!contentEl) {
          lastBot.insertAdjacentElement("afterend", cardEl);
        } else {
          const sep = document.createElement("div");
          sep.className = "nova-card-separator";
          contentEl.appendChild(sep);
          contentEl.appendChild(cardEl);
        }

        scrollToBottom();
        initCardBehavior(cardEl);
      };

      if (isTypingAnimationActive) pendingCardCallbacks.push(doAppend);
      else doAppend();
    }

    function detectLangFromText(text) {
      return /[A-Za-z]/.test(text) ? "en" : "ar";
    }

    function createDeveloperCard(langPref) {
      const langDev = langPref === "en" ? "en" : "ar";

      const card = document.createElement("div");
      card.className = "nova-card";

      const title =
        langDev === "en" ? "👨‍💻 Who Built NovaBot?" : "👨‍💻 من يقف خلف نوفا بوت؟";

      const text =
        langDev === "en"
          ? "“Mohammed Abu Snaina — a developer who blended banking experience with artificial intelligence.\nHe is building NovaLink as a practical space that helps entrepreneurs use smart tools with clarity and confidence.”"
          : "“محمد أبو سنينة—مطور عربي جمع خبرته بين العمل المصرفي والذكاء الاصطناعي.\nيبني نوفا لينك كمساحة عملية تساعد روّاد الأعمال على استخدام الأدوات الذكية بثقة ووضوح.”";

      card.innerHTML = `
        <div class="nova-card-header">${title}</div>
        <div class="nova-card-text">${text.replace(/\n/g, "<br>")}</div>
      `;

      return card;
    }

    function showCardByType(cardType, lastUserMessage) {
      let card = null;

      switch (cardType) {
        case "subscribe":
          if (subscribeCardShown) return;
          subscribeCardShown = true;
          card = createSubscribeCard("default");
          break;
        case "business_subscribe":
          if (businessCardShown) return;
          businessCardShown = true;
          card = window.NovaBotCards?.createBusinessCard?.();
          break;
        case "bot_lead":
          if (botCardShown) return;
          botCardShown = true;
          card = window.NovaBotCards?.createBotLeadCard?.();
          break;
        case "collaboration":
          if (collabCardShown) return;
          collabCardShown = true;
          card = window.NovaBotCards?.createCollaborationCard?.();
          break;
        case "developer_identity":
          if (devCardShown) return;
          devCardShown = true;
          card = createDeveloperCard(detectLangFromText(lastUserMessage));
          break;
        default:
          return;
      }

      appendCardInsideLastBotBubble(card);
    }

    function createSubscribeCard(type) {
      const card = document.createElement("div");
      card.className = "nova-card";

      const isBusiness = type === "business";

      const title = isBusiness
        ? "📧 طوّر عملك خطوة بخطوة"
        : "📧 اشترك في نوفا لينك";

      const text = isBusiness
        ? "إذا كان تطوّر أعمالك يهمك فعلاً، فمتابعة التحديثات في الذكاء الاصطناعي للأعمال ليست رفاهية."
        : "ابدأ رحلتك معنا… نحو إنتاجيةٍ تنمو كل يوم. ✨";

      card.innerHTML = `
        <div class="nova-card-header">${title}</div>
        <div class="nova-card-text">${text}</div>
        <input type="email" class="nova-card-input" placeholder="email@example.com" />
        <div class="nova-card-actions">
          <button class="nova-card-btn nova-card-btn-primary">اشتراك</button>
          <button class="nova-card-btn nova-card-btn-secondary">
            ${isBusiness ? "صفحة الخدمات" : "صفحة الاشتراك"}
          </button>
        </div>
      `;

      return card;
    }

    // ============================================================
    //                   التخزين المحلي
    // ============================================================
    function saveConversation() {
      try {
        const payload = {
          ts: Date.now(),
          history: chatHistory.slice(-25),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {}
    }

    function restoreConversationIfFresh() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const data = JSON.parse(raw);
        if (!data.ts || !Array.isArray(data.history)) return;

        if (Date.now() - data.ts > STORAGE_TTL_MS) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        chatHistory = data.history;
        NovaUIState.sessionRestored = true;
        NovaUIState.hasSession = true;

        chatHistory.forEach((msg) => {
          if (msg.role === "user") {
            addUserMessage(msg.content);
          } else if (msg.role === "assistant") {
            addStaticBotMessage(escapeHtml(msg.content).replace(/\n/g, "<br>"));
          }
        });
      } catch {}
    }

    // ============================================================
    //                   إرسال الرسائل
    // ============================================================
    function autoResizeTextarea() {
      input.style.height = "auto";

      const isDesktop = !isMobileViewport();

      const lineHeight = 24; // متوافق مع Tajawal
      const minLines = isDesktop ? 2 : 1; // 👈 الفرق الوحيد
      const maxLines = 4;

      const minHeight = lineHeight * minLines;
      const maxHeight = lineHeight * maxLines;

      const newHeight = Math.min(
        maxHeight,
        Math.max(minHeight, input.scrollHeight)
      );

      input.style.height = newHeight + "px";

      // إظهار السكرول فقط بعد تجاوز 4 أسطر
      input.style.overflowY =
        input.scrollHeight > maxHeight ? "auto" : "hidden";
    }

    input.addEventListener("input", autoResizeTextarea);

    // استرجاع سلوك الديسكتوب الطبيعي عند الخروج من الموبايل
    input.addEventListener("blur", () => {
      if (isMobileViewport()) return;

      input.style.height = "";
      input.style.minHeight = "";
      input.style.overflowY = "";
      input.rows = 2; // السلوك الأصلي للديسكتوب
    });

    // تثبيت سطر واحد فعلي عند الفتح (موبايل/تابلت فقط)
    input.addEventListener("focus", () => {
      if (!isMobileViewport()) return;

      input.style.minHeight = "32px";
      input.style.height = "32px";
      input.rows = 1;
    });

    async function handleSend() {
      const text = input.value.trim();
      const now = Date.now();
      if (
        NovaUIState.lastInteractionAt &&
        now - NovaUIState.lastInteractionAt < SEND_COOLDOWN_MS
      ) {
        return;
      }

      if (!text || NovaUIState.isTyping) return;

      // Guard: prevent double send
      if (NovaUIState.isSending) return;
      NovaUIState.isSending = true;
      NovaUIState.lastInteractionAt = Date.now();

      addUserMessage(text);
      chatHistory.push({ role: "user", content: text });
      saveConversation();

      input.value = "";
      autoResizeTextarea();

      // لا نغلق الكيبورد في الموبايل
      setTimeout(() => input.focus({ preventScroll: true }), 30);

      sendBtn.disabled = true;

      startThinkingBubble();

      let result;
      try {
        const apiPromise = callNovaApi(text);
        const minDelayMs = 900 + Math.random() * 600;
        const [apiRes] = await Promise.all([
          apiPromise,
          new Promise((r) => setTimeout(r, minDelayMs)),
        ]);
        result = apiRes;
      } catch {
        result = { ok: false, reply: "" };
      } finally {
        sendBtn.disabled = false;
        NovaUIState.isSending = false;
      }

      let replyText = "";

      if (result && result.ok && result.reply) {
        replyText = result.reply;
      } else {
        replyText =
          lang === "en"
            ? "NovaBot is in UI testing mode."
            : "✨ واجهة نوفا بوت الآن في وضع التجربة. سيتم ربط الدماغ قريباً.";
      }

      const replyHtml = replyText.replace(/\n/g, "<br>");
      typeReplyInCurrentBubble(replyHtml);
       if (
  !businessNurtureShown &&
  sessionContext &&
  (
    sessionContext.intent === "اهتمام_ذكاء_اصطناعي_للأعمال" ||
    sessionContext.interest === "business_subscription"
  ) &&
  sessionContext.temperature !== "بارد"
) {
  businessNurtureShown = true;
  setTimeout(() => {
    addStaticBotMessage("");
    showCardByType("business_subscribe");
  }, 5000);
}

      chatHistory.push({ role: "assistant", content: replyText });
      saveConversation();

      if (result && result.actionCard) {
        showCardByType(result.actionCard, text);
      }
    }

    // ============================================================
    //                   فتح وإغلاق النافذة
    // ============================================================
    function openChat() {
      if (novaChatOpen) return;
      if (NovaUIState.isOpen) return;
      NovaUIState.isOpen = true;

      novaChatOpen = true;

      backdrop.classList.add("nova-open");
      backdrop.setAttribute("aria-hidden", "false");

      // موبايل/تابلت فقط → إخفاء الزر العائم عند الفتح
      if (isMobileViewport()) {
        fabBtn.classList.add("nova-hidden");
      }

      try {
        history.pushState({ novaBotOpen: true }, "", window.location.href);
      } catch {}

      if (!chatHistory.length && !NovaUIState.sessionRestored) {
        setTimeout(() => {
          startThinkingBubble();
          setTimeout(() => {
            typeReplyInCurrentBubble(WELCOME_HTML);
            chatHistory.push({
              role: "assistant",
              content: WELCOME_HTML.replace(/<br>/g, "\n"),
            });
            saveConversation();
          }, 900);
        }, 400);
      }

      // prefetch session token عند الفتح (اختياري لكن يحسن أول رسالة)
      ensureSessionToken();

      setTimeout(() => input.focus({ preventScroll: true }), 350);
    }

    function closeChat(options = { fromBack: false }) {
      if (!novaChatOpen) return;
      if (!NovaUIState.isOpen) return;
      NovaUIState.isOpen = false;

      novaChatOpen = false;

      backdrop.classList.remove("nova-open");
      backdrop.setAttribute("aria-hidden", "true");

      // موبايل/تابلت فقط → إظهار الزر العائم بعد الإغلاق
      if (isMobileViewport()) {
        setTimeout(() => fabBtn.classList.remove("nova-hidden"), 280);
      }

      if (!options.fromBack) {
        try {
          if (history.state?.novaBotOpen) history.back();
        } catch {}
      }
    }

    // ============================================================
    //                   الأحداث
    // ============================================================
    fabBtn.addEventListener("click", () =>
      novaChatOpen ? closeChat() : openChat()
    );
    closeBtn.addEventListener("click", () => closeChat());

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeChat();
    });

    // نبض الزر العائم
    setInterval(() => {
      if (!novaChatOpen) {
        fabBtn.classList.add("nova-idle");
        setTimeout(() => fabBtn.classList.remove("nova-idle"), 900);
      }
    }, 9000);

    sendBtn.addEventListener("mousedown", (e) => e.preventDefault());
    sendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleSend();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    window.addEventListener("popstate", () => {
      if (novaChatOpen) closeChat({ fromBack: true });
    });

    restoreConversationIfFresh();
  }
})();

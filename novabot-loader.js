/* ============================================================
   NovaBot v6.9.4 – Shadow DOM Loader
   Loader file that injects:
   - ui.css
   - ui.html
   And initializes NovaBot UI + Logic.
   Fully compatible with GitHub Pages + Hostinger Website Builder.
   ============================================================ */

(function () {
  const scriptEl = document.currentScript;
  if (!scriptEl) {
    console.error("NovaBot Loader: script element not detected.");
    return;
  }

  /* ---------------------------
     قراءة الإعدادات من الـ HTML
     --------------------------- */
  const API_URL = scriptEl.getAttribute("data-novabot-api") || "";
  const LOCALE = scriptEl.getAttribute("data-novabot-locale") || "ar";

  /* ---------------------------
     تجهيز حاوية الشادو
     --------------------------- */
  const host = document.createElement("div");
  host.id = "novabot-shadow-host";
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "999999";
  host.style.pointerEvents = "none"; // سيتم تفعيلها بعد تحميل الواجهة
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  /* ---------------------------
     استخراج المسار الأساسي من سكربت اللودر
     لتسهيل جلب ui.css و ui.html
     --------------------------- */
  const baseUrl = scriptEl.src.replace(/[^\/]+$/, ""); // remove loader.js name
  const cssUrl = `${baseUrl}ui.css?v=16`;
  const htmlUrl = `${baseUrl}ui.html?v=16`;

  /* ---------------------------
     تحميل ملفات الـ UI
     --------------------------- */
  Promise.all([
    fetch(cssUrl).then((r) => r.text()),
    fetch(htmlUrl).then((r) => r.text())
  ])
    .then(([cssText, htmlText]) => {
      shadow.innerHTML = `<style>${cssText}</style>${htmlText}`;

      // 🔥 بعد تحميل الواجهة نسمح بالتفاعل
      host.style.pointerEvents = "auto";

      // تفعيل سكربت التشغيل
      initNovaBot(shadow, { apiUrl: API_URL, locale: LOCALE });
    })
    .catch((err) => {
      console.error("NovaBot Loader Error:", err);
    });

  /* ============================================================
     =============  من هنا يبدأ دمج Logic نوفا بوت  =============
     ============================================================ */

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
      CONTACT_EMAIL: "contact@novalink-ai.com"
    };

    const lang = config.LOCALE === "en" ? "en" : "ar";

    const WELCOME_HTML =
      lang === "en"
        ? "Welcome to NovaLink 👋<br>I'm NovaBot… ready to help you with AI and business growth questions."
        : "مرحباً بك في نوفا لينك 👋<br>أنا نوفا بوت… جاهز لمساعدتك في أي سؤال حول الذكاء الاصطناعي وتطوير أعمالك.";

    const STORAGE_KEY = "novabot_v6.9_conversation";
    const STORAGE_TTL_MS = 12 * 60 * 60 * 1000; // 12 ساعة

    /* ---------------------------
       عناصر الواجهة
       --------------------------- */
    const fabBtn = root.getElementById("novaFabBtn");
    const backdrop = root.getElementById("novaBackdrop");
    const closeBtn = root.getElementById("novaCloseBtn");
    const chatBody = root.getElementById("novaChatBody");
    const input = root.getElementById("novaInput");
    const sendBtn = root.getElementById("novaSendBtn");

    if (!fabBtn || !backdrop || !closeBtn || !chatBody || !input || !sendBtn) {
      console.error("NovaBot: Missing UI elements in Shadow DOM.");
      return;
    }

    /* ---------------------------
       إدارة المحادثة
       --------------------------- */
    let chatHistory = [];
    let soundCount = 0;
    let novaChatOpen = false;

    let currentBotRow = null;
    let typingIntervalId = null;
    let isTypingAnimationActive = false;
    const pendingCardCallbacks = [];

    /* ---------------------------
       أدوات مساعدة
       --------------------------- */
    function scrollToBottom() {
      chatBody.scrollTop = chatBody.scrollHeight;
    }

    function escapeHtml(str) {
      return (str || "").replace(/[&<>"]/g, (c) => {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] || c;
      });
    }

    function playNovaSound() {
      if (!config.SOUND_URL) return;
      if (soundCount >= 3) return;

      const a = new Audio(config.SOUND_URL);
      a.play().catch(() => {});
      soundCount++;
    }

    function isSmallScreen() {
      return window.innerWidth <= 640;
    }

    function clearTypingState() {
      if (typingIntervalId) {
        clearInterval(typingIntervalId);
        typingIntervalId = null;
      }
      isTypingAnimationActive = false;
      pendingCardCallbacks.length = 0;
    }

    /* ---------------------------
       فقاعات البوت – مؤشر الكتابة
       --------------------------- */
    function startThinkingBubble() {
      clearTypingState();
      currentBotRow = document.createElement("div");
      currentBotRow.className = "nova-msg-row nova-bot";

      currentBotRow.innerHTML = `
        <div class="nova-bubble nova-bubble-bot">
          <div class="nova-bot-header">
            <div class="nova-bot-header-icon">
              <img src="https://assets.zyrosite.com/YD0w46zZ5ZIrwlP8/novabot-2-f081v1SXHunuZjwP.png" />
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

    function typeReplyInCurrentBubble(html) {
      if (!currentBotRow) startThinkingBubble();

      const contentEl = currentBotRow.querySelector(".nova-bubble-content");
      if (!contentEl) return;

      clearTypingState();
      const full = (html || "").toString();
      let i = 0;

      isTypingAnimationActive = true;

      const speed = full.length <= 80 ? 25 : full.length <= 180 ? 18 : 12;

      typingIntervalId = setInterval(() => {
        contentEl.innerHTML = full.slice(0, i);
        i++;
        scrollToBottom();

        if (i > full.length) {
          clearInterval(typingIntervalId);
          typingIntervalId = null;
          isTypingAnimationActive = false;
          playNovaSound();

          // تنفيذ البطاقات المعلقة
          while (pendingCardCallbacks.length > 0) {
            const cb = pendingCardCallbacks.shift();
            try {
              cb();
            } catch (e) {}
          }
        }
      }, speed);
    }

    /* ---------------------------
       إضافة رسائل المستخدم
       --------------------------- */
    function addUserMessage(text) {
      const row = document.createElement("div");
      row.className = "nova-msg-row nova-user";
      row.innerHTML = `
        <div class="nova-bubble nova-bubble-user">${escapeHtml(text)}</div>
      `;
      chatBody.appendChild(row);
      scrollToBottom();
    }

    /* ---------------------------
       إضافة رد ثابت من البوت
       --------------------------- */
    function addStaticBotMessage(html) {
      const row = document.createElement("div");
      row.className = "nova-msg-row nova-bot";
      row.innerHTML = `
        <div class="nova-bubble nova-bubble-bot">
          <div class="nova-bot-header">
            <div class="nova-bot-header-icon">
              <img src="https://assets.zyrosite.com/YD0w46zZ5ZIrwlP8/novabot-2-f081v1SXHunuZjwP.png" />
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

    /* ---------------------------
       الاتصال بالسيرفر
       --------------------------- */
    async function callNovaApi(message) {
      try {
        const res = await fetch(config.API_PRIMARY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message })
        });

        if (!res.ok) return { ok: false, reply: "" };

        const data = await res.json();
        return {
          ok: data.ok,
          reply: data.reply,
          actionCard: data.actionCard || null
        };
      } catch (e) {
        console.error("NovaBot API Error:", e);
        return { ok: false, reply: "" };
      }
    }

    /* ---------------------------
       بطاقات نوفا بوت
       --------------------------- */
    function appendCardInsideLastBotBubble(cardEl) {
      if (!cardEl) return;

      const execute = () => {
        const botRows = chatBody.querySelectorAll(".nova-msg-row.nova-bot");
        const lastBot = botRows[botRows.length - 1];

        if (!lastBot) {
          chatBody.appendChild(cardEl);
          scrollToBottom();
          return;
        }

        const contentEl = lastBot.querySelector(".nova-bubble-content");

        if (contentEl) {
          const sep = document.createElement("div");
          sep.className = "nova-card-separator";
          contentEl.appendChild(sep);
          contentEl.appendChild(cardEl);
        } else {
          lastBot.insertAdjacentElement("afterend", cardEl);
        }

        scrollToBottom();
      };

      if (isTypingAnimationActive) {
        pendingCardCallbacks.push(execute);
      } else {
        execute();
      }
    }

    /* ---------------------------
       بطاقات: اشتراك / خدمات / تطوير / تعاون / مطور
       --------------------------- */
    let subscribeCardShown = false;
    let businessCardShown = false;
    let botCardShown = false;
    let collabCardShown = false;
    let devCardShown = false;

    function detectLangFromText(text) {
      return /[A-Za-z]/.test(text) ? "en" : "ar";
    }

    function createDeveloperCard(langPref) {
      const isEn = langPref === "en";
      const card = document.createElement("div");
      card.className = "nova-card nova-anim";

      const title = isEn ? "👨‍💻 Who Built NovaBot?" : "👨‍💻 من يقف خلف نوفا بوت؟";
      const text = isEn
        ? `“Mohammed Abu Sunaina — a developer who blended banking experience with artificial intelligence.\nHe is building NovaLink as a practical space that helps entrepreneurs use smart tools with clarity and confidence.”`
        : `“محمد أبو سنينة—مطور عربي جمع خبرته بين العمل المصرفي والذكاء الاصطناعي.\nيبني نوفا لينك كمساحة عملية تساعد روّاد الأعمال على استخدام الأدوات الذكية بثقة ووضوح.”`;

      card.innerHTML = `
        <div class="nova-card-header">${title}</div>
        <div class="nova-card-text">${text.replace(/\n/g, "<br>")}</div>
      `;

      return card;
    }

    function showCardByType(cardType, lastUserMessage) {
      let card = null;

      switch (cardType) {
        case "developer_identity":
          if (devCardShown) return;
          devCardShown = true;
          card = createDeveloperCard(
            detectLangFromText(lastUserMessage) === "en" ? "en" : "ar"
          );
          break;

        default:
          return;
      }

      appendCardInsideLastBotBubble(card);
    }

    /* ---------------------------
       تخزين واسترجاع المحادثة
       --------------------------- */
    function saveConversation() {
      try {
        const payload = {
          ts: Date.now(),
          history: chatHistory.slice(-25)
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {}
    }

    function restoreConversationIfFresh() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const data = JSON.parse(raw);
        if (!data || !data.ts || !data.history) return;

        if (Date.now() - data.ts > STORAGE_TTL_MS) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        chatHistory = data.history;

        chatHistory.forEach((msg) => {
          if (msg.role === "user") addUserMessage(msg.content);
          else
            addStaticBotMessage(
              escapeHtml(msg.content).replace(/\n/g, "<br>")
            );
        });
      } catch {}
    }

    /* ---------------------------
       إرسال الرسائل
       --------------------------- */
    async function handleSend() {
      const text = (input.value || "").trim();
      if (!text) return;

      addUserMessage(text);
      chatHistory.push({ role: "user", content: text });
      saveConversation();

      input.value = "";
      input.style.height = "auto";
      sendBtn.disabled = true;

      startThinkingBubble();

      let result = { ok: false, reply: "" };

      try {
        const apiPromise = callNovaApi(text);
        const minDelay = 700 + Math.random() * 500;

        const [apiRes] = await Promise.all([
          apiPromise,
          new Promise((r) => setTimeout(r, minDelay))
        ]);

        result = apiRes || {};
      } catch (e) {
        console.error(e);
      }

      sendBtn.disabled = false;

      let reply = "";

      if (result.ok && result.reply) {
        reply = result.reply;
      } else {
        reply =
          lang === "en"
            ? "NovaBot is currently in test mode — real answers will arrive soon."
            : "نوفا بوت يعمل حالياً في وضع الاختبار — سيتم تفعيل الإجابات الذكية قريباً.";
      }

      if (result.actionCard === "developer_identity") {
        reply =
          detectLangFromText(text) === "en"
            ? "✨ This is an identity card of the person behind NovaBot."
            : "✨ هذه بطاقة تعريف بالمطور الذي يقف خلف نوفا بوت.";
      }

      typeReplyInCurrentBubble(reply.replace(/\n/g, "<br>"));

      chatHistory.push({ role: "assistant", content: reply });
      saveConversation();

      if (result.actionCard) {
        showCardByType(result.actionCard, text);
      }
    }

    /* ---------------------------
       فتح وإغلاق النافذة
       --------------------------- */
    function openChat() {
      if (novaChatOpen) return;
      novaChatOpen = true;

      backdrop.classList.add("nova-open");
      backdrop.setAttribute("aria-hidden", "false");

      if (isSmallScreen()) {
        fabBtn.classList.add("nova-hidden");
      } else {
        fabBtn.classList.remove("nova-hidden");
      }

      try {
        history.pushState({ novaBotOpen: true }, "", window.location.href);
      } catch {}

      if (!chatHistory.length) {
        setTimeout(() => {
          startThinkingBubble();
          setTimeout(() => {
            typeReplyInCurrentBubble(WELCOME_HTML);
            chatHistory.push({
              role: "assistant",
              content: WELCOME_HTML.replace(/<br>/g, "\n")
            });
            saveConversation();
          }, 900);
        }, 400);
      }

      setTimeout(() => input.focus(), isSmallScreen() ? 350 : 200);
    }

    function closeChat(options = { fromBack: false }) {
      if (!novaChatOpen) return;
      novaChatOpen = false;

      backdrop.classList.remove("nova-open");
      backdrop.setAttribute("aria-hidden", "true");

      setTimeout(() => {
        if (isSmallScreen()) fabBtn.classList.remove("nova-hidden");
      }, 280);

      if (!options.fromBack) {
        try {
          if (history.state && history.state.novaBotOpen) {
            history.back();
          }
        } catch {}
      }
    }

    /* ---------------------------
       أحداث الواجهة
       --------------------------- */
    fabBtn.addEventListener("click", () => {
      novaChatOpen ? closeChat() : openChat();
    });

    closeBtn.addEventListener("click", () => closeChat());

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeChat();
    });

    sendBtn.addEventListener("click", handleSend);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    window.addEventListener("popstate", () => {
      if (novaChatOpen) closeChat({ fromBack: true });
    });

    // تنفيذ اهتزاز صغير دوري للزر
    setInterval(() => {
      if (!novaChatOpen) {
        fabBtn.classList.add("nova-idle");
        setTimeout(() => fabBtn.classList.remove("nova-idle"), 900);
      }
    }, 9000);

    restoreConversationIfFresh();
  }
})();

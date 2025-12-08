/* NovaBot v6.9.4 – Shadow DOM Loader + Logic
   يعمل مع:
   - ui.css
   - ui.html
   في نفس الريبو / نفس المسار
*/

(function () {
  const scriptEl = document.currentScript;
  if (!scriptEl) return;

  const API_URL = scriptEl.getAttribute("data-novabot-api") || "";
  const LOCALE = scriptEl.getAttribute("data-novabot-locale") || "ar";

  // إنشاء حاوية للشادو
  const host = document.createElement("div");
  host.id = "novabot-shadow-host";
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.pointerEvents = "none";
  host.style.zIndex = "9999";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // حساب مسار الملفات ui.css و ui.html
  const baseUrl = scriptEl.src.replace(/[^\/]+$/, "");
  const cssUrl = baseUrl + "ui.css";
  const htmlUrl = baseUrl + "ui.html";

  Promise.all([
    fetch(cssUrl).then((r) => r.text()),
    fetch(htmlUrl).then((r) => r.text())
  ])
    .then(([cssText, htmlText]) => {
      shadow.innerHTML = `<style>${cssText}</style>${htmlText}`;
      initNovaBot(shadow, { apiUrl: API_URL, locale: LOCALE });
    })
    .catch((err) => {
      console.error("NovaBot loader error:", err);
    });

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

    // عناصر الواجهة من داخل الشادو
    const fabBtn = root.getElementById("novaFabBtn");
    const backdrop = root.getElementById("novaBackdrop");
    const closeBtn = root.getElementById("novaCloseBtn");
    const chatBody = root.getElementById("novaChatBody");
    const input = root.getElementById("novaInput");
    const sendBtn = root.getElementById("novaSendBtn");

    if (!fabBtn || !backdrop || !closeBtn || !chatBody || !input || !sendBtn) {
      console.error("NovaBot UI elements missing");
      return;
    }

    let chatHistory = [];
    let soundCount = 0;
    let novaChatOpen = false;

    let currentBotRow = null;
    let typingIntervalId = null;
    let isTypingAnimationActive = false;
    const pendingCardCallbacks = [];

    let subscribeCardShown = false;
    let botCardShown = false;
    let businessCardShown = false;
    let collabCardShown = false;
    let devCardShown = false;

    // ===== Helpers =====
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
      if (soundCount >= 3) return;
      try {
        const a = new Audio(config.SOUND_URL);
        a.play().catch(() => {});
        soundCount++;
      } catch (e) {}
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

    function startThinkingBubble() {
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
      if (!currentBotRow) {
        startThinkingBubble();
      }
      const contentEl = currentBotRow.querySelector(".nova-bubble-content");
      if (!contentEl) return;

      clearTypingState();

      const full = (html || "").toString();
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
          playNovaSound();
          while (pendingCardCallbacks.length > 0) {
            const cb = pendingCardCallbacks.shift();
            try {
              cb();
            } catch (e) {}
          }
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
              <img src="https://assets.zyrosite.com/YD0w46zZ5ZIrwlP8/novabot-2-f081v1SXHunuZjwP.png" alt="NovaBot" />
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

    // ===== اتصال فعلي بالسيرفر =====
    async function callNovaApi(message) {
      if (!config.API_PRIMARY) {
        return { ok: false, reply: "" };
      }
      try {
        const res = await fetch(config.API_PRIMARY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message })
        });

        if (!res.ok) {
          return { ok: false, reply: "" };
        }

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

    function appendCardInsideLastBotBubble(cardEl) {
      if (!cardEl) return;

      const doAppend = () => {
        const botRows = chatBody.querySelectorAll(".nova-msg-row.nova-bot");
        const lastBot = botRows[botRows.length - 1];
        if (!lastBot) {
          chatBody.appendChild(cardEl);
          scrollToBottom();
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
      };

      if (isTypingAnimationActive) {
        pendingCardCallbacks.push(doAppend);
      } else {
        doAppend();
      }
    }

    // ===== البطاقات =====
    function createSubscribeCard(type) {
      const card = document.createElement("div");
      card.className = "nova-card nova-anim";

      const isBusiness = type === "business";

      const title = isBusiness
        ? "📧 طوّر عملك خطوة بخطوة"
        : "📧 اشترك في نوفا لينك";
      const text = isBusiness
        ? "إذا كان تطوّر أعمالك يهمك فعلاً، فمتابعة التحديثات في الذكاء الاصطناعي للأعمال ليست رفاهية. اترك بريدك لتصلك أحدث المقالات والأفكار التي تركّز على النتائج، لا الضجيج."
        : "ابدأ رحلتك معنا… نحو إنتاجيةٍ تنمو كل يوم. ✨";

      card.innerHTML = `
        <div class="nova-card-header">${title}</div>
        <div class="nova-card-text">${text}</div>
        <input type="email" class="nova-card-input" placeholder="example@email.com" />
        <div class="nova-card-actions">
          <button class="nova-card-btn nova-card-btn-primary">اشتراك</button>
          <button class="nova-card-btn nova-card-btn-secondary" type="button">
            ${isBusiness ? "زيارة صفحة الخدمات" : "زيارة صفحة الاشتراك"}
          </button>
        </div>
        <div class="nova-card-note">
          يمكنك إلغاء الاشتراك في أي وقت من خلال الرابط الموجود في رسائل البريد.
        </div>
      `;

      const emailInput = card.querySelector(".nova-card-input");
      const btnPrimary = card.querySelector(".nova-card-btn-primary");
      const btnSecondary = card.querySelector(".nova-card-btn-secondary");

      btnSecondary.addEventListener("click", () => {
        const url = isBusiness ? config.SERVICES_URL : config.SUBSCRIBE_URL;
        window.open(url, "_blank");
      });

      btnPrimary.addEventListener("click", async () => {
        const email = (emailInput.value || "").trim();
        if (!email || !email.includes("@")) {
          alert("الرجاء إدخال بريد إلكتروني صالح.");
          return;
        }

        btnPrimary.disabled = true;
        btnPrimary.textContent = "جارٍ الإرسال...";

        if (config.FEEDBACK_API) {
          try {
            await fetch(config.FEEDBACK_API, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "subscribe",
                email,
                intent: isBusiness
                  ? "business_subscribe"
                  : "newsletter_subscribe",
                source: isBusiness
                  ? "novabot-business-card"
                  : "novabot-subscribe-card",
                url: window.location.href,
                createdAt: new Date().toISOString()
              })
            });
          } catch (e) {
            console.warn("Feedback API error:", e);
          }
        }

        btnPrimary.textContent = "تم الاشتراك ✅";
      });

      return card;
    }

    function createBotLeadCard() {
      const card = document.createElement("div");
      card.className = "nova-card nova-anim";

      card.innerHTML = `
        <div class="nova-card-header">📧 بوت دردشة لعملك</div>
        <div class="nova-card-text">
          إذا تخيّلت أن موقعك أو مشروعك يملك نوفا بوت خاصًا به يرد على عملائك، يشرح خدماتك،
          ويقترح عليهم ما يناسبهم… فهذا بالضبط ما يمكن أن نبنيه معك في نوفا لينك.<br><br>
          اترك بريدك أو رقم واتساب وسنرتّب معك استشارة تعريفية مجانية قصيرة.
        </div>
        <input type="text" class="nova-card-input" placeholder="بريدك الإلكتروني أو رقم واتساب" />
        <div class="nova-card-actions">
          <button class="nova-card-btn nova-card-btn-primary">احجز استشارتك المجانية</button>
        </div>
        <div class="nova-card-note">
          سيتم فتح رسالة بريد جاهزة لتأكيد طلبك، ويمكنك تعديلها قبل الإرسال.
        </div>
      `;

      const contactInput = card.querySelector(".nova-card-input");
      const btn = card.querySelector(".nova-card-btn-primary");

      btn.addEventListener("click", () => {
        const contact = (contactInput.value || "").trim();
        if (!contact) {
          alert("الرجاء إدخال بريد إلكتروني أو رقم واتساب للتواصل معك.");
          return;
        }

        const subject = encodeURIComponent(
          "NovaBot Lead – طلب استشارة حول بوت دردشة"
        );
        const body = encodeURIComponent(
          `مرحبًا فريق نوفا لينك,\n\nأرغب في استشارة مجانية حول إنشاء بوت دردشة بالذكاء الاصطناعي لمشروعي.\n\nبيانات التواصل:\n${contact}\n\nتم إرسال هذا الطلب عبر نوفا بوت على موقع نوفا لينك.`
        );

        if (config.FEEDBACK_API) {
          try {
            fetch(config.FEEDBACK_API, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "lead",
                channel: "bot",
                contact,
                source: "novabot-bot-lead-card",
                url: window.location.href,
                createdAt: new Date().toISOString()
              })
            }).catch(() => {});
          } catch (e) {}

        }

        window.location.href = `mailto:${config.CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      });

      return card;
    }

    function createBusinessCard() {
      return createSubscribeCard("business");
    }

    function createCollaborationCard() {
      const card = document.createElement("div");
      card.className = "nova-card nova-anim";

      card.innerHTML = `
        <div class="nova-card-header">📧 تعاون وشراكات مع نوفا لينك</div>
        <div class="nova-card-text">
          نوفا لينك منفتحة على التعاونات المهنية الجادة: رعاية محتوى، شراكات، ورش عمل، أو مشاريع مشتركة
          ترتبط بالذكاء الاصطناعي للأعمال وتطوير المهارات.<br><br>
          إذا كان لديك فكرة تعاون واضحة، يسعدنا أن نسمعها منك.
        </div>
        <div class="nova-card-actions">
          <button class="nova-card-btn nova-card-btn-primary">تواصل عبر البريد</button>
        </div>
        <div class="nova-card-note">
          برجاء توضيح نوع التعاون المقترح، والفئة المستهدفة، وأي تفاصيل إضافية.
        </div>
      `;

      const btn = card.querySelector(".nova-card-btn-primary");
      btn.addEventListener("click", () => {
        const subject = encodeURIComponent("NovaLink Collaboration Opportunity");
        const body = encodeURIComponent(
          `مرحبًا فريق نوفا لينك,\n\nأود مناقشة فرصة تعاون/شراكة معكم.\n\nنوع التعاون المقترح:\n\nالجمهور المستهدف:\n\nتفاصيل إضافية:\n\nتم إرسال هذا الطلب عبر نوفا بوت على موقع نوفا لينك.`
        );

        if (config.FEEDBACK_API) {
          try {
            fetch(config.FEEDBACK_API, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "collaboration_interest",
                source: "novabot-collab-card",
                url: window.location.href,
                createdAt: new Date().toISOString()
              })
            }).catch(() => {});
          } catch (e) {}

        }

        window.location.href = `mailto:${config.CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      });

      return card;
    }

    // بطاقة المطوّر الخامسة – Developer Identity
    function detectLangFromText(text) {
      const hasLatin = /[A-Za-z]/.test(text || "");
      return hasLatin ? "en" : "ar";
    }

    function createDeveloperCard(langPref) {
      const langDev = langPref === "en" ? "en" : "ar";
      const card = document.createElement("div");
      card.className = "nova-card nova-anim";

      const title =
        langDev === "en"
          ? "👨‍💻 Who Built NovaBot?"
          : "👨‍💻 من يقف خلف نوفا بوت؟";

      const text =
        langDev === "en"
          ? "“Mohammed Abu Sunaina — a developer who blended banking experience with artificial intelligence.\nHe is building NovaLink as a practical space that helps entrepreneurs use smart tools with clarity and confidence.”"
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
          card = createBusinessCard();
          break;
        case "bot_lead":
          if (botCardShown) return;
          botCardShown = true;
          card = createBotLeadCard();
          break;
        case "collaboration":
          if (collabCardShown) return;
          collabCardShown = true;
          card = createCollaborationCard();
          break;
        case "developer_identity":
          if (devCardShown) return;
          devCardShown = true;
          const langFromUser = detectLangFromText(lastUserMessage || "");
          card = createDeveloperCard(langFromUser === "en" ? "en" : "ar");
          break;
        default:
          return;
      }

      appendCardInsideLastBotBubble(card);
    }

    // ===== تخزين المحادثة =====
    function saveConversation() {
      try {
        const payload = {
          ts: Date.now(),
          history: chatHistory.slice(-25)
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {}
    }

    function restoreConversationIfFresh() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data || !data.ts || !Array.isArray(data.history)) return;
        if (Date.now() - data.ts > STORAGE_TTL_MS) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        chatHistory = data.history;

        chatHistory.forEach((msg) => {
          if (msg.role === "user") {
            addUserMessage(msg.content || "");
          } else if (msg.role === "assistant") {
            addStaticBotMessage(
              escapeHtml(msg.content || "").replace(/\n/g, "<br>")
            );
          }
        });
      } catch (e) {}
    }

    function autoResizeTextarea() {
      input.style.height = "auto";
      const newHeight = Math.min(96, Math.max(32, input.scrollHeight));
      input.style.height = newHeight + "px";
    }
    input.addEventListener("input", autoResizeTextarea);

    // ===== فتح/إغلاق =====
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
      } catch (e) {}

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

      setTimeout(() => {
        input.focus();
      }, isSmallScreen() ? 350 : 200);
    }

    function closeChat(options = { fromBack: false }) {
      if (!novaChatOpen) return;
      novaChatOpen = false;

      backdrop.classList.remove("nova-open");
      backdrop.setAttribute("aria-hidden", "true");

      setTimeout(() => {
        if (isSmallScreen()) {
          fabBtn.classList.remove("nova-hidden");
        }
      }, 280);

      if (!options.fromBack) {
        try {
          if (history.state && history.state.novaBotOpen) {
            history.back();
          }
        } catch (e) {}
      }
    }

    // ===== إرسال رسالة =====
    async function handleSend() {
      const text = (input.value || "").trim();
      if (!text) return;

      addUserMessage(text);
      chatHistory.push({ role: "user", content: text });
      saveConversation();

      input.value = "";
      autoResizeTextarea();
      input.focus();
      sendBtn.disabled = true;

      startThinkingBubble();

      let result;
      try {
        const apiPromise = callNovaApi(text);
        const minDelayMs = 900 + Math.random() * 600;

        const [apiRes] = await Promise.all([
          apiPromise,
          new Promise((resolve) => setTimeout(resolve, minDelayMs))
        ]);

        result = apiRes || {};
      } catch (e) {
        console.error("NovaBot error:", e);
        result = {
          ok: false,
          reply: ""
        };
      } finally {
        sendBtn.disabled = false;
      }

      let replyText = "";

      if (result && result.ok && result.reply) {
        replyText = (result.reply || "").toString();
      } else {
        replyText =
          lang === "en"
            ? "✨ NovaBot UI is currently in testing mode (brain not fully connected).\nSoon it will be linked to a real AI engine for smarter answers.\nMeanwhile, you can explore NovaLink articles for more ideas."
            : "✨ واجهة نوفا بوت الآن في وضع التجربة (بدون دماغ متصل).\nسيتم قريبًا ربطها بمحرك ذكاء اصطناعي حقيقي ليرد على أسئلتك بشكل ذكي ومخصص.\nإلى أن يتم ذلك، يمكنك استكشاف مقالات نوفا لينك للحصول على أفكار عملية إضافية.";
      }

      // حالة بطاقة المطور – تعديل نص مؤشر الكتابة
      if (result && result.actionCard === "developer_identity") {
        replyText =
          detectLangFromText(text) === "en"
            ? "✨ This is a quick identity card for the person who built and trained NovaBot — a short glimpse into the human behind the technology."
            : "✨ هذه بطاقة تعريف سريعة بالشخص الذي طوّر نوفا بوت ودرّبه… لمحة خفيفة عن الإنسان خلف التقنية.";
      }

      const replyHtml = replyText.replace(/\n/g, "<br>").trim();
      typeReplyInCurrentBubble(replyHtml);

      chatHistory.push({
        role: "assistant",
        content: replyText
      });
      saveConversation();

      if (result && result.actionCard) {
        showCardByType(result.actionCard, text);
      }
    }

    // ===== أحداث الواجهة =====
    fabBtn.addEventListener("click", () => {
      if (novaChatOpen) {
        closeChat();
      } else {
        openChat();
      }
    });

    closeBtn.addEventListener("click", () => closeChat());

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        closeChat();
      }
    });

    setInterval(() => {
      if (!novaChatOpen) {
        fabBtn.classList.add("nova-idle");
        setTimeout(() => fabBtn.classList.remove("nova-idle"), 900);
      }
    }, 9000);

    sendBtn.addEventListener("click", handleSend);

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    window.addEventListener("popstate", function () {
      if (novaChatOpen) {
        closeChat({ fromBack: true });
      }
    });

    restoreConversationIfFresh();
  }
})();

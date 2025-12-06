// NovaBot Shadow Loader v0.1 – Prototype
(function () {
  // 1) العثور على سكربت اللودر نفسه
  const thisScript = document.currentScript;

  // 2) قراءة الإعدادات من data- attributes
  const API_URL   = thisScript.getAttribute("data-novabot-api") || "https://novabot-brain.onrender.com";
  const LOCALE    = thisScript.getAttribute("data-novabot-locale") || "ar";

  // 3) ننتظر DOM يجهز
  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  onReady(function () {
    // 4) إنشاء عنصر مضيف للـ Shadow DOM
    const host = document.createElement("div");
    host.id = "novabot-root-host";
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });

    // 5) HTML + CSS مصغرة للواجهة (زر + نافذة بسيطة)
    const widgetHTML = `
      <style>
        :host {
          all: initial;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Tajawal", sans-serif;
        }

        .nova-fab {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 999999;
          width: 70px;
          height: 70px;
          border-radius: 999px;
          border: none;
          padding: 0;
          background: radial-gradient(circle at 20% 20%, #fe930e, #1b577c 70%);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow:
            0 10px 30px rgba(0,0,0,0.45),
            0 0 0 2px rgba(255,255,255,0.08);
          color: #fff;
          font-size: 26px;
        }

        .nova-shell-backdrop {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at bottom right,
            rgba(0,0,0,0.55),
            rgba(0,0,0,0.75)
          );
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          z-index: 999998;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .nova-shell-backdrop.nova-open {
          opacity: 1;
          pointer-events: auto;
        }

        .nova-shell {
          margin: 16px;
          width: min(420px, 100vw - 32px);
          height: min(560px, 80vh);
          border-radius: 18px;
          background: radial-gradient(circle at 0% 0%, #132033, #050b14 60%);
          border: 1px solid rgba(192,209,224,0.22);
          box-shadow:
            0 22px 60px rgba(0,0,0,0.6),
            0 0 0 1px rgba(255,255,255,0.02);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform-origin: bottom right;
          transform: translateY(24px) scale(0.9);
          opacity: 0;
          transition:
            transform 0.35s cubic-bezier(0.23,1,0.32,1.1),
            opacity 0.35s ease;
          direction: rtl;
          color: #f5f7ff;
        }

        .nova-shell-backdrop.nova-open .nova-shell {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .nova-header {
          padding: 8px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #0c1724, #152a40);
        }

        .nova-header-title {
          font-size: 13px;
          font-weight: 700;
        }

        .nova-header-sub {
          font-size: 11px;
          opacity: .85;
        }

        .nova-close-btn {
          border: none;
          background: transparent;
          color: #fff;
          font-size: 18px;
          cursor: pointer;
        }

        .nova-body {
          flex: 1;
          padding: 10px;
          font-size: 13px;
          line-height: 1.7;
          overflow-y: auto;
          background: linear-gradient(
            135deg,
            #0b1824 0%,
            #101f33 40%,
            #050b14 100%
          );
        }

        .nova-footer {
          padding: 8px;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.35) 100%
          );
          display: flex;
          gap: 6px;
        }

        .nova-input {
          flex: 1;
          border-radius: 14px;
          border: 1px solid rgba(192,209,224,0.5);
          background: rgba(7,15,24,0.98);
          color: #f5f7ff;
          min-height: 34px;
          max-height: 96px;
          padding: 7px 10px;
          resize: none;
          font-size: 13px;
          outline: none;
        }

        .nova-send {
          border-radius: 999px;
          border: none;
          padding: 9px 11px;
          background: linear-gradient(135deg, #fe930e, #ffb24c);
          color: #10171f;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          min-width: 40px;
        }

        .nova-msg-row {
          margin-bottom: 8px;
        }
        .nova-msg-bot {
          background: rgba(12,26,44,0.96);
          border: 1px solid rgba(192,209,224,0.35);
          border-radius: 12px;
          padding: 8px 10px;
        }
        .nova-msg-user {
          background: linear-gradient(135deg, #1b577c, #13405b);
          border-radius: 12px;
          padding: 8px 10px;
          text-align: left;
        }

        @media (max-width: 768px) {
          .nova-shell {
            margin: 10px;
            width: calc(100vw - 20px);
            height: 70vh;
          }
        }
      </style>

      <button class="nova-fab" id="novaFab">🤖</button>

      <div class="nova-shell-backdrop" id="novaBackdrop">
        <div class="nova-shell">
          <header class="nova-header">
            <div>
              <div class="nova-header-title">NOVA BOT</div>
              <div class="nova-header-sub">مساعدك الذكي للأعمال</div>
            </div>
            <button class="nova-close-btn" id="novaClose">✕</button>
          </header>

          <main class="nova-body" id="novaBody">
            <div class="nova-msg-row">
              <div class="nova-msg-bot">
                أهلاً بك 👋<br>
                هذه نسخة تجريبية من واجهة نوفا بوت تعمل عبر Shadow DOM loader.
              </div>
            </div>
          </main>

          <footer class="nova-footer">
            <textarea class="nova-input" id="novaInput" placeholder="اكتب سؤالك هنا…"></textarea>
            <button class="nova-send" id="novaSend">➤</button>
          </footer>
        </div>
      </div>
    `;

    shadow.innerHTML = widgetHTML;

    // 6) توصيل الأحداث داخل الـ Shadow DOM
    const fab      = shadow.getElementById("novaFab");
    const backdrop = shadow.getElementById("novaBackdrop");
    const closeBtn = shadow.getElementById("novaClose");
    const bodyEl   = shadow.getElementById("novaBody");
    const inputEl  = shadow.getElementById("novaInput");
    const sendBtn  = shadow.getElementById("novaSend");

    function scrollBottom() {
      bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    function openChat() {
      backdrop.classList.add("nova-open");
      setTimeout(() => inputEl.focus(), 200);
    }

    function closeChat() {
      backdrop.classList.remove("nova-open");
    }

    fab.addEventListener("click", openChat);
    closeBtn.addEventListener("click", closeChat);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeChat();
    });

    function addUserMessage(text) {
      const row = document.createElement("div");
      row.className = "nova-msg-row";
      row.innerHTML = `<div class="nova-msg-user">${text}</div>`;
      bodyEl.appendChild(row);
      scrollBottom();
    }

    function addBotMessage(text) {
      const row = document.createElement("div");
      row.className = "nova-msg-row";
      row.innerHTML = `<div class="nova-msg-bot">${text}</div>`;
      bodyEl.appendChild(row);
      scrollBottom();
    }

    async function sendMessage() {
      const text = (inputEl.value || "").trim();
      if (!text) return;
      addUserMessage(text);
      inputEl.value = "";

      // نسخة تجريبية: رد ثابت (لاحقاً نربطه مع API_URL)
      addBotMessage("🚧 هذه نسخة تجريبية من نوفا بوت. سيتم ربطها بمحرك الذكاء الاصطناعي لاحقاً.");
      // هنا لاحقاً نضيف:
      // const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ message: text }) ... })
    }

    sendBtn.addEventListener("click", sendMessage);
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  });
})();

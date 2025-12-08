// NovaBot v6.9.3 – Shadow DOM Widget
// By Mohammed Abu Snaina – NOVALINK.AI

(function () {
  const currentScript = document.currentScript;
  const API_URL = currentScript?.dataset.novabotApi || "https://novabot-brain.onrender.com";
  const LOCALE = (currentScript?.dataset.novabotLocale || "ar").toLowerCase();

  // إنشاء الحاوية + الشادو دوم
  function initNovaBot() {
    if (document.getElementById("novabot-launcher-root")) return;

    const host = document.createElement("div");
    host.id = "novabot-launcher-root";
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = getNovaCss();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = getNovaHtml();

    shadow.appendChild(style);
    shadow.appendChild(wrapper);

    wireNovaLogic(shadow);
  }

  // ============== CSS ==============
  function getNovaCss() {
    return `
/* تحميل خط Tajawal داخل الشادو */
@import url("https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap");

/* RESET داخل الشادو */
*,
*::before,
*::after {
  box-sizing: border-box;
  font-family: "Tajawal", system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
  margin: 0;
  padding: 0;
}

/* متغيرات الألوان */
:host {
  --nova-blue: #1b577c;
  --nova-blue-deep: #0b1a2a;
  --nova-blue-soft: #122235;
  --nova-orange: #fe930e;
  --nova-bg-dark: #050b14;
  --nova-font: "Tajawal", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

/* ============ الزر العائم ============ */
.nova-fab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  width: clamp(70px, 12vw, 92px);
  height: clamp(70px, 12vw, 92px);
  border-radius: 999px;
  border: none;
  padding: 0;
  background: radial-gradient(circle at 20% 20%, #fe930e, #1b577c 70%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.45),
    0 0 0 2px rgba(255, 255, 255, 0.08);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    filter 0.25s ease,
    opacity 0.25s ease;
}
.nova-fab-inner {
  width: 82%;
  height: 82%;
  border-radius: inherit;
  background: rgba(9, 19, 30, 0.6);
  backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.nova-fab img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.nova-fab:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.6),
    0 0 0 2px rgba(254, 147, 14, 0.4);
  filter: drop-shadow(0 0 12px rgba(254, 147, 14, 0.6));
}

/* اهتزاز خفيف كل فترة */
@keyframes novaPulse {
  0%, 100% { transform: translateY(0) scale(1); }
  25% { transform: translateY(-3px) scale(1.02); }
  50% { transform: translateY(1px) scale(0.99); }
  75% { transform: translateY(-2px) scale(1.01); }
}
.nova-fab.nova-idle {
  animation: novaPulse 0.9s ease-in-out 1;
}

/* إخفاء الزر عند فتح الشات على الموبايل */
.nova-fab.nova-hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateY(10px) scale(0.9);
}

/* ============ الخلفية خلف نافذة الدردشة ============ */
.nova-chat-backdrop {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at bottom right, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.75));
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  z-index: 9998;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
}

.nova-chat-backdrop.nova-open {
  opacity: 1;
  pointer-events: auto;
}

/* ============ نافذة الدردشة – الوضع الليلي الأساسي ============ */
.nova-chat-shell {
  position: relative;
  margin: 16px 16px 120px 16px;
  width: min(420px, 100vw - 32px);
  height: min(560px, 80vh);
  border-radius: 18px;
  background: radial-gradient(circle at 0% 0%, #132033, #050b14 60%);
  border: 1px solid rgba(192, 209, 224, 0.22);
  box-shadow:
    0 22px 60px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.02);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform-origin: bottom right;
  transform: translateY(24px) scale(0.9);
  opacity: 0;
  transition:
    transform 0.35s cubic-bezier(0.23, 1, 0.32, 1.1),
    opacity 0.35s ease;
}

.nova-chat-backdrop.nova-open .nova-chat-shell {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* ============ الهيدر – Glass Card ============ */
.nova-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  margin: 8px;
  border-radius: 16px;
  background: linear-gradient(135deg, #0c1724, #152a40);
  color: #ffffff;
  direction: rtl;
  font-family: var(--nova-font);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
  position: relative;
  z-index: 4;
}
.nova-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nova-header-avatar {
  width: 34px;
  height: 50px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(9, 19, 30, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid rgba(254, 147, 14, 0.75);
  padding: 2px;
}
.nova-header-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.nova-header-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.nova-header-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.nova-header-subtitle {
  font-size: 10.5px;
  color: rgba(253, 253, 255, 0.82);
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.nova-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #1ec070;
  box-shadow: 0 0 10px rgba(30, 192, 112, 0.8);
}
.nova-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.nova-header-chip {
  border-radius: 999px;
  border: 1px solid rgba(233, 243, 255, 0.25);
  padding: 3px 8px;
  font-size: 10px;
  color: rgba(233, 243, 255, 0.86);
  white-space: nowrap;
}
.nova-header-close {
  background: transparent;
  border: none;
  color: rgba(249, 251, 255, 0.8);
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 999px;
  transition: background 0.2s ease, color 0.2s ease;
}
.nova-header-close:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
}

/* ============ جسم المحادثة ============ */
.nova-chat-body {
  flex: 1;
  padding: 6px 10px 80px 10px;
  overflow-y: auto;
  direction: rtl;
  font-family: var(--nova-font);
  background: linear-gradient(
    135deg,
    #0b1824 0%,
    #101f33 40%,
    #050b14 100%
  );
  color: #f5f7ff;
}

/* Scrollbar */
.nova-chat-body::-webkit-scrollbar {
  width: 6px;
}
.nova-chat-body::-webkit-scrollbar-track {
  background: transparent;
}
.nova-chat-body::-webkit-scrollbar-thumb {
  background: rgba(192, 209, 224, 0.4);
  border-radius: 10px;
}

/* فقاعات الرسائل */
.nova-msg-row {
  display: flex;
  margin-bottom: 8px;
}
.nova-msg-row.nova-user {
  justify-content: flex-end;
}
.nova-msg-row.nova-bot {
  justify-content: flex-start;
}
.nova-bubble {
  max-width: 78%;
  padding: 9px 11px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.7;
  word-wrap: break-word;
  word-break: break-word;
}

/* فقاعة المستخدم */
.nova-bubble-user {
  background: linear-gradient(135deg, #1b577c, #13405b);
  color: #fdfdff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 4px 12px rgba(10, 26, 44, 0.6);
}

/* فقاعة نوفا – ليلي */
.nova-bubble-bot {
  background: rgba(12, 26, 44, 0.96);
  border: 1px solid rgba(192, 209, 224, 0.35);
  color: #e3edf9;
  border-bottom-left-radius: 4px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
  position: relative;
}

/* رأس فقاعة البوت */
.nova-bot-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 11px;
  color: rgba(227, 237, 249, 0.95);
}
.nova-bot-header-icon {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(9, 19, 30, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}
.nova-bot-header-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.nova-bot-name {
  font-weight: 600;
  letter-spacing: 0.01em;
}

/* محتوى فقاعة البوت */
.nova-bubble-content {
  font-size: 13px;
}
.nova-bubble-content a {
  color: #82b7ff;
  text-decoration: underline;
  cursor: pointer;
}
.nova-bubble-content a:hover {
  color: #fe930e;
}

/* ============ مؤشر الكتابة ============ */
.nova-typing {
  font-size: 11px;
  color: #e3edf9;
  margin-top: 2px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.nova-typing-dots {
  display: inline-flex;
  gap: 2px;
}
.nova-dot-typing {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: #fe930e;
  animation: novaTyping 1.2s infinite ease-in-out;
}
.nova-dot-typing:nth-child(1) { animation-delay: 0s; }
.nova-dot-typing:nth-child(2) { animation-delay: 0.2s; }
.nova-dot-typing:nth-child(3) { animation-delay: 0.4s; }
@keyframes novaTyping {
  0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-2px); }
}

/* ============ الفوتر الزجاجي ============ */
.nova-chat-footer {
  padding: 0;
  border-top: none;
  background: transparent;
  position: relative;
}

.nova-footer-row {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 8px 10px 10px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-direction: row-reverse;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.00) 0%,
    rgba(0, 0, 0, 0.20) 55%,
    rgba(0, 0, 0, 0.38) 100%
  );
  z-index: 3;
}
.nova-input-wrapper {
  position: relative;
  flex: 1;
}

/* حقل الكتابة */
.nova-input {
  width: 100%;
  padding: 7px 10px 7px 52px;
  border-radius: 14px;
  border: 1px solid rgba(192, 209, 224, 0.5);
  background: rgba(7, 15, 24, 0.98);
  color: #f5f7ff;
  font-size: 13px;
  font-family: var(--nova-font);
  outline: none;
  resize: none;
  min-height: 32px;
  max-height: 96px;
  line-height: 1.6;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}
.nova-input::placeholder {
  color: rgba(180, 199, 220, 0.82);
}
.nova-input:focus {
  border-color: rgba(254, 147, 14, 0.85);
  box-shadow: 0 0 0 1px rgba(254, 147, 14, 0.4);
  background: rgba(8, 18, 30, 0.98);
}
.nova-input-hint {
  position: absolute;
  left: 14px;
  bottom: 3px;
  font-size: 10px;
  color: rgba(180, 199, 220, 0.7);
}

/* زر الإرسال – شكل بيضاوي رأسي */
.nova-send-btn {
  border-radius: 999px;
  border: none;
  padding: 10px 13px;
  background: linear-gradient(135deg, #fe930e, #ffb24c);
  color: #10171f;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--nova-font);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(254, 147, 14, 0.45);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    filter 0.15s ease,
    opacity 0.15s ease;
  min-width: 40px;
  min-height: 40px;
}
.nova-send-btn span {
  font-size: 15px;
}
.nova-send-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.02);
  box-shadow: 0 10px 24px rgba(254, 147, 14, 0.55);
}
.nova-send-btn:active {
  transform: translateY(1px) scale(0.97);
  box-shadow: 0 4px 14px rgba(254, 147, 14, 0.35);
}
.nova-send-btn:disabled {
  opacity: 0.6;
  cursor: default;
  box-shadow: none;
}

/* رسائل نظامية */
.nova-system-msg {
  text-align: center;
  font-size: 10px;
  color: rgba(196, 210, 230, 0.9);
  margin: 6px 0 2px;
}

/* ============ البطاقات الذكية ============ */
.nova-card {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(192, 209, 224, 0.35);
  background: rgba(10, 22, 36, 0.96);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.55);
  font-size: 13px;
  direction: rtl;
  color: #e3edf9;
  animation: novaCardIn 0.45s cubic-bezier(.22,.7,.3,1) forwards;
}
.nova-card-header {
  font-weight: 700;
  margin-bottom: 6px;
}
.nova-card-text {
  font-size: 12px;
  color: rgba(222, 234, 248, 0.96);
  margin-bottom: 8px;
}
.nova-card-input {
  width: 100%;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid rgba(192, 209, 224, 0.7);
  background: rgba(5, 13, 22, 0.9);
  color: #e8f0ff;
  font-family: var(--nova-font);
  font-size: 12px;
  margin-bottom: 8px;
}
.nova-card-input::placeholder {
  color: rgba(196, 210, 230, 0.82);
}
.nova-card-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  justify-content: flex-start;
}
.nova-card-btn {
  border-radius: 999px;
  border: none;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  font-family: var(--nova-font);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.nova-card-btn-primary {
  background: linear-gradient(135deg, #fe930e, #ffb24c);
  color: #10171f;
  box-shadow: 0 3px 10px rgba(254, 147, 14, 0.45);
}
.nova-card-btn-secondary {
  background: rgba(11, 24, 38, 0.9);
  color: #e0ecff;
  border: 1px solid rgba(192, 209, 224, 0.6);
}
.nova-card-note {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(196, 210, 230, 0.9);
}
.nova-card-separator {
  height: 6px;
}

/* حركة دخول البطاقات */
@keyframes novaCardIn {
  0%   { opacity: 0; transform: translateY(18px) scale(0.96); }
  60%  { opacity: 1; transform: translateY(4px)  scale(1.02); }
  100% { opacity: 1; transform: translateY(0)    scale(1); }
}

/* ============ موبايل: ارتفاع أقل وتوسيط ============ */
@media (max-width: 768px) {
  .nova-chat-backdrop {
    align-items: flex-end;
    justify-content: center;
  }
  .nova-chat-shell {
    margin: 0 10px 12px 10px;
    width: calc(100vw - 20px);
    height: 55dvh;
  }
  .nova-header-avatar {
    width: 30px;
    height: 44px;
  }
  .nova-header-title {
    font-size: 12px;
  }
  .nova-header-subtitle {
    font-size: 10px;
  }
  .nova-header-chip {
    font-size: 9px;
    padding: 2px 7px;
  }
}

/* ============ الوضع النهاري للموبايل + التابلت فقط ============ */
@media (max-width: 1024px) and (prefers-color-scheme: light) {

  .nova-chat-shell {
    background: #f5f7fc;
    border: 1px solid rgba(27, 87, 124, 0.18);
    box-shadow:
      0 18px 40px rgba(0, 0, 0, 0.08),
      0 0 0 1px rgba(255, 255, 255, 0.85);
  }

  .nova-chat-header {
    background: rgba(255, 255, 255, 0.9);
    color: #1b577c;
    box-shadow: 0 4px 12px rgba(27, 87, 124, 0.15);
  }

  .nova-header-subtitle {
    color: #1b577c;
  }

  .nova-header-chip {
    color: #1b577c;
    border-color: rgba(27,87,124,0.35);
  }

  .nova-header-avatar {
    background: #1b577c;
    border-color: rgba(254,147,14,0.85);
  }

  .nova-chat-body {
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.98),
      rgba(245, 247, 252, 0.99)
    );
    color: #122235;
  }

  .nova-bubble-bot {
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(27, 87, 124, 0.20);
    color: #122235;
    box-shadow: 0 3px 10px rgba(27, 87, 124, 0.18);
  }

  .nova-bot-header {
    color: #122235;
  }

  .nova-bot-header-icon {
    background: #1b577c;
  }

  .nova-bubble-content {
    color: #122235;
  }

  .nova-typing {
    color: #122235;
  }

  .nova-bubble-content a {
    color: #1b577c;
  }
  .nova-bubble-content a:hover {
    color: #fe930e;
  }

  .nova-card {
    background: rgba(255, 255, 255, 0.98);
    border-color: rgba(27, 87, 124, 0.20);
    color: #122235;
    box-shadow: 0 8px 20px rgba(27, 87, 124, 0.16);
  }
  .nova-card-text {
    color: #122235;
  }
  .nova-card-note {
    color: #3a4b64;
  }

  .nova-card-input {
    background: #ffffff;
    color: #122235;
    border-color: rgba(27,87,124,0.35);
  }

  .nova-card-btn-secondary {
    background: #1b577c;
    color: #ffffff;
    border: 1px solid rgba(27, 87, 124, 0.85);
  }

  .nova-chat-footer {
    background: transparent;
  }

  .nova-footer-row {
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    background: linear-gradient(
      to bottom,
      rgba(255,255,255,0.00) 0%,
      rgba(255,255,255,0.75) 55%,
      rgba(255,255,255,0.92) 100%
    );
  }

  .nova-input {
    background: #ffffff;
    color: #122235;
    border: 1px solid rgba(27, 87, 124, 0.35);
  }
  .nova-input:focus {
    background: #ffffff;
  }
}

/* تأكيد الخط مرة أخرى لكل شيء داخل الشادو */
body, button, textarea, input, div, span, p, a {
  font-family: "Tajawal", system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
}
`;
  }

  // ============== HTML ==============
  function getNovaHtml() {
    return `
<button class="nova-fab" id="novaFabBtn" aria-label="Open NovaBot chat">
  <div class="nova-fab-inner">
    <img src="https://assets.zyrosite.com/YD0w46zZ5ZIrwlP8/uo3osso1o--uuuoss-ossuodeguu-1-fUS15tGQu2AgbmOA.gif" alt="NovaBot Icon" />
  </div>
</button>

<div class="nova-chat-backdrop" id="novaBackdrop" aria-hidden="true">
  <div class="nova-chat-shell" dir="rtl">
    <header class="nova-chat-header">
      <div class="nova-header-left">
        <div class="nova-header-avatar">
          <img
            src="https://assets.zyrosite.com/YD0w46zZ5ZIrwlP8/novabot-2-f081v1SXHunuZjwP.png"
            alt="NovaBot Avatar"
          />
        </div>
        <div class="nova-header-text">
          <div class="nova-header-title">NOVA BOT</div>
          <div class="nova-header-subtitle">
            <span class="nova-dot"></span>
            <span>مساعدك الذكي لتطوير الأعمال</span>
          </div>
        </div>
      </div>
      <div class="nova-header-actions">
        <div class="nova-header-chip">NovaBot v6.9.3</div>
        <button class="nova-header-close" id="novaCloseBtn" aria-label="Close chat">✕</button>
      </div>
    </header>

    <main class="nova-chat-body" id="novaChatBody"></main>

    <footer class="nova-chat-footer">
      <div class="nova-footer-row">
        <div class="nova-input-wrapper">
          <textarea
            id="novaInput"
            class="nova-input"
            placeholder="اسأل NovaBot"
          ></textarea>
          <div class="nova-input-hint"></div>
        </div>
        <button class="nova-send-btn" id="novaSendBtn" aria-label="إرسال">
          <span>➤</span>
        </button>
      </div>
    </footer>
  </div>
</div>
`;
  }

  // ============== المنطق (JS) ==============
  function wireNovaLogic(root) {
    const SOUND_URL =
      "https://assets.zyrosite.com/YD0w46zZ5ZIrwlP8/new-notification-3-398649-RwIqiPPdJUta0dpV.mp3";
    const SUBSCRIBE_URL = "https://novalink-ai.com/ashtrk-alan";
    const SERVICES_URL = "https://novalink-ai.com/services-khdmat-nwfa-lynk";
    const CONTACT_EMAIL = "contact@novalink-ai.com";
    const STORAGE_KEY = "novabot_v6.9_conversation";
    const STORAGE_TTL_MS = 12 * 60 * 60 * 1000;

    const fabBtn = root.getElementById("novaFabBtn");
    const backdrop = root.getElementById("novaBackdrop");
    const closeBtn = root.getElementById("novaCloseBtn");
    const chatBody = root.getElementById("novaChatBody");
    const input = root.getElementById("novaInput");
    const sendBtn = root.getElementById("novaSendBtn");

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

    function isSmallScreen() {
      return window.innerWidth <= 640;
    }

    function escapeHtml(str) {
      return (str || "").replace(/[&<>"]/g, (c) => {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] || c;
      });
    }

    function scrollToBottom() {
      chatBody.scrollTop = chatBody.scrollHeight;
    }

    function playNovaSound() {
      if (!SOUND_URL) return;
      if (soundCount >= 3) return;
      try {
        const a = new Audio(SOUND_URL);
        a.play().catch(() => {});
        soundCount++;
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
              <span>نوفا بوت يكتب الآن</span>
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

    async function callNovaApi(message) {
      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message })
        });

        if (!response.ok) {
          return { ok: false, reply: "" };
        }

        const data = await response.json();
        return {
          ok: data.ok,
          reply: data.reply,
          actionCard: data.actionCard || null
        };
      } catch (e) {
        console.error("❌ NovaBot API Error:", e);
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

    function createSubscribeCard(type, lang) {
      const card = document.createElement("div");
      card.className = "nova-card";

      const isBusiness = type === "business";

      const title = lang === "en"
        ? (isBusiness ? "📧 Grow your business step by step" : "📧 Subscribe to NovaLink")
        : (isBusiness ? "📧 طوّر عملك خطوة بخطوة" : "📧 اشترك في نوفا لينك");

      const text = lang === "en"
        ? (isBusiness
          ? "If business growth really matters to you, keeping up with practical AI-for-business updates is not a luxury. Leave your email to receive focused, result-oriented insights."
          : "Start your journey with us… towards productivity that grows every single day. ✨")
        : (isBusiness
          ? "إذا كان تطوّر أعمالك يهمك فعلاً، فمتابعة التحديثات في الذكاء الاصطناعي للأعمال ليست رفاهية. اترك بريدك لتصلك أحدث المقالات والأفكار التي تركّز على النتائج، لا الضجيج."
          : "ابدأ رحلتك معنا… نحو إنتاجيةٍ تنمو كل يوم. ✨");

      const secondaryText = lang === "en"
        ? (isBusiness ? "Visit services page" : "Visit subscription page")
        : (isBusiness ? "زيارة صفحة الخدمات" : "زيارة صفحة الاشتراك");

      card.innerHTML = `
        <div class="nova-card-header">${title}</div>
        <div class="nova-card-text">${text}</div>
        <input type="email" class="nova-card-input" placeholder="${lang === "en" ? "example@email.com" : "example@email.com"}" />
        <div class="nova-card-actions">
          <button class="nova-card-btn nova-card-btn-primary">${lang === "en" ? "Subscribe" : "اشتراك"}</button>
          <button class="nova-card-btn nova-card-btn-secondary" type="button">
            ${secondaryText}
          </button>
        </div>
        <div class="nova-card-note">
          ${lang === "en"
            ? "You can unsubscribe at any time through the link at the bottom of our emails."
            : "يمكنك إلغاء الاشتراك في أي وقت من خلال الرابط الموجود في رسائل البريد."}
        </div>
      `;

      const emailInput = card.querySelector(".nova-card-input");
      const btnPrimary = card.querySelector(".nova-card-btn-primary");
      const btnSecondary = card.querySelector(".nova-card-btn-secondary");

      btnSecondary.addEventListener("click", () => {
        const url = isBusiness ? SERVICES_URL : SUBSCRIBE_URL;
        window.open(url, "_blank");
      });

      btnPrimary.addEventListener("click", async () => {
        const email = (emailInput.value || "").trim();
        if (!email || !email.includes("@")) {
          alert(lang === "en" ? "Please enter a valid email address." : "الرجاء إدخال بريد إلكتروني صالح.");
          return;
        }

        btnPrimary.disabled = true;
        btnPrimary.textContent = lang === "en" ? "Sending..." : "جارٍ الإرسال...";

        btnPrimary.textContent = lang === "en" ? "Subscribed ✅" : "تم الاشتراك ✅";
      });

      return card;
    }

    function createBotLeadCard(lang) {
      const card = document.createElement("div");
      card.className = "nova-card";

      const header = lang === "en"
        ? "📧 AI Chatbot for your business"
        : "📧 بوت دردشة لعملك";

      const text = lang === "en"
        ? "Imagine your website having its own NovaBot that answers your customers, explains your services, and suggests what fits them… That’s exactly what we can build with you at NovaLink.<br><br>Leave your email or WhatsApp number and we’ll arrange a short free intro call."
        : "إذا تخيّلت أن موقعك أو مشروعك يملك نوفا بوت خاصًا به يرد على عملائك، يشرح خدماتك، ويقترح عليهم ما يناسبهم… فهذا بالضبط ما يمكن أن نبنيه معك في نوفا لينك.<br><br>اترك بريدك أو رقم واتساب وسنرتّب معك استشارة تعريفية مجانية قصيرة.";

      const placeholder = lang === "en"
        ? "Your email or WhatsApp number"
        : "بريدك الإلكتروني أو رقم واتساب";

      const btnText = lang === "en"
        ? "Book your free call"
        : "احجز استشارتك المجانية";

      const note = lang === "en"
        ? "We’ll open a pre-filled email that you can edit before sending."
        : "سيتم فتح رسالة بريد جاهزة لتأكيد طلبك، ويمكنك تعديلها قبل الإرسال.";

      card.innerHTML = `
        <div class="nova-card-header">${header}</div>
        <div class="nova-card-text">${text}</div>
        <input type="text" class="nova-card-input" placeholder="${placeholder}" />
        <div class="nova-card-actions">
          <button class="nova-card-btn nova-card-btn-primary">${btnText}</button>
        </div>
        <div class="nova-card-note">
          ${note}
        </div>
      `;

      const contactInput = card.querySelector(".nova-card-input");
      const btn = card.querySelector(".nova-card-btn-primary");

      btn.addEventListener("click", () => {
        const contact = (contactInput.value || "").trim();
        if (!contact) {
          alert(lang === "en"
            ? "Please enter an email or WhatsApp number."
            : "الرجاء إدخال بريد إلكتروني أو رقم واتساب للتواصل معك.");
          return;
        }

        const subject = encodeURIComponent(
          lang === "en"
            ? "NovaBot Lead – Request for chatbot consultation"
            : "NovaBot Lead – طلب استشارة حول بوت دردشة"
        );
        const body = encodeURIComponent(
          (lang === "en"
            ? `Hello NovaLink team,\n\nI’d like a free consultation about creating an AI chatbot for my project.\n\nContact details:\n${contact}\n\nSent via NovaBot on NovaLink website.`
            : `مرحبًا فريق نوفا لينك,\n\nأرغب في استشارة مجانية حول إنشاء بوت دردشة بالذكاء الاصطناعي لمشروعي.\n\nبيانات التواصل:\n${contact}\n\nتم إرسال هذا الطلب عبر نوفا بوت على موقع نوفا لينك.`)
        );

        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      });

      return card;
    }

    function createBusinessCard(lang) {
      return createSubscribeCard("business", lang);
    }

    function createCollaborationCard(lang) {
      const card = document.createElement("div");
      card.className = "nova-card";

      const header = lang === "en"
        ? "📧 Collaborations & Partnerships with NovaLink"
        : "📧 تعاون وشراكات مع نوفا لينك";

      const text = lang === "en"
        ? "NovaLink is open to serious professional collaborations: sponsored content, partnerships, workshops, or joint projects related to AI for business and skill development.<br><br>If you have a clear collaboration idea, we’d be happy to hear it."
        : "نوفا لينك منفتحة على التعاونات المهنية الجادة: رعاية محتوى، شراكات، ورش عمل، أو مشاريع مشتركة ترتبط بالذكاء الاصطناعي للأعمال وتطوير المهارات.<br><br>إذا كان لديك فكرة تعاون واضحة، يسعدنا أن نسمعها منك.";

      const btnText = lang === "en"
        ? "Contact via email"
        : "تواصل عبر البريد";

      const note = lang === "en"
        ? "Please clarify the type of collaboration, target audience, and any extra details."
        : "برجاء توضيح نوع التعاون المقترح، والفئة المستهدفة، وأي تفاصيل إضافية.";

      card.innerHTML = `
        <div class="nova-card-header">${header}</div>
        <div class="nova-card-text">${text}</div>
        <div class="nova-card-actions">
          <button class="nova-card-btn nova-card-btn-primary">${btnText}</button>
        </div>
        <div class="nova-card-note">
          ${note}
        </div>
      `;

      const btn = card.querySelector(".nova-card-btn-primary");
      btn.addEventListener("click", () => {
        const subject = encodeURIComponent(
          lang === "en"
            ? "NovaLink Collaboration Opportunity"
            : "NovaLink – فرصة تعاون/شراكة"
        );
        const body = encodeURIComponent(
          (lang === "en"
            ? `Hello NovaLink team,\n\nI’d like to discuss a collaboration/partnership with you.\n\nType of collaboration:\n\nTarget audience:\n\nExtra details:\n\nSent via NovaBot on NovaLink website.`
            : `مرحبًا فريق نوفا لينك,\n\nأود مناقشة فرصة تعاون/شراكة معكم.\n\nنوع التعاون المقترح:\n\nالجمهور المستهدف:\n\nتفاصيل إضافية:\n\nتم إرسال هذا الطلب عبر نوفا بوت على موقع نوفا لينك.`)
        );

        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      });

      return card;
    }

    function createDeveloperCard(lang) {
      const card = document.createElement("div");
      card.className = "nova-card";

      const title =
        lang === "en"
          ? "👨‍💻 Who Built NovaBot?"
          : "👨‍💻 من يقف خلف نوفا بوت؟";

      const text =
        lang === "en"
          ? "“Mohammed Abu Sunaina — an Arab developer who blended banking experience with artificial intelligence.\nHe is building NovaLink as a practical space that helps entrepreneurs use smart tools with clarity and confidence.”"
          : "“محمد أبو سنينة—مطور عربي جمع خبرته بين العمل المصرفي والذكاء الاصطناعي.\nيبني نوفا لينك كمساحة عملية تساعد روّاد الأعمال على استخدام الأدوات الذكية بثقة ووضوح.”";

      card.innerHTML = `
        <div class="nova-card-header">${title}</div>
        <div class="nova-card-text">${text.replace(/\n/g, "<br>")}</div>
      `;

      return card;
    }

    function detectLangFromText(text) {
      const hasArabic = /[ء-ي]/.test(text);
      const hasLatin = /[a-zA-Z]/.test(text);
      if (hasArabic && !hasLatin) return "ar";
      if (hasLatin && !hasArabic) return "en";
      return LOCALE === "en" ? "en" : "ar";
    }

    function showCardByType(cardType, lang) {
      let card = null;

      switch (cardType) {
        case "subscribe":
          if (subscribeCardShown) return;
          subscribeCardShown = true;
          card = createSubscribeCard("default", lang);
          break;
        case "business_subscribe":
          if (businessCardShown) return;
          businessCardShown = true;
          card = createBusinessCard(lang);
          break;
        case "bot_lead":
          if (botCardShown) return;
          botCardShown = true;
          card = createBotLeadCard(lang);
          break;
        case "collaboration":
          if (collabCardShown) return;
          collabCardShown = true;
          card = createCollaborationCard(lang);
          break;
        case "developer_identity":
          card = createDeveloperCard(lang);
          break;
        default:
          return;
      }

      appendCardInsideLastBotBubble(card);
    }

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
            addStaticBotMessage(escapeHtml(msg.content || "").replace(/\n/g, "<br>"));
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

    const WELCOME_HTML =
      "مرحباً بك في نوفا لينك 👋<br>" +
      "أنا نوفا بوت… جاهز لمساعدتك في أي سؤال حول الذكاء الاصطناعي وتطوير أعمالك.";

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

    async function handleSend() {
      const text = (input.value || "").trim();
      if (!text) return;

      const lang = detectLangFromText(text);

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
        console.error("❌ NovaBot error:", e);
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
            ? "✨ NovaBot UI is currently in trial mode (without a connected brain).\nIt will soon be linked to a real AI engine to reply intelligently.\nUntil then, you can explore NovaLink articles for more practical ideas."
            : "✨ واجهة نوفا بوت الآن في وضع التجربة (بدون دماغ متصل).\nسيتم قريبًا ربطها بمحرك ذكاء اصطناعي حقيقي ليرد على أسئلتك بشكل ذكي ومخصص.\nإلى أن يتم ذلك، يمكنك استكشاف مقالات نوفا لينك للحصول على أفكار عملية إضافية.";
      }

      // حالة بطاقة المطوّر: لو الـ actionCard = developer_identity نستخدم نص خاص
      if (result && result.actionCard === "developer_identity") {
        replyText =
          lang === "en"
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
        showCardByType(result.actionCard, lang);
      }
    }

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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNovaBot);
  } else {
    initNovaBot();
  }
})();

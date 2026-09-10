// chatbot-widget.js
// Self-contained chat widget. Injects itself at the end of <body>.
// Talks to /api/chat (a Vercel serverless function) — never calls the AI API directly.

(function () {
  const CONFIG = {
    companyPhone: "(555) 010-2938",
    companyEmail: "info@bluewrenchplumbing.com",
    serviceArea: "Greater Metro Area & surrounding suburbs",
    inactivityTimeoutMs: 60000,
    typingDelayMinMs: 400,
    typingDelayMaxMs: 1100,
    goodbyeWords: ["bye", "goodbye", "thanks", "thank you", "that's all", "ok thanks"],
    greeting: "Hi! I'm the Blue Wrench Plumbing assistant. What can I help you with today?",
  };

  let conversationHistory = [];
  let hasShownFirstForm = false;
  let hasContactInfo = false;
  let hasShownSecondForm = false;
  let inactivityTimer = null;
  let widgetOpen = false;

  // ---------- DOM setup ----------

  const root = document.createElement("div");
  root.id = "bwp-chat-widget";
  root.innerHTML = `
    <button id="bwp-chat-bubble" aria-label="Open chat">💬</button>
    <div id="bwp-chat-panel" hidden>
      <div id="bwp-chat-header">
        <span>Blue Wrench Plumbing</span>
        <button id="bwp-chat-close" aria-label="Close chat">×</button>
      </div>
      <div id="bwp-chat-messages"></div>
      <div id="bwp-chat-input-row">
        <input id="bwp-chat-input" type="text" placeholder="Type a message..." autocomplete="off" />
        <button id="bwp-chat-send">Send</button>
      </div>
      <div id="bwp-chat-footer">Call us anytime: <a href="tel:5550102938">${CONFIG.companyPhone}</a></div>
    </div>
  `;
  document.body.appendChild(root);

  const bubble = root.querySelector("#bwp-chat-bubble");
  const panel = root.querySelector("#bwp-chat-panel");
  const closeBtn = root.querySelector("#bwp-chat-close");
  const messagesEl = root.querySelector("#bwp-chat-messages");
  const inputEl = root.querySelector("#bwp-chat-input");
  const sendBtn = root.querySelector("#bwp-chat-send");

  // ---------- Helpers ----------

  function addMessage(text, sender) {
    const el = document.createElement("div");
    el.className = "bwp-msg bwp-msg-" + sender;
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addBotMessageWithDelay(text, callback) {
    const typingEl = document.createElement("div");
    typingEl.className = "bwp-msg bwp-msg-bot bwp-typing";
    typingEl.textContent = "...";
    messagesEl.appendChild(typingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const delay =
      CONFIG.typingDelayMinMs +
      Math.random() * (CONFIG.typingDelayMaxMs - CONFIG.typingDelayMinMs);

    setTimeout(() => {
      typingEl.remove();
      addMessage(text, "bot");
      if (callback) callback();
      resetInactivityTimer();
    }, delay);
  }

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    if (!widgetOpen) return;
    inactivityTimer = setTimeout(() => {
      triggerSecondContactAsk();
    }, CONFIG.inactivityTimeoutMs);
  }

  function isGoodbye(message) {
    const lower = message.toLowerCase();
    return CONFIG.goodbyeWords.some((word) => lower.includes(word));
  }

  // ---------- Lead capture forms ----------

  function showFirstLeadForm(onDone) {
    hasShownFirstForm = true;
    const formEl = document.createElement("div");
    formEl.className = "bwp-lead-form";
    formEl.innerHTML = `
      <button class="bwp-form-dismiss" aria-label="Dismiss">×</button>
      <p>Mind sharing a few details so we can follow up if needed?</p>
      <input type="text" class="bwp-form-name" placeholder="Name" />
      <input type="tel" class="bwp-form-phone" placeholder="Phone" />
      <input type="email" class="bwp-form-email" placeholder="Email" />
      <div class="bwp-form-actions">
        <button class="bwp-form-submit">Submit</button>
        <button class="bwp-form-skip">No thanks, just answer my question</button>
      </div>
    `;
    messagesEl.appendChild(formEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    function finish(submitted) {
      formEl.remove();
      if (submitted) {
        hasContactInfo = true;
        const name = formEl.querySelector(".bwp-form-name").value.trim();
        addMessage(
          name ? `Thanks, ${name} — got it.` : "Thanks — got it.",
          "bot"
        );
      }
      onDone();
    }

    formEl.querySelector(".bwp-form-dismiss").addEventListener("click", () => finish(false));
    formEl.querySelector(".bwp-form-skip").addEventListener("click", () => finish(false));
    formEl.querySelector(".bwp-form-submit").addEventListener("click", () => finish(true));
  }

  function showSecondLeadForm() {
    if (hasShownSecondForm || hasContactInfo) {
      showFinalContactBlock();
      return;
    }
    hasShownSecondForm = true;
    const formEl = document.createElement("div");
    formEl.className = "bwp-lead-form";
    formEl.innerHTML = `
      <p>Before you go — want us to follow up? Leave your name and number.</p>
      <input type="text" class="bwp-form-name" placeholder="Name" />
      <input type="tel" class="bwp-form-phone" placeholder="Phone" />
      <div class="bwp-form-actions">
        <button class="bwp-form-submit">Submit</button>
        <button class="bwp-form-skip">No thanks</button>
      </div>
    `;
    messagesEl.appendChild(formEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    function finish(submitted) {
      formEl.remove();
      if (submitted) {
        hasContactInfo = true;
        addMessage("Thanks — we'll be in touch.", "bot");
      } else {
        showFinalContactBlock();
      }
    }

    formEl.querySelector(".bwp-form-skip").addEventListener("click", () => finish(false));
    formEl.querySelector(".bwp-form-submit").addEventListener("click", () => finish(true));
  }

  function showFinalContactBlock() {
    addMessage(
      `You can always reach us at ${CONFIG.companyPhone} or ${CONFIG.companyEmail}. We serve the ${CONFIG.serviceArea}.`,
      "bot"
    );
  }

  function triggerSecondContactAsk() {
    showSecondLeadForm();
  }

  // ---------- API call ----------

  async function getBotReply(message) {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: conversationHistory }),
      });
      const data = await response.json();
      return data.reply || "Something went wrong — call us at " + CONFIG.companyPhone + ".";
    } catch (err) {
      return "Something went wrong — call us at " + CONFIG.companyPhone + ".";
    }
  }

  async function handleUserMessage(message) {
    addMessage(message, "user");
    conversationHistory.push({ role: "user", content: message });
    inputEl.value = "";
    resetInactivityTimer();

    if (isGoodbye(message)) {
      const reply = await getBotReply(message);
      addBotMessageWithDelay(reply, () => {
        conversationHistory.push({ role: "assistant", content: reply });
        triggerSecondContactAsk();
      });
      return;
    }

    const runAnswer = async () => {
      const reply = await getBotReply(message);
      addBotMessageWithDelay(reply, () => {
        conversationHistory.push({ role: "assistant", content: reply });
      });
    };

    if (!hasShownFirstForm) {
      showFirstLeadForm(runAnswer);
    } else {
      runAnswer();
    }
  }

  // ---------- Events ----------

  bubble.addEventListener("click", () => {
    widgetOpen = true;
    panel.hidden = false;
    bubble.hidden = true;
    if (messagesEl.children.length === 0) {
      addMessage(CONFIG.greeting, "bot");
    }
    resetInactivityTimer();
    inputEl.focus();
  });

  closeBtn.addEventListener("click", () => {
    const shouldAsk = !hasShownSecondForm && !hasContactInfo && messagesEl.children.length > 0;
    if (shouldAsk) {
      triggerSecondContactAsk();
      return;
    }
    widgetOpen = false;
    clearTimeout(inactivityTimer);
    panel.hidden = true;
    bubble.hidden = false;
  });

  sendBtn.addEventListener("click", () => {
    const message = inputEl.value.trim();
    if (message) handleUserMessage(message);
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const message = inputEl.value.trim();
      if (message) handleUserMessage(message);
    }
  });
})();

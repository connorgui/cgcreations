(function () {
  const preferenceKey = "cg_cookie_preferences_v1";
  const preferenceEvent = "cg:privacy-preferences";
  const termsKey = "cg_terms_choice_v1";
  const termsVersion = "2026-10-11";
  const termsEvent = "cg:terms-choice";

  function loadTermsChoice() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(termsKey) || "null");
      const validChoices = ["accepted", "declined", "dismissed"];
      if (saved && saved.version === termsVersion && validChoices.includes(saved.choice)) {
        return saved;
      }
    } catch {
      // A malformed choice is treated as a first visit.
    }
    return null;
  }

  function saveTermsChoice(choice) {
    const saved = { choice, version: termsVersion, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(termsKey, JSON.stringify(saved));
    window.dispatchEvent(new CustomEvent(termsEvent, { detail: saved }));
    return saved;
  }

  function loadPreferences() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(preferenceKey) || "null");
      if (saved && typeof saved.analytics === "boolean") {
        return { essential: true, analytics: saved.analytics, updatedAt: saved.updatedAt || null };
      }
    } catch {
      // A malformed preference is treated as no choice yet.
    }
    return null;
  }

  function savePreferences(analytics) {
    const preferences = {
      essential: true,
      analytics: Boolean(analytics),
      updatedAt: new Date().toISOString()
    };
    window.localStorage.setItem(preferenceKey, JSON.stringify(preferences));
    window.dispatchEvent(new CustomEvent(preferenceEvent, { detail: preferences }));
    return preferences;
  }

  function addStylesheet() {
    if (document.querySelector('link[href^="/trust.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/trust.css?v=20261011b";
    document.head.appendChild(link);
  }

  function createTrustFooter() {
    if (document.querySelector(".global-trust-footer")) return;
    const footer = document.createElement("footer");
    footer.className = "global-trust-footer";
    footer.innerHTML = `
      <div class="global-trust-footer-inner">
        <div class="trust-footer-brand">
          <strong><span aria-hidden="true">CG</span> CG Creations</strong>
          <p>Transparent tools for learning, organizing, and playing.</p>
        </div>
        <nav aria-label="Trust and legal information">
          <a href="/trust">Trust Center</a>
          <a href="/about">About</a>
          <a href="/privacy">Privacy</a>
          <a href="/cookies">Cookies</a>
          <a href="/terms">Terms</a>
          <a href="/contact">Contact &amp; Safety</a>
          <button type="button" data-terms-settings>Terms choice</button>
          <button type="button" data-cookie-settings>Cookie settings</button>
        </nav>
        <p class="trust-footer-note">Secure connection &bull; Passwords are hashed &bull; Account deletion available</p>
      </div>`;
    document.body.appendChild(footer);
  }

  function createPrivacyUi() {
    const shell = document.createElement("div");
    shell.className = "privacy-ui";
    shell.innerHTML = `
      <section class="cookie-banner" role="dialog" aria-modal="false" aria-labelledby="cookie-banner-title" hidden>
        <div>
          <p class="cookie-kicker">Your privacy, your choice</p>
          <h2 id="cookie-banner-title">Choose how visitor analytics work</h2>
          <p>CG Creations uses essential browser storage for sign-in and preferences. Optional visitor analytics records your IP address and country to count unique visitors only when you allow it.</p>
          <a href="/cookies">Read the Cookie Policy</a>
        </div>
        <div class="cookie-actions">
          <button type="button" class="cookie-secondary" data-consent="essential">Essential only</button>
          <button type="button" class="cookie-secondary" data-open-preferences>Manage choices</button>
          <button type="button" class="cookie-primary" data-consent="all">Allow analytics</button>
        </div>
      </section>
      <div class="cookie-modal" hidden>
        <button class="cookie-modal-backdrop" type="button" aria-label="Close cookie settings"></button>
        <section class="cookie-modal-card" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title">
          <button class="cookie-modal-close" type="button" aria-label="Close cookie settings">&times;</button>
          <p class="cookie-kicker">Privacy controls</p>
          <h2 id="cookie-settings-title">Cookie and storage settings</h2>
          <div class="cookie-choice">
            <div><strong>Essential storage</strong><p>Required for sign-in sessions, security, saved preferences, and features you request.</p></div>
            <span>Always on</span>
          </div>
          <label class="cookie-choice" for="analytics-consent">
            <div><strong>Visitor analytics</strong><p>Counts unique visitors using an IP address and looks up the visitor's country. It is not used for advertising.</p></div>
            <input id="analytics-consent" type="checkbox">
          </label>
          <p class="cookie-detail">Changing this setting affects future visitor registration. It does not delete account data or analytics already recorded.</p>
          <div class="cookie-actions">
            <button class="cookie-secondary" type="button" data-close-preferences>Cancel</button>
            <button class="cookie-primary" type="button" data-save-preferences>Save choices</button>
          </div>
        </section>
      </div>`;
    document.body.appendChild(shell);

    const banner = shell.querySelector(".cookie-banner");
    const modal = shell.querySelector(".cookie-modal");
    const analyticsInput = shell.querySelector("#analytics-consent");

    function closeModal() {
      modal.hidden = true;
    }

    function openModal() {
      const preferences = loadPreferences();
      analyticsInput.checked = Boolean(preferences && preferences.analytics);
      modal.hidden = false;
      shell.querySelector(".cookie-modal-close").focus();
    }

    function choose(analytics) {
      savePreferences(analytics);
      banner.hidden = true;
      closeModal();
    }

    shell.querySelector('[data-consent="essential"]').addEventListener("click", () => choose(false));
    shell.querySelector('[data-consent="all"]').addEventListener("click", () => choose(true));
    shell.querySelector("[data-open-preferences]").addEventListener("click", openModal);
    shell.querySelector("[data-save-preferences]").addEventListener("click", () => choose(analyticsInput.checked));
    shell.querySelector("[data-close-preferences]").addEventListener("click", closeModal);
    shell.querySelector(".cookie-modal-close").addEventListener("click", closeModal);
    shell.querySelector(".cookie-modal-backdrop").addEventListener("click", closeModal);

    document.querySelectorAll("[data-cookie-settings]").forEach((button) => {
      button.addEventListener("click", openModal);
    });

    return {
      showBanner() {
        if (!loadPreferences()) banner.hidden = false;
      }
    };
  }

  function createTermsUi(onComplete) {
    const shell = document.createElement("div");
    shell.className = "terms-ui";
    shell.innerHTML = `
      <div class="terms-modal" hidden>
        <section class="terms-modal-card" role="dialog" aria-modal="false" aria-labelledby="terms-dialog-title" aria-describedby="terms-dialog-description">
          <button class="terms-modal-close" type="button" aria-label="Dismiss terms and conditions">&times;</button>
          <p class="cookie-kicker">First-visit notice</p>
          <h2 id="terms-dialog-title">Terms &amp; Conditions</h2>
          <p id="terms-dialog-description">You can keep using the website while this notice is open. Please use CG Creations responsibly and check important learning or AI answers with a trusted source.</p>
          <p class="terms-read-more">Read the <a href="/terms">Terms of Use</a> and <a href="/privacy">Privacy Notice</a>.</p>
          <div class="terms-actions">
            <button class="terms-disagree" type="button" data-terms-choice="declined">Disagree</button>
            <button class="terms-agree" type="button" data-terms-choice="accepted">Agree</button>
          </div>
          <p class="terms-detail">Your selection is saved only in this browser. Closing with X records that the notice was dismissed.</p>
        </section>
      </div>`;
    document.body.appendChild(shell);

    const modal = shell.querySelector(".terms-modal");
    const closeButton = shell.querySelector(".terms-modal-close");

    function openModal() {
      modal.hidden = false;
      closeButton.focus();
    }

    function finish(choice) {
      saveTermsChoice(choice);
      modal.hidden = true;
      onComplete();
    }

    closeButton.addEventListener("click", () => finish("dismissed"));
    shell.querySelectorAll("[data-terms-choice]").forEach((button) => {
      button.addEventListener("click", () => finish(button.dataset.termsChoice));
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) finish("dismissed");
    });
    document.querySelectorAll("[data-terms-settings]").forEach((button) => {
      button.addEventListener("click", openModal);
    });

    if (loadTermsChoice()) {
      onComplete();
    } else {
      openModal();
    }
  }

  function init() {
    addStylesheet();
    createTrustFooter();
    const privacyUi = createPrivacyUi();
    createTermsUi(privacyUi.showBanner);
  }

  window.cgPrivacy = { loadPreferences, savePreferences, preferenceKey, preferenceEvent };
  window.cgTerms = { loadTermsChoice, saveTermsChoice, termsKey, termsVersion, termsEvent };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}());

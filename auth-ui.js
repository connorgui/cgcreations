(function () {
  const skipPromptKey = "cg_skip_sign_in_prompt";
  const gameKey = document.body.dataset.gameKey || "";
  const gameLabel = document.body.dataset.gameLabel || "";
  const trackButtons = Array.from(document.querySelectorAll("[data-track-score]"));
  const promptLinks = Array.from(document.querySelectorAll("[data-auth-prompt-link]"));

  let authState = { signedIn: false, username: null };
  let trackingEnabled = false;
  let pendingAction = null;
  let authMode = "signin";
  let syncTimeoutId = null;

  const shell = document.createElement("div");
  shell.className = "site-auth-shell";
  shell.innerHTML = `
    <div class="site-auth-topbar">
      <button id="site-auth-button" type="button" class="site-auth-button">Sign In</button>
    </div>
    <div id="site-auth-modal" class="site-auth-modal hidden" role="dialog" aria-modal="true" aria-labelledby="site-auth-title">
      <div class="site-auth-backdrop" data-auth-close="true"></div>
      <div class="site-auth-card">
        <button type="button" class="site-auth-close" data-auth-close="true" aria-label="Close">x</button>
        <div id="site-auth-prompt-view">
          <p class="eyebrow">Score Tracking</p>
          <h2 id="site-auth-title">Sign in for better usage</h2>
          <p id="site-auth-prompt-text" class="support-text">This game requires sign in for better usage. Continue?</p>
          <label class="site-auth-checkbox">
            <input id="site-auth-hide-checkbox" type="checkbox">
            Don't show again
          </label>
          <div class="actions site-auth-actions">
            <button id="site-auth-signin-button" type="button">Sign In</button>
            <button id="site-auth-continue-button" type="button" class="secondary">Continue</button>
          </div>
        </div>
        <div id="site-auth-form-view" class="hidden">
          <p class="eyebrow">Account</p>
          <h2 id="site-auth-form-title">Sign In</h2>
          <p id="site-auth-form-copy" class="support-text">Use a username and password so your scores can stay with your account.</p>
          <div class="site-auth-mode-row">
            <button id="site-auth-mode-signin" type="button" class="secondary">Sign In</button>
            <button id="site-auth-mode-signup" type="button" class="secondary">Create Account</button>
          </div>
          <label class="form-field" for="site-auth-username">
            Username
            <input id="site-auth-username" type="text" autocomplete="username" placeholder="yourname">
          </label>
          <label class="form-field" for="site-auth-password">
            Password
            <input id="site-auth-password" type="password" autocomplete="current-password" placeholder="At least 6 characters">
          </label>
          <p id="site-auth-error" class="site-auth-error" aria-live="polite"></p>
          <div class="actions site-auth-actions">
            <button id="site-auth-submit" type="button">Continue</button>
            <button id="site-auth-back" type="button" class="secondary">Back</button>
          </div>
        </div>
        <div id="site-auth-account-view" class="hidden">
          <p class="eyebrow">Account</p>
          <h2>You're signed in</h2>
          <p id="site-auth-account-copy" class="support-text"></p>
          <div class="actions site-auth-actions">
            <button id="site-auth-signout-button" type="button" class="secondary">Sign Out</button>
            <button id="site-auth-account-close" type="button">Done</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(shell);

  const authButtonEl = document.getElementById("site-auth-button");
  const modalEl = document.getElementById("site-auth-modal");
  const promptViewEl = document.getElementById("site-auth-prompt-view");
  const formViewEl = document.getElementById("site-auth-form-view");
  const accountViewEl = document.getElementById("site-auth-account-view");
  const promptTextEl = document.getElementById("site-auth-prompt-text");
  const hideCheckboxEl = document.getElementById("site-auth-hide-checkbox");
  const signInPromptButtonEl = document.getElementById("site-auth-signin-button");
  const continuePromptButtonEl = document.getElementById("site-auth-continue-button");
  const formTitleEl = document.getElementById("site-auth-form-title");
  const formCopyEl = document.getElementById("site-auth-form-copy");
  const modeSigninEl = document.getElementById("site-auth-mode-signin");
  const modeSignupEl = document.getElementById("site-auth-mode-signup");
  const usernameEl = document.getElementById("site-auth-username");
  const passwordEl = document.getElementById("site-auth-password");
  const errorEl = document.getElementById("site-auth-error");
  const submitEl = document.getElementById("site-auth-submit");
  const backEl = document.getElementById("site-auth-back");
  const signOutEl = document.getElementById("site-auth-signout-button");
  const accountCloseEl = document.getElementById("site-auth-account-close");
  const accountCopyEl = document.getElementById("site-auth-account-copy");

  function shouldSkipPrompt() {
    return window.localStorage.getItem(skipPromptKey) === "1";
  }

  function updateSkipPreference() {
    if (hideCheckboxEl.checked) {
      window.localStorage.setItem(skipPromptKey, "1");
    } else {
      window.localStorage.removeItem(skipPromptKey);
    }
  }

  function showModal() {
    modalEl.classList.remove("hidden");
  }

  function hideModal() {
    modalEl.classList.add("hidden");
    errorEl.textContent = "";
    pendingAction = null;
  }

  function setVisibleView(view) {
    promptViewEl.classList.toggle("hidden", view !== "prompt");
    formViewEl.classList.toggle("hidden", view !== "form");
    accountViewEl.classList.toggle("hidden", view !== "account");
  }

  function updateAuthButton() {
    authButtonEl.textContent = authState.signedIn ? `Account (${authState.username})` : "Sign In";
  }

  function updateTrackButtons() {
    for (const button of trackButtons) {
      button.textContent = trackingEnabled ? "Tracking to your account" : "Track your score";
      button.classList.toggle("is-tracking", trackingEnabled);
    }
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    return data;
  }

  async function refreshAuthState() {
    try {
      authState = await fetchJson("/api/auth/me", { method: "GET" });
    } catch {
      authState = { signedIn: false, username: null };
    }

    updateAuthButton();
    updateTrackButtons();
  }

  function getCurrentScoreSnapshot() {
    if (!window.gameScoreApi || typeof window.gameScoreApi.getScoreSnapshot !== "function") {
      return null;
    }

    return window.gameScoreApi.getScoreSnapshot();
  }

  async function pushCurrentScoreSnapshot() {
    if (!trackingEnabled || !authState.signedIn || !gameKey) {
      return;
    }

    const scoreData = getCurrentScoreSnapshot();
    if (!scoreData) {
      return;
    }

    await fetchJson(`/api/game-score/${encodeURIComponent(gameKey)}`, {
      method: "POST",
      body: JSON.stringify({ scoreData })
    });
  }

  function scheduleScoreSync() {
    if (!trackingEnabled || !authState.signedIn || !gameKey) {
      return;
    }

    if (syncTimeoutId !== null) {
      window.clearTimeout(syncTimeoutId);
    }

    syncTimeoutId = window.setTimeout(() => {
      syncTimeoutId = null;
      pushCurrentScoreSnapshot().catch(() => {});
    }, 150);
  }

  function enableTracking() {
    trackingEnabled = true;
    updateTrackButtons();
    scheduleScoreSync();
  }

  function runPendingActionAfterAuth() {
    if (!pendingAction) {
      return;
    }

    const action = pendingAction;
    pendingAction = null;

    if (action.type === "link") {
      window.location.href = action.href;
      return;
    }

    if (action.type === "track") {
      enableTracking();
      hideModal();
    }
  }

  function showPrompt(action) {
    pendingAction = action;
    hideCheckboxEl.checked = shouldSkipPrompt();
    const label = action && action.label ? action.label : (gameLabel || "This game");
    promptTextEl.textContent = `${label} requires sign in for better usage. Continue?`;
    setVisibleView("prompt");
    showModal();
  }

  function setAuthMode(mode) {
    authMode = mode;
    const isSignup = mode === "signup";
    formTitleEl.textContent = isSignup ? "Create Account" : "Sign In";
    formCopyEl.textContent = isSignup
      ? "Create a username and password so your scores save to your account."
      : "Sign in to track your score and keep it on your account.";
    submitEl.textContent = isSignup ? "Create Account" : "Sign In";
    modeSigninEl.classList.toggle("is-selected", !isSignup);
    modeSignupEl.classList.toggle("is-selected", isSignup);
    passwordEl.autocomplete = isSignup ? "new-password" : "current-password";
    errorEl.textContent = "";
  }

  function showAuthForm(mode = "signin") {
    setAuthMode(mode);
    setVisibleView("form");
    showModal();
    usernameEl.focus();
  }

  function showAccountView() {
    accountCopyEl.textContent = `Signed in as ${authState.username}. Your tracked scores can save to your account.`;
    setVisibleView("account");
    showModal();
  }

  async function submitAuth() {
    errorEl.textContent = "";

    try {
      const endpoint = authMode === "signup" ? "/api/auth/signup" : "/api/auth/signin";
      const result = await fetchJson(endpoint, {
        method: "POST",
        body: JSON.stringify({
          username: usernameEl.value,
          password: passwordEl.value
        })
      });

      authState = {
        signedIn: Boolean(result.signedIn),
        username: result.username || null
      };
      updateAuthButton();
      updateTrackButtons();
      if (!pendingAction) {
        showAccountView();
        return;
      }
      runPendingActionAfterAuth();
    } catch (error) {
      errorEl.textContent = error.message;
    }
  }

  async function signOut() {
    try {
      await fetchJson("/api/auth/signout", {
        method: "POST",
        body: JSON.stringify({})
      });
    } catch {
      // Keep the UI usable even if sign-out cleanup fails remotely.
    }

    authState = { signedIn: false, username: null };
    trackingEnabled = false;
    updateAuthButton();
    updateTrackButtons();
    hideModal();
  }

  authButtonEl.addEventListener("click", () => {
    if (authState.signedIn) {
      showAccountView();
      return;
    }

    showAuthForm("signin");
  });

  signInPromptButtonEl.addEventListener("click", () => {
    updateSkipPreference();
    showAuthForm("signin");
  });

  continuePromptButtonEl.addEventListener("click", () => {
    updateSkipPreference();
    const action = pendingAction;
    hideModal();
    if (action && action.type === "link") {
      window.location.href = action.href;
    }
  });

  modeSigninEl.addEventListener("click", () => setAuthMode("signin"));
  modeSignupEl.addEventListener("click", () => setAuthMode("signup"));
  submitEl.addEventListener("click", submitAuth);
  backEl.addEventListener("click", () => {
    if (pendingAction) {
      setVisibleView("prompt");
      return;
    }

    hideModal();
  });
  signOutEl.addEventListener("click", signOut);
  accountCloseEl.addEventListener("click", hideModal);

  usernameEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitAuth();
    }
  });

  passwordEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitAuth();
    }
  });

  modalEl.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.authClose === "true") {
      hideModal();
    }
  });

  for (const link of promptLinks) {
    link.addEventListener("click", (event) => {
      if (authState.signedIn || shouldSkipPrompt()) {
        return;
      }

      event.preventDefault();
      showPrompt({
        type: "link",
        href: link.href,
        label: link.dataset.authPromptLabel || "This game"
      });
    });
  }

  for (const button of trackButtons) {
    button.addEventListener("click", () => {
      if (authState.signedIn) {
        enableTracking();
        return;
      }

      if (shouldSkipPrompt()) {
        showAuthForm("signin");
        return;
      }

      showPrompt({
        type: "track",
        label: gameLabel || "This game"
      });
    });
  }

  window.scoreTracker = {
    notifyScore() {
      scheduleScoreSync();
    },
    getState() {
      return {
        signedIn: authState.signedIn,
        username: authState.username,
        trackingEnabled
      };
    }
  };

  refreshAuthState();
})();

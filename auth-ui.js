(function () {
  const skipPromptKey = "cg_skip_sign_in_prompt";
  const avatarColors = ["#6a86c7", "#9f5de2", "#f06aa7", "#ff8c5a", "#3fb98d", "#3f6ddc", "#5c4aa8", "#1f2933"];
  const avatarEmojis = [
    0x1F430,
    0x1F31F,
    0x1F3AE,
    0x1F9E0,
    0x1F525,
    0x1F353,
    0x1F319,
    0x1F4D8,
    0x1F3AF,
    0x1FA90,
    0x1F4A1,
    0x1F3A8
  ].map((codePoint) => String.fromCodePoint(codePoint));

  const body = document.body;
  if (!body) {
    return;
  }

  const gameKey = body.dataset.gameKey || "";
  const gameLabel = body.dataset.gameLabel || "this game";
  const trackButtons = Array.from(document.querySelectorAll("[data-track-score='true']"));
  const promptLinks = Array.from(document.querySelectorAll("[data-auth-prompt-link='true']"));

  const authState = {
    signedIn: false,
    username: null,
    profileData: null
  };

  const uiState = {
    trackingEnabled: false,
    pendingAction: null,
    authMode: "signin",
    menuOpen: false,
    modalView: null,
    scoreSyncTimeoutId: null
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalizeInitials(value, username = "") {
    const trimmed = String(value || "").trim().replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase();
    if (trimmed) {
      return trimmed;
    }

    const fallback = String(username || "").trim().slice(0, 2).toUpperCase();
    return fallback || "CG";
  }

  function getDefaultProfileData(username = "") {
    return {
      avatarType: "initials",
      avatarValue: normalizeInitials("", username),
      avatarColor: avatarColors[0]
    };
  }

  function normalizeProfileData(profileData, username = "") {
    const defaults = getDefaultProfileData(username);
    if (!profileData || typeof profileData !== "object") {
      return defaults;
    }

    const avatarType = profileData.avatarType === "emoji" || profileData.avatarType === "photo"
      ? profileData.avatarType
      : "initials";
    const avatarColor = avatarColors.includes(profileData.avatarColor) ? profileData.avatarColor : defaults.avatarColor;

    if (avatarType === "emoji") {
      const avatarValue = String(profileData.avatarValue || "").trim();
      return {
        avatarType,
        avatarValue: avatarValue || avatarEmojis[0],
        avatarColor
      };
    }

    if (avatarType === "photo") {
      const avatarValue = String(profileData.avatarValue || "");
      if (avatarValue.startsWith("data:image/")) {
        return {
          avatarType,
          avatarValue,
          avatarColor
        };
      }
    }

    return {
      avatarType: "initials",
      avatarValue: normalizeInitials(profileData.avatarValue, username),
      avatarColor
    };
  }

  function shouldSkipPrompt() {
    return window.localStorage.getItem(skipPromptKey) === "true";
  }

  function setSkipPromptPreference(shouldSkip) {
    window.localStorage.setItem(skipPromptKey, shouldSkip ? "true" : "false");
    if (promptSkipCheckbox) {
      promptSkipCheckbox.checked = shouldSkip;
    }
    if (settingsSkipCheckbox) {
      settingsSkipCheckbox.checked = shouldSkip;
    }
  }

  function buildAvatarMarkup(profileData, username, options = {}) {
    const normalized = normalizeProfileData(profileData, username);
    const classes = ["site-avatar"];
    if (options.large) {
      classes.push("site-avatar-large");
    }
    if (normalized.avatarType === "photo") {
      classes.push("site-avatar-photo");
    }

    if (normalized.avatarType === "photo") {
      return `<span class="${classes.join(" ")}"><img src="${escapeHtml(normalized.avatarValue)}" alt="${escapeHtml(username || "Profile avatar")}"></span>`;
    }

    const style = normalized.avatarType === "initials"
      ? ` style="background:${escapeHtml(normalized.avatarColor)}"`
      : ` style="background:${escapeHtml(normalized.avatarColor)}1A;color:${escapeHtml(normalized.avatarColor)}"`;
    const label = normalized.avatarType === "emoji" ? normalized.avatarValue : normalizeInitials(normalized.avatarValue, username);
    return `<span class="${classes.join(" ")}"${style}>${escapeHtml(label)}</span>`;
  }

  function buildColorOptions(prefix) {
    return avatarColors.map((color, index) => {
      const selectedClass = index === 0 ? " is-selected" : "";
      return `<button type="button" class="site-avatar-color${selectedClass}" data-avatar-color="${escapeHtml(color)}" data-avatar-prefix="${escapeHtml(prefix)}" style="background:${escapeHtml(color)}" aria-label="Choose color ${index + 1}"></button>`;
    }).join("");
  }

  function buildEmojiOptions(prefix) {
    return avatarEmojis.map((emoji, index) => {
      const selectedClass = index === 0 ? " is-selected" : "";
      return `<button type="button" class="site-avatar-emoji${selectedClass}" data-avatar-emoji="${escapeHtml(emoji)}" data-avatar-prefix="${escapeHtml(prefix)}" aria-label="Choose emoji avatar">${escapeHtml(emoji)}</button>`;
    }).join("");
  }

  function buildAvatarEditor(prefix, heading, copy) {
    return `
      <div class="site-avatar-editor" data-avatar-editor="${escapeHtml(prefix)}">
        <div class="site-avatar-preview-wrap">
          <div id="${escapeHtml(prefix)}-avatar-preview">${buildAvatarMarkup(getDefaultProfileData(""), "", { large: true })}</div>
          <div>
            <p class="spoken-label">${escapeHtml(heading)}</p>
            <p class="support-text">${escapeHtml(copy)}</p>
          </div>
        </div>
        <div class="site-avatar-mode-row">
          <button type="button" class="site-avatar-mode is-selected" data-avatar-mode="initials" data-avatar-prefix="${escapeHtml(prefix)}">Colors + Initials</button>
          <button type="button" class="site-avatar-mode" data-avatar-mode="emoji" data-avatar-prefix="${escapeHtml(prefix)}">Emoji</button>
          <button type="button" class="site-avatar-mode" data-avatar-mode="photo" data-avatar-prefix="${escapeHtml(prefix)}">Photo</button>
        </div>
        <div class="site-avatar-panel" data-avatar-panel="initials" data-avatar-prefix="${escapeHtml(prefix)}">
          <label class="site-auth-field" for="${escapeHtml(prefix)}-avatar-initials">
            Initials
            <input id="${escapeHtml(prefix)}-avatar-initials" type="text" maxlength="2" placeholder="CG">
          </label>
          <div class="site-avatar-color-grid">
            ${buildColorOptions(prefix)}
          </div>
        </div>
        <div class="site-avatar-panel hidden" data-avatar-panel="emoji" data-avatar-prefix="${escapeHtml(prefix)}">
          <div class="site-avatar-emoji-grid">
            ${buildEmojiOptions(prefix)}
          </div>
        </div>
        <div class="site-avatar-panel hidden" data-avatar-panel="photo" data-avatar-prefix="${escapeHtml(prefix)}">
          <label class="site-auth-field" for="${escapeHtml(prefix)}-avatar-photo">
            Photo
            <input id="${escapeHtml(prefix)}-avatar-photo" type="file" accept="image/*">
          </label>
          <p class="support-text">Choose a small image file. It will be saved to your profile.</p>
        </div>
      </div>
    `;
  }

  const shell = document.createElement("div");
  shell.className = "site-auth-shell";
  shell.innerHTML = `
    <div class="site-auth-topbar">
      <div class="site-auth-anchor">
        <div class="site-auth-actions">
          <button id="site-auth-pref-button" class="site-auth-button" type="button" aria-label="Settings">⚙</button>
          <button id="site-auth-button" class="site-auth-button" type="button">
            <span id="site-auth-button-label" class="site-auth-button-label">Sign In</span>
            <span id="site-auth-button-avatar" class="site-auth-button-avatar" hidden></span>
          </button>
        </div>
        <div id="site-auth-menu" class="site-auth-menu" hidden>
          <button id="site-auth-settings-button" class="site-auth-button site-auth-menu-item" type="button">Account Settings</button>
          <button id="site-auth-signout-button" class="site-auth-button site-auth-menu-item site-auth-menu-item-danger" type="button">Log out</button>
        </div>
      </div>
    </div>
    <div id="site-auth-modal" class="site-auth-modal" hidden>
      <div id="site-auth-backdrop" class="site-auth-backdrop"></div>
      <div class="site-auth-card" role="dialog" aria-modal="true" aria-labelledby="site-auth-title">
        <button id="site-auth-close" class="site-auth-close" type="button" aria-label="Close">&times;</button>
      </div>
    </div>
  `;
  body.appendChild(shell);

  const authCard = shell.querySelector(".site-auth-card");
  const settingsButtonEl = shell.querySelector("#site-auth-pref-button");
  if (settingsButtonEl) {
    settingsButtonEl.innerHTML = "&#9881;";
  }

  authCard?.insertAdjacentHTML("beforeend", `
    <section id="site-auth-prompt-view" hidden>
      <p class="eyebrow">Heads up</p>
      <h2 id="site-auth-title">Sign in for better tracking</h2>
      <p class="support-text">This game works better when you're signed in so it can save your score and settings.</p>
      <label class="site-auth-checkbox">
        <input id="site-auth-prompt-skip" type="checkbox">
        Don't show again
      </label>
      <div class="actions site-auth-actions">
        <button id="site-auth-prompt-signin" type="button">Sign In</button>
        <button id="site-auth-prompt-decline" type="button" class="secondary">No thanks</button>
      </div>
    </section>

    <section id="site-auth-auth-view" class="site-auth-hero" hidden>
      <div class="site-auth-stars"></div>
      <div class="site-auth-sky-glow"></div>
      <div class="site-auth-mountains"></div>
      <div class="site-auth-forest"></div>
      <div class="site-auth-form-shell">
        <p class="site-auth-hero-eyebrow">Creations account</p>
        <h2 id="site-auth-heading" class="site-auth-hero-title">Login</h2>
        <p id="site-auth-copy" class="site-auth-hero-copy">Save your scores, carry your profile across devices, and keep your tracking settings.</p>
        <label class="site-auth-field" for="site-auth-username">
          Username
          <input id="site-auth-username" type="text" autocomplete="username" placeholder="Username">
        </label>
        <label class="site-auth-field" for="site-auth-password">
          Password
          <input id="site-auth-password" type="password" autocomplete="current-password" placeholder="Password">
        </label>
        <div class="site-auth-row">
          <label class="site-auth-checkbox site-auth-checkbox-inline">
            <input id="site-auth-remember" type="checkbox">
            Remember me
          </label>
          <button id="site-auth-forgot" class="site-auth-link-button" type="button">Forgot password?</button>
        </div>
        <div id="site-auth-signup-avatar-wrap" class="hidden">
          ${buildAvatarEditor("signup", "Profile picture", "Pick colors and initials, an emoji, or a photo.")}
        </div>
        <p id="site-auth-error" class="site-auth-error" aria-live="polite"></p>
        <div class="site-auth-form-actions">
          <button id="site-auth-submit" class="site-auth-primary" type="button">Login</button>
        </div>
        <p class="site-auth-switch-copy">
          <span id="site-auth-switch-label">Don't have an account?</span>
          <button id="site-auth-switch" class="site-auth-link-button" type="button">Register</button>
        </p>
      </div>
    </section>

    <section id="site-auth-settings-view" hidden>
      <p class="eyebrow">Settings</p>
      <h2 id="site-auth-settings-title">Account Settings</h2>
      <p id="site-auth-settings-copy" class="support-text">Change your profile picture and adjust whether the sign-in reminder appears.</p>
      <div id="site-auth-settings-avatar-wrap">
        ${buildAvatarEditor("settings", "Profile picture", "Your avatar appears on the top-right button after you sign in.")}
      </div>
      <label class="site-auth-checkbox">
        <input id="site-auth-settings-skip" type="checkbox">
        Skip the sign-in message before games
      </label>
      <p id="site-auth-settings-error" class="site-auth-error" aria-live="polite"></p>
      <div class="actions site-auth-actions">
        <button id="site-auth-settings-save" type="button">Save Changes</button>
        <button id="site-auth-settings-cancel" type="button" class="secondary">Cancel</button>
      </div>
    </section>
  `);

  const authButton = document.getElementById("site-auth-button");
  const authButtonLabel = document.getElementById("site-auth-button-label");
  const authButtonAvatar = document.getElementById("site-auth-button-avatar");
  const menu = document.getElementById("site-auth-menu");
  const menuSettingsButton = document.getElementById("site-auth-settings-button");
  const signoutButton = document.getElementById("site-auth-signout-button");
  const settingsCogButton = document.getElementById("site-auth-pref-button");

  const modal = document.getElementById("site-auth-modal");
  const closeButton = document.getElementById("site-auth-close");
  const backdrop = document.getElementById("site-auth-backdrop");
  const promptView = document.getElementById("site-auth-prompt-view");
  const authView = document.getElementById("site-auth-auth-view");
  const settingsView = document.getElementById("site-auth-settings-view");

  const promptSkipCheckbox = document.getElementById("site-auth-prompt-skip");
  const promptSigninButton = document.getElementById("site-auth-prompt-signin");
  const promptDeclineButton = document.getElementById("site-auth-prompt-decline");

  const authHeading = document.getElementById("site-auth-heading");
  const authCopy = document.getElementById("site-auth-copy");
  const usernameInput = document.getElementById("site-auth-username");
  const passwordInput = document.getElementById("site-auth-password");
  const rememberCheckbox = document.getElementById("site-auth-remember");
  const forgotButton = document.getElementById("site-auth-forgot");
  const signupAvatarWrap = document.getElementById("site-auth-signup-avatar-wrap");
  const submitButton = document.getElementById("site-auth-submit");
  const switchLabel = document.getElementById("site-auth-switch-label");
  const switchButton = document.getElementById("site-auth-switch");
  const authError = document.getElementById("site-auth-error");

  const settingsTitle = document.getElementById("site-auth-settings-title");
  const settingsCopy = document.getElementById("site-auth-settings-copy");
  const settingsAvatarWrap = document.getElementById("site-auth-settings-avatar-wrap");
  const settingsSkipCheckbox = document.getElementById("site-auth-settings-skip");
  const settingsSaveButton = document.getElementById("site-auth-settings-save");
  const settingsCancelButton = document.getElementById("site-auth-settings-cancel");
  const settingsError = document.getElementById("site-auth-settings-error");

  function getStoredPhotoValue(prefix) {
    const input = document.getElementById(`${prefix}-avatar-photo`);
    return input?.dataset.photoValue || "";
  }

  function setStoredPhotoValue(prefix, value) {
    const input = document.getElementById(`${prefix}-avatar-photo`);
    if (input) {
      input.dataset.photoValue = value || "";
    }
  }

  function getEditorState(prefix) {
    const container = shell.querySelector(`[data-avatar-editor='${prefix}']`);
    const selectedModeButton = container?.querySelector(`.site-avatar-mode.is-selected[data-avatar-prefix='${prefix}']`);
    const selectedColorButton = container?.querySelector(`.site-avatar-color.is-selected[data-avatar-prefix='${prefix}']`);
    const selectedEmojiButton = container?.querySelector(`.site-avatar-emoji.is-selected[data-avatar-prefix='${prefix}']`);
    return {
      container,
      mode: selectedModeButton?.dataset.avatarMode || "initials",
      color: selectedColorButton?.dataset.avatarColor || avatarColors[0],
      emoji: selectedEmojiButton?.dataset.avatarEmoji || avatarEmojis[0],
      initialsInput: document.getElementById(`${prefix}-avatar-initials`)
    };
  }

  function getEditorProfileData(prefix, username = "") {
    const state = getEditorState(prefix);
    if (state.mode === "emoji") {
      return {
        avatarType: "emoji",
        avatarValue: state.emoji,
        avatarColor: state.color
      };
    }

    if (state.mode === "photo") {
      const photoValue = getStoredPhotoValue(prefix);
      if (photoValue) {
        return {
          avatarType: "photo",
          avatarValue: photoValue,
          avatarColor: state.color
        };
      }
    }

    return {
      avatarType: "initials",
      avatarValue: normalizeInitials(state.initialsInput?.value, username),
      avatarColor: state.color
    };
  }

  function updateEditorPreview(prefix, username = "") {
    const preview = document.getElementById(`${prefix}-avatar-preview`);
    if (!preview) {
      return;
    }

    preview.innerHTML = buildAvatarMarkup(getEditorProfileData(prefix, username), username, { large: true });
  }

  function setEditorMode(prefix, mode) {
    const container = shell.querySelector(`[data-avatar-editor='${prefix}']`);
    if (!container) {
      return;
    }

    container.querySelectorAll(`.site-avatar-mode[data-avatar-prefix='${prefix}']`).forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.avatarMode === mode);
    });

    container.querySelectorAll(`.site-avatar-panel[data-avatar-prefix='${prefix}']`).forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.avatarPanel !== mode);
    });

    updateEditorPreview(prefix, prefix === "settings" ? authState.username : usernameInput?.value.trim());
  }

  function setSelectedColor(prefix, color) {
    const container = shell.querySelector(`[data-avatar-editor='${prefix}']`);
    container?.querySelectorAll(`.site-avatar-color[data-avatar-prefix='${prefix}']`).forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.avatarColor === color);
    });
    updateEditorPreview(prefix, prefix === "settings" ? authState.username : usernameInput?.value.trim());
  }

  function setSelectedEmoji(prefix, emoji) {
    const container = shell.querySelector(`[data-avatar-editor='${prefix}']`);
    container?.querySelectorAll(`.site-avatar-emoji[data-avatar-prefix='${prefix}']`).forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.avatarEmoji === emoji);
    });
    updateEditorPreview(prefix, prefix === "settings" ? authState.username : usernameInput?.value.trim());
  }

  function populateEditor(prefix, profileData, username = "") {
    const normalized = normalizeProfileData(profileData, username);
    const initialsInput = document.getElementById(`${prefix}-avatar-initials`);
    if (initialsInput) {
      initialsInput.value = normalized.avatarType === "initials"
        ? normalizeInitials(normalized.avatarValue, username)
        : normalizeInitials("", username);
    }

    setSelectedColor(prefix, normalized.avatarColor);
    setSelectedEmoji(prefix, normalized.avatarValue);
    setStoredPhotoValue(prefix, normalized.avatarType === "photo" ? normalized.avatarValue : "");
    setEditorMode(prefix, normalized.avatarType);
    updateEditorPreview(prefix, username);
  }

  function clearAuthError() {
    authError.textContent = "";
  }

  function clearSettingsError() {
    settingsError.textContent = "";
  }

  function showModal(viewName) {
    uiState.modalView = viewName;
    modal.hidden = false;
    promptView.hidden = viewName !== "prompt";
    authView.hidden = viewName !== "auth";
    settingsView.hidden = viewName !== "settings";
    menu.hidden = true;
    uiState.menuOpen = false;
  }

  function hideModal() {
    modal.hidden = true;
    uiState.modalView = null;
    clearAuthError();
    clearSettingsError();
  }

  function closeMenu() {
    uiState.menuOpen = false;
    menu.hidden = true;
  }

  function openMenu() {
    if (!authState.signedIn) {
      return;
    }

    uiState.menuOpen = true;
    menu.hidden = false;
  }

  function updateAuthButton() {
    if (!authState.signedIn) {
      authButton.classList.remove("is-avatar-button");
      authButtonLabel.textContent = "Sign In";
      authButtonLabel.classList.remove("hidden");
      authButtonAvatar.hidden = true;
      authButtonAvatar.innerHTML = "";
      return;
    }

    authButton.classList.add("is-avatar-button");
    authButtonLabel.classList.add("hidden");
    authButtonAvatar.hidden = false;
    authButtonAvatar.innerHTML = buildAvatarMarkup(authState.profileData, authState.username);
  }

  function setTrackButtonState(enabled) {
    trackButtons.forEach((button) => {
      button.textContent = enabled ? "Tracking enabled" : "Track your score";
      button.classList.toggle("is-selected", enabled);
    });
  }

  function fetchJson(url, options = {}) {
    return window.fetch(url, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error || "Request failed.");
        error.statusCode = response.status;
        throw error;
      }
      return payload;
    });
  }

  function collectPiScore() {
    return {
      correctCount: Number(document.getElementById("correct-count")?.textContent || 0),
      wrongCount: Number(document.getElementById("wrong-count")?.textContent || 0),
      nextPosition: Number(document.getElementById("next-position")?.textContent || 1),
      correctSequence: document.getElementById("correct-sequence")?.textContent || "-"
    };
  }

  function collectPrimeScore() {
    return {
      correctCount: Number(document.getElementById("prime-correct-count")?.textContent || 0),
      wrongCount: Number(document.getElementById("prime-wrong-count")?.textContent || 0),
      streakCount: Number(document.getElementById("prime-streak-count")?.textContent || 0),
      averageTime: document.getElementById("prime-average-time")?.textContent || "-"
    };
  }

  function collectBunnyScore() {
    return {
      wins: Number(document.getElementById("bunny-wins")?.textContent || 0),
      losses: Number(document.getElementById("bunny-losses")?.textContent || 0),
      streak: Number(document.getElementById("bunny-streak")?.textContent || 0),
      rounds: Number(document.getElementById("bunny-rounds")?.textContent || 0)
    };
  }

  function getCurrentScoreSnapshot() {
    if (!gameKey) {
      return null;
    }

    if (gameKey === "pi-voice-checker") {
      return collectPiScore();
    }

    if (gameKey === "prime-speed-check") {
      return collectPrimeScore();
    }

    if (gameKey === "easter-bunny-memory") {
      return collectBunnyScore();
    }

    return null;
  }

  function pushCurrentScoreSnapshot() {
    if (!uiState.trackingEnabled || !authState.signedIn || !gameKey) {
      return Promise.resolve();
    }

    const scoreData = getCurrentScoreSnapshot();
    if (!scoreData) {
      return Promise.resolve();
    }

    return fetchJson(`/api/game-score/${encodeURIComponent(gameKey)}`, {
      method: "POST",
      body: JSON.stringify({ scoreData })
    }).catch(() => {});
  }

  function scheduleScoreSync() {
    if (!uiState.trackingEnabled || !authState.signedIn || !gameKey) {
      return;
    }

    if (uiState.scoreSyncTimeoutId !== null) {
      window.clearTimeout(uiState.scoreSyncTimeoutId);
    }

    uiState.scoreSyncTimeoutId = window.setTimeout(() => {
      uiState.scoreSyncTimeoutId = null;
      pushCurrentScoreSnapshot();
    }, 250);
  }

  function enableTracking() {
    if (!authState.signedIn) {
      uiState.pendingAction = { type: "track" };
      showAuthForm("signin");
      return;
    }

    uiState.trackingEnabled = true;
    setTrackButtonState(true);
    pushCurrentScoreSnapshot();
  }

  function runPendingActionAfterAuth() {
    const action = uiState.pendingAction;
    uiState.pendingAction = null;
    if (!action) {
      return;
    }

    if (action.type === "link" && action.href) {
      window.location.href = action.href;
      return;
    }

    if (action.type === "track") {
      enableTracking();
    }
  }

  function showPrompt(action) {
    uiState.pendingAction = action;
    promptSkipCheckbox.checked = shouldSkipPrompt();
    showModal("prompt");
  }

  function showAuthForm(mode = "signin") {
    uiState.authMode = mode;
    clearAuthError();
    authHeading.textContent = mode === "signup" ? "Create Account" : "Login";
    authCopy.textContent = mode === "signup"
      ? "Create an account to track your score, save your profile picture, and keep your settings."
      : "Save your scores, carry your profile across devices, and keep your tracking settings.";
    submitButton.textContent = mode === "signup" ? "Create Account" : "Login";
    switchLabel.textContent = mode === "signup" ? "Already have an account?" : "Don't have an account?";
    switchButton.textContent = mode === "signup" ? "Sign In" : "Register";
    signupAvatarWrap.classList.toggle("hidden", mode !== "signup");
    passwordInput.autocomplete = mode === "signup" ? "new-password" : "current-password";
    showModal("auth");

    if (mode === "signup") {
      populateEditor("signup", getDefaultProfileData(usernameInput.value.trim()), usernameInput.value.trim());
    }
  }

  function showSettingsView(prefOnly = false) {
    clearSettingsError();
    settingsSkipCheckbox.checked = shouldSkipPrompt();
    settingsAvatarWrap.classList.toggle("hidden", prefOnly);
    settingsTitle.textContent = prefOnly ? "Reminder Settings" : "Account Settings";
    settingsCopy.textContent = prefOnly
      ? "Choose whether the sign-in reminder appears before score-tracked games."
      : "Change your profile picture and adjust whether the sign-in reminder appears.";
    settingsSaveButton.textContent = prefOnly ? "Save Preference" : "Save Changes";
    showModal("settings");

    if (!prefOnly) {
      populateEditor("settings", authState.profileData, authState.username);
    }
  }

  function updateAuthState(payload) {
    authState.signedIn = Boolean(payload?.signedIn);
    authState.username = payload?.username || null;
    authState.profileData = authState.signedIn
      ? normalizeProfileData(payload.profileData, authState.username)
      : null;
    updateAuthButton();
    if (!authState.signedIn) {
      uiState.trackingEnabled = false;
      setTrackButtonState(false);
    }
  }

  async function refreshAuthState() {
    try {
      const payload = await fetchJson("/api/auth/me", { method: "GET" });
      updateAuthState(payload);
    } catch {
      updateAuthState({ signedIn: false });
    }
  }

  async function submitAuth() {
    clearAuthError();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      authError.textContent = "Please enter both a username and password.";
      return;
    }

    const payload = { username, password, remember: rememberCheckbox.checked };
    if (uiState.authMode === "signup") {
      payload.profileData = getEditorProfileData("signup", username);
    }

    try {
      const response = await fetchJson(`/api/auth/${uiState.authMode}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      updateAuthState(response);
      hideModal();
      runPendingActionAfterAuth();
    } catch (error) {
      authError.textContent = error.message || "That request could not be completed.";
    }
  }

  async function saveSettings() {
    clearSettingsError();
    setSkipPromptPreference(settingsSkipCheckbox.checked);

    if (!authState.signedIn) {
      hideModal();
      return;
    }

    try {
      const response = await fetchJson("/api/auth/profile", {
        method: "POST",
        body: JSON.stringify({
          profileData: getEditorProfileData("settings", authState.username)
        })
      });
      updateAuthState(response);
      hideModal();
    } catch (error) {
      settingsError.textContent = error.message || "Could not save settings.";
    }
  }

  async function signOut() {
    try {
      await fetchJson("/api/auth/signout", { method: "POST", body: JSON.stringify({}) });
    } catch {
      // Keep the UI responsive even if the network request fails.
    }

    updateAuthState({ signedIn: false });
    closeMenu();
  }

  function handlePhotoSelection(prefix, file) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setStoredPhotoValue(prefix, typeof reader.result === "string" ? reader.result : "");
      setEditorMode(prefix, "photo");
      updateEditorPreview(prefix, prefix === "settings" ? authState.username : usernameInput.value.trim());
    });
    reader.readAsDataURL(file);
  }

  function wireAvatarEditor(prefix) {
    const container = shell.querySelector(`[data-avatar-editor='${prefix}']`);
    if (!container) {
      return;
    }

    container.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const modeButton = target.closest(`.site-avatar-mode[data-avatar-prefix='${prefix}']`);
      if (modeButton instanceof HTMLElement) {
        setEditorMode(prefix, modeButton.dataset.avatarMode || "initials");
        return;
      }

      const colorButton = target.closest(`.site-avatar-color[data-avatar-prefix='${prefix}']`);
      if (colorButton instanceof HTMLElement) {
        setSelectedColor(prefix, colorButton.dataset.avatarColor || avatarColors[0]);
        return;
      }

      const emojiButton = target.closest(`.site-avatar-emoji[data-avatar-prefix='${prefix}']`);
      if (emojiButton instanceof HTMLElement) {
        setSelectedEmoji(prefix, emojiButton.dataset.avatarEmoji || avatarEmojis[0]);
        setEditorMode(prefix, "emoji");
      }
    });

    container.addEventListener("input", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.id === `${prefix}-avatar-initials`) {
        target.value = normalizeInitials(target.value, prefix === "settings" ? authState.username : usernameInput.value.trim());
        updateEditorPreview(prefix, prefix === "settings" ? authState.username : usernameInput.value.trim());
      }
    });

    const photoInput = document.getElementById(`${prefix}-avatar-photo`);
    photoInput?.addEventListener("change", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement) {
        handlePhotoSelection(prefix, target.files?.[0]);
      }
    });
  }

  function handlePromptDecline() {
    setSkipPromptPreference(promptSkipCheckbox.checked);
    const action = uiState.pendingAction;
    uiState.pendingAction = null;
    hideModal();

    if (action?.type === "link" && action.href) {
      window.location.href = action.href;
    }
  }

  function onPromptableNavigation(event, link) {
    const href = link.getAttribute("href");
    if (!href) {
      return;
    }

    if (authState.signedIn || shouldSkipPrompt()) {
      return;
    }

    event.preventDefault();
    showPrompt({
      type: "link",
      href,
      label: link.dataset.authPromptLabel || gameLabel
    });
  }

  function onTrackButtonPress() {
    if (authState.signedIn) {
      enableTracking();
      return;
    }

    if (shouldSkipPrompt()) {
      uiState.pendingAction = { type: "track" };
      showAuthForm("signin");
      return;
    }

    showPrompt({ type: "track", label: gameLabel });
  }

  promptLinks.forEach((link) => {
    link.addEventListener("click", (event) => onPromptableNavigation(event, link));
  });

  trackButtons.forEach((button) => {
    button.addEventListener("click", onTrackButtonPress);
  });

  authButton.addEventListener("click", () => {
    if (authState.signedIn) {
      if (uiState.menuOpen) {
        closeMenu();
      } else {
        openMenu();
      }
      return;
    }

    showAuthForm("signin");
  });

  settingsCogButton.addEventListener("click", () => {
    closeMenu();
    showSettingsView(!authState.signedIn);
  });

  menuSettingsButton.addEventListener("click", () => {
    closeMenu();
    showSettingsView(false);
  });

  signoutButton.addEventListener("click", signOut);
  closeButton.addEventListener("click", hideModal);
  backdrop.addEventListener("click", hideModal);
  promptSigninButton.addEventListener("click", () => {
    setSkipPromptPreference(promptSkipCheckbox.checked);
    showAuthForm("signin");
  });
  promptDeclineButton.addEventListener("click", handlePromptDecline);
  switchButton.addEventListener("click", () => showAuthForm(uiState.authMode === "signin" ? "signup" : "signin"));
  submitButton.addEventListener("click", submitAuth);
  settingsSaveButton.addEventListener("click", saveSettings);
  settingsCancelButton.addEventListener("click", hideModal);
  forgotButton.addEventListener("click", () => {
    authError.textContent = "Password reset is not set up yet. Create a new account or contact the site owner for help.";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      hideModal();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!shell.contains(target)) {
      closeMenu();
    }
  });

  wireAvatarEditor("signup");
  wireAvatarEditor("settings");
  populateEditor("signup", getDefaultProfileData(""), "");
  populateEditor("settings", getDefaultProfileData(""), "");
  setTrackButtonState(false);
  setSkipPromptPreference(shouldSkipPrompt());
  refreshAuthState();

  window.scoreTracker = {
    notifyScore() {
      scheduleScoreSync();
    }
  };
})();

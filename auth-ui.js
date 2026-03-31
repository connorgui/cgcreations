(function () {
  const skipPromptKey = "cg_skip_sign_in_prompt";
  const gameKey = document.body.dataset.gameKey || "";
  const gameLabel = document.body.dataset.gameLabel || "";
  const trackButtons = Array.from(document.querySelectorAll("[data-track-score]"));
  const promptLinks = Array.from(document.querySelectorAll("[data-auth-prompt-link]"));
  const avatarColors = ["#6a86c7", "#9f5de2", "#f06aa7", "#ff8c5a", "#3fb98d", "#3f6ddc", "#5c4aa8", "#1f2933"];
  const avatarEmojis = ["🐰", "🌟", "🎮", "🧠", "🔥", "🍓", "🌙", "📘", "🎯", "🪐", "💡", "🎨"];

  let authState = { signedIn: false, username: null, profileData: null };
  let trackingEnabled = false;
  let pendingAction = null;
  let authMode = "signin";
  let syncTimeoutId = null;
  let menuOpen = false;
  let authPhotoValue = "";
  let settingsPhotoValue = "";

  function buildColorOptions(prefix) {
    return avatarColors.map((color) => `
      <button type="button" class="site-avatar-color" data-avatar-color="${color}" data-avatar-prefix="${prefix}" style="background:${color}" aria-label="Avatar color ${color}"></button>
    `).join("");
  }

  function buildEmojiOptions(prefix) {
    return avatarEmojis.map((emoji) => `
      <button type="button" class="site-avatar-emoji" data-avatar-emoji="${emoji}" data-avatar-prefix="${prefix}" aria-label="Choose ${emoji}">${emoji}</button>
    `).join("");
  }

  function buildAvatarEditor(prefix) {
    return `
      <section class="site-avatar-editor" data-avatar-editor="${prefix}">
        <div class="site-avatar-preview-wrap">
          <div id="${prefix}-avatar-preview" class="site-avatar-preview"></div>
          <div class="site-avatar-meta">
            <span class="spoken-label">Profile Picture</span>
            <p class="support-text">Pick initials, an emoji, or a small photo.</p>
          </div>
        </div>
        <div class="site-avatar-mode-row" role="tablist" aria-label="Avatar type">
          <button type="button" class="site-avatar-mode" data-avatar-mode="initials" data-avatar-prefix="${prefix}">Colors + Initials</button>
          <button type="button" class="site-avatar-mode" data-avatar-mode="emoji" data-avatar-prefix="${prefix}">Emoji</button>
          <button type="button" class="site-avatar-mode" data-avatar-mode="photo" data-avatar-prefix="${prefix}">Photo</button>
        </div>
        <div id="${prefix}-avatar-panel-initials" class="site-avatar-panel">
          <label class="form-field" for="${prefix}-avatar-initials">
            Initials
            <input id="${prefix}-avatar-initials" type="text" maxlength="2" placeholder="AB">
          </label>
          <div class="site-avatar-color-grid">
            ${buildColorOptions(prefix)}
          </div>
        </div>
        <div id="${prefix}-avatar-panel-emoji" class="site-avatar-panel hidden">
          <div class="site-avatar-emoji-grid">
            ${buildEmojiOptions(prefix)}
          </div>
          <div class="site-avatar-color-grid">
            ${buildColorOptions(prefix)}
          </div>
        </div>
        <div id="${prefix}-avatar-panel-photo" class="site-avatar-panel hidden">
          <label class="form-field" for="${prefix}-avatar-photo">
            Upload Photo
            <input id="${prefix}-avatar-photo" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
          </label>
          <p class="support-text">Use a small square image for the cleanest result.</p>
        </div>
      </section>
    `;
  }

  const shell = document.createElement("div");
  shell.className = "site-auth-shell";
  shell.innerHTML = `
    <div class="site-auth-topbar">
      <div class="site-auth-anchor">
        <button id="site-auth-button" type="button" class="site-auth-button">
          <span id="site-auth-button-avatar" class="site-auth-button-avatar"></span>
          <span id="site-auth-button-label" class="site-auth-button-label">Sign In</span>
        </button>
        <div id="site-auth-menu" class="site-auth-menu hidden">
          <button id="site-auth-settings-button" type="button" class="site-auth-menu-item">Account Settings</button>
          <button id="site-auth-signout-button" type="button" class="site-auth-menu-item site-auth-menu-item-danger">Log out</button>
        </div>
      </div>
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
          <div class="site-auth-hero">
            <div class="site-auth-stars" aria-hidden="true"></div>
            <div class="site-auth-mountains" aria-hidden="true"></div>
            <div class="site-auth-forest" aria-hidden="true"></div>
            <div class="site-auth-sky-glow" aria-hidden="true"></div>
            <div class="site-auth-form-shell">
              <p class="eyebrow site-auth-hero-eyebrow">Welcome Back</p>
              <h2 id="site-auth-form-title" class="site-auth-hero-title">Login</h2>
              <p id="site-auth-form-copy" class="site-auth-hero-copy">Sign in to track your score and keep it on your account.</p>
              <label class="site-auth-field" for="site-auth-username">
                <span>Username</span>
                <input id="site-auth-username" type="text" autocomplete="username" placeholder="Username">
              </label>
              <label class="site-auth-field" for="site-auth-password">
                <span>Password</span>
                <input id="site-auth-password" type="password" autocomplete="current-password" placeholder="Password">
              </label>
              <div class="site-auth-row">
                <label class="site-auth-checkbox site-auth-checkbox-inline">
                  <input id="site-auth-remember" type="checkbox" checked>
                  Remember me
                </label>
                <button id="site-auth-forgot" type="button" class="site-auth-link-button">Forgot password?</button>
              </div>
              <div id="site-auth-signup-profile" class="hidden">
                ${buildAvatarEditor("site-auth")}
              </div>
              <p id="site-auth-error" class="site-auth-error" aria-live="polite"></p>
              <div class="site-auth-form-actions">
                <button id="site-auth-submit" type="button" class="site-auth-primary">Login</button>
                <button id="site-auth-back" type="button" class="site-auth-link-button">Back</button>
              </div>
              <p class="site-auth-switch-copy">
                <span id="site-auth-switch-prefix">Don't have an account?</span>
                <button id="site-auth-switch-button" type="button" class="site-auth-link-button">Register</button>
              </p>
            </div>
          </div>
        </div>
        <div id="site-auth-settings-view" class="hidden">
          <p class="eyebrow">Account Settings</p>
          <h2>Customize your profile</h2>
          <p id="site-auth-settings-copy" class="support-text"></p>
          ${buildAvatarEditor("site-settings")}
          <p id="site-auth-settings-error" class="site-auth-error" aria-live="polite"></p>
          <div class="actions site-auth-actions">
            <button id="site-auth-settings-save" type="button">Save Changes</button>
            <button id="site-auth-settings-cancel" type="button" class="secondary">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(shell);

  const authButtonEl = document.getElementById("site-auth-button");
  const authButtonAvatarEl = document.getElementById("site-auth-button-avatar");
  const authButtonLabelEl = document.getElementById("site-auth-button-label");
  const menuEl = document.getElementById("site-auth-menu");
  const modalEl = document.getElementById("site-auth-modal");
  const promptViewEl = document.getElementById("site-auth-prompt-view");
  const formViewEl = document.getElementById("site-auth-form-view");
  const settingsViewEl = document.getElementById("site-auth-settings-view");
  const promptTextEl = document.getElementById("site-auth-prompt-text");
  const hideCheckboxEl = document.getElementById("site-auth-hide-checkbox");
  const promptSignInEl = document.getElementById("site-auth-signin-button");
  const promptContinueEl = document.getElementById("site-auth-continue-button");
  const formTitleEl = document.getElementById("site-auth-form-title");
  const formCopyEl = document.getElementById("site-auth-form-copy");
  const usernameEl = document.getElementById("site-auth-username");
  const passwordEl = document.getElementById("site-auth-password");
  const rememberEl = document.getElementById("site-auth-remember");
  const forgotEl = document.getElementById("site-auth-forgot");
  const authSignupProfileEl = document.getElementById("site-auth-signup-profile");
  const errorEl = document.getElementById("site-auth-error");
  const submitEl = document.getElementById("site-auth-submit");
  const backEl = document.getElementById("site-auth-back");
  const switchPrefixEl = document.getElementById("site-auth-switch-prefix");
  const switchButtonEl = document.getElementById("site-auth-switch-button");
  const settingsButtonEl = document.getElementById("site-auth-settings-button");
  const signoutButtonEl = document.getElementById("site-auth-signout-button");
  const settingsCopyEl = document.getElementById("site-auth-settings-copy");
  const settingsSaveEl = document.getElementById("site-auth-settings-save");
  const settingsCancelEl = document.getElementById("site-auth-settings-cancel");
  const settingsErrorEl = document.getElementById("site-auth-settings-error");

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function shouldSkipPrompt() {
    return window.localStorage.getItem(skipPromptKey) === "1";
  }

  function updateSkipPreference() {
    if (hideCheckboxEl.checked) {
      window.localStorage.setItem(skipPromptKey, "1");
      return;
    }

    window.localStorage.removeItem(skipPromptKey);
  }

  function getDefaultProfileData(username = "") {
    return {
      avatarType: "initials",
      avatarValue: String(username || "").replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "CG",
      avatarColor: "#6a86c7"
    };
  }

  function normalizeProfileData(profileData, username = "") {
    const fallback = getDefaultProfileData(username);
    return {
      avatarType: ["initials", "emoji", "photo"].includes(profileData && profileData.avatarType) ? profileData.avatarType : fallback.avatarType,
      avatarValue: String(profileData && profileData.avatarValue ? profileData.avatarValue : fallback.avatarValue),
      avatarColor: /^#[0-9a-f]{6}$/i.test(profileData && profileData.avatarColor ? profileData.avatarColor : "")
        ? profileData.avatarColor
        : fallback.avatarColor
    };
  }

  function getAvatarMarkup(profileData, username, className = "") {
    const normalized = normalizeProfileData(profileData, username);
    const classes = ["site-avatar", className, `site-avatar-${normalized.avatarType}`].filter(Boolean).join(" ");

    if (normalized.avatarType === "photo") {
      return `<span class="${classes}" style="background:${escapeHtml(normalized.avatarColor)}"><img src="${escapeHtml(normalized.avatarValue)}" alt=""></span>`;
    }

    return `<span class="${classes}" style="background:${escapeHtml(normalized.avatarColor)}">${escapeHtml(normalized.avatarValue)}</span>`;
  }

  function renderAvatar(targetEl, profileData, username, className = "") {
    targetEl.innerHTML = getAvatarMarkup(profileData, username, className);
  }

  function getEditorState(prefix) {
    return {
      wrapper: document.querySelector(`[data-avatar-editor="${prefix}"]`),
      preview: document.getElementById(`${prefix}-avatar-preview`),
      initialsInput: document.getElementById(`${prefix}-avatar-initials`),
      photoInput: document.getElementById(`${prefix}-avatar-photo`),
      panels: {
        initials: document.getElementById(`${prefix}-avatar-panel-initials`),
        emoji: document.getElementById(`${prefix}-avatar-panel-emoji`),
        photo: document.getElementById(`${prefix}-avatar-panel-photo`)
      },
      prefix
    };
  }

  const authEditor = getEditorState("site-auth");
  const settingsEditor = getEditorState("site-settings");

  function getStoredPhotoValue(prefix) {
    return prefix === "site-settings" ? settingsPhotoValue : authPhotoValue;
  }

  function setStoredPhotoValue(prefix, value) {
    if (prefix === "site-settings") {
      settingsPhotoValue = value;
      return;
    }

    authPhotoValue = value;
  }

  function setEditorMode(prefix, mode) {
    const editor = prefix === "site-settings" ? settingsEditor : authEditor;
    const wrapper = editor.wrapper;
    wrapper.dataset.avatarMode = mode;

    for (const panelMode of ["initials", "emoji", "photo"]) {
      editor.panels[panelMode].classList.toggle("hidden", panelMode !== mode);
    }

    for (const button of wrapper.querySelectorAll(".site-avatar-mode")) {
      const selected = button.dataset.avatarMode === mode;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
  }

  function setSelectedColor(prefix, color) {
    const editor = prefix === "site-settings" ? settingsEditor : authEditor;
    editor.wrapper.dataset.avatarColor = color;
    for (const button of editor.wrapper.querySelectorAll(".site-avatar-color")) {
      button.classList.toggle("is-selected", button.dataset.avatarColor === color);
    }
  }

  function setSelectedEmoji(prefix, emoji) {
    const editor = prefix === "site-settings" ? settingsEditor : authEditor;
    editor.wrapper.dataset.avatarEmoji = emoji;
    for (const button of editor.wrapper.querySelectorAll(".site-avatar-emoji")) {
      button.classList.toggle("is-selected", button.dataset.avatarEmoji === emoji);
    }
  }

  function getEditorProfileData(prefix) {
    const editor = prefix === "site-settings" ? settingsEditor : authEditor;
    const avatarType = editor.wrapper.dataset.avatarMode || "initials";
    const avatarColor = editor.wrapper.dataset.avatarColor || "#6a86c7";
    const initials = editor.initialsInput.value.trim().replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase();
    const emoji = editor.wrapper.dataset.avatarEmoji || avatarEmojis[0];
    const photo = getStoredPhotoValue(prefix);

    if (avatarType === "emoji") {
      return {
        avatarType,
        avatarValue: emoji,
        avatarColor
      };
    }

    if (avatarType === "photo") {
      return {
        avatarType,
        avatarValue: photo,
        avatarColor
      };
    }

    return {
      avatarType,
      avatarValue: initials || getDefaultProfileData(usernameEl.value.trim()).avatarValue,
      avatarColor
    };
  }

  function updateEditorPreview(prefix) {
    const editor = prefix === "site-settings" ? settingsEditor : authEditor;
    const username = prefix === "site-settings" ? authState.username : usernameEl.value.trim();
    const profileData = getEditorProfileData(prefix);
    renderAvatar(editor.preview, profileData, username, "site-avatar-large");
  }

  function populateEditor(prefix, profileData, username) {
    const editor = prefix === "site-settings" ? settingsEditor : authEditor;
    const normalized = normalizeProfileData(profileData, username);
    editor.initialsInput.value = normalized.avatarType === "initials"
      ? normalized.avatarValue.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase()
      : getDefaultProfileData(username).avatarValue;
    setStoredPhotoValue(prefix, normalized.avatarType === "photo" ? normalized.avatarValue : "");
    if (editor.photoInput) {
      editor.photoInput.value = "";
    }
    setEditorMode(prefix, normalized.avatarType);
    setSelectedColor(prefix, normalized.avatarColor);
    setSelectedEmoji(prefix, normalized.avatarType === "emoji" ? normalized.avatarValue : avatarEmojis[0]);
    updateEditorPreview(prefix);
  }

  function openMenu() {
    menuOpen = true;
    menuEl.classList.remove("hidden");
  }

  function closeMenu() {
    menuOpen = false;
    menuEl.classList.add("hidden");
  }

  function showModal() {
    modalEl.classList.remove("hidden");
  }

  function hideModal() {
    modalEl.classList.add("hidden");
    errorEl.textContent = "";
    settingsErrorEl.textContent = "";
    pendingAction = null;
  }

  function setVisibleView(view) {
    promptViewEl.classList.toggle("hidden", view !== "prompt");
    formViewEl.classList.toggle("hidden", view !== "form");
    settingsViewEl.classList.toggle("hidden", view !== "settings");
  }

  function updateAuthButton() {
    if (authState.signedIn) {
      renderAvatar(authButtonAvatarEl, authState.profileData, authState.username);
      authButtonLabelEl.classList.add("hidden");
      authButtonEl.classList.add("is-avatar-button");
      authButtonEl.setAttribute("aria-label", `Account for ${authState.username}`);
      return;
    }

    authButtonAvatarEl.innerHTML = "";
    authButtonLabelEl.classList.remove("hidden");
    authButtonLabelEl.textContent = "Sign In";
    authButtonEl.classList.remove("is-avatar-button");
    authButtonEl.removeAttribute("aria-label");
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
      authState = { signedIn: false, username: null, profileData: null };
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
    formTitleEl.textContent = isSignup ? "Create Account" : "Login";
    formCopyEl.textContent = isSignup
      ? "Make an account to save scores and personalize your profile."
      : "Sign in to track your score and keep it on your account.";
    submitEl.textContent = isSignup ? "Create Account" : "Login";
    switchPrefixEl.textContent = isSignup ? "Already have an account?" : "Don't have an account?";
    switchButtonEl.textContent = isSignup ? "Sign In" : "Register";
    authSignupProfileEl.classList.toggle("hidden", !isSignup);
    backEl.classList.toggle("hidden", !pendingAction);
    forgotEl.classList.toggle("hidden", isSignup);
    rememberEl.closest(".site-auth-checkbox-inline").classList.toggle("hidden", isSignup);
    errorEl.textContent = "";
    if (isSignup) {
      populateEditor("site-auth", getDefaultProfileData(usernameEl.value.trim()), usernameEl.value.trim());
    }
  }

  function showAuthForm(mode = "signin") {
    setAuthMode(mode);
    setVisibleView("form");
    showModal();
    usernameEl.focus();
  }

  function showSettingsView() {
    settingsCopyEl.textContent = `Signed in as ${authState.username}. Choose how your profile picture should look.`;
    populateEditor("site-settings", authState.profileData, authState.username);
    settingsErrorEl.textContent = "";
    setVisibleView("settings");
    showModal();
  }

  function runPendingActionAfterAuth() {
    if (!pendingAction) {
      hideModal();
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

  async function submitAuth() {
    errorEl.textContent = "";

    try {
      const endpoint = authMode === "signup" ? "/api/auth/signup" : "/api/auth/signin";
      const payload = {
        username: usernameEl.value,
        password: passwordEl.value
      };

      if (authMode === "signup") {
        payload.profileData = getEditorProfileData("site-auth");
      }

      const result = await fetchJson(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      authState = {
        signedIn: Boolean(result.signedIn),
        username: result.username || null,
        profileData: normalizeProfileData(result.profileData || {}, result.username || usernameEl.value)
      };
      updateAuthButton();
      updateTrackButtons();
      closeMenu();
      runPendingActionAfterAuth();
    } catch (error) {
      errorEl.textContent = error.message;
    }
  }

  async function saveSettings() {
    settingsErrorEl.textContent = "";

    try {
      const result = await fetchJson("/api/auth/profile", {
        method: "POST",
        body: JSON.stringify({
          profileData: getEditorProfileData("site-settings")
        })
      });

      authState = {
        signedIn: Boolean(result.signedIn),
        username: result.username || authState.username,
        profileData: normalizeProfileData(result.profileData || {}, result.username || authState.username)
      };
      updateAuthButton();
      hideModal();
    } catch (error) {
      settingsErrorEl.textContent = error.message;
    }
  }

  async function signOut() {
    try {
      await fetchJson("/api/auth/signout", {
        method: "POST",
        body: JSON.stringify({})
      });
    } catch {
      // keep UI moving even if the request fails
    }

    authState = { signedIn: false, username: null, profileData: null };
    trackingEnabled = false;
    updateAuthButton();
    updateTrackButtons();
    closeMenu();
    hideModal();
  }

  function handlePhotoSelection(prefix, file) {
    const targetErrorEl = prefix === "site-settings" ? settingsErrorEl : errorEl;
    targetErrorEl.textContent = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      targetErrorEl.textContent = "Please choose an image file.";
      return;
    }

    if (file.size > 180000) {
      targetErrorEl.textContent = "That photo is too large. Use an image under about 180 KB.";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setStoredPhotoValue(prefix, result);
      setEditorMode(prefix, "photo");
      updateEditorPreview(prefix);
    };
    reader.readAsDataURL(file);
  }

  function wireAvatarEditor(prefix) {
    const editor = prefix === "site-settings" ? settingsEditor : authEditor;

    editor.wrapper.addEventListener("click", (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) {
        return;
      }

      const modeButton = target.closest("[data-avatar-mode]");
      if (modeButton instanceof HTMLElement) {
        setEditorMode(prefix, modeButton.dataset.avatarMode || "initials");
        updateEditorPreview(prefix);
        return;
      }

      const colorButton = target.closest("[data-avatar-color]");
      if (colorButton instanceof HTMLElement) {
        setSelectedColor(prefix, colorButton.dataset.avatarColor || "#6a86c7");
        updateEditorPreview(prefix);
        return;
      }

      const emojiButton = target.closest("[data-avatar-emoji]");
      if (emojiButton instanceof HTMLElement) {
        setSelectedEmoji(prefix, emojiButton.dataset.avatarEmoji || avatarEmojis[0]);
        setEditorMode(prefix, "emoji");
        updateEditorPreview(prefix);
      }
    });

    editor.initialsInput.addEventListener("input", () => {
      editor.initialsInput.value = editor.initialsInput.value.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase();
      updateEditorPreview(prefix);
    });

    editor.photoInput.addEventListener("change", () => {
      handlePhotoSelection(prefix, editor.photoInput.files && editor.photoInput.files[0]);
    });
  }

  wireAvatarEditor("site-auth");
  wireAvatarEditor("site-settings");

  usernameEl.addEventListener("input", () => {
    if (authMode !== "signup") {
      return;
    }

    if ((authEditor.wrapper.dataset.avatarMode || "initials") !== "initials") {
      return;
    }

    if (!authEditor.initialsInput.value.trim() || authEditor.initialsInput.value.trim().length <= 2) {
      authEditor.initialsInput.value = getDefaultProfileData(usernameEl.value.trim()).avatarValue;
      updateEditorPreview("site-auth");
    }
  });

  authButtonEl.addEventListener("click", () => {
    if (authState.signedIn) {
      if (menuOpen) {
        closeMenu();
      } else {
        openMenu();
      }
      return;
    }

    showAuthForm("signin");
  });

  settingsButtonEl.addEventListener("click", () => {
    closeMenu();
    showSettingsView();
  });

  signoutButtonEl.addEventListener("click", signOut);

  promptSignInEl.addEventListener("click", () => {
    updateSkipPreference();
    showAuthForm("signin");
  });

  promptContinueEl.addEventListener("click", () => {
    updateSkipPreference();
    const action = pendingAction;
    hideModal();
    if (action && action.type === "link") {
      window.location.href = action.href;
    }
  });

  submitEl.addEventListener("click", submitAuth);
  switchButtonEl.addEventListener("click", () => {
    setAuthMode(authMode === "signup" ? "signin" : "signup");
  });
  backEl.addEventListener("click", () => setVisibleView("prompt"));
  forgotEl.addEventListener("click", () => {
    errorEl.textContent = "Forgot password is not set up yet.";
  });
  settingsSaveEl.addEventListener("click", saveSettings);
  settingsCancelEl.addEventListener("click", hideModal);

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
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target && target.dataset.authClose === "true") {
      hideModal();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Node ? event.target : null;
    if (!target) {
      return;
    }

    if (!shell.contains(target)) {
      closeMenu();
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

  populateEditor("site-auth", getDefaultProfileData(""), "");
  refreshAuthState();
})();

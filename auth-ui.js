(function () {
  const skipPromptKey = "cg_skip_sign_in_prompt";
  const rememberMeKey = "cg_remember_me";
  const rememberedUsernameKey = "cg_remembered_username";
  const body = document.body;
  if (!body) {
    return;
  }

  const avatarColors = ["#6a86c7", "#9f5de2", "#f06aa7", "#ff8c5a", "#3fb98d", "#3f6ddc", "#5c4aa8", "#1f2933"];
  const avatarEmojis = [
    0x1F430,
    0x1F31F,
    0x1F3AE,
    0x1F9E0,
    0x1F525,
    0x1F353,
    0x1F319,
    0x1F4D8
  ].map((codePoint) => String.fromCodePoint(codePoint));

  const gameKey = body.dataset.gameKey || "";
  const trackButtons = Array.from(document.querySelectorAll("[data-track-score='true']"));
  const promptLinks = Array.from(document.querySelectorAll("[data-auth-prompt-link='true']"));
  const customSyncGameKeys = new Set(["pi-voice-checker", "snake-classic", "study-courses"]);

  const authState = {
    signedIn: false,
    username: null,
    profileData: null
  };

  const uiState = {
    authMode: "signin",
    pendingAction: null,
    trackingEnabled: false,
    scoreSyncTimeoutId: null,
    scoreLoadedForUsername: null,
    scoreLoadPromise: null
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalizeInitials(value, username) {
    const cleaned = String(value || "").replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase();
    if (cleaned) {
      return cleaned;
    }

    return String(username || "").slice(0, 2).toUpperCase() || "CG";
  }

  function defaultProfileData(username) {
    return {
      avatarType: "initials",
      avatarValue: normalizeInitials("", username),
      avatarColor: avatarColors[0],
      skipLoginPrompt: false
    };
  }

  function normalizeProfileData(profileData, username) {
    const defaults = defaultProfileData(username);
    if (!profileData || typeof profileData !== "object") {
      return defaults;
    }

    const avatarType = ["initials", "emoji", "photo"].includes(profileData.avatarType)
      ? profileData.avatarType
      : "initials";
    const avatarColor = avatarColors.includes(profileData.avatarColor)
      ? profileData.avatarColor
      : defaults.avatarColor;
    const skipLoginPrompt = Boolean(profileData.skipLoginPrompt);

    if (avatarType === "emoji") {
      return {
        avatarType,
        avatarValue: String(profileData.avatarValue || avatarEmojis[0]),
        avatarColor,
        skipLoginPrompt
      };
    }

    if (avatarType === "photo" && String(profileData.avatarValue || "").startsWith("data:image/")) {
      return {
        avatarType,
        avatarValue: String(profileData.avatarValue),
        avatarColor,
        skipLoginPrompt
      };
    }

    return {
      avatarType: "initials",
      avatarValue: normalizeInitials(profileData.avatarValue, username),
      avatarColor,
      skipLoginPrompt
    };
  }

  function avatarMarkup(profileData, username, large) {
    const profile = normalizeProfileData(profileData, username);
    const classes = large ? "site-avatar site-avatar-large" : "site-avatar";

    if (profile.avatarType === "photo") {
      return `<span class="${classes} site-avatar-photo"><img src="${escapeHtml(profile.avatarValue)}" alt="${escapeHtml(username || "Profile avatar")}"></span>`;
    }

    const content = profile.avatarType === "emoji" ? profile.avatarValue : normalizeInitials(profile.avatarValue, username);
    const style = profile.avatarType === "emoji"
      ? `background:${escapeHtml(profile.avatarColor)}1A;color:${escapeHtml(profile.avatarColor)}`
      : `background:${escapeHtml(profile.avatarColor)};color:#ffffff`;
    return `<span class="${classes}" style="${style}">${escapeHtml(content)}</span>`;
  }

  function editorMarkup(prefix, heading, copy) {
    const colorButtons = avatarColors.map((color, index) => {
      const selected = index === 0 ? " is-selected" : "";
      return `<button type="button" class="site-avatar-color${selected}" data-editor-prefix="${prefix}" data-avatar-color="${color}" style="background:${color}" aria-label="Choose color"></button>`;
    }).join("");

    const emojiButtons = avatarEmojis.map((emoji, index) => {
      const selected = index === 0 ? " is-selected" : "";
      return `<button type="button" class="site-avatar-emoji${selected}" data-editor-prefix="${prefix}" data-avatar-emoji="${escapeHtml(emoji)}">${escapeHtml(emoji)}</button>`;
    }).join("");

    return `
      <div class="site-avatar-editor" data-editor="${prefix}">
        <div class="site-avatar-preview-wrap">
          <div id="${prefix}-avatar-preview">${avatarMarkup(defaultProfileData(""), "", true)}</div>
          <div>
            <p class="spoken-label">${escapeHtml(heading)}</p>
            <p class="support-text">${escapeHtml(copy)}</p>
          </div>
        </div>
        <div class="site-avatar-mode-row">
          <button type="button" class="site-avatar-mode is-selected" data-editor-prefix="${prefix}" data-avatar-mode="initials">Colors + Initials</button>
          <button type="button" class="site-avatar-mode" data-editor-prefix="${prefix}" data-avatar-mode="emoji">Emoji</button>
          <button type="button" class="site-avatar-mode" data-editor-prefix="${prefix}" data-avatar-mode="photo">Photo</button>
        </div>
        <div class="site-avatar-panel" data-editor-prefix="${prefix}" data-avatar-panel="initials">
          <label class="site-auth-field" for="${prefix}-avatar-initials">
            Initials
            <input id="${prefix}-avatar-initials" type="text" maxlength="2" placeholder="CG">
          </label>
          <div class="site-avatar-color-grid">${colorButtons}</div>
        </div>
        <div class="site-avatar-panel hidden" data-editor-prefix="${prefix}" data-avatar-panel="emoji">
          <div class="site-avatar-emoji-grid">${emojiButtons}</div>
        </div>
        <div class="site-avatar-panel hidden" data-editor-prefix="${prefix}" data-avatar-panel="photo">
          <label class="site-auth-field" for="${prefix}-avatar-photo">
            Photo
            <input id="${prefix}-avatar-photo" type="file" accept="image/*">
          </label>
          <p class="support-text">Choose a small image file to use as your profile picture.</p>
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
          <button id="site-auth-settings-gear" class="site-auth-button" type="button" aria-label="Settings">&#9881;</button>
          <button id="site-auth-main-button" class="site-auth-button" type="button">
            <span id="site-auth-main-label" class="site-auth-button-label">Sign In</span>
            <span id="site-auth-main-avatar" class="site-auth-button-avatar hidden"></span>
          </button>
        </div>
        <div id="site-auth-account-menu" class="site-auth-menu hidden">
          <button id="site-auth-account-settings" class="site-auth-button site-auth-menu-item" type="button">Account Settings</button>
          <button id="site-auth-account-logout" class="site-auth-button site-auth-menu-item site-auth-menu-item-danger" type="button">Log out</button>
        </div>
      </div>
    </div>
    <div id="site-auth-modal" class="site-auth-modal" hidden>
      <div id="site-auth-backdrop" class="site-auth-backdrop"></div>
      <div class="site-auth-card">
        <button id="site-auth-close" class="site-auth-close" type="button" aria-label="Close">&times;</button>
        <section id="site-auth-prompt-view" class="hidden">
          <p class="eyebrow">Heads up</p>
          <h2>Sign in for better tracking</h2>
          <p class="support-text">This game works better when you're signed in so it can save your score and settings.</p>
          <label class="site-auth-checkbox">
            <input id="site-auth-prompt-skip" type="checkbox">
            Don't show again
          </label>
          <div class="actions site-auth-actions">
            <button id="site-auth-prompt-signin" type="button">Sign In</button>
            <button id="site-auth-prompt-skip-button" type="button" class="secondary">No thanks</button>
          </div>
        </section>
        <section id="site-auth-auth-view" class="site-auth-hero hidden">
          <div class="site-auth-stars"></div>
          <div class="site-auth-sky-glow"></div>
          <div class="site-auth-mountains"></div>
          <div class="site-auth-forest"></div>
          <div class="site-auth-form-shell">
            <p class="site-auth-hero-eyebrow">Creations account</p>
            <h2 id="site-auth-auth-heading" class="site-auth-hero-title">Login</h2>
            <p id="site-auth-auth-copy" class="site-auth-hero-copy">Save your scores, carry your profile across devices, and keep your tracking settings.</p>
            <label class="site-auth-field" for="site-auth-username">
              <span id="site-auth-identifier-label">Username</span>
              <input id="site-auth-username" type="text" autocomplete="username" placeholder="Username">
            </label>
            <label class="site-auth-field" for="site-auth-password">
              Password
              <input id="site-auth-password" type="password" autocomplete="current-password" placeholder="Password">
            </label>
            <div id="site-auth-remember-row" class="site-auth-row">
              <label class="site-auth-checkbox site-auth-checkbox-inline">
                <input id="site-auth-remember" type="checkbox">
                Remember me
              </label>
              <button id="site-auth-forgot-button" class="site-auth-link-button" type="button">Forgot password?</button>
            </div>
            <div id="site-auth-signup-editor" class="hidden">
              ${editorMarkup("signup", "Profile picture", "Pick colors and initials, an emoji, or a photo.")}
            </div>
            <p id="site-auth-error" class="site-auth-error"></p>
            <div class="site-auth-form-actions">
              <button id="site-auth-submit" class="site-auth-primary" type="button">Login</button>
            </div>
            <p class="site-auth-switch-copy">
              <span id="site-auth-switch-label">Don't have an account?</span>
              <button id="site-auth-switch-button" class="site-auth-link-button" type="button">Register</button>
            </p>
          </div>
        </section>
        <section id="site-auth-settings-view" class="hidden">
          <p class="eyebrow">Settings</p>
          <h2 id="site-auth-settings-heading">Account Settings</h2>
          <p id="site-auth-settings-copy" class="support-text">Change your profile picture and whether the sign-in message appears.</p>
          <div id="site-auth-settings-editor-wrap">
            ${editorMarkup("settings", "Profile picture", "Your avatar appears in the top-right button after sign in.")}
          </div>
          <label class="site-auth-checkbox">
            <input id="site-auth-settings-skip" type="checkbox">
            Skip the sign-in message before games
          </label>
          <div id="site-auth-danger-zone" class="site-auth-danger-zone hidden">
            <p class="spoken-label">Danger Zone</p>
            <p class="support-text">Delete your account and remove your saved scores and homework from this site.</p>
            <button id="site-auth-open-delete" type="button" class="secondary site-auth-danger-button">Delete Account</button>
          </div>
          <p id="site-auth-settings-error" class="site-auth-error"></p>
          <div class="actions site-auth-actions">
            <button id="site-auth-settings-save" type="button">Save Changes</button>
            <button id="site-auth-settings-cancel" type="button" class="secondary">Cancel</button>
          </div>
        </section>
        <section id="site-auth-delete-view" class="hidden">
          <p class="eyebrow">Delete Account</p>
          <h2>Delete your account?</h2>
          <p class="support-text">This action cannot be undone. Your saved scores, homework, and profile for this site will be permanently removed.</p>
          <label class="site-auth-field" for="site-auth-delete-confirmation">
            Type DELETE to confirm
            <input id="site-auth-delete-confirmation" type="text" placeholder="DELETE" autocomplete="off" spellcheck="false">
          </label>
          <p id="site-auth-delete-error" class="site-auth-error"></p>
          <div class="actions site-auth-actions">
            <button id="site-auth-delete-confirm" type="button" class="secondary site-auth-danger-button">Delete Account</button>
            <button id="site-auth-delete-cancel" type="button" class="secondary">Cancel</button>
          </div>
        </section>
      </div>
    </div>
  `;
  body.appendChild(shell);

  const modal = document.getElementById("site-auth-modal");
  const promptView = document.getElementById("site-auth-prompt-view");
  const authView = document.getElementById("site-auth-auth-view");
  const settingsView = document.getElementById("site-auth-settings-view");
  const deleteView = document.getElementById("site-auth-delete-view");
  const authButton = document.getElementById("site-auth-main-button");
  const authLabel = document.getElementById("site-auth-main-label");
  const authAvatar = document.getElementById("site-auth-main-avatar");
  const accountMenu = document.getElementById("site-auth-account-menu");
  const settingsGear = document.getElementById("site-auth-settings-gear");
  const usernameInput = document.getElementById("site-auth-username");
  const passwordInput = document.getElementById("site-auth-password");
  const rememberCheckbox = document.getElementById("site-auth-remember");
  const rememberRow = document.getElementById("site-auth-remember-row");
  const identifierLabel = document.getElementById("site-auth-identifier-label");
  const authHeading = document.getElementById("site-auth-auth-heading");
  const authCopy = document.getElementById("site-auth-auth-copy");
  const switchLabel = document.getElementById("site-auth-switch-label");
  const submitButton = document.getElementById("site-auth-submit");
  const authError = document.getElementById("site-auth-error");
  const signupEditorWrap = document.getElementById("site-auth-signup-editor");

  async function fetchJson(url, options) {
    const response = await window.fetch(url, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...options
    });
    const rawText = await response.text();
    let payload = {};
    if (rawText) {
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = {};
      }
    }
    if (!response.ok) {
      const fallbackMessage = rawText
        ? rawText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : `Request failed (${response.status}).`;
      throw new Error(payload.error || fallbackMessage || `Request failed (${response.status}).`);
    }
    return payload;
  }

  function clearAuthMessage() {
    authError.textContent = "";
    authError.classList.remove("is-success");
  }

  function setAuthMessage(message, kind) {
    authError.textContent = message || "";
    authError.classList.toggle("is-success", kind === "success");
  }

  function shouldSkipPrompt() {
    if (authState.signedIn) {
      return Boolean(authState.profileData && authState.profileData.skipLoginPrompt);
    }

    return window.localStorage.getItem(skipPromptKey) === "true";
  }

  function getRememberedAuth() {
    return {
      remember: window.localStorage.getItem(rememberMeKey) === "true",
      username: window.localStorage.getItem(rememberedUsernameKey) || ""
    };
  }

  function setRememberedAuth(remember, username) {
    if (remember) {
      window.localStorage.setItem(rememberMeKey, "true");
      window.localStorage.setItem(rememberedUsernameKey, username || "");
      return;
    }

    window.localStorage.setItem(rememberMeKey, "false");
    window.localStorage.removeItem(rememberedUsernameKey);
  }

  function setSkipPrompt(shouldSkip) {
    window.localStorage.setItem(skipPromptKey, shouldSkip ? "true" : "false");
    document.getElementById("site-auth-prompt-skip").checked = shouldSkip;
    document.getElementById("site-auth-settings-skip").checked = shouldSkip;
    if (authState.profileData) {
      authState.profileData.skipLoginPrompt = shouldSkip;
    }
  }

  function showOnly(viewName) {
    promptView.classList.toggle("hidden", viewName !== "prompt");
    authView.classList.toggle("hidden", viewName !== "auth");
    settingsView.classList.toggle("hidden", viewName !== "settings");
    deleteView.classList.toggle("hidden", viewName !== "delete");
    modal.hidden = false;
    accountMenu.classList.add("hidden");
  }

  function closeModal() {
    modal.hidden = true;
    promptView.classList.add("hidden");
    authView.classList.add("hidden");
    settingsView.classList.add("hidden");
    deleteView.classList.add("hidden");
    clearAuthMessage();
    document.getElementById("site-auth-settings-error").textContent = "";
    document.getElementById("site-auth-delete-error").textContent = "";
    document.getElementById("site-auth-delete-confirmation").value = "";
  }

  function currentEditorProfile(prefix, username) {
    const modeButton = shell.querySelector(`.site-avatar-mode.is-selected[data-editor-prefix='${prefix}']`);
    const colorButton = shell.querySelector(`.site-avatar-color.is-selected[data-editor-prefix='${prefix}']`);
    const emojiButton = shell.querySelector(`.site-avatar-emoji.is-selected[data-editor-prefix='${prefix}']`);
    const initialsInput = document.getElementById(`${prefix}-avatar-initials`);
    const photoInput = document.getElementById(`${prefix}-avatar-photo`);
    const mode = modeButton?.dataset.avatarMode || "initials";
    const color = colorButton?.dataset.avatarColor || avatarColors[0];

    if (mode === "emoji") {
      return { avatarType: "emoji", avatarValue: emojiButton?.dataset.avatarEmoji || avatarEmojis[0], avatarColor: color };
    }

    if (mode === "photo" && photoInput?.dataset.photoValue) {
      return { avatarType: "photo", avatarValue: photoInput.dataset.photoValue, avatarColor: color };
    }

    return {
      avatarType: "initials",
      avatarValue: normalizeInitials(initialsInput?.value, username),
      avatarColor: color
    };
  }

  function updatePreview(prefix, username) {
    const preview = document.getElementById(`${prefix}-avatar-preview`);
    if (preview) {
      preview.innerHTML = avatarMarkup(currentEditorProfile(prefix, username), username, true);
    }
  }

  function populateEditor(prefix, profileData, username) {
    const normalized = normalizeProfileData(profileData, username);
    const initialsInput = document.getElementById(`${prefix}-avatar-initials`);
    const photoInput = document.getElementById(`${prefix}-avatar-photo`);

    if (initialsInput) {
      initialsInput.value = normalized.avatarType === "initials" ? normalizeInitials(normalized.avatarValue, username) : normalizeInitials("", username);
    }
    if (photoInput) {
      photoInput.dataset.photoValue = normalized.avatarType === "photo" ? normalized.avatarValue : "";
    }

    shell.querySelectorAll(`[data-editor-prefix='${prefix}'].site-avatar-mode`).forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.avatarMode === normalized.avatarType);
    });
    shell.querySelectorAll(`[data-editor-prefix='${prefix}'].site-avatar-color`).forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.avatarColor === normalized.avatarColor);
    });
    shell.querySelectorAll(`[data-editor-prefix='${prefix}'].site-avatar-emoji`).forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.avatarEmoji === normalized.avatarValue);
    });
    shell.querySelectorAll(`[data-avatar-panel][data-editor-prefix='${prefix}']`).forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.avatarPanel !== normalized.avatarType);
    });

    updatePreview(prefix, username);
  }

  function setAuthButton() {
    if (!authState.signedIn) {
      authButton.classList.remove("is-avatar-button");
      authLabel.classList.remove("hidden");
      authAvatar.classList.add("hidden");
      authAvatar.innerHTML = "";
      return;
    }

    authButton.classList.add("is-avatar-button");
    authLabel.classList.add("hidden");
    authAvatar.classList.remove("hidden");
    authAvatar.innerHTML = avatarMarkup(authState.profileData, authState.username, false);
  }

  function emitAuthChange() {
    window.dispatchEvent(new CustomEvent("site-auth-change", {
      detail: {
        signedIn: authState.signedIn,
        username: authState.username,
        profileData: authState.profileData
      }
    }));
    refreshTrackingForAuth();
  }

  function collectScore() {
    const apiSnapshot = window.gameScoreApi?.getScoreSnapshot?.();
    if (apiSnapshot && typeof apiSnapshot === "object") {
      return apiSnapshot;
    }

    if (gameKey === "pi-voice-checker") {
      return {
        correctCount: Number(document.getElementById("correct-count")?.textContent || 0),
        wrongCount: Number(document.getElementById("wrong-count")?.textContent || 0)
      };
    }

    if (gameKey === "prime-speed-check") {
      return {
        correctCount: Number(document.getElementById("prime-correct-count")?.textContent || 0),
        wrongCount: Number(document.getElementById("prime-wrong-count")?.textContent || 0)
      };
    }

    if (gameKey === "easter-bunny-memory") {
      return {
        wins: Number(document.getElementById("bunny-wins")?.textContent || 0),
        losses: Number(document.getElementById("bunny-losses")?.textContent || 0)
      };
    }

    if (gameKey === "snake-classic") {
      return {
        score: Number(document.getElementById("snake-score")?.textContent || 0),
        bestScore: Number(document.getElementById("snake-best-score")?.textContent || 0),
        snakeLength: Number(document.getElementById("snake-length")?.textContent || 0),
        state: document.getElementById("snake-state")?.textContent || "Ready"
      };
    }

    if (gameKey === "study-courses") {
      if (window.studyCourses?.getScoreData) {
        return window.studyCourses.getScoreData();
      }
      return {
        currentCourse: document.getElementById("study-current-course")?.textContent || "Reading",
        currentPractice: document.getElementById("study-current-practice")?.textContent || "Synonyms",
        currentLevel: document.getElementById("study-current-level")?.textContent || "Easy",
        correctCount: Number(document.getElementById("study-correct-count")?.textContent || 0),
        wrongCount: Number(document.getElementById("study-wrong-count")?.textContent || 0),
        answeredCount: Number(document.getElementById("study-answered-count")?.textContent || 0),
        bestCorrect: Number(document.getElementById("study-best-correct")?.textContent || 0)
      };
    }

    return null;
  }

  function setTrackingButtonText(message) {
    trackButtons.forEach((button) => {
      button.textContent = message;
    });
  }

  function resetTrackingState() {
    uiState.trackingEnabled = false;
    uiState.scoreLoadedForUsername = null;
    uiState.scoreLoadPromise = null;
    if (uiState.scoreSyncTimeoutId) {
      window.clearTimeout(uiState.scoreSyncTimeoutId);
      uiState.scoreSyncTimeoutId = null;
    }
    setTrackingButtonText("Track your score");
  }

  async function loadSharedScore() {
    if (!authState.signedIn || !authState.username || !gameKey || customSyncGameKeys.has(gameKey)) {
      return;
    }

    if (uiState.scoreLoadedForUsername === authState.username) {
      return;
    }

    if (uiState.scoreLoadPromise) {
      return uiState.scoreLoadPromise;
    }

    const usernameAtStart = authState.username;
    uiState.scoreLoadPromise = (async () => {
      const payload = await fetchJson(`/api/game-score/${encodeURIComponent(gameKey)}`, { method: "GET" });
      if (!authState.signedIn || authState.username !== usernameAtStart) {
        return;
      }

      uiState.scoreLoadedForUsername = usernameAtStart;
      const savedScore = payload?.scoreData;
      if (savedScore && typeof savedScore === "object") {
        window.gameScoreApi?.applyScoreSnapshot?.(savedScore);
      }
    })();

    try {
      await uiState.scoreLoadPromise;
    } finally {
      uiState.scoreLoadPromise = null;
    }
  }

  function syncScoreSoon() {
    if (
      !uiState.trackingEnabled ||
      !authState.signedIn ||
      !gameKey ||
      customSyncGameKeys.has(gameKey)
    ) {
      return;
    }

    if (uiState.scoreLoadedForUsername !== authState.username) {
      enableTracking({ automatic: true });
      return;
    }

    if (uiState.scoreSyncTimeoutId) {
      window.clearTimeout(uiState.scoreSyncTimeoutId);
    }

    uiState.scoreSyncTimeoutId = window.setTimeout(() => {
      uiState.scoreSyncTimeoutId = null;
      const scoreData = collectScore();
      if (!scoreData) {
        return;
      }

      setTrackingButtonText("Syncing...");
      fetchJson(`/api/game-score/${encodeURIComponent(gameKey)}`, {
        method: "POST",
        body: JSON.stringify({ scoreData })
      }).then(() => {
        if (authState.signedIn) {
          setTrackingButtonText("Account sync on");
        }
      }).catch(() => {
        if (authState.signedIn) {
          setTrackingButtonText("Sync unavailable - retrying");
        }
      });
    }, 250);
  }

  async function enableTracking({ automatic = false } = {}) {
    if (!authState.signedIn) {
      if (!automatic) {
        uiState.pendingAction = { type: "track" };
        openAuth("signin");
      }
      return;
    }

    if (!trackButtons.length) {
      return;
    }

    if (customSyncGameKeys.has(gameKey)) {
      setTrackingButtonText("Account sync on");
      return;
    }

    uiState.trackingEnabled = true;
    setTrackingButtonText("Syncing...");

    try {
      await loadSharedScore();
    } catch {
      setTrackingButtonText("Sync unavailable - retrying");
      return;
    }

    setTrackingButtonText("Account sync on");
    syncScoreSoon();
  }

  function refreshTrackingForAuth() {
    if (!trackButtons.length) {
      return;
    }

    if (!authState.signedIn) {
      resetTrackingState();
      return;
    }

    enableTracking({ automatic: true });
  }

  function openPrompt(action) {
    uiState.pendingAction = action;
    document.getElementById("site-auth-prompt-skip").checked = shouldSkipPrompt();
    showOnly("prompt");
  }

  function openAuth(mode) {
    uiState.authMode = mode;
    clearAuthMessage();
    const signingUp = mode === "signup";
    authHeading.textContent = signingUp ? "Create Account" : "Login";
    authCopy.textContent = mode === "signup"
      ? "Create an account to track your score, save your profile picture, and keep your settings."
      : "Save your scores, carry your profile across devices, and keep your tracking settings.";
    submitButton.textContent = signingUp ? "Create Account" : "Login";
    switchLabel.textContent = signingUp ? "Already have an account?" : "Don't have an account?";
    document.getElementById("site-auth-switch-button").textContent = signingUp ? "Sign In" : "Register";
    signupEditorWrap.classList.toggle("hidden", !signingUp);
    rememberRow.classList.toggle("hidden", false);
    identifierLabel.textContent = "Username";
    usernameInput.placeholder = "Username";
    usernameInput.autocomplete = "username";
    passwordInput.autocomplete = signingUp ? "new-password" : "current-password";
    if (!usernameInput.value) {
      const remembered = getRememberedAuth();
      rememberCheckbox.checked = remembered.remember;
      if (remembered.remember && remembered.username) {
        usernameInput.value = remembered.username;
      }
    }
    if (signingUp) {
      populateEditor("signup", defaultProfileData(usernameInput.value.trim()), usernameInput.value.trim());
    }
    showOnly("auth");
  }

  function openSettings(prefOnly) {
    document.getElementById("site-auth-settings-skip").checked = shouldSkipPrompt();
    const editorWrap = document.getElementById("site-auth-settings-editor-wrap");
    const dangerZone = document.getElementById("site-auth-danger-zone");
    const shouldShowAccountSettings = !prefOnly && authState.signedIn;
    document.getElementById("site-auth-settings-heading").textContent = shouldShowAccountSettings ? "Account Settings" : "Reminder Settings";
    document.getElementById("site-auth-settings-copy").textContent = shouldShowAccountSettings
      ? "Change your profile picture and whether the sign-in message appears."
      : "Choose whether the sign-in message appears before score-tracked games.";
    editorWrap.classList.toggle("hidden", !shouldShowAccountSettings);
    dangerZone.classList.toggle("hidden", !shouldShowAccountSettings);
    if (shouldShowAccountSettings) {
      populateEditor("settings", authState.profileData, authState.username);
    }
    showOnly("settings");
  }

  function openDeleteConfirm() {
    document.getElementById("site-auth-delete-error").textContent = "";
    document.getElementById("site-auth-delete-confirmation").value = "";
    showOnly("delete");
    document.getElementById("site-auth-delete-confirmation").focus();
  }

  function finishPendingAction() {
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

  async function refreshAuth() {
    try {
      const payload = await fetchJson("/api/auth/me", { method: "GET" });
      authState.signedIn = Boolean(payload.signedIn);
      authState.username = payload.username || null;
      authState.profileData = authState.signedIn ? normalizeProfileData(payload.profileData, payload.username) : null;
    } catch {
      authState.signedIn = false;
      authState.username = null;
      authState.profileData = null;
    }

    setSkipPrompt(shouldSkipPrompt());
    setAuthButton();
    emitAuthChange();
  }

  document.getElementById("site-auth-close").addEventListener("click", closeModal);
  document.getElementById("site-auth-backdrop").addEventListener("click", closeModal);
  document.getElementById("site-auth-prompt-signin").addEventListener("click", () => {
    setSkipPrompt(document.getElementById("site-auth-prompt-skip").checked);
    openAuth("signin");
  });
  document.getElementById("site-auth-prompt-skip-button").addEventListener("click", () => {
    setSkipPrompt(document.getElementById("site-auth-prompt-skip").checked);
    const action = uiState.pendingAction;
    closeModal();
    uiState.pendingAction = null;
    if (action?.type === "link" && action.href) {
      window.location.href = action.href;
    }
  });
  document.getElementById("site-auth-switch-button").addEventListener("click", () => {
    openAuth(uiState.authMode === "signin" ? "signup" : "signin");
  });
  document.getElementById("site-auth-forgot-button").addEventListener("click", () => {
    setAuthMessage("Password reset is not set up yet.");
  });
  document.getElementById("site-auth-submit").addEventListener("click", async () => {
    clearAuthMessage();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) {
      setAuthMessage("Please enter both a username and password.");
      return;
    }

    const payload = { username, password, remember: rememberCheckbox.checked };
    if (uiState.authMode === "signup") {
      payload.profileData = {
        ...currentEditorProfile("signup", username),
        skipLoginPrompt: shouldSkipPrompt()
      };
    }

    try {
      const response = await fetchJson(`/api/auth/${uiState.authMode}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setRememberedAuth(rememberCheckbox.checked, username);
      authState.signedIn = Boolean(response.signedIn);
      authState.username = response.username || username;
      authState.profileData = normalizeProfileData(response.profileData, authState.username);
      setSkipPrompt(shouldSkipPrompt());
      setAuthButton();
      emitAuthChange();
      closeModal();
      finishPendingAction();
    } catch (error) {
      setAuthMessage(error.message || "That request could not be completed.");
    }
  });

  document.getElementById("site-auth-settings-save").addEventListener("click", async () => {
    document.getElementById("site-auth-settings-error").textContent = "";
    setSkipPrompt(document.getElementById("site-auth-settings-skip").checked);

    if (!authState.signedIn) {
      closeModal();
      return;
    }

    try {
      const response = await fetchJson("/api/auth/profile", {
        method: "POST",
        body: JSON.stringify({
          profileData: {
            ...currentEditorProfile("settings", authState.username),
            skipLoginPrompt: document.getElementById("site-auth-settings-skip").checked
          }
        })
      });
      authState.profileData = normalizeProfileData(response.profileData, authState.username);
      setSkipPrompt(shouldSkipPrompt());
      setAuthButton();
      emitAuthChange();
      closeModal();
    } catch (error) {
      document.getElementById("site-auth-settings-error").textContent = error.message || "Could not save settings.";
    }
  });

  document.getElementById("site-auth-settings-cancel").addEventListener("click", closeModal);
  document.getElementById("site-auth-account-settings").addEventListener("click", () => openSettings(false));
  document.getElementById("site-auth-open-delete").addEventListener("click", openDeleteConfirm);
  document.getElementById("site-auth-delete-cancel").addEventListener("click", () => openSettings(false));
  document.getElementById("site-auth-delete-confirm").addEventListener("click", async () => {
    const confirmation = document.getElementById("site-auth-delete-confirmation").value.trim();
    const deleteError = document.getElementById("site-auth-delete-error");
    deleteError.textContent = "";

    if (confirmation !== "DELETE") {
      deleteError.textContent = "Type DELETE in all caps to confirm account deletion.";
      return;
    }

    try {
      await fetchJson("/api/auth/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation })
      });
      authState.signedIn = false;
      authState.username = null;
      authState.profileData = null;
      resetTrackingState();
      setSkipPrompt(window.localStorage.getItem(skipPromptKey) === "true");
      setAuthButton();
      emitAuthChange();
      accountMenu.classList.add("hidden");
      closeModal();
    } catch (error) {
      deleteError.textContent = error.message || "Could not delete your account.";
    }
  });
  document.getElementById("site-auth-account-logout").addEventListener("click", async () => {
    try {
      await fetchJson("/api/auth/signout", { method: "POST", body: JSON.stringify({}) });
    } catch {
      // Ignore network errors during sign out.
    }

    authState.signedIn = false;
    authState.username = null;
    authState.profileData = null;
    resetTrackingState();
    setSkipPrompt(window.localStorage.getItem(skipPromptKey) === "true");
    setAuthButton();
    emitAuthChange();
    accountMenu.classList.add("hidden");
  });

  authButton.addEventListener("click", () => {
    if (!authState.signedIn) {
      openAuth("signin");
      return;
    }

    accountMenu.classList.toggle("hidden");
  });

  settingsGear.addEventListener("click", () => {
    openSettings(!authState.signedIn);
  });

  promptLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (authState.signedIn || shouldSkipPrompt()) {
        return;
      }

      event.preventDefault();
      openPrompt({ type: "link", href: link.getAttribute("href") || "/" });
    });
  });

  trackButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (authState.signedIn) {
        enableTracking();
        return;
      }

      if (shouldSkipPrompt()) {
        uiState.pendingAction = { type: "track" };
        openAuth("signin");
        return;
      }

      openPrompt({ type: "track" });
    });
  });

  shell.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const modeButton = target.closest(".site-avatar-mode");
    if (modeButton) {
      const prefix = modeButton.dataset.editorPrefix;
      shell.querySelectorAll(`.site-avatar-mode[data-editor-prefix='${prefix}']`).forEach((button) => {
        button.classList.toggle("is-selected", button === modeButton);
      });
      shell.querySelectorAll(`[data-avatar-panel][data-editor-prefix='${prefix}']`).forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.avatarPanel !== modeButton.dataset.avatarMode);
      });
      updatePreview(prefix, prefix === "settings" ? authState.username : usernameInput.value.trim());
      return;
    }

    const colorButton = target.closest(".site-avatar-color");
    if (colorButton) {
      const prefix = colorButton.dataset.editorPrefix;
      shell.querySelectorAll(`.site-avatar-color[data-editor-prefix='${prefix}']`).forEach((button) => {
        button.classList.toggle("is-selected", button === colorButton);
      });
      updatePreview(prefix, prefix === "settings" ? authState.username : usernameInput.value.trim());
      return;
    }

    const emojiButton = target.closest(".site-avatar-emoji");
    if (emojiButton) {
      const prefix = emojiButton.dataset.editorPrefix;
      shell.querySelectorAll(`.site-avatar-emoji[data-editor-prefix='${prefix}']`).forEach((button) => {
        button.classList.toggle("is-selected", button === emojiButton);
      });
      shell.querySelectorAll(`.site-avatar-mode[data-editor-prefix='${prefix}']`).forEach((button) => {
        button.classList.toggle("is-selected", button.dataset.avatarMode === "emoji");
      });
      shell.querySelectorAll(`[data-avatar-panel][data-editor-prefix='${prefix}']`).forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.avatarPanel !== "emoji");
      });
      updatePreview(prefix, prefix === "settings" ? authState.username : usernameInput.value.trim());
    }
  });

  shell.addEventListener("input", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.id.endsWith("-avatar-initials")) {
      target.value = normalizeInitials(target.value, target.id.startsWith("settings") ? authState.username : usernameInput.value.trim());
      updatePreview(target.id.startsWith("settings") ? "settings" : "signup", target.id.startsWith("settings") ? authState.username : usernameInput.value.trim());
    }
  });

  shell.querySelectorAll("input[type='file']").forEach((input) => {
    input.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.files?.[0]) {
        return;
      }

      const prefix = target.id.startsWith("settings") ? "settings" : "signup";
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        target.dataset.photoValue = typeof reader.result === "string" ? reader.result : "";
        shell.querySelectorAll(`.site-avatar-mode[data-editor-prefix='${prefix}']`).forEach((button) => {
          button.classList.toggle("is-selected", button.dataset.avatarMode === "photo");
        });
        shell.querySelectorAll(`[data-avatar-panel][data-editor-prefix='${prefix}']`).forEach((panel) => {
          panel.classList.toggle("hidden", panel.dataset.avatarPanel !== "photo");
        });
        updatePreview(prefix, prefix === "settings" ? authState.username : usernameInput.value.trim());
      });
      reader.readAsDataURL(target.files[0]);
    });
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) {
      return;
    }

    if (!shell.contains(event.target)) {
      accountMenu.classList.add("hidden");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      accountMenu.classList.add("hidden");
    }
  });

  setSkipPrompt(shouldSkipPrompt());
  {
    const remembered = getRememberedAuth();
    rememberCheckbox.checked = remembered.remember;
    if (remembered.remember && remembered.username) {
      usernameInput.value = remembered.username;
    }
  }
  populateEditor("signup", defaultProfileData(""), "");
  populateEditor("settings", defaultProfileData(""), "");
  refreshAuth();

  window.scoreTracker = {
    notifyScore() {
      syncScoreSoon();
    }
  };

  window.siteAuth = {
    openSignIn() {
      openAuth("signin");
    },
    openSettings() {
      openSettings(!authState.signedIn);
    },
    getState() {
      return {
        signedIn: authState.signedIn,
        username: authState.username,
        profileData: authState.profileData
      };
    }
  };
})();

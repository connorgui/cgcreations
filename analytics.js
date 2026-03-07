(function () {
  async function trackVisitor() {
    const response = await fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });

    if (!response.ok) {
      throw new Error(`Visitor registration failed: ${response.status}`);
    }

    return response.json();
  }

  async function fetchAnalytics() {
    const response = await fetch('/api/analytics', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Analytics request failed: ${response.status}`);
    }
    return response.json();
  }

  function renderAnalytics(analytics) {
    const uniqueUsersEl = document.getElementById('unique-users');
    if (uniqueUsersEl) {
      uniqueUsersEl.textContent = String(analytics.uniqueUsers || 0);
      uniqueUsersEl.removeAttribute('title');
    }
  }

  async function init() {
    const uniqueUsersEl = document.getElementById('unique-users');
    let tracked = false;

    try {
      const registration = await trackVisitor();
      renderAnalytics(registration);
      tracked = true;
    } catch (error) {
      if (uniqueUsersEl) {
        uniqueUsersEl.title = error.message;
      }
    }

    try {
      const analytics = await fetchAnalytics();
      renderAnalytics(analytics);
    } catch (error) {
      if (!tracked && uniqueUsersEl) {
        uniqueUsersEl.textContent = uniqueUsersEl.textContent.trim() || '0';
        uniqueUsersEl.title = error.message;
      }
    }
  }

  window.siteAnalytics = { init };
})();
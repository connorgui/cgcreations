(function () {
  const form = document.getElementById('assistant-form');
  const input = document.getElementById('assistant-input');
  const send = document.getElementById('assistant-send');
  const messagesEl = document.getElementById('assistant-messages');
  const history = [];

  function addMessage(content, role, isError = false) {
    const item = document.createElement('div');
    item.className = `assistant-message ${role}${isError ? ' error' : ''}`;
    item.textContent = content;
    messagesEl.appendChild(item);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return item;
  }

  async function ask(text) {
    history.push({ role: 'user', content: text });
    addMessage(text, 'user');
    const waiting = addMessage('Thinking...', 'assistant');
    send.disabled = true;
    input.disabled = true;
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-12) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The assistant could not answer.');
      waiting.remove();
      history.push({ role: 'assistant', content: data.reply });
      addMessage(data.reply, 'assistant');
    } catch (error) {
      waiting.remove();
      addMessage(error.message || 'The assistant is unavailable. Try again later.', 'assistant', true);
      history.pop();
    } finally {
      send.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || send.disabled) return;
    input.value = '';
    ask(text);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
  });
  document.querySelectorAll('.assistant-suggestion').forEach((button) => button.addEventListener('click', () => {
    input.value = button.textContent;
    form.requestSubmit();
  }));
}());

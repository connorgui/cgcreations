(function () {
  const buttons = Array.from(document.querySelectorAll('[data-filter]'));
  const cards = Array.from(document.querySelectorAll('[data-category]'));
  buttons.forEach((button) => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    buttons.forEach((item) => item.classList.toggle('is-selected', item === button));
    cards.forEach((card) => {
      const visible = filter === 'all' || card.dataset.category === filter;
      card.hidden = !visible;
      if (visible) {
        card.style.animation = 'none';
        requestAnimationFrame(() => { card.style.animation = ''; });
      }
    });
  }));
}());

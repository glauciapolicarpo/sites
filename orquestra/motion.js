(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const status = document.querySelector('.dash-status');
  if (status) {
    status.textContent = status.textContent.replace('●', '').trim();
    const dot = document.createElement('i');
    dot.className = 'status-pulse';
    dot.setAttribute('aria-hidden', 'true');
    status.prepend(dot);
  }
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('motion-pending');
      if (entry.target.dataset.countTarget) count(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: .2 });
  function count(element) {
    const target = Number(element.dataset.countTarget);
    const format = value => target === 34 ? `+${value}%` : String(value);
    const start = performance.now();
    function frame(now) {
      const progress = Math.min((now - start) / 1800, 1);
      element.textContent = format(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  document.querySelectorAll('.metric strong').forEach(element => {
    const value = element.textContent.trim();
    if (value !== '+34%' && value !== '126') return;
    element.setAttribute('aria-label', value);
    element.dataset.countTarget = value === '+34%' ? '34' : '126';
    observer.observe(element);
  });
  document.querySelectorAll('.product-intro h2 mark, #onboarding h2, #onboarding .steps > div').forEach(element => {
    if (!element.matches('mark')) element.classList.add('fade-step');
    element.classList.add('motion-pending');
    observer.observe(element);
  });
  const rotating = document.querySelector('.flow-heading h2 > span');
  if (rotating) {
    const phrases = ['Vários talentos.', 'Vários agentes.', 'Vários resultados.'];
    rotating.setAttribute('aria-label', phrases.join(' '));
    setInterval(() => {
      if (document.hidden || reduced.matches || rotating.getBoundingClientRect().bottom < 0 || rotating.getBoundingClientRect().top > innerHeight) return;
      const choices = phrases.filter(phrase => phrase !== rotating.textContent);
      rotating.classList.add('word-out');
      setTimeout(() => {
        rotating.textContent = choices[Math.floor(Math.random() * choices.length)];
        rotating.classList.remove('word-out');
      }, 400);
    }, 4200);
  }
})();

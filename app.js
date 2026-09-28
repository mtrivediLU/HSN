(() => {
  const deck = document.querySelector('#deck');
  const slides = Array.from(deck.querySelectorAll(':scope > section'));
  const previousButton = document.querySelector('#previousButton');
  const nextButton = document.querySelector('#nextButton');
  const slideNumber = document.querySelector('#slideNumber');
  const homeButton = document.querySelector('#homeButton');
  const anchorIds = ['opening', 'decisions', 'measures', 'trust-the-data', 'foundation', 'validate', 'dashboard', 'after-launch'];
  let currentIndex = 0;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  slides.forEach((slide, index) => {
    const number = String(index + 1).padStart(2, '0');
    slide.classList.add('slide');
    slide.id = anchorIds[index] || `step-${number}`;
    slide.dataset.step = String(index + 1);
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${number} of ${slides.length}: ${slide.dataset.label.replace(/^\d+\s*/, '')}`);
  });

  function indexFromHash() {
    const hash = location.hash.slice(1);
    const semanticIndex = anchorIds.indexOf(hash);
    if (semanticIndex >= 0) return semanticIndex;
    const legacyMatch = hash.match(/^step-(\d{2})$/);
    if (!legacyMatch) return 0;
    return Math.min(Math.max(Number(legacyMatch[1]) - 1, 0), slides.length - 1);
  }

  function updateScale() {
    if (!matchMedia('(min-width: 1200px)').matches) {
      document.documentElement.style.removeProperty('--deck-scale');
      return;
    }
    const headerHeight = document.querySelector('.site-header').offsetHeight;
    const controlsAllowance = 76;
    const availableHeight = Math.max(innerHeight - headerHeight - controlsAllowance, 320);
    const scale = Math.min(innerWidth / 1920, availableHeight / 1080);
    document.documentElement.style.setProperty('--deck-scale', String(scale));
  }

  function showSlide(index, options = {}) {
    currentIndex = Math.min(Math.max(index, 0), slides.length - 1);
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === currentIndex;
      slide.classList.toggle('is-active', active);
      slide.hidden = !active;
      slide.setAttribute('aria-hidden', String(!active));
    });
    previousButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === slides.length - 1;
    slideNumber.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    document.title = `${slides[currentIndex].dataset.label} · HSN OR Dashboard`;
    const hash = `#${slides[currentIndex].id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    if (!options.preserveScroll) {
      requestAnimationFrame(() => scrollTo({ top: 0, behavior: options.instant ? 'auto' : 'smooth' }));
    }
  }

  function move(delta) {
    showSlide(currentIndex + delta);
  }

  previousButton.addEventListener('click', () => move(-1));
  nextButton.addEventListener('click', () => move(1));
  homeButton.addEventListener('click', () => showSlide(0));
  slideNumber.addEventListener('click', () => showSlide(0));

  addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) {
      event.preventDefault();
      move(1);
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      showSlide(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      showSlide(slides.length - 1);
    }
  });

  addEventListener('hashchange', () => showSlide(indexFromHash(), { instant: true }));
  addEventListener('resize', updateScale);
  updateScale();
  showSlide(indexFromHash(), { instant: true });
})();

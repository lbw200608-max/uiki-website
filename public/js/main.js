const data = window.SITE_DATA;

const byData = (name) => document.querySelector(`[data-${name}]`);

const setText = (name, value) => {
  const node = byData(name);
  if (node) node.textContent = value;
};

const createTag = (tagName, className, text) => {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

const renderStats = () => {
  const target = byData('stats');
  if (!target) return;

  target.innerHTML = '';
  data.stats.forEach((stat) => {
    const item = createTag('article', 'stat');
    item.append(createTag('strong', '', stat.value));
    item.append(createTag('span', '', stat.label));
    target.append(item);
  });
};

const renderProjectStatus = () => {
  const status = data.projectStatus;
  if (!status) return;

  setText('project-stage', status.stage);
  setText('project-phase', status.phase);
  setText('project-progress', `${status.progress}%`);
  setText('project-summary', status.summary);

  const track = byData('project-progress-track');
  const bar = byData('project-progress-bar');
  if (track) track.setAttribute('aria-valuenow', String(status.progress));
  if (bar) bar.style.width = `${status.progress}%`;

  const steps = byData('next-steps');
  if (steps) {
    steps.innerHTML = '';
    status.nextSteps.forEach((step) => steps.append(createTag('li', '', step)));
  }

  const milestones = byData('project-milestones');
  if (milestones) {
    milestones.innerHTML = '';
    status.milestones.forEach((item) => {
      const card = createTag('article', `milestone-card ${item.status}`);
      const state = item.status === 'done' ? '已完成' : '下一步';
      card.append(createTag('span', 'milestone-state', state));
      card.append(createTag('h3', '', item.label));
      card.append(createTag('p', '', item.detail));
      milestones.append(card);
    });
  }
};

const renderProfile = () => {
  const target = byData('profile-list');
  if (!target) return;

  target.innerHTML = '';
  data.profile.forEach(([label, value]) => {
    target.append(createTag('dt', '', label));
    target.append(createTag('dd', '', value));
  });
};

const renderServices = () => {
  const target = byData('services');
  if (!target) return;

  target.innerHTML = '';
  data.services.forEach((service, index) => {
    const card = createTag('article', 'service-card');
    card.append(createTag('span', 'service-index', String(index + 1).padStart(2, '0')));
    card.append(createTag('h3', '', service.title));
    card.append(createTag('p', '', service.description));
    target.append(card);
  });
};

const renderProjects = () => {
  const target = byData('projects');
  if (!target) return;

  target.innerHTML = '';
  data.projects.forEach((project) => {
    const card = createTag('article', 'project-card');
    const tags = createTag('div', 'tag-list');

    project.tags.forEach((tag) => {
      tags.append(createTag('span', 'tag', tag));
    });

    card.append(createTag('h3', '', project.title));
    card.append(createTag('p', '', project.description));
    card.append(tags);
    target.append(card);
  });
};

const renderTimeline = () => {
  const target = byData('timeline');
  if (!target) return;

  target.innerHTML = '';
  data.timeline.forEach((item) => {
    const row = createTag('article', 'timeline-item');
    row.append(createTag('div', 'timeline-date', item.date));

    const copy = createTag('div', '');
    copy.append(createTag('h3', '', item.title));
    copy.append(createTag('p', '', item.description));

    row.append(copy);
    target.append(row);
  });
};

const renderContacts = () => {
  const target = byData('contact-actions');
  if (!target) return;

  target.innerHTML = '';
  data.contacts.forEach((contact) => {
    const link = createTag('a', `button ${contact.variant}`, contact.label);
    link.href = contact.href;
    if (contact.href.startsWith('http')) {
      link.target = '_blank';
      link.rel = 'noreferrer';
    }
    target.append(link);
  });
};

const initPageLoader = () => {
  const loader = document.querySelector('[data-page-loader]');
  const bar = document.querySelector('[data-loader-bar]');
  const label = document.querySelector('[data-loader-progress]');
  const progress = loader?.querySelector('[role="progressbar"]');
  if (!loader || !bar || !label) return;

  let value = 0;
  let finished = false;
  const paint = () => {
    bar.style.width = `${value}%`;
    label.textContent = `${value}%`;
    progress?.setAttribute('aria-valuenow', String(value));
  };
  const tick = () => {
    if (finished || value >= 92) return;
    value += value < 60 ? 4 : 2;
    paint();
    window.setTimeout(tick, 55);
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    value = 100;
    paint();
    window.setTimeout(() => loader.classList.add('is-hidden'), 260);
  };
  tick();
  window.addEventListener('load', finish, { once: true });
  window.setTimeout(finish, 1500);
};

const initHeader = () => {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const sync = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  sync();
  window.addEventListener('scroll', sync, { passive: true });
};

const initNavigation = () => {
  const links = [...document.querySelectorAll('.site-nav a[href^="#"]')];
  const paintActive = (hash) => links.forEach((link) => {
    const active = link.getAttribute('href') === (hash || '#home');
    link.toggleAttribute('aria-current', active);
  });

  paintActive(window.location.hash || '#home');
  window.addEventListener('hashchange', () => paintActive(window.location.hash || '#home'));
  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const hash = link.getAttribute('href');
      paintActive(hash);
      window.history.replaceState(null, '', hash);
    });
  });
};

const initStrokeText = () => {
  const canvas = document.querySelector('[data-stroke-text]');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const text = 'UiKi';
  const strokeColor = '#A78BFA';
  const fillColor = '#f5f4f6';
  const drawDuration = 1600;
  const fillDelay = 200;
  const stagger = 50;
  const letterSpacing = -4;
  let letters = [];
  let width = 0;
  let height = 0;
  let frame = 0;

  const rebuild = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(240, Math.round(bounds.width));
    height = Math.max(120, Math.round(bounds.height));
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const fontSize = Math.min(128, height * 0.84, width * 0.29);
    context.font = `800 ${fontSize}px system-ui, sans-serif`;
    context.textBaseline = 'middle';
    const widths = [...text].map((letter) => context.measureText(letter).width);
    const totalWidth = widths.reduce((sum, letterWidth) => sum + letterWidth, 0) + letterSpacing * (text.length - 1);
    let x = (width - totalWidth) / 2;
    letters = [...text].map((letter, index) => {
      const item = { letter, x, width: widths[index], index };
      x += widths[index] + letterSpacing;
      return item;
    });
  };

  const draw = (time = 0) => {
    context.clearRect(0, 0, width, height);
    const elapsed = reducedMotion ? drawDuration + fillDelay : Math.min(time - startTime, drawDuration + 500);
    context.font = `800 ${Math.min(128, height * 0.84, width * 0.29)}px system-ui, sans-serif`;
    context.textBaseline = 'middle';
    letters.forEach(({ letter, x, width: letterWidth, index }) => {
      const progress = Math.max(0, Math.min(1, (elapsed - index * stagger) / drawDuration));
      const eased = 1 - Math.pow(1 - progress, 2);
      const fillProgress = Math.max(0, Math.min(1, (elapsed - index * stagger - fillDelay) / 550));
      context.save();
      context.lineWidth = 1.4;
      context.strokeStyle = strokeColor;
      context.globalAlpha = eased;
      context.strokeText(letter, x, height * 0.54);
      if (fillProgress > 0) {
        context.beginPath();
        context.rect(x - 4, 0, letterWidth * fillProgress + 8, height);
        context.clip();
        context.fillStyle = fillColor;
        context.globalAlpha = fillProgress;
        context.fillText(letter, x, height * 0.54);
      }
      context.restore();
    });
    if (!reducedMotion && elapsed < drawDuration + 500) frame = window.requestAnimationFrame(draw);
  };

  let startTime = 0;

  const render = () => {
    window.cancelAnimationFrame(frame);
    rebuild();
    startTime = performance.now();
    draw(reducedMotion ? drawDuration : 0);
  };

  if (window.ResizeObserver) new ResizeObserver(render).observe(canvas);
  else window.addEventListener('resize', render, { passive: true });
  render();
};

const initLightRays = () => {
  const canvas = document.querySelector('[data-light-rays]');
  const host = canvas?.closest('.hero-media');
  if (!canvas || !host) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
  let width = 0;
  let height = 0;
  let frame = 0;

  const resize = () => {
    const bounds = host.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  host.addEventListener('pointermove', (event) => {
    const bounds = host.getBoundingClientRect();
    pointer.targetX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    pointer.targetY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
  }, { passive: true });

  const draw = (time = 0) => {
    pointer.x += (pointer.targetX - pointer.x) * 0.1;
    pointer.y += (pointer.targetY - pointer.y) * 0.1;
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = 'screen';

    const originX = width * (0.5 + (pointer.x - 0.5) * 0.1);
    for (let index = -7; index <= 7; index += 1) {
      const ratio = index / 7;
      const wave = reducedMotion ? 0 : Math.sin(time * 0.0007 + index * 1.7) * width * 0.012;
      const startX = originX + index * width * 0.012;
      const endX = originX + ratio * width * 0.68 + wave + (pointer.x - 0.5) * width * 0.1;
      const rayWidth = width * (0.018 + (1 - Math.abs(ratio)) * 0.018);
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(224, 9, 227, 0.02)');
      gradient.addColorStop(0.28, 'rgba(224, 9, 227, 0.2)');
      gradient.addColorStop(0.82, 'rgba(167, 139, 250, 0.06)');
      gradient.addColorStop(1, 'rgba(224, 9, 227, 0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(startX - rayWidth * 0.24, 0);
      context.lineTo(startX + rayWidth * 0.24, 0);
      context.lineTo(endX + rayWidth, height * (1.05 + pointer.y * 0.08));
      context.lineTo(endX - rayWidth, height * (1.05 + pointer.y * 0.08));
      context.closePath();
      context.fill();
    }

    context.globalCompositeOperation = 'source-over';
    if (!reducedMotion) frame = window.requestAnimationFrame(draw);
  };

  const render = () => {
    window.cancelAnimationFrame(frame);
    resize();
    draw();
  };

  if (window.ResizeObserver) new ResizeObserver(render).observe(host);
  else window.addEventListener('resize', render, { passive: true });
  render();
};

const initClickSpark = () => {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  document.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;

    const spark = document.createElement('span');
    spark.className = 'click-spark';
    spark.style.left = `${event.clientX}px`;
    spark.style.top = `${event.clientY}px`;

    for (let index = 0; index < 8; index += 1) {
      const ray = document.createElement('i');
      ray.style.setProperty('--angle', `${index * 45}deg`);
      spark.append(ray);
    }

    document.body.append(spark);
    window.setTimeout(() => spark.remove(), 560);
  });
};

const initHeroInteraction = () => {
  const stage = document.querySelector('[data-hero-stage]');
  if (!stage) return;

  const faces = {
    normal: { face: '·ᴗ·', label: '平静陪伴', status: 'READY' },
    happy: { face: '^ᴗ^', label: '开心回应', status: 'HAPPY' },
    comfort: { face: '-ᴗ-', label: '安静安慰', status: 'COMFORT' },
    alert: { face: '!ᴗ!', label: '温柔提醒', status: 'ALERT' },
  };

  const paint = (mood) => {
    const state = faces[mood] || faces.normal;
    stage.dataset.mood = mood;
    const face = stage.querySelector('[data-hero-face]');
    const label = stage.querySelector('[data-hero-screen-label]');
    const status = stage.querySelector('[data-hero-device-status]');
    if (face) face.textContent = state.face;
    if (label) label.textContent = state.label;
    if (status) status.textContent = state.status;
    stage.querySelectorAll('[data-hero-mood]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.heroMood === mood));
    });
  };

  stage.querySelectorAll('[data-hero-mood]').forEach((button) => {
    button.addEventListener('click', () => paint(button.dataset.heroMood));
  });
  paint('normal');
};

const initDemoAuth = () => {
  const dialog = document.querySelector('[data-auth-dialog]');
  const form = document.querySelector('[data-auth-form]');
  if (!dialog || !form) return;
  const nameInput = form.querySelector('[data-auth-name]');
  const emailInput = form.querySelector('[data-auth-email]');
  const status = form.querySelector('[data-auth-status]');
  let saved = (() => {
    try { return JSON.parse(localStorage.getItem('uiki-demo-user') || 'null'); } catch { return null; }
  })();

  const open = () => {
    if (saved && nameInput && emailInput) {
      nameInput.value = saved.name || '';
      emailInput.value = saved.email || '';
    }
    dialog.showModal();
  };
  document.querySelectorAll('[data-auth-open]').forEach((button) => button.addEventListener('click', open));
  document.querySelector('[data-auth-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const user = { name: nameInput?.value.trim(), email: emailInput?.value.trim() };
    localStorage.setItem('uiki-demo-user', JSON.stringify(user));
    saved = user;
    if (status) status.textContent = `演示账号已保存：${user.name}`;
    window.setTimeout(() => { dialog.close(); document.querySelector('#ai')?.scrollIntoView({ behavior: 'smooth' }); }, 240);
  });
};

const init = () => {
  document.title = `${data.ownerName} | AI 情绪陪伴桌宠`;

  setText('owner-name', data.ownerName);
  setText('hero-kicker', data.hero.kicker);
  initStrokeText();
  initLightRays();
  setText('hero-copy', data.hero.copy);
  setText('about-primary', data.about.primary);
  setText('about-secondary', data.about.secondary);
  setText('avatar-initials', data.initials);
  setText('profile-name', data.ownerName);
  setText('profile-role', `${data.role} · ${data.location}`);
  setText('contact-copy', data.contactCopy);
  setText('footer-name', data.ownerName);
  setText('footer-year', `© ${new Date().getFullYear()}`);
  document.querySelectorAll('[data-version]').forEach((node) => { node.textContent = data.version || 'Uiki v1.0'; });

  renderStats();
  renderProjectStatus();
  renderProfile();
  renderServices();
  renderProjects();
  renderTimeline();
  renderContacts();
};

initPageLoader();
initHeader();
initNavigation();
initClickSpark();
initHeroInteraction();
initDemoAuth();
init();

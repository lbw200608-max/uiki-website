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

const initParticleText = () => {
  const canvas = document.querySelector('[data-particle-text]');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let particles = [];
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

    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    const maskContext = mask.getContext('2d');
    if (!maskContext) return;

    const fontSize = Math.min(height * 0.78, width * 0.27);
    maskContext.fillStyle = '#fff';
    maskContext.font = `900 ${fontSize}px system-ui, sans-serif`;
    maskContext.textBaseline = 'middle';
    const text = 'UiKi';
    const textWidth = maskContext.measureText(text).width;
    maskContext.fillText(text, (width - textWidth) / 2, height * 0.54);

    const pixels = maskContext.getImageData(0, 0, width, height).data;
    const targets = [];
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        if (pixels[(y * width + x) * 4 + 3] > 120) targets.push({ x, y });
      }
    }

    const stride = Math.max(1, Math.ceil(targets.length / 1800));
    particles = targets.filter((_, index) => index % stride === 0).map(({ x, y }) => ({
      x: x + (Math.random() - 0.5) * 34,
      y: y + (Math.random() - 0.5) * 34,
      targetX: x,
      targetY: y,
      phase: Math.random() * Math.PI * 2,
      size: 0.7 + Math.random() * 1.2,
    }));
  };

  const draw = (time = 0) => {
    context.clearRect(0, 0, width, height);
    particles.forEach((particle, index) => {
      particle.x += (particle.targetX - particle.x) * 0.08;
      particle.y += (particle.targetY - particle.y) * 0.08;
      const drift = reducedMotion ? 0 : Math.sin(time * 0.0016 + particle.phase) * 1.1;
      const alpha = 0.64 + (Math.sin(time * 0.002 + index) + 1) * 0.16;
      context.beginPath();
      context.fillStyle = index % 7 === 0 ? `rgba(255, 248, 255, ${alpha})` : `rgba(202, 181, 255, ${alpha})`;
      context.arc(particle.x + drift, particle.y + drift * 0.45, particle.size, 0, Math.PI * 2);
      context.fill();
    });
    if (!reducedMotion) frame = window.requestAnimationFrame(draw);
  };

  const render = () => {
    window.cancelAnimationFrame(frame);
    rebuild();
    draw();
  };

  if (window.ResizeObserver) new ResizeObserver(render).observe(canvas);
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
    form.classList.remove('is-authenticated');
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
    form.classList.add('is-authenticated');
    if (status) status.textContent = `登录成功：${user.email}`;
    window.setTimeout(() => { dialog.close(); document.querySelector('#ai')?.scrollIntoView({ behavior: 'smooth' }); }, 1000);
  });
};

const init = () => {
  document.title = `${data.ownerName} | AI 情绪陪伴桌宠`;

  setText('owner-name', data.ownerName);
  setText('hero-kicker', data.hero.kicker);
  initParticleText();
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

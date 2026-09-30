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

const initCircularText = () => {
  const canvas = document.querySelector('[data-circular-text]');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const text = 'UiKi*UiKi*UiKi*';
  const spinDuration = 20000;
  const chars = [...text];
  let width = 0;
  let height = 0;
  let angle = 0;
  let lastTime = performance.now();
  let hover = false;
  let frame = 0;

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(220, Math.round(bounds.width));
    height = Math.max(180, Math.round(bounds.height));
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const draw = (time = 0) => {
    const delta = time - lastTime;
    lastTime = time;
    if (!reducedMotion) angle += delta * (Math.PI * 2 / spinDuration) * (hover ? 4 : 1);
    context.clearRect(0, 0, width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.36;
    const fontSize = Math.max(14, Math.min(28, radius * 0.2));

    context.save();
    context.translate(centerX, centerY);
    context.font = `800 ${fontSize}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    chars.forEach((char, index) => {
      const currentAngle = angle + index / chars.length * Math.PI * 2 - Math.PI / 2;
      context.save();
      context.rotate(currentAngle);
      context.translate(0, -radius);
      context.rotate(Math.PI / 2);
      context.fillStyle = index % 3 === 0 ? '#f5f4f6' : '#cdb7ff';
      context.shadowColor = 'rgba(219, 1, 231, .72)';
      context.shadowBlur = 12;
      context.fillText(char, 0, 0);
      context.restore();
    });

    context.beginPath();
    context.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(167, 139, 250, .42)';
    context.lineWidth = 1;
    context.stroke();
    context.font = `900 ${Math.max(28, Math.min(54, radius * 0.45))}px system-ui, sans-serif`;
    context.fillStyle = '#f5f4f6';
    context.shadowColor = 'rgba(219, 1, 231, .58)';
    context.shadowBlur = 22;
    context.fillText('UiKi', 0, 0);
    context.restore();

    if (!reducedMotion) frame = window.requestAnimationFrame(draw);
  };

  canvas.addEventListener('pointerenter', () => { hover = true; });
  canvas.addEventListener('pointerleave', () => { hover = false; });

  const render = () => {
    window.cancelAnimationFrame(frame);
    resize();
    lastTime = performance.now();
    draw(lastTime);
  };

  if (window.ResizeObserver) new ResizeObserver(render).observe(canvas);
  else window.addEventListener('resize', render, { passive: true });
  render();
};

const initFerrofluid = () => {
  const canvas = document.querySelector('[data-ferrofluid]');
  const host = canvas?.closest('.hero-media-placeholder');
  if (!canvas || !host) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
  const blobs = [
    { x: .18, y: .16, radius: .28, scaleX: 1.1, scaleY: .72, phase: .2, color: 'rgba(67, 3, 73, .92)' },
    { x: .48, y: .04, radius: .34, scaleX: .8, scaleY: .64, phase: 1.1, color: 'rgba(219, 1, 231, .75)' },
    { x: .82, y: .2, radius: .3, scaleX: 1.16, scaleY: .66, phase: 2.5, color: 'rgba(46, 7, 64, .96)' },
    { x: .3, y: .58, radius: .34, scaleX: .74, scaleY: 1.12, phase: 3.2, color: 'rgba(219, 1, 231, .62)' },
    { x: .7, y: .55, radius: .27, scaleX: 1.18, scaleY: .72, phase: 4.1, color: 'rgba(67, 3, 73, .9)' },
    { x: .52, y: .92, radius: .4, scaleX: .9, scaleY: .56, phase: 5.2, color: 'rgba(46, 7, 64, .98)' },
  ];
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
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  host.addEventListener('pointermove', (event) => {
    const bounds = host.getBoundingClientRect();
    pointer.targetX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    pointer.targetY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
  }, { passive: true });
  host.addEventListener('pointerleave', () => {
    pointer.targetX = 0.5;
    pointer.targetY = 0.5;
  }, { passive: true });

  const draw = (time = 0) => {
    pointer.x += (pointer.targetX - pointer.x) * 0.1;
    pointer.y += (pointer.targetY - pointer.y) * 0.1;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#2e0740';
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'screen';

    blobs.forEach((blob, index) => {
      const flow = reducedMotion ? 0 : (time * 0.000035 * 0.5) % 1.35;
      const noise = reducedMotion ? 0 : Math.sin(time * 0.00045 + blob.phase) * 0.06;
      const distance = Math.hypot(pointer.x - blob.x, pointer.y - blob.y);
      const influence = Math.max(0, 1 - distance / 0.3) * 0.1;
      const centerX = width * (blob.x + (pointer.x - 0.5) * influence + noise * 0.3);
      const centerY = height * (((blob.y + flow + noise) % 1.35) - 0.14 + (pointer.y - 0.5) * influence);
      const radius = Math.min(width, height) * blob.radius;

      context.save();
      context.translate(centerX, centerY);
      context.rotate(noise * 1.8);
      context.scale(blob.scaleX, blob.scaleY);
      const gradient = context.createRadialGradient(0, 0, radius * 0.02, 0, 0, radius);
      gradient.addColorStop(0, blob.color);
      gradient.addColorStop(0.38, index % 2 ? 'rgba(219, 1, 231, .36)' : 'rgba(67, 3, 73, .5)');
      gradient.addColorStop(0.78, 'rgba(46, 7, 64, .34)');
      gradient.addColorStop(1, 'rgba(46, 7, 64, 0)');
      context.fillStyle = gradient;
      context.shadowColor = 'rgba(219, 1, 231, .34)';
      context.shadowBlur = radius * 0.28 * 2;
      context.beginPath();
      for (let point = 0; point <= 28; point += 1) {
        const radians = point / 28 * Math.PI * 2;
        const edgeNoise = 1 + Math.sin(radians * 3 + blob.phase + time * 0.00035) * 0.08;
        const x = Math.cos(radians) * radius * edgeNoise;
        const y = Math.sin(radians) * radius * edgeNoise;
        if (point === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.closePath();
      context.fill();
      context.lineWidth = Math.max(1, radius * 0.035);
      context.strokeStyle = 'rgba(244, 205, 255, .3)';
      context.stroke();
      context.restore();
    });

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
  initCircularText();
  initFerrofluid();
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

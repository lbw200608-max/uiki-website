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
    const radius = Math.min(width, height) * 0.42;
    const fontSize = Math.max(24, Math.min(46, radius * 0.34));

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

    context.font = `900 ${Math.max(42, Math.min(78, radius * 0.68))}px system-ui, sans-serif`;
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

const initAeroShards = () => {
  const canvas = document.querySelector('[data-aero-shards]');
  const host = canvas?.closest('.hero-media-placeholder');
  if (!canvas || !host) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const settings = {
    speed: 1,
    spread: 1,
    depth: 1,
    turbulence: 1,
    spin: 1,
    shardSize: 1.1,
    interactionRadius: 1.5,
    interactionStrength: 0.5,
    rippleIntensity: 1,
  };
  const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, active: false, hold: false };
  const ripples = [];
  const fullArcLookup = [
    0, .028092, .055939, .083892, .112291, .141449, .171637, .203033,
    .235650, .269282, .303537, .337982, .372308, .406392, .440263, .474026,
    .507794, .541636, .575553, .609470, .643257, .676761, .709855, .742465,
    .774594, .806319, .837790, .869218, .900862, .933020, .965991, 1,
  ];
  const shardRandom = (seed) => {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  };
  const shards = Array.from({ length: 360 }, (_, index) => {
    const seed = index + 1;
    const laneSeed = shardRandom(seed * 2.13);
    const depthSeed = shardRandom(seed * 4.71);
    return {
      seed,
      phase: shardRandom(seed * 1.37),
      lane: Math.sign(laneSeed * 2 - 1) * Math.pow(Math.abs(laneSeed * 2 - 1), 0.72),
      depth: depthSeed * 2 - 1,
      scale: 0.46 + shardRandom(seed * 7.21) * 0.58,
      roll: shardRandom(seed * 8.43) * Math.PI * 2,
      loose: shardRandom(seed * 9.87) > 0.92 ? 1 : 0,
    };
  });
  let width = 0;
  let height = 0;
  let frame = 0;
  let travelPhase = 0;
  let gatherAmount = 0;
  let previousTime = performance.now();

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const fract = (value) => value - Math.floor(value);
  const mix = (from, to, amount) => from + (to - from) * amount;

  const fullArc = (phase) => {
    const scaled = clamp(phase, 0, 0.999999) * 31;
    const index = Math.min(Math.floor(scaled), 30);
    return mix(fullArcLookup[index], fullArcLookup[index + 1], scaled - index);
  };

  // Same fullPath geometry as AeroShards: a horizontal curved stream, not a top-down fall.
  const fullPath = (phase, aspect) => {
    const pi = Math.PI;
    const t = fullArc(phase);
    const pathWidth = 2.44 * aspect;
    const x = mix(-aspect * 1.22, aspect * 1.22, t);
    const y = Math.sin((t * 1.72 - 0.2) * pi) * 0.54 + Math.sin(t * pi * 3) * 0.12;
    const dx = aspect * 2.44;
    const dy = Math.cos((t * 1.72 - 0.2) * pi) * 1.72 * pi * 0.54
      + Math.cos(t * pi * 3) * pi * 3 * 0.12;
    return { x, y, dx, dy, pathLength: Math.hypot(pathWidth, Math.sqrt(5)) };
  };

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
    pointer.active = true;
  }, { passive: true });
  host.addEventListener('pointerdown', () => {
    pointer.hold = true;
    ripples.push({ x: pointer.targetX, y: pointer.targetY, age: 0 });
  });
  host.addEventListener('pointerup', () => { pointer.hold = false; });
  host.addEventListener('pointerleave', () => {
    pointer.active = false;
    pointer.hold = false;
    pointer.targetX = 0.5;
    pointer.targetY = 0.5;
  }, { passive: true });
  window.addEventListener('pointerup', () => { pointer.hold = false; }, { passive: true });

  const draw = (time = 0) => {
    const elapsed = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
    previousTime = time;
    pointer.x += (pointer.targetX - pointer.x) * (1 - Math.exp(-elapsed * 26));
    pointer.y += (pointer.targetY - pointer.y) * (1 - Math.exp(-elapsed * 26));
    if (!reducedMotion) {
      const aspect = width / Math.max(height, 1);
      travelPhase = fract(travelPhase + (elapsed * settings.speed * 0.34) / fullPath(0, aspect).pathLength);
    }
    const gatherTarget = pointer.hold ? 1 : 0;
    gatherAmount += (gatherTarget - gatherAmount) * (1 - Math.exp(-elapsed * (pointer.hold ? 3.8 : 3.2)));
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#120F17';
    context.fillRect(0, 0, width, height);
    const seconds = time * 0.001;
    const aspect = width / Math.max(height, 1);
    const worldToPixel = (point) => ({
      x: width * (0.5 + point.x / (2.44 * aspect) * 0.92),
      y: height * (0.5 - point.y / 1.45),
    });

    shards.forEach((shard, index) => {
      const phase = fract(shard.phase + travelPhase);
      const path = fullPath(phase, aspect);
      const pixel = worldToPixel(path);
      const tangentX = path.dx * width / (2.44 * aspect) * 0.92;
      const tangentY = -path.dy * height / 1.45;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const tangent = { x: tangentX / tangentLength, y: tangentY / tangentLength };
      const normal = { x: -tangent.y, y: tangent.x };
      const widthProfile = 0.46 + Math.pow(Math.max(Math.sin(phase * Math.PI), 0), 0.72) * 0.54;
      const flowWave = Math.sin(phase * Math.PI * 12 + shard.depth * 6);
      const laneWorld = (shard.lane * 0.56 + flowWave * 0.055 * settings.turbulence)
        * settings.spread * widthProfile * (1 + shard.loose * 0.72);
      let x = pixel.x + normal.x * laneWorld * Math.min(width, height) * 0.34;
      let y = pixel.y + normal.y * laneWorld * Math.min(width, height) * 0.34;

      const depthLane = shard.depth * settings.depth + Math.cos(phase * Math.PI * 10 + shard.lane * 8) * 0.06 * settings.turbulence;
      const depthScale = mix(0.56, 1.58, clamp(depthLane * 0.31 + 0.5, 0, 1));
      const pointerX = pointer.x * width;
      const pointerY = pointer.y * height;
      const pointerDx = pointerX - x;
      const pointerDy = pointerY - y;
      const pointerDistance = Math.hypot(pointerDx, pointerDy);
      const interactionRadius = Math.min(width, height) * 0.28 * settings.interactionRadius;
      if (pointer.active && pointerDistance < interactionRadius) {
        const falloff = Math.exp(-0.28 * Math.pow(pointerDx / interactionRadius, 2) - 1.2 * Math.pow(pointerDy / interactionRadius, 2));
        const direction = pointer.hold ? -1 : 1;
        x -= normal.x * falloff * direction * settings.interactionStrength * 34;
        y -= normal.y * falloff * direction * settings.interactionStrength * 34;
      }

      if (gatherAmount > 0.001) {
        const angle = shard.phase * Math.PI * 2 + seconds * (0.3 + (shard.depth + 1) * 0.09);
        const gatherRadius = Math.sqrt(Math.max(shard.lane * shard.lane, 0.04));
        const targetX = pointerX + Math.cos(angle) * gatherRadius * 24;
        const targetY = pointerY + Math.sin(angle) * gatherRadius * 18;
        x = mix(x, targetX, gatherAmount * 0.72);
        y = mix(y, targetY, gatherAmount * 0.72);
      }

      const depth = clamp(0.74 + depthLane * 0.16 + Math.sin(shard.phase * 10 + seconds * 0.5) * 0.08, 0.42, 1.3);
      const scaleShape = shard.scale + Math.pow(shard.scale, 12) * 1.55;
      const length = (8 + scaleShape * 18) * depth * settings.shardSize;
      const shardWidth = (2.5 + scaleShape * 4.5) * depth * settings.shardSize;
      const rotation = Math.atan2(tangent.y, tangent.x) + shard.roll + seconds * settings.spin * (shard.depth > 0 ? 0.5 : -0.35);
      const alpha = clamp(0.48 + depth * 0.32, 0, 1);
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      const gradient = context.createLinearGradient(-length, 0, length, 0);
      gradient.addColorStop(0, `rgba(137, 106, 189, ${alpha * 0.12})`);
      gradient.addColorStop(0.52, index % 5 === 0 ? `rgba(168, 85, 247, ${alpha})` : `rgba(137, 106, 189, ${alpha * 0.78})`);
      gradient.addColorStop(1, `rgba(216, 190, 255, ${alpha * 0.12})`);
      context.fillStyle = gradient;
      context.shadowColor = 'rgba(168, 85, 247, .55)';
      context.shadowBlur = 6 + depth * 7;
      context.beginPath();
      context.moveTo(-length * 0.68, 0);
      context.lineTo(-length * 0.08, -shardWidth);
      context.lineTo(length * 0.74, -shardWidth * 0.38);
      context.lineTo(length, 0);
      context.lineTo(length * 0.3, shardWidth * 0.78);
      context.closePath();
      context.fill();
      context.restore();
    });

    ripples.forEach((ripple) => {
      ripple.age += reducedMotion ? 0 : elapsed;
      const progress = Math.min(1, ripple.age / 1.8);
      context.beginPath();
      context.arc(ripple.x * width, ripple.y * height, progress * Math.min(width, height) * 0.24, 0, Math.PI * 2);
      context.strokeStyle = `rgba(168, 85, 247, ${0.3 * (1 - progress) * settings.rippleIntensity})`;
      context.lineWidth = 2;
      context.stroke();
    });
    while (ripples.length && ripples[0].age >= 1.8) ripples.shift();
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
  initAeroShards();
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

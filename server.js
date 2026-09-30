const fs = require('fs');
const http = require('http');
const path = require('path');
const { randomUUID } = require('crypto');

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const deviceOfflineAfterMs = 90000;

const loadLocalEnv = () => {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;

    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
};

loadLocalEnv();

const dataDir = path.join(__dirname, 'data');
const deviceRegistryPath = path.join(dataDir, 'device-registry.json');
const defaultDeviceProfile = {
  deviceId: 'Uiki01',
  displayName: 'Uiki',
  roleName: 'UikiAI',
  type: '桌面陪伴机器人',
  owner: 'Liu',
  location: '',
  personality: '可以是无聊时的陪伴，也可以是忙碌时的安慰',
  userTitle: '主人',
  welcomeMessage: '你好呀，主人，我是Uiki',
  registeredAt: new Date().toISOString(),
};

const deviceProfileFields = [
  'deviceId',
  'displayName',
  'roleName',
  'type',
  'owner',
  'location',
  'personality',
  'userTitle',
  'welcomeMessage',
];

const normalizeDeviceProfile = (input = {}, fallback = defaultDeviceProfile) => {
  const profile = {};
  for (const field of deviceProfileFields) {
    const value = input[field];
    profile[field] = typeof value === 'string' ? value.trim() : (fallback[field] || '');
  }
  profile.registeredAt = input.registeredAt || fallback.registeredAt || new Date().toISOString();
  return profile;
};

const loadDeviceRegistry = () => {
  fs.mkdirSync(dataDir, { recursive: true });
  try {
    const parsed = JSON.parse(fs.readFileSync(deviceRegistryPath, 'utf8'));
    if (Array.isArray(parsed.devices) && parsed.devices.length > 0) {
      return {
        version: parsed.version || 1,
        activeDeviceId: parsed.activeDeviceId || parsed.devices[0].deviceId,
        devices: parsed.devices.map((device) => normalizeDeviceProfile(device)),
      };
    }
  } catch {
    // Initialize the local registry below.
  }

  const initial = { version: 1, activeDeviceId: defaultDeviceProfile.deviceId, devices: [defaultDeviceProfile] };
  fs.writeFileSync(deviceRegistryPath, JSON.stringify(initial, null, 2), 'utf8');
  return initial;
};

const saveDeviceRegistry = () => {
  fs.writeFileSync(deviceRegistryPath, JSON.stringify(deviceRegistry, null, 2), 'utf8');
};

const deviceRegistry = loadDeviceRegistry();
let activeDeviceId = deviceRegistry.activeDeviceId || defaultDeviceProfile.deviceId;
let activeDeviceProfile = deviceRegistry.devices.find((device) => device.deviceId === activeDeviceId);
if (!activeDeviceProfile) {
  activeDeviceProfile = defaultDeviceProfile;
  deviceRegistry.devices.push(activeDeviceProfile);
  deviceRegistry.activeDeviceId = activeDeviceProfile.deviceId;
  activeDeviceId = activeDeviceProfile.deviceId;
  saveDeviceRegistry();
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const deviceState = {
  ...activeDeviceProfile,
  firmware: null,
  ip: null,
  rssi: null,
  uptimeMs: 0,
  led: false,
  mode: 'idle',
  oledMood: 'offline',
  temperature: null,
  humidity: null,
  message: 'Waiting for ESP32-C3 telemetry',
  lastSeen: null,
  updatedAt: new Date().toISOString(),
};

const deviceCommand = {
  commandId: randomUUID(),
  led: false,
  ledPattern: 'hold',
  mode: 'idle',
  oledMood: 'normal',
  intervalMs: 2000,
  message: 'Stand by',
  updatedAt: new Date().toISOString(),
};

const history = [];
const aiHistory = [];

const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';
const aiConfig = {
  apiUrl: process.env.AI_API_URL || (apiKey ? 'https://api.openai.com/v1/chat/completions' : ''),
  apiKey,
  model: process.env.AI_MODEL || (apiKey ? 'gpt-4.1-mini' : ''),
};

const getAiSystemPrompt = () => [
  `你的名字是 ${activeDeviceProfile.roleName}，设备显示名是 ${activeDeviceProfile.displayName}。`,
  `你的性格是：${activeDeviceProfile.personality}。称呼用户为“${activeDeviceProfile.userTitle}”。`,
  `第一次欢迎语可以使用：“${activeDeviceProfile.welcomeMessage}”。`,
  '你是一个温和、简洁、可信的 AI 情感陪伴角色。',
  '请用中文回复，最多 120 个汉字。不要假装拥有真实情绪、身体或位置权限。',
  '只返回 JSON，不要 Markdown 代码块，格式为：',
  '{"reply":"给用户的回复","emotion":"normal|happy|comfort|alert","ledCommand":"none|led:on|led:off|led:blink"}',
  '只有在用户明确表达开心、难过、压力或需要提醒时才使用对应情绪和灯效。',
].join('\n');

const allowedOledMoods = new Set(['normal', 'happy', 'comfort', 'alert', 'thinking', 'listening', 'offline']);

const emotionToOledMood = {
  normal: 'normal',
  happy: 'happy',
  comfort: 'comfort',
  alert: 'alert',
};

const getAiMode = () => aiConfig.apiUrl && aiConfig.apiKey && aiConfig.model ? 'remote' : 'demo';

const normalizeAiResult = (value, originalMessage) => {
  const fallback = createDemoAiResult(originalMessage);
  if (!value || typeof value !== 'object') return fallback;

  const allowedEmotions = new Set(['normal', 'happy', 'comfort', 'alert']);
  const allowedLedCommands = new Set(['none', 'led:on', 'led:off', 'led:blink']);
  const reply = typeof value.reply === 'string' ? value.reply.trim().slice(0, 240) : '';
  const emotion = allowedEmotions.has(value.emotion) ? value.emotion : 'normal';
  const ledCommand = allowedLedCommands.has(value.ledCommand) ? value.ledCommand : 'none';

  return {
    reply: reply || fallback.reply,
    emotion,
    ledCommand,
  };
};

const createDemoAiResult = (message) => {
  const text = String(message || '').toLowerCase();
  if (/难过|伤心|委屈|压力|累|焦虑|烦/.test(text)) {
    return {
      reply: '我听到了。先慢一点，把现在最困扰你的事情告诉我，我陪你一起理清。',
      emotion: 'comfort',
      ledCommand: 'led:blink',
    };
  }
  if (/开心|高兴|成功|太棒|喜欢|快乐/.test(text)) {
    return {
      reply: '听起来这是一个值得开心的时刻。把这份好心情留一会儿吧。',
      emotion: 'happy',
      ledCommand: 'led:blink',
    };
  }
  if (/提醒|注意|危险|紧急|快点/.test(text)) {
    return {
      reply: '收到，我会把这条消息标记成提醒状态。',
      emotion: 'alert',
      ledCommand: 'led:on',
    };
  }
  return {
    reply: `我收到啦，${activeDeviceProfile.userTitle}。你可以和我说说今天发生了什么。`,
    emotion: 'normal',
    ledCommand: 'none',
  };
};

const parseAiResponse = (content, originalMessage) => {
  if (typeof content !== 'string') return createDemoAiResult(originalMessage);

  const trimmed = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    return normalizeAiResult(JSON.parse(trimmed), originalMessage);
  } catch {
    return normalizeAiResult({ reply: trimmed }, originalMessage);
  }
};

const requestRemoteAi = async (message) => {
  const messages = [
    { role: 'system', content: getAiSystemPrompt() },
    ...aiHistory.slice(-8),
    { role: 'user', content: message },
  ];

  const usesResponsesApi = /\/responses(?:$|\?)/i.test(aiConfig.apiUrl);
  const requestBody = usesResponsesApi
    ? {
        model: aiConfig.model,
        input: messages,
      }
    : {
        model: aiConfig.model,
        messages,
        temperature: 0.7,
      };

  const response = await fetch(aiConfig.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`AI provider HTTP ${response.status}`);
  }

  const payload = await response.json();
  const content = usesResponsesApi
    ? payload?.output_text
      || payload?.output
        ?.flatMap((item) => Array.isArray(item.content) ? item.content : [])
        .map((item) => item.text || item.value || '')
        .filter(Boolean)
        .join('\n')
    : payload?.choices?.[0]?.message?.content;
  return parseAiResponse(content, message);
};

const updateDeviceCommandFromAi = (result) => {
  const led = result.ledCommand === 'led:on'
    ? true
    : result.ledCommand === 'led:off'
      ? false
      : deviceCommand.led;

  Object.assign(deviceCommand, {
    commandId: randomUUID(),
    led,
    ledPattern: result.ledCommand === 'led:blink'
      ? 'blink'
      : result.ledCommand === 'led:on'
        ? 'on'
        : result.ledCommand === 'led:off'
          ? 'off'
          : 'hold',
    mode: result.emotion,
    oledMood: emotionToOledMood[result.emotion] || 'normal',
    message: result.reply.slice(0, 120),
    updatedAt: new Date().toISOString(),
  });
};

const setDeviceThinkingState = () => {
  Object.assign(deviceCommand, {
    commandId: randomUUID(),
    ledPattern: 'hold',
    mode: 'thinking',
    oledMood: 'thinking',
    message: `${activeDeviceProfile.displayName} 正在思考`,
    updatedAt: new Date().toISOString(),
  });
};

const getRequestBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });

const isDeviceOnline = () => {
  if (!deviceState.lastSeen) return false;
  return Date.now() - new Date(deviceState.lastSeen).getTime() < deviceOfflineAfterMs;
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': mimeTypes['.json'],
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(payload));
};

const sendFile = (res, filePath, statusCode = 200) => {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { status: 'not_found' });
      return;
    }

    const type = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(statusCode, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
    });
    res.end(content);
  });
};

const resolvePublicPath = (pathname) => {
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const filePath = path.resolve(publicDir, `.${requestedPath}`);
  const isInsidePublic = filePath === publicDir || filePath.startsWith(`${publicDir}${path.sep}`);

  return isInsidePublic ? filePath : null;
};

const handleApi = async (req, res, url) => {
  if (url.pathname === '/api/device/registry' && req.method === 'GET') {
    sendJson(res, 200, {
      status: 'ok',
      activeDeviceId,
      devices: deviceRegistry.devices,
    });
    return true;
  }

  if (url.pathname === '/api/device/register' && req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const requestedId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
      if (!requestedId) {
        sendJson(res, 400, { status: 'bad_request', message: 'deviceId is required' });
        return true;
      }

      const existing = deviceRegistry.devices.find((device) => device.deviceId === requestedId);
      const profile = normalizeDeviceProfile(body, existing || defaultDeviceProfile);
      if (existing) {
        Object.assign(existing, profile);
      } else {
        deviceRegistry.devices.push(profile);
      }

      activeDeviceId = profile.deviceId;
      activeDeviceProfile = profile;
      deviceRegistry.activeDeviceId = activeDeviceId;
      Object.assign(deviceState, profile, { updatedAt: new Date().toISOString() });
      saveDeviceRegistry();

      sendJson(res, 200, {
        status: 'registered',
        activeDeviceId,
        profile,
      });
    } catch {
      sendJson(res, 400, { status: 'bad_request', message: 'Expected a JSON device profile' });
    }
    return true;
  }

  if (url.pathname === '/api/device/status' && req.method === 'GET') {
    sendJson(res, 200, {
      status: 'ok',
      online: isDeviceOnline(),
      offlineAfterMs: deviceOfflineAfterMs,
      profile: activeDeviceProfile,
      device: deviceState,
      command: deviceCommand,
      history: history.slice(-20),
    });
    return true;
  }

  if (url.pathname === '/api/device/telemetry' && req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const now = new Date().toISOString();

      Object.assign(deviceState, {
        ...body,
        lastSeen: now,
        updatedAt: now,
      });

      history.push({
        at: now,
        rssi: deviceState.rssi ?? null,
        uptimeMs: deviceState.uptimeMs ?? null,
        temperature: deviceState.temperature ?? null,
        humidity: deviceState.humidity ?? null,
        led: Boolean(deviceState.led),
        mode: deviceState.mode || 'idle',
        oledMood: deviceState.oledMood || 'normal',
      });

      if (history.length > 60) history.shift();

      sendJson(res, 200, {
        status: 'accepted',
        online: true,
        command: deviceCommand,
      });
    } catch (error) {
      sendJson(res, 400, {
        status: 'bad_request',
        message: 'Expected a JSON telemetry payload',
      });
    }

    return true;
  }

  if (url.pathname === '/api/device/command' && req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      if (body.ifCommandId && body.ifCommandId !== deviceCommand.commandId) {
        sendJson(res, 200, { status: 'superseded', command: deviceCommand });
        return true;
      }
      if (body.oledMood !== undefined && !allowedOledMoods.has(body.oledMood)) {
        sendJson(res, 400, { status: 'bad_request', message: 'Unknown OLED expression' });
        return true;
      }
      const nextLed = typeof body.led === 'boolean' ? body.led : deviceCommand.led;
      const nextLedPattern = ['hold', 'on', 'off', 'blink'].includes(body.ledPattern)
        ? body.ledPattern
        : typeof body.led === 'boolean' ? (body.led ? 'on' : 'off') : 'hold';
      const nextMode = typeof body.mode === 'string' ? body.mode.slice(0, 32) : deviceCommand.mode;
      const nextOledMood = allowedOledMoods.has(body.oledMood) ? body.oledMood : deviceCommand.oledMood;
      const nextMessage =
        typeof body.message === 'string' ? body.message.slice(0, 120) : deviceCommand.message;
      const nextIntervalMs = Number.isFinite(Number(body.intervalMs))
        ? Math.max(1000, Math.min(60000, Number(body.intervalMs)))
        : deviceCommand.intervalMs;

      Object.assign(deviceCommand, {
        commandId: randomUUID(),
        led: nextLed,
        ledPattern: nextLedPattern,
        mode: nextMode,
        oledMood: nextOledMood,
        message: nextMessage,
        intervalMs: nextIntervalMs,
        updatedAt: new Date().toISOString(),
      });

      sendJson(res, 200, {
        status: 'updated',
        command: deviceCommand,
      });
    } catch (error) {
      sendJson(res, 400, {
        status: 'bad_request',
        message: 'Expected a JSON command payload',
      });
    }

    return true;
  }

  if (url.pathname === '/api/ai/status' && req.method === 'GET') {
    sendJson(res, 200, {
      status: 'ok',
      mode: getAiMode(),
      configured: getAiMode() === 'remote',
      model: getAiMode() === 'remote' ? aiConfig.model : null,
      historyLength: aiHistory.length,
    });
    return true;
  }

  if (url.pathname === '/api/ai/chat' && req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const message = typeof body.message === 'string' ? body.message.trim().slice(0, 240) : '';

      if (!message) {
        sendJson(res, 400, { status: 'bad_request', message: 'Message is required' });
        return true;
      }

      setDeviceThinkingState();

      let result;
      let mode = getAiMode();
      if (mode === 'remote') {
        try {
          result = await requestRemoteAi(message);
        } catch (error) {
          console.error(`[AI] remote provider failed: ${error.message}`);
          result = createDemoAiResult(message);
          mode = 'demo-fallback';
        }
      } else {
        result = createDemoAiResult(message);
      }

      aiHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: result.reply },
      );
      if (aiHistory.length > 24) aiHistory.splice(0, aiHistory.length - 24);

      updateDeviceCommandFromAi(result);

      sendJson(res, 200, {
        status: 'ok',
        mode,
        reply: result.reply,
        emotion: result.emotion,
        ledCommand: result.ledCommand,
        oledMood: deviceCommand.oledMood,
        command: deviceCommand,
      });
    } catch (error) {
      sendJson(res, 400, {
        status: 'bad_request',
        message: 'Expected a JSON message payload',
      });
    }

    return true;
  }

  return false;
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (url.pathname === '/health') {
    sendJson(res, 200, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      deviceOnline: isDeviceOnline(),
    });
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    const handled = await handleApi(req, res, url);
    if (!handled) {
      sendJson(res, 404, { status: 'not_found' });
    }
    return;
  }

  const filePath = resolvePublicPath(url.pathname);

  if (!filePath) {
    sendJson(res, 403, { status: 'forbidden' });
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(res, filePath);
      return;
    }

    if (path.extname(filePath)) {
      sendJson(res, 404, { status: 'not_found' });
      return;
    }

    sendFile(res, path.join(publicDir, 'index.html'));
  });
});

server.listen(port, () => {
  console.log(`Website running at http://localhost:${port}`);
  console.log(`Device API at http://localhost:${port}/api/device/status`);
  console.log(`Health check at http://localhost:${port}/health`);
});

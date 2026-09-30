const { randomUUID } = require('node:crypto');

const profile = {
  deviceId: 'Uiki01',
  displayName: 'Uiki',
  roleName: 'UikiAI',
  type: '桌面陪伴机器人',
  owner: 'Liu',
  personality: '可以是无聊时的陪伴，也可以是忙碌时的安慰',
  userTitle: '主人',
  welcomeMessage: '你好呀，主人，我是Uiki',
};

const aiHistory = [];
const command = {
  commandId: randomUUID(),
  led: false,
  ledPattern: 'hold',
  mode: 'idle',
  oledMood: 'normal',
  message: 'Stand by',
  updatedAt: new Date().toISOString(),
};

const device = {
  ...profile,
  online: false,
  lastSeen: null,
  temperature: null,
  humidity: null,
  updatedAt: new Date().toISOString(),
};

const moods = new Set(['normal', 'happy', 'comfort', 'alert', 'thinking', 'listening', 'offline']);
const json = (statusCode, payload) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(payload),
});

const readBody = (event) => {
  try { return event.body ? JSON.parse(event.body) : {}; } catch { return null; }
};

const systemPrompt = () => [
  `你的名字是 ${profile.roleName}，设备显示名是 ${profile.displayName}。`,
  `你的性格是：${profile.personality}。称呼用户为“${profile.userTitle}”。`,
  '你是一个温和、简洁、可信的中文 AI 情感陪伴角色。',
  '不要假装拥有真实情绪、身体、定位或传感器权限。',
  '不要回答实时天气、时间、位置等需要查询的数据，提醒用户使用设备信息面板。',
  '只返回 JSON，不要 Markdown 代码块：',
  '{"reply":"给用户的回复","emotion":"normal|happy|comfort|alert","ledCommand":"none|led:on|led:off|led:blink"}',
].join('\n');

const parseReply = (content) => {
  const text = String(content || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    const value = JSON.parse(text);
    return {
      reply: String(value.reply || text).slice(0, 240),
      emotion: ['normal', 'happy', 'comfort', 'alert'].includes(value.emotion) ? value.emotion : 'normal',
      ledCommand: ['none', 'led:on', 'led:off', 'led:blink'].includes(value.ledCommand) ? value.ledCommand : 'none',
    };
  } catch {
    return { reply: text.slice(0, 240), emotion: 'normal', ledCommand: 'none' };
  }
};

const callAi = async (message) => {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error('AI_API_KEY is not configured');

  const response = await fetch(process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://uiki.netlify.app',
      'X-Title': 'Uiki AI Companion',
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'openrouter/free',
      messages: [
        { role: 'system', content: systemPrompt() },
        ...aiHistory.slice(-8),
        { role: 'user', content: message },
      ],
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`AI provider HTTP ${response.status}`);
  const payload = await response.json();
  return parseReply(payload?.choices?.[0]?.message?.content);
};

const updateCommand = (result) => {
  command.commandId = randomUUID();
  command.led = result.ledCommand === 'led:on' ? true : result.ledCommand === 'led:off' ? false : command.led;
  command.ledPattern = result.ledCommand === 'led:blink' ? 'blink' : result.ledCommand === 'led:on' ? 'on' : result.ledCommand === 'led:off' ? 'off' : 'hold';
  command.mode = result.emotion;
  command.oledMood = result.emotion;
  command.message = result.reply.slice(0, 120);
  command.updatedAt = new Date().toISOString();
};

const route = (event) => {
  const pathname = new URL(event.rawUrl || `https://${event.headers.host || 'localhost'}${event.path}`).pathname;
  return pathname.replace(/^\/(?:api|\.netlify\/functions\/api)/, '') || '/';
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  const path = route(event);

  if (path === '/ai/status' && event.httpMethod === 'GET') {
    const configured = Boolean(process.env.AI_API_KEY);
    return json(200, { status: 'ok', mode: configured ? 'remote' : 'demo', configured, model: process.env.AI_MODEL || 'openrouter/free' });
  }

  if (path === '/ai/chat' && event.httpMethod === 'POST') {
    const body = readBody(event);
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 240) : '';
    if (!message) return json(400, { status: 'bad_request', message: 'Message is required' });

    try {
      const result = await callAi(message);
      aiHistory.push({ role: 'user', content: message }, { role: 'assistant', content: result.reply });
      if (aiHistory.length > 24) aiHistory.splice(0, aiHistory.length - 24);
      updateCommand(result);
      return json(200, { status: 'ok', mode: 'remote', ...result, oledMood: command.oledMood, command });
    } catch (error) {
      console.error('[AI]', error.message);
      return json(502, { status: 'error', message: 'AI 服务暂时不可用，请检查 API Key 或稍后重试' });
    }
  }

  if (path === '/device/status' && event.httpMethod === 'GET') {
    return json(200, { status: 'ok', online: device.online, profile, device, command, history: [] });
  }

  if (path === '/device/command' && event.httpMethod === 'POST') {
    const body = readBody(event);
    if (body?.oledMood !== undefined && !moods.has(body.oledMood)) return json(400, { status: 'bad_request', message: 'Unknown OLED expression' });
    if (typeof body?.led === 'boolean') command.led = body.led;
    if (moods.has(body?.oledMood)) command.oledMood = body.oledMood;
    command.commandId = randomUUID();
    command.updatedAt = new Date().toISOString();
    return json(200, { status: 'updated', command });
  }

  if (path === '/device/telemetry' && event.httpMethod === 'POST') {
    const body = readBody(event) || {};
    Object.assign(device, body, { online: true, lastSeen: new Date().toISOString(), updatedAt: new Date().toISOString() });
    return json(200, { status: 'accepted', online: true, command });
  }

  if (path === '/device/registry' && event.httpMethod === 'GET') {
    return json(200, { status: 'ok', activeDeviceId: profile.deviceId, devices: [profile] });
  }

  return json(404, { status: 'not_found' });
};

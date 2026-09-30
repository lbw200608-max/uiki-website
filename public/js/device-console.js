const apiBase = (window.DEVICE_API_BASE || window.SITE_DATA?.apiBase || '').replace(/\/+$/, '');
let commandDirty = false;
let commandRevision = 0;
let sendingCommand = false;

const getDeviceNode = (name) => document.querySelector(`[data-${name}]`);

const setDeviceText = (name, value) => {
  const node = getDeviceNode(name);
  if (node) node.textContent = value;
};

const formatNumber = (value, suffix = '') => {
  if (value === null || value === undefined || value === '') return '--';
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  return `${Math.round(number * 10) / 10}${suffix}`;
};

const formatUptime = (value) => {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return '--';

  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
};

const formatOledMood = (mood) => ({
  normal: '平静',
  happy: '开心',
  comfort: '安慰',
  alert: '提醒',
  thinking: '思考中',
  listening: '倾听中',
  offline: '离线',
}[mood] || (mood || '--'));

const formatTime = (value) => {
  if (!value) return '等待设备上报';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  return date.toLocaleString('zh-CN', { hour12: false });
};

const setOnlineState = (online) => {
  const node = getDeviceNode('device-online');
  if (!node) return;

  node.textContent = online ? '在线' : '离线';
  node.classList.toggle('online', online);
  node.classList.toggle('offline', !online);
};

const syncCommandForm = (command) => {
  const led = getDeviceNode('command-led');
  const mode = getDeviceNode('command-mode');
  const message = getDeviceNode('command-message');
  const interval = getDeviceNode('command-interval');

  if (led) led.checked = Boolean(command.led);
  if (mode && command.mode) mode.value = command.mode;
  if (message && typeof command.message === 'string') message.value = command.message;
  if (interval && command.intervalMs) interval.value = String(command.intervalMs);
};

const renderDeviceState = (payload, syncForm = true) => {
  const profile = payload.profile || payload.device || {};
  const device = payload.device || {};
  const command = payload.command || {};

  setOnlineState(Boolean(payload.online));
  setDeviceText('device-name', profile.displayName || 'Uiki');
  setDeviceText('device-role', profile.roleName || 'UikiAI');
  setDeviceText('device-type', profile.type || '桌面陪伴机器人');
  setDeviceText('device-owner', profile.owner || '未设置');
  setDeviceText('device-location', profile.location || '未设置');
  setDeviceText('device-user-title', profile.userTitle || '主人');
  setDeviceText('device-id', device.deviceId || profile.deviceId || 'Uiki01');
  setDeviceText('device-last-seen', formatTime(device.lastSeen));
  setDeviceText('device-ip', device.ip || '--');
  setDeviceText('device-rssi', formatNumber(device.rssi, ' dBm'));
  const oledStatus = !payload.online ? '设备离线' : device.oled === true
    ? `已连接（${device.oledAddress || 'I2C'}）` : device.oled === false ? '未检测到' : '固件未报告';
  const reportedMood = payload.online && device.oled === true ? formatOledMood(device.oledMood) : oledStatus;
  setDeviceText('device-oled', oledStatus);
  setDeviceText('device-oled-mood', reportedMood);
  setDeviceText('ai-device-expression', reportedMood);
  setDeviceText('device-uptime', formatUptime(device.uptimeMs));
  setDeviceText('device-temperature', formatNumber(device.temperature, ' °C'));
  setDeviceText('device-humidity', formatNumber(device.humidity, ' %'));

  if (syncForm && !commandDirty && !sendingCommand) syncCommandForm(command);
};

const fetchDeviceState = async () => {
  const revision = commandRevision;
  try {
    const response = await fetch(`${apiBase}/api/device/status`, {
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    renderDeviceState(payload, revision === commandRevision);
  } catch (error) {
    setOnlineState(false);
    setDeviceText('device-last-seen', 'API 未连接');
    setDeviceText('ai-device-expression', '设备接口未连接');
  }
};

const sendCommand = async () => {
  if (sendingCommand) return;
  sendingCommand = true;
  const revision = commandRevision;
  const sendButton = getDeviceNode('send-command');
  if (sendButton) sendButton.disabled = true;
  const led = getDeviceNode('command-led');
  const mode = getDeviceNode('command-mode');
  const message = getDeviceNode('command-message');
  const interval = getDeviceNode('command-interval');
  const result = getDeviceNode('command-result');

  const payload = {
    led: Boolean(led?.checked),
    mode: mode?.value || 'idle',
    message: message?.value || '',
    intervalMs: Number(interval?.value || 5000),
  };

  if (result) result.textContent = '正在发送...';

  try {
    const response = await fetch(`${apiBase}/api/device/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (revision === commandRevision) commandDirty = false;
    commandRevision += 1;

    if (result) {
      result.textContent = `指令已保存，等待设备下次上报时领取：${data.command.mode} / LED ${data.command.led ? '开' : '关'}`;
    }

    await fetchDeviceState();
  } catch (error) {
    if (result) result.textContent = '发送失败：API 未连接';
  } finally {
    sendingCommand = false;
    if (sendButton) sendButton.disabled = false;
  }
};

const initDeviceConsole = () => {
  const sendButton = getDeviceNode('send-command');
  if (!sendButton) return;

  ['command-led', 'command-mode', 'command-message', 'command-interval'].forEach((name) => {
    const node = getDeviceNode(name);
    const markDirty = () => { commandDirty = true; commandRevision += 1; };
    node?.addEventListener('input', markDirty);
    node?.addEventListener('change', markDirty);
  });
  sendButton.addEventListener('click', sendCommand);
  fetchDeviceState();
  window.setInterval(fetchDeviceState, 3000);
};

initDeviceConsole();

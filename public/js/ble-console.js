const BLE_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

let bleDevice = null;
let bleWriteCharacteristic = null;
let bleNotifyCharacteristic = null;
let bleDecoder = new TextDecoder();
let bleReceiveBuffer = '';
let blePendingCommand = null;
let bleResponseTimer = null;
let bleConnecting = false;
let bleGpioReady = false;

const getBleNode = (name) => document.querySelector(`[data-ble-${name}]`);

const setBleText = (name, value) => {
  const node = getBleNode(name);
  if (node) node.textContent = value;
};

const appendBleLog = (message) => {
  const node = getBleNode('log');
  if (!node) return;

  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const next = `[${time}] ${message}`;
  const lines = node.textContent === '等待蓝牙事件...' ? [] : node.textContent.split('\n');
  lines.push(next);
  node.textContent = lines.slice(-24).join('\n');
  node.scrollTop = node.scrollHeight;
};

const setBleStatus = (connected) => {
  const node = getBleNode('status');
  if (!node) return;

  node.textContent = connected ? '已连接' : '未连接';
  node.classList.toggle('online', connected);
  node.classList.toggle('offline', !connected);
};

const setBleButtons = (connected) => {
  const connect = getBleNode('connect');
  const disconnect = getBleNode('disconnect');
  const send = getBleNode('send');
  const info = getBleNode('info');
  const ledOn = getBleNode('led-on');
  const ledOff = getBleNode('led-off');
  const ledBlink = getBleNode('led-blink');

  if (connect) connect.disabled = connected || bleConnecting || !navigator.bluetooth;
  if (disconnect) disconnect.disabled = !connected;
  [send, info].forEach((button) => {
    if (button) button.disabled = !connected || Boolean(blePendingCommand);
  });
  [ledOn, ledOff, ledBlink].forEach((button) => {
    if (button) button.disabled = !connected || !bleGpioReady || Boolean(blePendingCommand);
  });
};

const finishBleCommand = () => {
  clearTimeout(bleResponseTimer);
  blePendingCommand = null;
  setBleButtons(Boolean(bleWriteCharacteristic));
};

const handleBleResponse = (value) => {
  appendBleLog(`设备回复：${value}`);
  if (value.startsWith('info:')) {
    const fields = Object.fromEntries(value.slice(5).split(',').map((field) => field.split('=')));
    bleGpioReady = fields.ledPin === '4' && fields.active === 'high' && fields.drive === 'weak-pullup';
    setBleText('pin', fields.ledPin ? `GPIO${fields.ledPin} / ${fields.active === 'high' ? '高' : '低'}电平有效` : '未知');
    setBleText('firmware', fields.firmware || '未知');
    setBleText('drive', fields.drive === 'weak-pullup' ? '内部弱上拉 / 微亮测试' : '非微亮测试固件，请先串联电阻');
    setBleText('output', fields.led === 'on' ? '设备报告：开启' : '设备报告：关闭');
    setBleButtons(Boolean(bleWriteCharacteristic));
  }
  if (value.startsWith('led:on,')) setBleText('output', '设备已执行：开启');
  if (value.startsWith('led:off,')) setBleText('output', '设备已执行：关闭');
  if (value.startsWith('led:blink,')) setBleText('output', '设备已启动：闪烁三次');

  const expected = blePendingCommand?.startsWith('message:') ? 'message:' : blePendingCommand;
  if (expected && (value.startsWith(expected) || value.startsWith('error:'))) {
    finishBleCommand();
  }
  if (value.startsWith('info:') && !bleGpioReady) {
    setBleText('result', '当前固件不是 GPIO4 内部弱上拉测试版本，请更新固件。');
  } else if (value === 'message:received') {
    setBleText('result', '设备已收到文字消息；LED 状态未改变。');
  } else {
    setBleText('result', `设备回复：${value}`);
  }
};

const handleBleNotification = (event) => {
  // BLE notifications can split a line or a UTF-8 character across packets.
  bleReceiveBuffer += bleDecoder.decode(event.target.value, { stream: true });
  const lines = bleReceiveBuffer.split('\n');
  bleReceiveBuffer = lines.pop();
  lines.filter(Boolean).forEach(handleBleResponse);
  if (bleReceiveBuffer.length > 2048) {
    bleReceiveBuffer = '';
    appendBleLog('设备回复过长，已清空接收缓冲区');
  }
};

const clearBleConnection = () => {
  bleNotifyCharacteristic?.removeEventListener('characteristicvaluechanged', handleBleNotification);
  bleDevice?.removeEventListener('gattserverdisconnected', handleBleDisconnected);
  bleWriteCharacteristic = null;
  bleNotifyCharacteristic = null;
  bleGpioReady = false;
  bleConnecting = false;
  bleDecoder = new TextDecoder();
  bleReceiveBuffer = '';
  setBleText('pin', '等待设备确认');
  setBleText('firmware', '等待设备确认');
  setBleText('drive', '等待设备确认');
  finishBleCommand();
};

const handleBleDisconnected = () => {
  clearBleConnection();
  setBleStatus(false);
  setBleButtons(false);
  setBleText('output', '未连接');
  setBleText('result', '蓝牙设备已断开');
  appendBleLog('设备已断开');
};

const sendBleCommand = async (command) => {
  if (blePendingCommand) return;
  if (!bleWriteCharacteristic) {
    setBleText('result', '请先连接蓝牙设备');
    return;
  }
  if (command.startsWith('led:') && !bleGpioReady) {
    setBleText('result', '请先读取信息，确认 GPIO4 微亮测试固件。');
    return;
  }

  blePendingCommand = command;
  setBleButtons(true);
  appendBleLog(`发送：${command}`);
  setBleText('result', '等待设备回复...');
  bleResponseTimer = setTimeout(() => {
    finishBleCommand();
    setBleText('result', '设备回复超时，请检查固件版本并重新连接。');
    appendBleLog('回复超时；未确认设备执行');
  }, 5000);
  try {
    const data = new TextEncoder().encode(command);
    if (bleWriteCharacteristic.writeValueWithResponse) {
      await bleWriteCharacteristic.writeValueWithResponse(data);
    } else {
      await bleWriteCharacteristic.writeValue(data);
    }
  } catch (error) {
    finishBleCommand();
    appendBleLog(`发送失败：${error.message}`);
    setBleText('result', '发送失败，请检查连接');
  }
};

const connectBle = async () => {
  if (bleConnecting || bleWriteCharacteristic) return;
  if (!navigator.bluetooth) {
    setBleText('support', '当前浏览器不支持 Web Bluetooth，请使用 Chrome 或 Edge 打开 localhost 页面。');
    setBleText('result', '浏览器不支持 Web Bluetooth');
    return;
  }

  bleConnecting = true;
  setBleButtons(false);
  try {
    setBleText('result', '正在搜索 BLE 设备，请在弹窗中选择 UikiAI-Uiki01');
    bleDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: [BLE_SERVICE_UUID] }],
      optionalServices: [BLE_SERVICE_UUID],
    });

    bleDevice.addEventListener('gattserverdisconnected', handleBleDisconnected);
    const server = await bleDevice.gatt.connect();
    const service = await server.getPrimaryService(BLE_SERVICE_UUID);
    bleWriteCharacteristic = await service.getCharacteristic(BLE_RX_UUID);
    bleNotifyCharacteristic = await service.getCharacteristic(BLE_TX_UUID);
    bleNotifyCharacteristic.addEventListener('characteristicvaluechanged', handleBleNotification);
    await bleNotifyCharacteristic.startNotifications();

    bleConnecting = false;
    setBleText('name', bleDevice.name || 'BLE 设备');
    setBleStatus(true);
    setBleButtons(true);
    setBleText('result', '蓝牙已连接');
    appendBleLog(`已连接：${bleDevice.name || 'BLE 设备'}`);
    await sendBleCommand('info');
  } catch (error) {
    clearBleConnection();
    if (bleDevice?.gatt?.connected) bleDevice.gatt.disconnect();
    setBleStatus(false);
    setBleButtons(false);
    setBleText('result', `连接失败：${error.message || '用户取消选择'}`);
    appendBleLog(`连接失败：${error.message || '用户取消选择'}`);
  }
};

const disconnectBle = () => {
  if (bleDevice?.gatt?.connected) bleDevice.gatt.disconnect();
  else handleBleDisconnected();
};

const sendBleInput = () => {
  const value = getBleNode('message')?.value.trim();
  if (!value) {
    setBleText('result', '请先输入消息或指令');
    return;
  }
  const normalized = value.toLowerCase().replace(/\s+/g, '').replace(/：/g, ':');
  const aliases = new Map([
    ['led开', 'led:on'], ['开灯', 'led:on'], ['led:on', 'led:on'],
    ['led关', 'led:off'], ['关灯', 'led:off'], ['led:off', 'led:off'],
    ['led闪烁', 'led:blink'], ['闪烁三次', 'led:blink'], ['led:blink', 'led:blink'],
  ]);
  return sendBleCommand(aliases.get(normalized) || `message:${value}`);
};

const initBleConsole = () => {
  const connect = getBleNode('connect');
  if (!connect) return;

  setBleButtons(false);
  if (navigator.bluetooth) {
    setBleText('support', '浏览器支持 Web Bluetooth。请先给 ESP32-C3 上电，再点击连接。');
  } else {
    setBleText('support', '当前浏览器不支持 Web Bluetooth，请使用 Chrome 或 Edge 打开 localhost 页面。');
    connect.disabled = true;
  }

  connect.addEventListener('click', connectBle);
  getBleNode('disconnect')?.addEventListener('click', disconnectBle);
  getBleNode('info')?.addEventListener('click', () => sendBleCommand('info'));
  getBleNode('led-on')?.addEventListener('click', () => sendBleCommand('led:on'));
  getBleNode('led-off')?.addEventListener('click', () => sendBleCommand('led:off'));
  getBleNode('led-blink')?.addEventListener('click', () => sendBleCommand('led:blink'));
  getBleNode('send')?.addEventListener('click', sendBleInput);
  getBleNode('message')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      sendBleInput();
    }
  });
};

initBleConsole();

(() => {
  const apiBase = (window.DEVICE_API_BASE || (window.SITE_DATA && window.SITE_DATA.apiBase) || '').replace(/\/+$/, '');
  const getNode = (name) => document.querySelector('[data-ai-' + name + ']');
  const setText = (name, value) => {
    const element = getNode(name);
    if (element) element.textContent = value;
  };

  const moodLabels = {
    normal: '平静',
    happy: '开心',
    comfort: '安慰',
    alert: '提醒',
    thinking: '思考',
    listening: '倾听',
    offline: '离线',
  };
  const ledLabels = {
    none: '保持当前状态',
    'led:on': 'LED 开',
    'led:off': 'LED 关',
    'led:blink': '闪烁三次',
  };

  let busy = false;
  let recognition = null;
  let voiceState = 'idle';
  let voiceHasResult = false;
  let voiceError = false;
  let listeningCommand = Promise.resolve(null);
  let selectedVoice = localStorage.getItem('uiki-voice') || 'gentle';
  const chatHistoryKey = 'uiki-ai-chat-history';
  let chatHistory = [];

  try {
    const saved = JSON.parse(localStorage.getItem(chatHistoryKey) || '[]');
    if (Array.isArray(saved)) {
      chatHistory = saved.filter((item) => (
        item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string'
      ));
    }
  } catch {
    chatHistory = [];
  }

  const voicePresets = {
    gentle: { label: '温柔', rate: 0.92, pitch: 1.08, keywords: ['xiaoxiao', 'yaoyao', '晓晓', '瑶瑶', '女'] },
    clear: { label: '清晰', rate: 1, pitch: 1, keywords: ['xiaoyi', '晓伊', 'tingting', '婷婷'] },
    steady: { label: '沉稳', rate: 0.88, pitch: 0.82, keywords: ['yunxi', 'yunyang', '云希', '云扬', '男'] },
    default: { label: '默认', rate: 1, pitch: 1, keywords: [] },
  };

  const post = async (path, body, timeout = 8000) => {
    const response = await fetch(apiBase + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  };

  const updateControls = () => {
    document.querySelectorAll('[data-ai-send], [data-ai-quick], [data-ai-face]').forEach((button) => {
      button.disabled = busy || voiceState !== 'idle';
    });
    const listen = getNode('listen');
    if (listen) listen.disabled = busy || !recognition || voiceState === 'starting';
  };

  const appendMessage = (role, content, persist = true) => {
    const list = getNode('messages');
    if (!list) return;
    const message = document.createElement('div');
    message.className = 'ai-message ' + role;
    const label = document.createElement('span');
    label.className = 'ai-message-role';
    label.textContent = role === 'user' ? '我' : 'UikiAI';
    const text = document.createElement('p');
    text.textContent = content;
    message.append(label, text);
    list.append(message);
    list.scrollTop = list.scrollHeight;
    if (persist) {
      chatHistory.push({ role, content });
      localStorage.setItem(chatHistoryKey, JSON.stringify(chatHistory));
    }
  };

  const restoreChatHistory = () => {
    const list = getNode('messages');
    if (!list || !chatHistory.length) return;
    list.innerHTML = '';
    chatHistory.forEach(({ role, content }) => appendMessage(role, content, false));
  };

  const updateStatus = (mode, configured) => {
    const status = getNode('status');
    if (status) {
      status.textContent = configured ? 'AI 已接入' : '演示模式';
      status.classList.toggle('online', configured);
      status.classList.toggle('offline', !configured);
    }
    setText('mode-detail', mode === 'remote' ? '真实 AI 已接入'
      : mode === 'demo-fallback' ? 'AI 服务异常，使用演示回复' : '本地演示模式');
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch(apiBase + '/api/ai/status', {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      updateStatus(data.mode, data.configured);
    } catch {
      updateStatus('demo', false);
      setText('mode-detail', 'AI 服务接口未连接');
    }
  };

  const getChineseVoices = () => (window.speechSynthesis?.getVoices() || [])
    .filter((voice) => /^zh[-_]/i.test(voice.lang) || /中文|Chinese/i.test(voice.name));

  const findVoice = (preset) => {
    const voices = getChineseVoices();
    if (!voices.length) return null;
    const keyword = preset.keywords.find((item) => voices.some((voice) => voice.name.toLowerCase().includes(item.toLowerCase())));
    return voices.find((voice) => keyword && voice.name.toLowerCase().includes(keyword.toLowerCase()))
      || voices.find((voice) => /^zh[-_]CN/i.test(voice.lang))
      || voices[0];
  };

  const updateVoiceButtons = () => {
    document.querySelectorAll('[data-ai-voice]').forEach((button) => {
      const active = button.dataset.aiVoice === selectedVoice;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const preset = voicePresets[selectedVoice] || voicePresets.gentle;
    const voice = window.speechSynthesis ? findVoice(preset) : null;
    const detail = voice ? `${preset.label} · ${voice.name}` : `${preset.label} · 浏览器默认中文声音`;
    setText('voice-name', detail);
  };

  const speakText = (content, force = false) => {
    const toggle = getNode('speak-toggle');
    if ((!force && (!toggle || !toggle.checked)) || !window.speechSynthesis || !window.SpeechSynthesisUtterance || !content) return;
    try {
      window.speechSynthesis.cancel();
      const speechContent = String(content)
        .replace(/UikiAI/gi, '优Ki AI')
        .replace(/Uiki/gi, '优Ki');
      const utterance = new window.SpeechSynthesisUtterance(speechContent);
      const preset = voicePresets[selectedVoice] || voicePresets.gentle;
      utterance.lang = 'zh-CN';
      utterance.rate = preset.rate;
      utterance.pitch = preset.pitch;
      const voice = findVoice(preset);
      if (voice) utterance.voice = voice;
      utterance.onerror = (event) => {
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          setText('voice-status', '朗读未成功，文字回复已保留');
        }
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      setText('voice-status', '朗读不可用，文字回复已保留');
    }
  };

  const speakReply = (content) => speakText(content);

  const selectVoice = (name) => {
    if (!voicePresets[name] || !window.speechSynthesis) return;
    selectedVoice = name;
    localStorage.setItem('uiki-voice', selectedVoice);
    updateVoiceButtons();
    setText('voice-status', `已切换为${voicePresets[name].label}声音，正在试听`);
    speakText('你好呀，主人，我是优Ki。', true);
  };

  const sendMessage = async (preset) => {
    if (busy) return;
    const input = getNode('input');
    const message = String(preset || (input && input.value) || '').trim();
    if (!message) {
      setText('result', '请先输入内容');
      if (input) input.focus();
      return;
    }

    busy = true;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (voiceState !== 'idle') {
      voiceHasResult = true;
      if (recognition) recognition.stop();
    }
    updateControls();
    appendMessage('user', message);
    if (input) input.value = '';
    setText('result', 'AI 正在思考...');
    setText('expression', '思考表情');

    try {
      await listeningCommand;
      const data = await post('/api/ai/chat', { message }, 35000);
      appendMessage('assistant', data.reply || '暂时没有收到回复，请重试。');
      setText('emotion', moodLabels[data.emotion] || '平静');
      setText('device-action', ledLabels[data.ledCommand] || '保持当前状态');
      setText('expression', (moodLabels[data.oledMood || data.emotion] || '平静') + '表情（已下发）');
      updateStatus(data.mode, data.mode === 'remote');
      setText('result', data.mode === 'remote' ? 'AI 已回复' : data.mode === 'demo-fallback' ? 'AI 服务异常，已使用演示回复' : '演示回复已完成');
      speakReply(data.reply);
    } catch (error) {
      setText('result', '发送失败：' + error.message);
      setText('expression', '未获得表情回复');
      if (input && !input.value) input.value = message;
    } finally {
      busy = false;
      updateControls();
    }
  };

  const sendFace = async (mood) => {
    if (busy || voiceState !== 'idle') return;
    busy = true;
    updateControls();
    setText('result', '正在发送' + (moodLabels[mood] || '平静') + '表情...');
    try {
      await post('/api/device/command', { oledMood: mood });
      setText('expression', (moodLabels[mood] || '平静') + '表情（已下发）');
      setText('result', '表情指令已保存，等待设备领取');
    } catch (error) {
      setText('result', '表情发送失败：' + error.message);
    } finally {
      busy = false;
      updateControls();
    }
  };

  const initVoice = () => {
    const toggle = getNode('speak-toggle');
    if (toggle) {
      toggle.disabled = !window.speechSynthesis || !window.SpeechSynthesisUtterance;
      if (toggle.disabled) toggle.checked = false;
      toggle.addEventListener('change', () => {
        if (!toggle.checked && window.speechSynthesis) window.speechSynthesis.cancel();
      });
    }

    document.querySelectorAll('[data-ai-voice]').forEach((button) => {
      button.addEventListener('click', () => selectVoice(button.dataset.aiVoice));
    });
    updateVoiceButtons();
    window.speechSynthesis?.addEventListener('voiceschanged', updateVoiceButtons);

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition || !window.isSecureContext) {
      setText('voice-status', '当前浏览器无法语音识别，请用文字输入');
      updateControls();
      return;
    }

    recognition = new Recognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.addEventListener('start', () => {
      voiceState = 'listening';
      setText('listen', '停止录音');
      setText('voice-status', '正在听，请说话...');
      setText('expression', '倾听表情');
      updateControls();
      listeningCommand = post('/api/device/command', { oledMood: 'listening' })
        .then((data) => data.command && data.command.commandId)
        .catch(() => null);
    });

    recognition.addEventListener('result', (event) => {
      const transcript = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0].transcript)
        .join('')
        .trim();
      if (!transcript || voiceHasResult) return;
      voiceHasResult = true;
      if (getNode('input')) getNode('input').value = transcript;
      setText('voice-status', '语音已识别，正在请求 AI...');
      sendMessage(transcript);
    });

    recognition.addEventListener('error', (event) => {
      voiceError = true;
      const messages = {
        'not-allowed': '麦克风权限未允许，请在浏览器中开启',
        'service-not-allowed': '浏览器语音识别服务不可用，请使用文字输入',
        'audio-capture': '未检测到可用麦克风',
        network: '语音识别服务连接失败，请使用文字输入',
        'no-speech': '没有听清，请再试一次',
        aborted: '录音已取消',
      };
      setText('voice-status', messages[event.error] || '语音识别失败：' + event.error);
    });

    recognition.addEventListener('end', () => {
      voiceState = 'idle';
      setText('listen', '开始说话');
      if (!voiceError && !voiceHasResult) setText('voice-status', '未识别到文字，请重试');
      updateControls();
      if (!voiceHasResult) {
        listeningCommand.then((commandId) => {
          if (commandId) post('/api/device/command', { oledMood: 'normal', ifCommandId: commandId }).catch(() => {});
        });
      }
    });

    getNode('listen')?.addEventListener('click', () => {
      if (busy) return;
      if (voiceState === 'listening') {
        recognition.stop();
        return;
      }
      if (voiceState !== 'idle') return;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      voiceHasResult = false;
      voiceError = false;
      voiceState = 'starting';
      setText('voice-status', '正在打开电脑麦克风...');
      updateControls();
      try {
        recognition.start();
      } catch {
        voiceState = 'idle';
        setText('voice-status', '麦克风启动失败，请重试或使用文字输入');
        updateControls();
      }
    });
    updateControls();
  };

  if (!getNode('send')) return;
  restoreChatHistory();
  getNode('send').addEventListener('click', () => sendMessage());
  getNode('input')?.addEventListener('keydown', (event) => {
    if (!event.isComposing && voiceState === 'idle' && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      sendMessage();
    }
  });
  document.querySelectorAll('[data-ai-quick]').forEach((button) => {
    button.addEventListener('click', () => sendMessage(button.dataset.aiQuick));
  });
  document.querySelectorAll('[data-ai-face]').forEach((button) => {
    button.addEventListener('click', () => sendFace(button.dataset.aiFace));
  });
  initVoice();
  fetchStatus();
})();

window.SITE_DATA = {
  // 本地开发留空；部署到 Netlify 后，把它改成公网 API 地址。
  apiBase: '',
  ownerName: 'Uiki',
  initials: 'UK',
  version: 'Uiki v1.0',
  role: 'AI 情绪陪伴桌宠原型',
  location: '大学生个人项目',
  availability: 'Prototype / v1.0',
  hero: {
    kicker: 'AI COMPANION / HARDWARE PROJECT',
    title: 'UiKi',
    copy:
      'Uiki 是一个面向年轻人的方形桌面陪伴设备。它用 AI 对话、OLED 表情和灯光，把温柔陪伴放到你的桌面上。',
  },
  about: {
    primary:
      'Uiki 从学习 AI、ESP32 和硬件开发开始，也来自一个很简单的想法：让陪伴不只停留在手机聊天窗口里。',
    secondary:
      '第一版先把 ESP32-C3、蓝牙、OLED、LED 和 AI 文字聊天跑通。未来再加入语音、音乐、情侣绑定和经过授权的位置服务。',
  },
  profile: [
    ['定位', 'AI 情绪陪伴桌宠'],
    ['阶段', '原型展示版'],
    ['重点', '陪伴、表达、连接'],
  ],
  stats: [
    { value: 'OLED', label: '会表达' },
    { value: 'AI Chat', label: '会陪伴' },
    { value: 'BLE + Wi-Fi', label: '会连接' },
    { value: 'Uiki v1.0', label: '原型版本' },
  ],
  projectStatus: {
    stage: '原型展示版',
    phase: '硬件与网站闭环',
    progress: 48,
    summary:
      'ESP32-C3 联网、OLED 表情、LED、蓝牙和 AI 文字聊天已经跑通。下一步是信息显示、语音输入和语音回复。',
    milestones: [
      { label: 'ESP32 + OLED', detail: '联网、表情、LED、蓝牙测试', status: 'done' },
      { label: 'AI 文字陪伴', detail: '网页演示、情绪和表情映射', status: 'done' },
      { label: '时间与天气', detail: '加入设备信息面板', status: 'next' },
      { label: '语音交互', detail: '网站和实体设备双端接入', status: 'next' },
    ],
    nextSteps: [
      '加入时间、天气、温度信息面板',
      '接入 INMP441 和 MAX98357，完成语音闭环',
      '设计情侣绑定和 VIP 功能预览',
    ],
  },
  services: [
    {
      title: '角色陪伴',
      description: '为每个手办设计角色人格、语气、记忆和情绪反馈，让它不只是会亮灯，而是有稳定的陪伴感。',
    },
    {
      title: '联网互动',
      description: '通过 Wi-Fi 和蓝牙实现设备配网、状态上报、灯效控制、触摸响应和 App 指令下发。',
    },
    {
      title: '情侣绑定',
      description: '为两个手办建立成对 ID，支持互相关心、状态同步、纪念日提醒和经过授权的位置共享。',
    },
  ],
  projects: [
    {
      title: 'AI 情感陪伴手办',
      description: '把手办、联网芯片、云端 AI 和移动 App 组合成一个可互动的陪伴产品原型。',
      tags: ['AI 角色', '智能硬件', '情感陪伴'],
    },
    {
      title: '情侣 ID 绑定系统',
      description: '每个设备拥有唯一编号，两个用户可以互相确认绑定，形成成对互动关系。',
      tags: ['设备 ID', '账号系统', '双向确认'],
    },
    {
      title: '位置与状态共享',
      description: '通过 App 获取用户授权的位置，再用网页或 App 展示彼此状态，硬件端只做轻量反馈。',
      tags: ['位置授权', '隐私控制', 'App'],
    },
  ],
  timeline: [
    {
      date: '现在',
      title: '概念和本地原型',
      description: '完成项目展示页、ESP32-C3 控制台、本地 HTTP API 和设备接入示例。',
    },
    {
      date: '明天到货后',
      title: '点亮硬件闭环',
      description: '先完成烧录、Wi-Fi 连接、LED 控制、按钮或触摸输入，再接入网页控制台。',
    },
    {
      date: '后续',
      title: 'App、AI 和绑定系统',
      description: '开发 App、账号系统、设备 ID、情侣绑定、位置授权和云端 AI 对话服务。',
    },
  ],
  contacts: [
    { label: '发送邮件', href: 'mailto:lbw200608@qq.com', variant: 'primary' },
    { label: '微信 / 电话', href: 'tel:+8618249397767', variant: 'secondary' },
  ],
  contactCopy:
    'Uiki 先作为大学生个人项目持续迭代。每一步都先做成能体验的原型，再决定下一步产品化方向。',
};

const APP_NAME = 'NanSafe';
const WATER_DATA_ENDPOINT = '/api/waterlevel?province=55';
const WATER_DATA_SOURCE = 'https://nan.thaiwater.net/wl';
const WATER_REFRESH_MS = 5 * 60 * 1000;

function readStorage(key, fallback = '') {
  try {
    return typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem(key) ?? fallback
      : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(key, value);
  } catch (error) {
    // Private browsing and restricted storage should not prevent the app from rendering.
  }
}

const scenarios = [
  {
    key: 'normal', icon: '✓', label: 'ปกติ', place: 'อ.ปัว',
    hero: 'ตอนนี้ยังไม่มีภัยที่กระทบพื้นที่ของคุณ',
    timing: 'ติดตามสถานการณ์ได้ตามปกติ',
    actionTitle: 'ตอนนี้คุณทำอะไรได้บ้าง',
    actionText: 'ยังไม่มีเหตุฉุกเฉินในพื้นที่ของคุณ แต่สามารถเตรียมตัวล่วงหน้าได้',
    actions: ['ตรวจรายชื่อจุดปลอดภัยใกล้บ้าน', 'เตรียมเบอร์โทรฉุกเฉินไว้ในโทรศัพท์', 'เปิดการแจ้งเตือนเพื่อรับข่าวเฉพาะพื้นที่'],
    water: 1.86, rise: '+0.02 ม.', waterStatus: 'ปกติ', stationRisk: 'normal', gauge: '35%',
    riskText: 'ไม่มีภัยที่กระทบ', nearby: 'สถานการณ์ปกติ', flood: false,
    alertTitle: 'สถานการณ์ปกติในพื้นที่ของคุณ', alertText: 'NanSafe ยังเฝ้าระวังข้อมูลฝนและระดับน้ำอย่างต่อเนื่อง', alertSymbol: '✓'
  },
  {
    key: 'watch', icon: '!', label: 'เฝ้าระวัง', place: 'อ.ปัว',
    hero: 'มีฝนตกหนักในพื้นที่ต้นน้ำ ควรติดตามสถานการณ์ใกล้ชิด',
    timing: 'อาจมีผลกระทบใน 2–4 ชั่วโมง',
    actionTitle: 'เตรียมตัวไว้ก่อน',
    actionText: 'ฝนในพื้นที่ต้นน้ำเพิ่มขึ้น ระดับน้ำยังไม่อันตราย แต่มีแนวโน้มสูงขึ้น',
    actions: ['ชาร์จโทรศัพท์และเตรียม Power Bank', 'เตรียมยา เอกสารสำคัญ และไฟฉาย', 'อย่าเข้าใกล้ลำน้ำหรือขับรถผ่านทางน้ำไหล'],
    water: 2.58, rise: '+0.18 ม.', waterStatus: 'เฝ้าระวัง', stationRisk: 'watch', gauge: '51%',
    riskText: 'ฝนหนักต้นน้ำ', nearby: 'ระดับน้ำเพิ่มขึ้น', flood: false,
    alertTitle: 'ฝนตกหนักในพื้นที่ต้นน้ำ', alertText: 'โปรดติดตามสถานการณ์ และเตรียมของจำเป็นไว้ใกล้ตัว', alertSymbol: '🌧️'
  },
  {
    key: 'prepare', icon: '!', label: 'เตรียมพร้อม', place: 'อ.ปัว',
    hero: 'ความเสี่ยงเพิ่มขึ้น ควรเตรียมพร้อมออกจากพื้นที่หากได้รับแจ้ง',
    timing: 'คาดการณ์ผลกระทบภายใน 60–90 นาที',
    actionTitle: 'เตรียมออกจากพื้นที่',
    actionText: 'ระดับน้ำเพิ่มเร็วและดินในพื้นที่อิ่มน้ำ ควรเตรียมตัวตามแผนของครอบครัว',
    actions: ['พาผู้สูงอายุ เด็ก และผู้ป่วยเตรียมพร้อม', 'ย้ายของจำเป็นและเอกสารขึ้นที่สูง', 'ตรวจเส้นทางไปจุดปลอดภัยก่อนออกเดินทาง'],
    water: 3.04, rise: '+0.37 ม.', waterStatus: 'เตรียมพร้อม', stationRisk: 'prepare', gauge: '64%',
    riskText: 'ความเสี่ยงเพิ่มขึ้น', nearby: 'น้ำเพิ่มเร็ว', flood: false,
    alertTitle: 'เตรียมพร้อมรับน้ำป่าไหลหลาก', alertText: 'ความเสี่ยงสูงขึ้นจากฝนสะสมและระดับน้ำต้นน้ำที่เพิ่มเร็ว', alertSymbol: '⚠️'
  },
  {
    key: 'danger', icon: '!', label: 'อันตราย', place: 'อ.ปัว',
    hero: 'พื้นที่ที่คุณอยู่มีความเสี่ยงน้ำป่าไหลหลาก หลีกเลี่ยงริมน้ำและพื้นที่ลาดชัน',
    timing: 'คาดการณ์ผลกระทบภายใน 30–60 นาที',
    actionTitle: 'ดำเนินการตอนนี้',
    actionText: 'มีรายงานน้ำเพิ่มเร็วจากต้นน้ำและเริ่มพบพื้นที่น้ำท่วมขัง ระบบแนะนำให้เตรียมอพยพ',
    actions: ['ห้ามข้ามน้ำหรือเดินผ่านทางน้ำไหล', 'ออกจากพื้นที่ลุ่มต่ำและริมลำน้ำ', 'เปิดเส้นทางปลอดภัยและเตรียมไปยังจุดอพยพ'],
    water: 3.41, rise: '+0.61 ม.', waterStatus: 'เสี่ยงน้ำท่วม', stationRisk: 'danger', gauge: '76%',
    riskText: 'เสี่ยงน้ำป่าไหลหลาก', nearby: 'พบพื้นที่น้ำท่วม', flood: true,
    alertTitle: 'พื้นที่ของคุณมีความเสี่ยงสูง', alertText: 'หลีกเลี่ยงลำน้ำและเตรียมไปยังจุดปลอดภัยที่ใกล้ที่สุด', alertSymbol: '🚨'
  },
  {
    key: 'evacuate', icon: '→', label: 'อพยพ', place: 'อ.ปัว',
    hero: 'ออกจากพื้นที่ทันที ไปยังจุดปลอดภัยตามเส้นทางที่แนะนำ',
    timing: 'คำแนะนำเร่งด่วน: ไป Safe Zone ที่ใกล้ที่สุด',
    actionTitle: 'อพยพทันที',
    actionText: 'มีภัยคุกคามต่อชีวิตในพื้นที่เสี่ยง ให้พาผู้สูงอายุ เด็ก และผู้ป่วยออกจากพื้นที่ก่อน',
    actions: ['ไปจุดปลอดภัยที่กำหนดตามเส้นทางแนะนำ', 'ห้ามข้ามน้ำ ใช้เส้นทางที่ระบบแจ้งเท่านั้น', 'หากติดอยู่หรือมีผู้บาดเจ็บ ให้กดขอความช่วยเหลือทันที'],
    water: 3.76, rise: '+0.84 ม.', waterStatus: 'อันตรายมาก', stationRisk: 'evacuate', gauge: '91%',
    riskText: 'อพยพออกจากพื้นที่', nearby: 'เหตุฉุกเฉิน', flood: true,
    alertTitle: 'อพยพออกจากพื้นที่ทันที', alertText: 'ใช้เส้นทางที่ระบบแนะนำไปยังจุดปลอดภัย ห้ามใช้ถนนที่มีน้ำท่วม', alertSymbol: '🆘'
  }
];

const state = {
  page: 'home',
  scenarioIndex: Number(readStorage('nansafe-scenario', '1')),
  mapLayers: { districts: true, river: true, flood: true, stations: true, safe: true, route: true },
  alertFilter: 'all',
  boundary: null,
  districts: [],
  waterData: [],
  waterLoading: true,
  waterError: '',
  waterUpdatedAt: null,
  waterSource: WATER_DATA_SOURCE,
  position: null,
  area: 'อ.ปัว จ.น่าน',
  checklist: JSON.parse(readStorage('nansafe-checklist', '{}') || '{}')
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const activeScenario = () => scenarios[state.scenarioIndex];

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function nowText() {
  return new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()) + ' น.';
}

function statusClass(key) {
  return ['normal', 'watch', 'prepare', 'danger', 'evacuate'].includes(key) ? key : 'watch';
}

function scenarioName(key) {
  return scenarios.find(s => s.key === key)?.label || 'เฝ้าระวัง';
}

function demoStrip() {
  if (state.waterData.length && !state.waterError) {
    return `<div class="demo-strip live-strip" role="status"><span class="demo-dot live-dot" aria-hidden="true"></span><span><strong>ข้อมูลระดับน้ำสด</strong> เชื่อมต่อ ThaiWater แล้ว · อัปเดต ${escapeHTML(formatWaterTime(state.waterUpdatedAt))} · <a href="${WATER_DATA_SOURCE}" target="_blank" rel="noreferrer">ดูแหล่งข้อมูล</a></span></div>`;
  }
  return `<div class="demo-strip" role="status"><span class="demo-dot" aria-hidden="true"></span><span><strong>โหมดสาธิต</strong> ${state.waterError ? 'เชื่อมข้อมูลสดไม่ได้ชั่วคราว จึงแสดงข้อมูลสำรองเพื่อให้แอปใช้งานต่อได้' : 'กำลังเชื่อมต่อข้อมูลระดับน้ำจริง'} </span></div>`;
}

function formatWaterTime(value) {
  if (!value) return 'กำลังโหลด';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stationName(record) {
  return record?.station?.tele_station_name?.th || record?.station?.tele_station_name?.en || 'สถานีวัดระดับน้ำ';
}

function stationLevel(record) {
  return numberValue(record?.waterlevel_msl ?? record?.waterlevel_m);
}

function stationBank(record) {
  return numberValue(record?.station?.min_bank);
}

function stationGround(record) {
  return numberValue(record?.station?.ground_level);
}

function stationGap(record) {
  const level = stationLevel(record);
  const bank = stationBank(record);
  return level !== null && bank !== null ? bank - level : numberValue(record?.diff_wl_bank);
}

function stationTrend(record) {
  const level = stationLevel(record);
  const previous = numberValue(record?.waterlevel_msl_previous);
  const delta = level !== null && previous !== null ? level - previous : null;
  if (delta === null || Math.abs(delta) < 0.005) return { key: 'steady', label: 'ทรงตัว', delta: 0, icon: '→' };
  return delta > 0
    ? { key: 'up', label: 'เพิ่มขึ้น', delta, icon: '↗' }
    : { key: 'down', label: 'ลดลง', delta, icon: '↘' };
}

function stationStatus(record) {
  const level = stationLevel(record);
  const bank = stationBank(record);
  const gap = stationGap(record);
  if (level !== null && bank !== null && level >= bank) return { key: 'danger', label: 'น้ำล้นตลิ่ง' };
  if (gap !== null && gap <= 0.5) return { key: 'danger', label: 'ใกล้ล้นตลิ่ง' };
  if (gap !== null && gap <= 1.5) return { key: 'prepare', label: 'น้ำมาก' };
  if (gap !== null && gap <= 3) return { key: 'watch', label: 'เฝ้าระวัง' };
  return { key: 'normal', label: 'น้ำปกติ' };
}

function primaryWaterStation() {
  return state.waterData.find(record => stationName(record).includes('น้ำขว้าง') || record?.geocode?.amphoe_name?.th === 'ปัว') || state.waterData[0] || null;
}

function liveWaterRecords() {
  return state.waterData.length ? state.waterData : [];
}

function homeTemplate() {
  const s = activeScenario();
  const directionButton = s.key === 'evacuate' ? 'ไปจุดปลอดภัย' : s.key === 'danger' || s.key === 'prepare' ? 'ดูเส้นทางปลอดภัย' : 'ดูสิ่งที่ควรทำ';
  return `
    ${demoStrip()}
    <article class="hero-status" data-risk="${s.key}" aria-labelledby="home-title">
      <div class="hero-topline">
        <span class="status-place">📍 ${escapeHTML(state.area)}</span>
        <span class="refresh-note">อัปเดต ${nowText()}</span>
      </div>
      <div class="status-identity">
        <span class="status-icon" aria-hidden="true">${s.icon}</span>
        <div><h1 id="home-title">${s.label}</h1><p>สถานะพื้นที่ของคุณ</p></div>
      </div>
      <p class="hero-message">${s.hero}</p>
      <span class="hero-timing">◷ ${s.timing}</span>
      <div class="hero-actions">
        <button type="button" class="button" data-action="open-route">${directionButton}</button>
        <button type="button" class="button button-secondary" data-action="navigate" data-page="map">ดูแผนที่</button>
      </div>
    </article>

    <section class="section">
      <article class="card action-card" data-risk="${s.key}">
        <h2>${s.actionTitle}</h2>
        <p>${s.actionText}</p>
        <ul class="action-list">${s.actions.map(action => `<li>${action}</li>`).join('')}</ul>
      </article>
    </section>

    <section class="section">
      <div class="section-title-row"><h2 class="section-title">ฉันอยู่ตรงไหน และรอบตัวเป็นอย่างไร</h2><button class="text-link" type="button" data-action="navigate" data-page="map">ดูแผนที่เต็ม</button></div>
      <article class="card map-preview">${mapSvg({ compact: true })}${mapOverlayControls({ compact: true })}<div class="map-meta"><span class="map-pill map-user">● พื้นที่ของฉัน</span><span class="map-pill">${s.flood ? 'พื้นที่น้ำท่วมถูกแสดงบนแผนที่' : 'ยังไม่พบพื้นที่น้ำท่วมใกล้คุณ'}</span></div><div class="map-key"><span class="key-item"><i class="key-symbol key-water"></i>ลำน้ำ</span><span class="key-item"><i class="key-symbol key-risk"></i>พื้นที่เสี่ยง</span><span class="key-item"><i class="key-symbol key-safe"></i>จุดปลอดภัย</span></div></article>
    </section>

    <section class="section">
      <div class="section-title-row"><h2 class="section-title">สถานีวัดระดับน้ำใกล้คุณ</h2><button type="button" class="text-link" data-action="show-station">รายละเอียด</button></div>
      ${waterCard()}
    </section>

    <section class="section">
      <h2 class="section-title">สถานการณ์ใกล้ฉัน</h2>
      <div class="card nearby-list">
        ${nearbyItem('🌧️', 'ฝน', s.key === 'normal' ? 'ฝนเล็กน้อย' : s.key === 'watch' ? 'ฝนตกหนักในพื้นที่ต้นน้ำ' : 'ฝนตกหนักต่อเนื่อง', s.key === 'normal' ? 'ปกติ' : s.key === 'watch' ? 'เฝ้าระวัง' : 'ติดตามใกล้ชิด', s.key === 'normal' ? '' : 'warning')}
        ${nearbyItem('💧', 'แม่น้ำน่าน — สถานีปัว', `ระดับน้ำ ${s.water.toFixed(2)} ม. เพิ่มขึ้น ${s.rise}`, s.waterStatus, s.key === 'normal' ? '' : s.key === 'danger' || s.key === 'evacuate' ? 'danger' : 'warning')}
        ${nearbyItem('🌊', 'พื้นที่น้ำท่วม', s.flood ? 'พบพื้นที่น้ำท่วมขังในเขตเฝ้าระวัง' : 'ยังไม่พบพื้นที่น้ำท่วมที่ยืนยันได้', s.flood ? 'ดูแผนที่' : 'ไม่มีเหตุการณ์', s.flood ? 'danger' : '')}
        ${nearbyItem('⛰️', 'ดินถล่ม', s.key === 'danger' || s.key === 'evacuate' ? 'หลีกเลี่ยงพื้นที่ลาดชันและดินอิ่มน้ำ' : 'ไม่มีรายงานเหตุการณ์ใกล้คุณ', s.key === 'danger' || s.key === 'evacuate' ? 'เฝ้าระวัง' : 'ปกติ', s.key === 'danger' || s.key === 'evacuate' ? 'warning' : '')}
      </div>
    </section>

    <section class="section">
      <article class="card location-card"><h2>ตรวจสอบพื้นที่ของฉัน</h2><p>ใช้ตำแหน่งโทรศัพท์ หรือเลือกอำเภอและตำบลเพื่อรับสถานะที่ตรงกับพื้นที่</p><div class="location-actions"><button type="button" class="button button-outline button-small" data-action="use-location">ใช้ตำแหน่งของฉัน</button><button type="button" class="button button-outline button-small" data-action="choose-area">เลือกพื้นที่เอง</button></div></article>
    </section>
  `;
}

function nearbyItem(icon, title, text, status, statusType) {
  return `<article class="nearby-item"><span class="nearby-icon" aria-hidden="true">${icon}</span><div><h3>${title}</h3><p>${text}</p></div><span class="nearby-status ${statusType}">${status}</span></article>`;
}

function waterCard() {
  const s = activeScenario();
  const record = primaryWaterStation();
  if (!record) {
    return `<article class="card water-card"><div class="water-header"><div><h3>💧 สถานีวัดระดับน้ำจังหวัดน่าน</h3><p>กำลังโหลดข้อมูลจาก ThaiWater…</p></div><span class="station-chip">กำลังโหลด</span></div><div class="loading-line" aria-label="กำลังโหลดข้อมูล"></div><p class="helper">หากเชื่อมต่อไม่ได้ ระบบจะแสดงข้อมูลสำรองและลองใหม่อัตโนมัติ</p></article>`;
  }
  const level = stationLevel(record) ?? s.water;
  const bank = stationBank(record);
  const gap = stationGap(record);
  const ground = stationGround(record);
  const trend = stationTrend(record);
  const status = stationStatus(record);
  const progress = bank !== null && ground !== null && bank > ground ? Math.max(3, Math.min(100, ((level - ground) / (bank - ground)) * 100)) : Math.max(3, Math.min(100, level / 300 * 100));
  const chipClass = status.key === 'normal' ? 'style="background:var(--green-soft);color:var(--green)"' : status.key === 'watch' ? 'style="background:var(--yellow-soft);color:var(--yellow)"' : status.key === 'prepare' ? 'style="background:var(--orange-soft);color:var(--orange)"' : 'style="background:var(--red-soft);color:var(--red)"';
  const gapText = gap === null ? 'ไม่ทราบระยะถึงตลิ่ง' : gap >= 0 ? `เหลืออีก ${gap.toFixed(2)} ม. ถึงตลิ่ง` : `เกินตลิ่ง ${Math.abs(gap).toFixed(2)} ม.`;
  return `<article class="card water-card">
    <div class="water-header"><div><h3>💧 ${escapeHTML(stationName(record))}</h3><p>${escapeHTML(record?.geocode?.amphoe_name?.th ? `ต.${record.geocode.tumbon_name?.th || '-'} อ.${record.geocode.amphoe_name.th} จ.น่าน` : 'จังหวัดน่าน')} · ${escapeHTML(record?.river_name || 'ลำน้ำ')}</p></div><span class="station-chip" ${chipClass}>${status.label}</span></div>
    <div class="water-figure"><div><div class="water-number">${level.toFixed(2)} <span>ม.รทก.</span></div><div class="water-trend trend-${trend.key}">${trend.icon} ${trend.label} ${Math.abs(trend.delta).toFixed(2)} ม.</div></div><div class="gauge-wrap" style="flex:1"><div class="gauge live-gauge" style="--gauge-position:${progress}%"></div><div class="gauge-labels"><span>ระดับพื้นน้ำ</span><span>ระดับปัจจุบัน</span><span>ตลิ่ง</span></div></div></div>
    <div class="water-gap"><strong>${escapeHTML(gapText)}</strong>${bank !== null ? `<span>ตลิ่ง ${bank.toFixed(2)} ม.รทก.</span>` : ''}</div>
    <div class="water-source-line"><span>อัปเดต ${escapeHTML(formatWaterTime(record.waterlevel_datetime || state.waterUpdatedAt))}</span><span>ทั้งหมด ${state.waterData.length} สถานี</span></div>
    <div style="margin-top:14px"><button type="button" class="button button-outline button-small" data-action="show-station">ดูระดับน้ำเทียบตลิ่งและแนวโน้ม</button></div>
  </article>`;
}

function stationList() {
  if (!state.waterData.length) return '<article class="card station-list-empty"><p>กำลังโหลดสถานีจาก ThaiWater…</p></article>';
  return `<div class="card station-list">${state.waterData.map(record => {
    const status = stationStatus(record);
    const trend = stationTrend(record);
    const level = stationLevel(record);
    const gap = stationGap(record);
    return `<button type="button" class="station-list-row" data-action="show-station" data-station-id="${record.station?.id || ''}"><span class="station-list-icon status-${status.key}">💧</span><span class="station-list-main"><strong>${escapeHTML(stationName(record))}</strong><small>อ.${escapeHTML(record?.geocode?.amphoe_name?.th || '-')} · ${escapeHTML(record?.river_name || 'ลำน้ำ')}</small></span><span class="station-list-value"><strong>${level === null ? '-' : level.toFixed(2)} ม.</strong><small class="trend-${trend.key}">${trend.icon} ${trend.label}${gap === null ? '' : ` · ถึงตลิ่ง ${gap.toFixed(2)} ม.`}</small></span><span class="station-list-chevron">›</span></button>`;
  }).join('')}</div>`;
}

function mapTemplate() {
  const s = activeScenario();
  return `
    ${demoStrip()}
    <div class="page-heading"><div><h1 id="map-title">แผนที่สถานการณ์</h1><p>จังหวัดน่าน · แสดงข้อมูลตามพื้นที่ที่เลือก</p></div><button class="button button-outline button-small" type="button" data-action="use-location">⌖ ตำแหน่งฉัน</button></div>
    <div class="map-toolbar" aria-label="ตัวควบคุมแผนที่">
      <button class="filter-button" type="button" data-action="open-layers">☷ ชั้นข้อมูล</button>
      <button class="filter-button is-on" type="button" data-action="set-scenario" data-index="${(state.scenarioIndex + 1) % scenarios.length}">▣ สาธิต: ${s.label}</button>
      <button class="filter-button" type="button" data-action="open-route">↗ จุดปลอดภัย</button>
    </div>
    <section class="map-page" aria-label="แผนที่จังหวัดน่าน">
      <div class="map-canvas">
        ${mapSvg({ compact: false })}
        ${mapOverlayControls({ compact: false })}
        <div class="map-float-card"><h2>${s.label} · ${s.riskText}</h2><p>${s.flood ? 'มีพื้นที่น้ำท่วมและเส้นทางที่ควรหลีกเลี่ยง กดจุดปลอดภัยเพื่อดูทางไป' : 'แตะสถานีวัดน้ำหรือจุดปลอดภัยบนแผนที่เพื่อดูรายละเอียด'}</p></div>
        <div class="map-tools-bottom"><button class="map-round-button" type="button" data-action="open-layers" aria-label="เปิดชั้นข้อมูล">☷</button><button class="map-round-button" type="button" data-action="use-location" aria-label="ใช้ตำแหน่งของฉัน">⌖</button></div>
      </div>
    </section>
    <section class="section"><div class="section-title-row"><h2 class="section-title">สถานีวัดระดับน้ำในจังหวัดน่าน</h2><span class="live-count">${state.waterData.length ? `สด ${state.waterData.length} สถานี` : 'กำลังโหลด'}</span></div>${stationList()}</section>
    <section class="section"><article class="card layer-panel"><h2>สิ่งที่แสดงบนแผนที่</h2><div class="layer-options">
      ${layerRow('districts', '▦', 'ขอบเขตอำเภอ', `${state.districts.length || 15} อำเภอของน่าน`)}
      ${layerRow('river', '~~~', 'แม่น้ำและลำน้ำ', 'แนวลำน้ำ')}
      ${layerRow('flood', '◒', 'พื้นที่น้ำท่วม', s.flood ? 'ข้อมูลจำลอง' : 'ไม่มีพื้นที่แสดง')}
      ${layerRow('stations', '●', 'สถานีวัดน้ำ', 'แตะเพื่อดูข้อมูล')}
      ${layerRow('safe', '◆', 'จุดปลอดภัย', 'Safe Zone')}
      ${layerRow('route', '↗', 'เส้นทางแนะนำ', 'หลีกเลี่ยงพื้นที่เสี่ยง')}
    </div></article>
    <article class="card legend"><h2>คำอธิบายสัญลักษณ์</h2><div class="legend-items"><span class="legend-item"><i class="legend-swatch flood"></i>พื้นที่น้ำท่วม</span><span class="legend-item"><i class="legend-swatch station"></i>สถานีวัดน้ำ</span><span class="legend-item"><i class="legend-swatch safe"></i>จุดปลอดภัย</span><span class="legend-item"><i class="legend-swatch route"></i>เส้นทางแนะนำ</span></div></article></section>
  `;
}

function layerRow(layer, icon, name, detail) {
  return `<label class="layer-option"><input type="checkbox" data-action="toggle-layer" data-layer="${layer}" ${state.mapLayers[layer] ? 'checked' : ''}><span aria-hidden="true">${icon}</span><span>${name}</span><small>${detail}</small></label>`;
}

function alertsTemplate() {
  const s = activeScenario();
  const notifications = currentAlerts();
  const visible = state.alertFilter === 'all' ? notifications : notifications.filter(item => item.type === state.alertFilter);
  return `
    ${demoStrip()}
    <div class="page-heading"><div><h1 id="alerts-title">แจ้งเตือน</h1><p>ข่าวสารสำคัญสำหรับพื้นที่ที่คุณติดตาม</p></div></div>
    <div class="alert-filter" role="tablist" aria-label="ตัวกรองแจ้งเตือน">
      ${alertFilter('all', 'ทั้งหมด')}${alertFilter('risk', 'สถานการณ์')}${alertFilter('weather', 'ฝนและอากาศ')}${alertFilter('community', 'รายงานชุมชน')}
    </div>
    <section class="timeline" aria-label="ลำดับการแจ้งเตือน">
      ${visible.length ? visible.map(alert => `<article class="timeline-item" data-risk="${alert.risk}"><div class="card"><h3>${alert.symbol} ${alert.title}</h3><p>${alert.text}</p><time>${alert.time}</time>${alert.action ? `<button type="button" class="text-link" style="margin-top:9px" data-action="${alert.action}">${alert.actionText}</button>` : ''}</div></article>`).join('') : '<p>ไม่มีแจ้งเตือนในหมวดนี้</p>'}
    </section>
    <section class="section"><article class="card location-card"><h2>รับแจ้งเตือนเฉพาะพื้นที่</h2><p>ตั้งพื้นที่บ้าน ครอบครัว หรือเส้นทางที่ต้องการติดตาม แล้วเปิด Web Push หรือเชื่อม LINE OA ในระบบจริง</p><button class="button button-outline button-small" type="button" data-action="notification-settings">ตั้งค่าการแจ้งเตือน</button></article></section>
  `;
}

function alertFilter(key, label) {
  return `<button type="button" class="filter-pill ${state.alertFilter === key ? 'is-active' : ''}" data-action="filter-alerts" data-filter="${key}" role="tab" aria-selected="${state.alertFilter === key}">${label}</button>`;
}

function currentAlerts() {
  const s = activeScenario();
  const station = primaryWaterStation();
  const stationLevelText = station && stationLevel(station) !== null ? stationLevel(station).toFixed(2) : s.water.toFixed(2);
  const stationTrendText = station ? `${stationTrend(station).label} ${Math.abs(stationTrend(station).delta).toFixed(2)} ม.` : `${s.rise} ใน 30 นาที`;
  const base = [
    { type: 'weather', risk: s.key === 'normal' ? 'normal' : 'watch', symbol: '🌧️', title: s.key === 'normal' ? 'สภาพอากาศทั่วไป' : 'ฝนตกหนักในพื้นที่ต้นน้ำ', text: s.key === 'normal' ? 'ยังไม่มีประกาศเฝ้าระวังในพื้นที่ที่คุณเลือก' : 'มีฝนตกหนักในพื้นที่ต้นน้ำ โปรดติดตามสถานการณ์อย่างใกล้ชิด', time: 'วันนี้ · 18:35 น.', action: 'navigate-map', actionText: 'ดูบนแผนที่' },
    { type: 'risk', risk: s.key, symbol: s.alertSymbol, title: s.alertTitle, text: s.alertText, time: `วันนี้ · ${nowText()}`, action: s.key === 'normal' ? 'open-preparedness' : 'open-route', actionText: s.key === 'normal' ? 'ดูวิธีเตรียมตัว' : 'ดูเส้นทางปลอดภัย' },
    { type: 'community', risk: s.flood ? 'danger' : 'watch', symbol: '📸', title: s.flood ? 'รายงานชุมชน: น้ำท่วมขังในพื้นที่เฝ้าระวัง' : 'รายงานชุมชน: ฝนตกต่อเนื่อง', text: s.flood ? 'รายงานนี้อยู่ระหว่างการตรวจสอบร่วมกับข้อมูลสถานีตรวจวัด' : 'ข้อมูลรายงานจากประชาชนยังไม่ใช่ประกาศทางการ', time: 'วันนี้ · 18:21 น.', action: 'open-report', actionText: 'แจ้งเหตุในพื้นที่' },
    { type: 'risk', risk: station ? stationStatus(station).key : 'watch', symbol: '💧', title: station ? `สถานีวัดระดับน้ำ — ${stationName(station)}` : 'สถานีวัดระดับน้ำ — ปัว', text: `ระดับน้ำ ${stationLevelText} ม. แนวโน้ม ${stationTrendText}`, time: station ? formatWaterTime(station.waterlevel_datetime) : 'วันนี้ · 18:10 น.', action: 'show-station', actionText: 'ดูข้อมูลสถานี' }
  ];
  return base;
}

function emergencyTemplate() {
  return `
    <section class="emergency-hero" aria-labelledby="emergency-title"><h1 id="emergency-title">🆘 ขอความช่วยเหลือ</h1><p>หากอยู่ในอันตรายหรือช่วยเหลือตัวเองไม่ได้ เลือกเหตุการณ์เพื่อเตรียมข้อมูลให้เจ้าหน้าที่</p></section>
    <section class="emergency-grid" aria-label="ประเภทเหตุฉุกเฉิน">
      ${emergencyType('💧', 'น้ำท่วม', 'flood')}${emergencyType('🌊', 'น้ำป่า', 'flash-flood')}${emergencyType('⛰️', 'ดินถล่ม', 'landslide')}${emergencyType('🏥', 'มีผู้บาดเจ็บ', 'injury')}${emergencyType('🚨', 'ติดอยู่ในพื้นที่', 'trapped')}${emergencyType('✎', 'แจ้งเหตุอื่น', 'other')}
    </section>
    <section class="section"><div class="section-title-row"><h2 class="section-title">ส่งตำแหน่งของฉัน</h2></div><article class="card location-card"><h2>${state.position ? 'พร้อมใช้ตำแหน่งของคุณ' : 'เพิ่มตำแหน่งเพื่อให้ช่วยเหลือได้เร็วขึ้น'}</h2><p>${state.position ? `ตำแหน่งที่บันทึก: ${state.position.label}` : 'ระบบจะขอใช้ตำแหน่งโทรศัพท์เฉพาะเมื่อคุณกดปุ่ม และจะแสดงข้อมูลก่อนส่งเสมอ'}</p><div class="location-actions"><button type="button" class="button button-warm button-small" data-action="use-location">⌖ ใช้ตำแหน่งของฉัน</button><button type="button" class="button button-outline button-small" data-action="choose-area">เลือกพื้นที่เอง</button></div></article></section>
    <section class="section"><h2 class="section-title">โทรขอความช่วยเหลือ</h2><div class="card contact-list">
      ${contactRow('191', 'เหตุด่วนเหตุร้าย', 'แจ้งเหตุฉุกเฉินที่ต้องการตำรวจ')}
      ${contactRow('1669', 'การแพทย์ฉุกเฉิน', 'ผู้บาดเจ็บหรือเจ็บป่วยฉุกเฉิน')}
      ${contactRow('199', 'ดับเพลิงและกู้ภัย', 'เหตุอัคคีภัยหรือกู้ภัย')}
      ${contactRow('1784', 'สาธารณภัย', 'ขอความช่วยเหลือด้านสาธารณภัย')}
    </div><p class="helper" style="margin:10px 2px 0">หมายเหตุ: ข้อมูลเบอร์โทรเป็นตัวอย่างในต้นแบบ ต้องตรวจสอบกับหน่วยงานทางการก่อนใช้งานจริง</p></section>
    <section class="section"><article class="card action-card" data-risk="watch"><h2>📸 แจ้งเหตุในพื้นที่</h2><p>ช่วยให้ชุมชนเห็นสถานการณ์เร็วขึ้น รายงานจะผ่านการตรวจสอบก่อนเผยแพร่</p><div style="margin-top:12px"><button type="button" class="button button-outline button-small" data-action="open-report">แจ้งเหตุพร้อมรูปและตำแหน่ง</button></div></article></section>
  `;
}

function emergencyType(icon, label, type) {
  return `<button type="button" class="emergency-type" data-action="open-emergency-type" data-type="${type}"><span aria-hidden="true">${icon}</span><span>${label}</span></button>`;
}

function contactRow(number, title, desc) {
  return `<article class="contact-item"><span class="contact-number">${number}</span><div><h3>${title}</h3><p>${desc}</p></div><a class="call-button" href="tel:${number}" aria-label="โทร ${number} ${title}">โทร</a></article>`;
}

function moreTemplate() {
  return `
    <div class="page-heading"><div><h1 id="more-title">เพิ่มเติม</h1><p>เตรียมพร้อมและตั้งค่าการใช้งาน</p></div></div>
    <section class="more-grid">
      ${moreCard('🧰', 'เตรียมตัวรับภัย', 'Checklist สำหรับครอบครัว', 'open-preparedness')}
      ${moreCard('◆', 'จุดปลอดภัย', 'ค้นหา Safe Zone ใกล้คุณ', 'open-route')}
      ${moreCard('🔔', 'ตั้งค่าการแจ้งเตือน', 'พื้นที่และช่องทางที่ติดตาม', 'notification-settings')}
      ${moreCard('📸', 'แจ้งเหตุในพื้นที่', 'ส่งข้อมูลให้ชุมชน', 'open-report')}
      ${moreCard('ℹ️', 'เกี่ยวกับข้อมูล', 'แหล่งข้อมูลและความเชื่อมั่น', 'open-data-info')}
      ${moreCard('▣', 'สาธิตสถานการณ์', `ตอนนี้: ${activeScenario().label}`, 'open-simulation')}
    </section>
    <section class="section"><article class="card checklist"><h2>ชุดของจำเป็นสำหรับครอบครัว</h2><p>เช็กลิสต์นี้บันทึกไว้ในเครื่องของคุณ</p>${checkRow('power', 'Power Bank และสายชาร์จ')}${checkRow('medicine', 'ยาประจำตัว')}${checkRow('documents', 'เอกสารสำคัญ')}${checkRow('flashlight', 'ไฟฉายและถ่าน')}${checkRow('water', 'น้ำดื่มและอาหาร')}${checkRow('clothes', 'เสื้อผ้าและของใช้จำเป็น')}</article></section>
  `;
}

function moreCard(icon, title, description, action) {
  return `<button class="more-card" type="button" data-action="${action}"><span class="more-icon" aria-hidden="true">${icon}</span><strong>${title}</strong><small>${description}</small></button>`;
}

function checkRow(key, label) {
  return `<div class="check-row"><input id="check-${key}" type="checkbox" data-action="checklist" data-key="${key}" ${state.checklist[key] ? 'checked' : ''}><label for="check-${key}">${label}</label></div>`;
}

function districtLayer() {
  if (!state.districts.length) return '';
  const colors = ['#d5efbf', '#c9e8b5', '#dff1c8', '#c3e4b3', '#e9f2bd', '#c7e7c1'];
  return state.districts.map((district, index) => `<g class="district-shape"><path d="${district.path}" fill="${colors[index % colors.length]}" stroke="#7ca57b" stroke-width="1.8" stroke-linejoin="round"/><text x="${district.centroid.x.toFixed(1)}" y="${district.centroid.y.toFixed(1)}" text-anchor="middle" class="district-label">อ.${escapeHTML(district.name)}</text></g>`).join('');
}

function liveStationMarkers() {
  const markers = liveWaterRecords().map(record => {
    const lat = numberValue(record?.station?.tele_station_lat);
    const lon = numberValue(record?.station?.tele_station_long);
    if (lat === null || lon === null || !state.boundary?.bounds) return '';
    const point = projectPoint(lon, lat);
    const status = stationStatus(record);
    const color = status.key === 'normal' ? '#1a8a61' : status.key === 'watch' ? '#e0a11b' : status.key === 'prepare' ? '#db7431' : '#c33b4b';
    return stationMarker(point.x, point.y, stationName(record), color, '💧', 'show-station', record.station.id);
  }).join('');
  return markers || stationMarker(308, 412, 'สถานีปัว', '#faab24', '💧', 'show-station');
}

function projectPoint(lon, lat) {
  const bounds = state.boundary?.bounds;
  if (!bounds) return { x: 308, y: 412 };
  return {
    x: bounds.xOffset + (lon - bounds.minLon) * bounds.scale,
    y: bounds.yOffset + (bounds.maxLat - lat) * bounds.scale
  };
}

function mapSvg({ compact }) {
  const s = activeScenario();
  const viewBox = '0 0 600 760';
  const borderPath = state.boundary?.path || fallbackBoundaryPath();
  const layerClass = layer => state.mapLayers[layer] ? '' : 'is-off';
  const floodVisible = s.flood ? '' : 'is-off';
  const compactClass = compact ? 'map-compact' : 'map-full';
  return `<svg class="map-svg ${compactClass}" viewBox="${viewBox}" role="img" aria-label="แผนที่จังหวัดน่านแสดงขอบเขต 15 อำเภอ จุดวัดระดับน้ำ และสถานการณ์น้ำ">
    <defs>
      <linearGradient id="flood-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#54aee9" stop-opacity=".70"/><stop offset="1" stop-color="#1879ca" stop-opacity=".82"/></linearGradient>
      <filter id="soft-shadow"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#10434a" flood-opacity=".22"/></filter>
    </defs>
    <rect width="600" height="760" fill="#d8edf3"/>
    <path d="M0 110 C110 70 165 130 260 100 S455 80 600 125 M0 260 C100 230 155 280 255 240 S470 240 600 275 M0 420 C120 380 205 445 320 405 S490 430 600 400 M0 600 C105 560 170 620 275 580 S470 590 600 550" fill="none" stroke="#c4dfdc" stroke-width="19" opacity=".8"/>
    <path d="${borderPath}" fill="#eaf5d9" stroke="#145a52" stroke-width="7" stroke-linejoin="round"/>
    <g class="map-layer districts ${layerClass('districts')}">${districtLayer()}</g>
    <g class="map-layer river ${layerClass('river')}"><path d="M315 100 C295 152 340 199 307 244 C275 288 334 331 311 374 C287 420 336 462 306 506 C279 548 326 600 298 668" fill="none" stroke="#2288c7" stroke-width="11" opacity=".85" stroke-linecap="round"/><path d="M311 254 C238 280 227 314 196 350 M313 374 C381 410 402 448 449 479 M304 510 C240 535 233 570 195 600" fill="none" stroke="#54aee9" stroke-width="6" opacity=".78" stroke-linecap="round"/></g>
    <g class="map-layer risk ${s.key === 'danger' || s.key === 'evacuate' ? '' : 'is-off'}"><path d="M205 414 C245 374 350 380 400 423 C425 447 406 506 343 524 C276 543 199 495 205 414Z" fill="#d24f5c" opacity=".23" stroke="#b33035" stroke-width="2" stroke-dasharray="7 6"/></g>
    <g class="map-layer flood ${layerClass('flood')} ${floodVisible}"><path d="M250 433 C290 402 366 414 389 451 C405 476 373 516 318 516 C268 514 224 477 250 433Z" fill="url(#flood-fill)" stroke="#1879ca" stroke-width="2" opacity=".91"/><path d="M268 457 C292 441 335 441 367 462" fill="none" stroke="#d8f3ff" stroke-width="3" opacity=".8"/><path d="M265 480 C301 465 342 470 371 488" fill="none" stroke="#d8f3ff" stroke-width="3" opacity=".8"/></g>
    <g class="map-layer route ${layerClass('route')}"><path d="M303 503 C352 542 390 551 442 587" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round"/><path d="M303 503 C352 542 390 551 442 587" fill="none" stroke="#6b438b" stroke-width="5" stroke-dasharray="9 7" stroke-linecap="round"/></g>
    <g class="map-layer stations ${layerClass('stations')}">${liveStationMarkers()}</g>
    <g class="map-layer safe ${layerClass('safe')}">${stationMarker(445, 588, 'จุดปลอดภัย', '#238360', '◆', 'open-route')}${stationMarker(210, 570, 'จุดรวมพล', '#238360', '◆', 'open-route')}</g>
    <g class="map-marker" aria-hidden="true"><circle cx="302" cy="500" r="14" fill="#07505d" stroke="#fff" stroke-width="5"/><circle cx="302" cy="500" r="24" fill="#07505d" opacity=".15"/><text x="321" y="506" font-size="15">คุณอยู่ที่นี่</text></g>
    <text x="306" y="198" text-anchor="middle" font-size="22" font-weight="800" fill="#2c6f62" opacity=".9">จังหวัดน่าน</text>
    <text x="460" y="728" text-anchor="end" font-size="10" fill="#4a6d73">ขอบเขตจังหวัด: DDPM · ชั้นข้อมูลสถานการณ์: สาธิต</text>
  </svg>`;
}

function stationMarker(x, y, label, color, symbol, action = '', stationId = '') {
  const actionAttrs = action ? `data-action="${action}" ${stationId ? `data-station-id="${stationId}"` : ''} tabindex="0" role="button"` : 'aria-hidden="true"';
  return `<g class="map-marker ${action ? 'is-interactive' : ''}" ${actionAttrs} aria-label="${escapeHTML(label)}"><circle cx="${x.toFixed ? x.toFixed(1) : x}" cy="${y.toFixed ? y.toFixed(1) : y}" r="${action === 'show-station' ? 10 : 15}" fill="${color}" stroke="#fff" stroke-width="3"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="11" stroke-width="0" fill="#fff">${symbol}</text><text x="${Number(x) + 14}" y="${Number(y) - 9}" font-size="${action === 'show-station' ? 9 : 13}">${escapeHTML(label)}</text></g>`;
}

function mapOverlayControls({ compact }) {
  const primary = primaryWaterStation();
  return `<div class="map-overlay-actions ${compact ? 'is-compact' : ''}" aria-label="จุดข้อมูลบนแผนที่"><button class="map-overlay-button station" type="button" data-action="show-station" ${primary?.station?.id ? `data-station-id="${primary.station.id}"` : ''}>💧 <span>${escapeHTML(primary ? stationName(primary) : 'สถานีวัดน้ำ')}</span></button><button class="map-overlay-button safe" type="button" data-action="open-route">◆ <span>จุดปลอดภัย</span></button><button class="map-overlay-button user" type="button" data-action="use-location" aria-label="ใช้ตำแหน่งของฉัน">⌖</button></div>`;
}

function fallbackBoundaryPath() {
  return 'M323 54 C366 85 420 103 431 153 C458 193 418 233 447 276 C462 320 425 352 449 401 C457 443 425 474 444 520 C451 561 415 614 384 664 C354 712 309 699 281 662 C247 630 202 597 190 544 C163 506 190 458 167 411 C149 361 179 320 159 278 C148 231 188 202 181 159 C190 112 233 90 262 54 C281 31 304 32 323 54Z';
}

function render() {
  const target = document.querySelector(`#page-${state.page}`);
  if (!target) return;
  $$('.page').forEach(page => { const active = page === target; page.hidden = !active; page.classList.toggle('is-active', active); });
  const templates = { home: homeTemplate, map: mapTemplate, alerts: alertsTemplate, emergency: emergencyTemplate, more: moreTemplate };
  target.innerHTML = templates[state.page]();
  $$('.nav-item').forEach(button => { const selected = button.dataset.page === state.page; button.classList.toggle('is-active', selected); button.setAttribute('aria-current', selected ? 'page' : 'false'); });
  document.documentElement.dataset.risk = activeScenario().key;
}

function navigate(page) {
  state.page = page;
  render();
  const heading = $('#page-' + page + ' h1, #page-' + page + ' h2');
  if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setScenario(index) {
  state.scenarioIndex = Number(index) % scenarios.length;
  writeStorage('nansafe-scenario', String(state.scenarioIndex));
  render();
  const s = activeScenario();
  toast(`เปลี่ยนสถานการณ์สาธิตเป็น “${s.label}”`, s.key === 'danger' || s.key === 'evacuate' ? 'danger' : s.key === 'normal' ? '' : 'warning');
}

function toggleLayer(layer, checked) {
  state.mapLayers[layer] = checked;
  render();
}

function toast(message, type = '') {
  const root = $('#toast-root');
  root.innerHTML = `<div class="toast ${type}">${message}</div>`;
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => { root.innerHTML = ''; }, 3800);
}

function openModal({ title, description = '', body, footer = '', small = false }) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><section class="modal ${small ? 'is-small' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-modal><header class="modal-header"><div><h2 id="modal-title">${title}</h2>${description ? `<p>${description}</p>` : ''}</div><button class="modal-close" type="button" data-action="close-modal" aria-label="ปิด">×</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}</section></div>`;
  const first = $('[data-modal] button, [data-modal] input, [data-modal] select, [data-modal] textarea');
  setTimeout(() => first?.focus(), 0);
}

function closeModal() { $('#modal-root').innerHTML = ''; }

function stationModal() {
  const s = activeScenario();
  const record = state.waterData.find(item => String(item?.station?.id) === String(state.selectedStationId)) || primaryWaterStation();
  if (!record) {
    openModal({ title: '💧 ข้อมูลสถานีวัดน้ำ', description: 'กำลังเชื่อมต่อข้อมูลจาก ThaiWater', body: '<div class="loading-line"></div><p class="helper">ลองใหม่อีกครั้งในอีกสักครู่</p>', footer: '<button type="button" class="button button-outline" data-action="close-modal">ปิด</button>' });
    return;
  }
  const level = stationLevel(record) ?? s.water;
  const bank = stationBank(record);
  const ground = stationGround(record);
  const gap = stationGap(record);
  const trend = stationTrend(record);
  const status = stationStatus(record);
  const previous = numberValue(record.waterlevel_msl_previous);
  const currentPercent = bank !== null && ground !== null && bank > ground ? Math.max(0, Math.min(100, ((level - ground) / (bank - ground)) * 100)) : 0;
  state.selectedStationId = record.station?.id;
  openModal({
    title: '💧 ' + escapeHTML(stationName(record)),
    description: `${escapeHTML(record?.geocode?.tumbon_name?.th ? `ต.${record.geocode.tumbon_name.th} อ.${record.geocode.amphoe_name?.th || '-'}` : 'จังหวัดน่าน')} · ${escapeHTML(record?.river_name || 'ลำน้ำ')} · อัปเดต ${escapeHTML(formatWaterTime(record.waterlevel_datetime))}`,
    body: `<div class="station-detail">
      <div class="metric-row"><div class="metric"><span>ระดับน้ำตอนนี้</span><strong>${level.toFixed(2)} ม.</strong></div><div class="metric"><span>แนวโน้มล่าสุด</span><strong class="trend-value trend-${trend.key}">${trend.icon} ${trend.label}</strong></div><div class="metric"><span>สถานะ</span><strong>${status.label}</strong></div></div>
      <div class="bank-meter"><div class="bank-meter-head"><strong>${gap === null ? 'ไม่ทราบระยะถึงตลิ่ง' : gap >= 0 ? `เหลือ ${gap.toFixed(2)} ม. ก่อนถึงตลิ่ง` : `เกินตลิ่ง ${Math.abs(gap).toFixed(2)} ม.`}</strong><span>${bank === null ? '' : `ตลิ่ง ${bank.toFixed(2)} ม.`}</span></div><div class="gauge live-gauge" style="--gauge-position:${currentPercent}%"></div><div class="gauge-labels"><span>${ground === null ? 'ระดับฐาน' : `พื้นน้ำ ${ground.toFixed(2)} ม.`}</span><span>ระดับปัจจุบัน</span><span>ตลิ่ง</span></div></div>
      <div class="history-compare"><h3>เทียบระดับน้ำเพื่อให้เข้าใจง่าย</h3>
        ${ground === null ? '' : compareLine('ระดับท้องน้ำ', ground.toFixed(2) + ' ม.', '20%', '#668f96')}
        ${previous === null ? '' : compareLine('ครั้งก่อน', previous.toFixed(2) + ' ม.', Math.max(10, Math.min(90, currentPercent - (level - previous) * 20)) + '%', '#6b438b')}
        ${compareLine('ปัจจุบัน', level.toFixed(2) + ' ม.', Math.max(10, currentPercent) + '%', status.key === 'danger' ? '#b33035' : '#b95306')}
        ${bank === null ? '' : compareLine('ระดับตลิ่ง', bank.toFixed(2) + ' ม.', '100%', '#cf5b62')}
      </div>
      <div class="chart-box"><h3>แนวโน้มระดับน้ำย้อนหลัง</h3><div id="station-history"><div class="loading-line"></div><p class="helper">กำลังโหลดกราฟจาก ThaiWater…</p></div></div>
      <p class="helper">แหล่งข้อมูล: ThaiWater / ${escapeHTML(record?.agency?.agency_shortname?.th || record?.agency?.agency_name?.th || '-')} · ม.รทก. คือระดับความสูงอ้างอิงจากระดับน้ำทะเลปานกลาง</p>
    </div>`,
    footer: `<button type="button" class="button button-outline" data-action="close-modal">ปิด</button>`
  });
  loadStationHistory(record);
}

function compareLine(label, value, width, color) {
  return `<div class="compare-line"><span>${label}</span><span class="compare-track" style="--compare:${width};--compare-color:${color}"></span><span class="compare-value">${value}</span></div>`;
}

async function loadStationHistory(record) {
  const target = $('#station-history');
  if (!target || !record?.station?.id) return;
  try {
    const response = await fetch(`/api/waterlevel-history?id=${encodeURIComponent(record.station.id)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('History unavailable');
    const payload = await response.json();
    target.innerHTML = waterHistoryChart(record, payload.data || []);
  } catch (error) {
    target.innerHTML = '<p class="helper">ยังโหลดกราฟย้อนหลังไม่ได้ แต่ค่า ณ ตอนนี้และแนวโน้มล่าสุดยังอ้างอิงข้อมูลสดได้</p>';
  }
}

function waterHistoryChart(record, data) {
  const samples = (Array.isArray(data) ? data : []).map(item => numberValue(item.value)).filter(value => value !== null);
  if (samples.length < 2) return '<p class="helper">ข้อมูลย้อนหลังไม่เพียงพอสำหรับวาดกราฟ</p>';
  const bank = stationBank(record);
  const current = stationLevel(record);
  const values = bank === null ? samples : [...samples, bank];
  const max = Math.max(...values) + 0.15;
  const min = Math.min(...values) - 0.15;
  const width = 380, height = 170, pad = 25;
  const step = Math.max(1, Math.floor(samples.length / 42));
  const selected = samples.filter((value, index) => index % step === 0 || index === samples.length - 1);
  const points = selected.map((value, i) => {
    const x = pad + (i * (width - pad * 2)) / (selected.length - 1);
    const y = height - pad - ((value - min) / (max - min || 1)) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const thresholdY = bank === null ? null : height - pad - ((bank - min) / (max - min || 1)) * (height - pad * 2);
  const currentPoint = points.split(' ').at(-1).split(',');
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="กราฟแนวโน้มระดับน้ำย้อนหลังจาก ThaiWater">${thresholdY === null ? '' : `<line x1="${pad}" y1="${thresholdY}" x2="${width-pad}" y2="${thresholdY}" stroke="#cf5b62" stroke-width="2" stroke-dasharray="5 4"/><text x="${width-pad}" y="${thresholdY-5}" text-anchor="end" font-size="10" fill="#9e343b">ตลิ่ง ${bank.toFixed(2)} ม.</text>`}<polyline points="${points}" fill="none" stroke="#0c7685" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${currentPoint[0]}" cy="${currentPoint[1]}" r="5" fill="#b95306" stroke="#fff" stroke-width="2"/><text x="${pad}" y="${height-3}" font-size="10" fill="#587177">ย้อนหลัง</text><text x="${width-pad}" y="${height-3}" text-anchor="end" font-size="10" fill="#587177">ล่าสุด ${current?.toFixed(2) || '-'} ม.</text></svg>`;
}

function routeModal() {
  const s = activeScenario();
  const urgent = s.key === 'evacuate' || s.key === 'danger';
  openModal({
    title: urgent ? 'เส้นทางไปจุดปลอดภัย' : 'จุดปลอดภัยใกล้คุณ',
    description: urgent ? 'ระบบหลีกเลี่ยงพื้นที่น้ำท่วมและถนนที่มีความเสี่ยงในข้อมูลสาธิต' : 'ตรวจจุดปลอดภัยไว้ล่วงหน้า เพื่อเตรียมตัวหากต้องอพยพ',
    body: `<article class="route-card"><h3>◆ โรงเรียนปัว — จุดปลอดภัย</h3><p>ระยะทางประมาณ 850 ม. · ใช้เวลาราว 12 นาทีโดยการเดิน</p><ol class="route-steps"><li>จากตำแหน่งของคุณ เดินไปทางถนนสายหลัก</li><li>เลี้ยวตามเส้นทางสีม่วง หลีกเลี่ยงพื้นที่ริมน้ำ</li><li>ไม่ใช้เส้นทางเดิมที่ผ่านจุดน้ำท่วมขัง</li><li>ถึงจุดปลอดภัย: โรงเรียนปัว</li></ol></article><p class="helper" style="margin-top:14px">เส้นทางนี้เป็นการสาธิต ระบบจริงต้องอิงข้อมูลถนน สภาพน้ำท่วม และคำสั่งจากเจ้าหน้าที่แบบปัจจุบัน</p>`,
    footer: `<button type="button" class="button button-outline" data-action="close-modal">ปิด</button>${urgent ? '<button type="button" class="button button-warm" data-action="navigate-emergency">ขอความช่วยเหลือ</button>' : ''}`
  });
}

function layersModal() {
  openModal({
    title: 'ชั้นข้อมูลแผนที่',
    description: 'เลือกสิ่งที่ต้องการแสดงบนแผนที่',
    body: `<div class="layer-options">${layerRow('districts', '▦', 'ขอบเขตอำเภอ', `${state.districts.length || 15} อำเภอของน่าน`)}${layerRow('river', '~~~', 'แม่น้ำและลำน้ำ', 'แนวลำน้ำ')}${layerRow('flood', '◒', 'พื้นที่น้ำท่วม', 'ข้อมูลสาธิต')}${layerRow('stations', '●', 'สถานีวัดน้ำ', `${state.waterData.length || 32} สถานี`)}${layerRow('safe', '◆', 'จุดปลอดภัย', 'Safe Zone')}${layerRow('route', '↗', 'เส้นทางแนะนำ', 'หลีกเลี่ยงพื้นที่เสี่ยง')}</div>`,
    footer: '<button type="button" class="button button-outline" data-action="close-modal">เสร็จสิ้น</button>',
    small: true
  });
}

function areaModal() {
  openModal({
    title: 'เลือกพื้นที่ที่ต้องการติดตาม',
    description: 'ใช้ได้เมื่อไม่สะดวกเปิดตำแหน่งโทรศัพท์',
    body: `<form id="area-form"><div class="field"><label for="district">อำเภอ</label><select id="district" name="district"><option>อ.ปัว</option><option>อ.เมืองน่าน</option><option>อ.ท่าวังผา</option><option>อ.เวียงสา</option><option>อ.บ่อเกลือ</option><option>อ.เชียงกลาง</option></select></div><div class="field"><label for="subdistrict">ตำบล</label><select id="subdistrict" name="subdistrict"><option>ต.ปัว</option><option>ต.ศิลาเพชร</option><option>ต.วรนคร</option><option>ต.ป่ากลาง</option></select></div><p class="helper">ต้นแบบนี้ใช้ข้อมูลสถานการณ์จำลองของพื้นที่ที่เลือก</p></form>`,
    footer: '<button type="button" class="button button-outline" data-action="close-modal">ยกเลิก</button><button type="button" class="button button-warm" data-action="save-area">บันทึกพื้นที่</button>',
    small: true
  });
}

function simulationModal() {
  openModal({
    title: 'สาธิตสถานการณ์',
    description: 'เปลี่ยนสถานการณ์เพื่อดูว่า NanSafe แสดงสถานะ คำแนะนำ แผนที่ และ Alert อย่างไร',
    body: `<div class="alert-feed">${scenarios.map((s, index) => `<button type="button" class="filter-pill ${index === state.scenarioIndex ? 'is-active' : ''}" style="text-align:left" data-action="set-scenario" data-index="${index}">${s.icon} <strong>${s.label}</strong> — ${s.hero}</button>`).join('')}</div>`,
    footer: '<button type="button" class="button button-outline" data-action="close-modal">ปิด</button>',
    small: true
  });
}

function reportModal() {
  openModal({
    title: '📸 แจ้งเหตุในพื้นที่',
    description: 'รายงานจะเข้าสู่ขั้นตอนตรวจสอบก่อนเผยแพร่เป็นข้อมูลสาธารณะ',
    body: `<form id="report-form"><div class="field"><label for="report-type">เกิดอะไรขึ้น?</label><select id="report-type" name="type"><option value="น้ำท่วม">🌊 น้ำท่วม</option><option value="น้ำป่า">💧 น้ำป่า</option><option value="ดินถล่ม">⛰️ ดินถล่ม</option><option value="ถนนขาด">🛣️ ถนนขาด / ถนนปิด</option><option value="สะพานเสียหาย">🌉 สะพานเสียหาย</option><option value="อื่น ๆ">อื่น ๆ</option></select></div><div class="field"><label for="report-detail">รายละเอียดสั้น ๆ</label><textarea id="report-detail" name="detail" maxlength="350" placeholder="เช่น มีน้ำท่วมขังหน้าโรงเรียน ระดับประมาณครึ่งล้อรถ"></textarea></div><div class="field"><label for="report-photo">รูปภาพ (ถ้ามี)</label><input id="report-photo" type="file" accept="image/*"><span class="helper">ต้นแบบนี้จะไม่อัปโหลดไฟล์ออกจากเครื่อง</span></div><div class="field"><label class="check-row" style="border:0;padding:0"><input id="report-location" type="checkbox" checked><span>แนบพื้นที่ที่เลือก: ${escapeHTML(state.area)}</span></label></div></form>`,
    footer: '<button type="button" class="button button-outline" data-action="close-modal">ยกเลิก</button><button type="button" class="button button-warm" data-action="submit-report">ส่งรายงาน</button>'
  });
}

function emergencyModal(type) {
  const names = { flood: 'น้ำท่วม', 'flash-flood': 'น้ำป่าไหลหลาก', landslide: 'ดินถล่ม', injury: 'มีผู้บาดเจ็บ', trapped: 'ติดอยู่ในพื้นที่', other: 'เหตุฉุกเฉินอื่น' };
  const title = names[type] || 'เหตุฉุกเฉิน';
  openModal({
    title: '🆘 ขอความช่วยเหลือ: ' + title,
    description: 'ตรวจสอบข้อมูลก่อนกดส่ง เพื่อช่วยให้เจ้าหน้าที่ประเมินเหตุการณ์ได้เร็วขึ้น',
    body: `<form id="emergency-form"><div class="field"><label for="people">จำนวนคนที่ต้องการความช่วยเหลือ</label><select id="people"><option>1 คน</option><option>2–4 คน</option><option>5 คนขึ้นไป</option><option>ไม่ทราบ</option></select></div><div class="field"><label for="condition">มีผู้บาดเจ็บหรือกลุ่มเปราะบางหรือไม่?</label><select id="condition"><option>ไม่มี</option><option>มีผู้บาดเจ็บ</option><option>มีผู้สูงอายุ / เด็ก / ผู้ป่วย</option><option>มีทั้งผู้บาดเจ็บและกลุ่มเปราะบาง</option></select></div><div class="field"><label for="emergency-note">รายละเอียดเพิ่มเติม</label><textarea id="emergency-note" maxlength="350" placeholder="บอกจุดสังเกต สภาพเส้นทาง หรือสิ่งที่ต้องการความช่วยเหลือ"></textarea></div><article class="card location-card"><h2>${state.position ? 'จะใช้ตำแหน่งที่บันทึกไว้' : 'ยังไม่ได้ใช้ตำแหน่งโทรศัพท์'}</h2><p>${state.position ? state.position.label : 'สามารถส่งคำขอพร้อมพื้นที่ที่คุณเลือกได้ หรือกดใช้ตำแหน่งของฉัน'}</p><button type="button" class="button button-outline button-small" data-action="use-location">⌖ ใช้ตำแหน่งของฉัน</button></article></form>`,
    footer: '<button type="button" class="button button-outline" data-action="close-modal">ยกเลิก</button><button type="button" class="button button-warm" data-action="submit-emergency" data-type="' + type + '">ส่งคำขอช่วยเหลือ</button>'
  });
}

function preparednessModal() {
  openModal({
    title: 'เตรียมตัวรับน้ำป่าและน้ำท่วม',
    description: 'อ่านง่าย ทำตามทีละข้อ และเก็บของสำคัญไว้พร้อมหยิบ',
    body: `<div class="station-detail"><article class="card checklist"><h2>ก่อนเกิดเหตุ</h2>${['ย้ายของขึ้นที่สูง', 'เตรียมยาและเอกสารสำคัญ', 'ชาร์จโทรศัพท์และ Power Bank', 'เตรียมน้ำดื่ม ไฟฉาย และอาหาร'].map(item => `<div class="check-row"><span>✓</span><span>${item}</span></div>`).join('')}</article><article class="card checklist"><h2>ขณะเกิดเหตุ</h2>${['อย่าข้ามน้ำและอย่าเข้าใกล้ลำน้ำ', 'หลีกเลี่ยงพื้นที่ลาดชัน', 'ไป Safe Zone ตามเส้นทางแนะนำ', 'ติดตามประกาศจากหน่วยงาน'].map(item => `<div class="check-row"><span>✓</span><span>${item}</span></div>`).join('')}</article></div>`,
    footer: '<button type="button" class="button button-outline" data-action="close-modal">ปิด</button><button type="button" class="button button-warm" data-action="open-route">ดูจุดปลอดภัย</button>'
  });
}

function notificationSettingsModal() {
  openModal({
    title: 'ตั้งค่าการแจ้งเตือน',
    description: 'กำหนดพื้นที่และระดับข้อความที่คุณต้องการรับ',
    body: `<form id="notifications-form"><div class="field"><label for="notify-area">พื้นที่ที่ติดตาม</label><input id="notify-area" value="${escapeHTML(state.area)}" readonly></div><label class="check-row"><input type="checkbox" checked><span>แจ้งเตือนการเปลี่ยนระดับความเสี่ยง</span></label><label class="check-row"><input type="checkbox" checked><span>แจ้งเตือนอพยพและเหตุฉุกเฉิน</span></label><label class="check-row"><input type="checkbox"><span>รับข่าวฝนและสถานการณ์ทั่วไป</span></label><p class="helper">Web Push และ LINE OA เป็นส่วนต่อเชื่อมใน Production; ต้นแบบนี้จะแสดงผลเป็นการแจ้งเตือนภายในแอป</p></form>`,
    footer: '<button type="button" class="button button-outline" data-action="close-modal">ยกเลิก</button><button type="button" class="button button-warm" data-action="save-notifications">บันทึกการตั้งค่า</button>',
    small: true
  });
}

function dataInfoModal() {
  openModal({
    title: 'เกี่ยวกับข้อมูลและความเชื่อมั่น',
    description: 'NanSafe ควรสื่อสารอย่างชัดเจนว่าข้อมูลมาจากไหน และสดใหม่เพียงใด',
    body: `<div class="station-detail"><article class="history-compare"><h3>ข้อมูลที่เชื่อมต่ออยู่ตอนนี้</h3><p class="helper">• ระดับน้ำและสถานี: ThaiWater (${state.waterData.length} สถานีจังหวัดน่าน)<br>• เวลาอัปเดตล่าสุด: ${escapeHTML(formatWaterTime(state.waterUpdatedAt))}<br>• กราฟย้อนหลัง: ThaiWater station history API<br>• ขอบเขตจังหวัด: DDPM<br>• ขอบเขตอำเภอ 15 อำเภอ: OpenGISData-Thailand / UNOCHA lineage</p></article><article class="history-compare"><h3>ข้อควรรู้</h3><p class="helper">ค่าระดับตลิ่งเป็นค่าอ้างอิงของแต่ละสถานี ไม่ใช่คำยืนยันว่าบ้านทุกหลังจะเริ่มท่วมพร้อมกัน และรายงานชุมชน/ประกาศอพยพต้องผ่านการตรวจสอบจากหน่วยงานที่รับผิดชอบ</p></article></div>`,
    footer: '<button type="button" class="button button-outline" data-action="close-modal">ปิด</button>', small: true
  });
}

async function useLocation() {
  if (!navigator.geolocation) { areaModal(); toast('อุปกรณ์นี้ไม่รองรับการใช้ตำแหน่ง เลือกพื้นที่เองได้', 'warning'); return; }
  toast('กำลังขอตำแหน่งจากอุปกรณ์ของคุณ…');
  navigator.geolocation.getCurrentPosition(
    position => {
      state.position = { lat: position.coords.latitude, lng: position.coords.longitude, label: `พิกัดที่ใช้ล่าสุด (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})` };
      state.area = 'พื้นที่ใกล้ตำแหน่งของคุณ';
      render(); closeModal(); toast('บันทึกตำแหน่งเพื่อประเมินพื้นที่แล้ว');
    },
    () => { areaModal(); toast('ไม่สามารถใช้ตำแหน่งได้ คุณยังเลือกพื้นที่เองได้', 'warning'); },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
}

function saveArea() {
  const district = $('#district')?.value || 'อ.ปัว';
  const subdistrict = $('#subdistrict')?.value || 'ต.ปัว';
  state.area = `${subdistrict} ${district} จ.น่าน`;
  state.position = null;
  closeModal(); render(); toast('เปลี่ยนพื้นที่ติดตามเป็น ' + state.area);
}

function submitReport() {
  const type = $('#report-type')?.value || 'รายงานเหตุ';
  const detail = $('#report-detail')?.value.trim();
  if (!detail) { toast('กรุณาเขียนรายละเอียดสั้น ๆ ก่อนส่งรายงาน', 'warning'); $('#report-detail')?.focus(); return; }
  closeModal(); toast(`ส่งรายงาน “${type}” เข้าสู่ขั้นตอนตรวจสอบแล้ว`);
}

function submitEmergency(type) {
  const names = { flood: 'น้ำท่วม', 'flash-flood': 'น้ำป่าไหลหลาก', landslide: 'ดินถล่ม', injury: 'ผู้บาดเจ็บ', trapped: 'ติดอยู่ในพื้นที่', other: 'เหตุฉุกเฉิน' };
  closeModal();
  toast(`ต้นแบบบันทึกคำขอ “${names[type] || 'เหตุฉุกเฉิน'}” แล้ว — ระบบจริงต้องส่งต่อหน่วยงานที่รับผิดชอบ`, 'danger');
}

function handleAction(action, element) {
  if (!action) return;
  switch (action) {
    case 'navigate': navigate(element.dataset.page); break;
    case 'navigate-map': navigate('map'); break;
    case 'navigate-emergency': closeModal(); navigate('emergency'); break;
    case 'set-scenario': setScenario(element.dataset.index); break;
    case 'toggle-layer': toggleLayer(element.dataset.layer, element.checked); break;
    case 'show-station': state.selectedStationId = element.dataset.stationId || state.selectedStationId; stationModal(); break;
    case 'open-route': routeModal(); break;
    case 'open-layers': layersModal(); break;
    case 'open-menu': navigate('more'); break;
    case 'open-notifications': navigate('alerts'); break;
    case 'filter-alerts': state.alertFilter = element.dataset.filter; render(); break;
    case 'use-location': useLocation(); break;
    case 'choose-area': areaModal(); break;
    case 'save-area': saveArea(); break;
    case 'open-report': reportModal(); break;
    case 'submit-report': submitReport(); break;
    case 'open-emergency-type': emergencyModal(element.dataset.type); break;
    case 'submit-emergency': submitEmergency(element.dataset.type); break;
    case 'open-preparedness': preparednessModal(); break;
    case 'notification-settings': notificationSettingsModal(); break;
    case 'save-notifications': closeModal(); toast('บันทึกการตั้งค่าการแจ้งเตือนแล้ว'); break;
    case 'open-data-info': dataInfoModal(); break;
    case 'open-simulation': simulationModal(); break;
    case 'close-modal': closeModal(); break;
    case 'checklist': state.checklist[element.dataset.key] = element.checked; writeStorage('nansafe-checklist', JSON.stringify(state.checklist)); break;
    default: break;
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'close-modal' && button.matches('.modal-backdrop')) { closeModal(); return; }
  handleAction(button.dataset.action, button);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('#modal-root').children.length) closeModal();
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.map-marker')) { event.preventDefault(); handleAction(event.target.dataset.action, event.target); }
});

async function loadBoundary() {
  try {
    const response = await fetch('./data/nan-boundary.json');
    if (!response.ok) throw new Error('Boundary unavailable');
    const feature = await response.json();
    const points = feature.geometry.coordinates[0];
    const lons = points.map(p => p[0]); const lats = points.map(p => p[1]);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons), minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const width = 340, height = 650, xOffset = 130, yOffset = 55;
    const scale = Math.min(width / (maxLon - minLon), height / (maxLat - minLat));
    const path = points.map(([lon, lat], index) => {
      const x = xOffset + (lon - minLon) * scale;
      const y = yOffset + (maxLat - lat) * scale;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ') + 'Z';
    state.boundary = { path, source: feature.properties?.source, bounds: { minLon, maxLon, minLat, maxLat, scale, xOffset, yOffset } };
  } catch (error) {
    state.boundary = null;
  }
}

function geometryPath(geometry) {
  if (!geometry || !state.boundary?.bounds) return '';
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  return polygons.map(polygon => polygon.map(ring => ring.map(([lon, lat], index) => {
    const point = projectPoint(lon, lat);
    return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }).join(' ') + ' Z').join(' ')).join(' ');
}

function geometryCentroid(geometry) {
  const points = [];
  const polygons = geometry?.type === 'Polygon' ? geometry.coordinates : geometry?.type === 'MultiPolygon' ? geometry.coordinates.flat(1) : [];
  polygons.forEach(ring => ring.slice(0, -1).forEach(([lon, lat]) => points.push(projectPoint(lon, lat))));
  if (!points.length) return { x: 300, y: 380 };
  return { x: points.reduce((sum, point) => sum + point.x, 0) / points.length, y: points.reduce((sum, point) => sum + point.y, 0) / points.length };
}

async function loadDistricts() {
  try {
    const response = await fetch('./data/nan-districts.json');
    if (!response.ok) throw new Error('District boundaries unavailable');
    const collection = await response.json();
    state.districts = (collection.features || []).map(feature => ({
      name: feature.properties?.amp_th || 'ไม่ทราบชื่ออำเภอ',
      path: geometryPath(feature.geometry),
      centroid: geometryCentroid(feature.geometry)
    })).filter(district => district.path);
  } catch (error) {
    state.districts = [];
  }
}

async function loadWaterData() {
  state.waterLoading = true;
  try {
    const response = await fetch(`${WATER_DATA_ENDPOINT}&t=${Date.now()}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Water data unavailable');
    const payload = await response.json();
    const records = Array.isArray(payload.data) ? payload.data : [];
    state.waterData = records.filter(record => record?.geocode?.province_code === '55' || record?.geocode?.province_code === 55);
    state.waterUpdatedAt = payload.updatedAt || state.waterData.map(record => record.waterlevel_datetime).filter(Boolean).sort().at(-1) || null;
    state.waterSource = payload.source || WATER_DATA_SOURCE;
    state.waterError = state.waterData.length ? '' : 'ไม่พบข้อมูลสถานีจังหวัดน่าน';
  } catch (error) {
    state.waterError = 'เชื่อมข้อมูล ThaiWater ไม่สำเร็จ';
    state.waterData = [];
  } finally {
    state.waterLoading = false;
  }
}

async function init() {
  await loadBoundary();
  await Promise.all([loadDistricts(), loadWaterData()]);
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  window.setInterval(async () => {
    await loadWaterData();
    render();
  }, WATER_REFRESH_MS);
}

init();

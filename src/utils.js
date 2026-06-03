// ─────────────────────────────────────────────────────────────────────────────
// src/utils.js  —  Yardımcı fonksiyonlar
// DURUM_CONFIG ve LANG_PROMPTS → src/constants/index.js'e taşındı.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Varsayılan Ayarlar ───────────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
  apiKey:    '',
  model:     'claude-sonnet-4-20250514',
  lang:      'tr',
  depth:     'normal',
  accent:    '#dc2626',
  siteTitle: 'Yalan mıyız?',
  badgeText: 'DOĞRULUK KONTROLÜ SİSTEMİ',
  font:      'Georgia, serif',
};

// ─── Sabitler ─────────────────────────────────────────────────────────────────

/** Geçerli bir Anthropic API anahtarı bu prefix ile başlar. */
const API_KEY_PREFIX = 'sk-ant-api';

export const STORAGE_KEYS = {
  settings: 'yd_settings',
  history:  'haber_gecmisi',
};

export const MAX_HISTORY_ITEMS         = 10;
export const MAX_COMPARE_LINKS         = 5;
export const HISTORY_LINK_PREVIEW_LEN  = 55;

// ─── URL Doğrulama ────────────────────────────────────────────────────────────

/**
 * Geçerli HTTP/HTTPS URL mı kontrol eder.
 */
export const isValidUrl = (url) => {
  if (!url?.trim()) return false;
  try {
    return ['http:', 'https:'].includes(new URL(url.trim()).protocol);
  } catch {
    return false;
  }
};

// ─── LocalStorage ─────────────────────────────────────────────────────────────

export const storageGet = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const storageSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[storage] yazma hatası:', e);
  }
};

export const storageRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('[storage] silme hatası:', e);
  }
};

// ─── Ayarlar ─────────────────────────────────────────────────────────────────

export const loadSettings  = () => ({ ...DEFAULT_SETTINGS, ...storageGet(STORAGE_KEYS.settings, {}) });
export const saveSettings  = (s) => storageSet(STORAGE_KEYS.settings, s);
export const resetSettings = ()  => storageRemove(STORAGE_KEYS.settings);

// ─── Geçmiş ──────────────────────────────────────────────────────────────────

export const loadHistory = () => storageGet(STORAGE_KEYS.history, []);

export const addToHistory = (link, sonuc) => {
  const item    = { id: Date.now().toString(), link, sonuc, timestamp: new Date().toISOString() };
  const updated = [item, ...loadHistory()].slice(0, MAX_HISTORY_ITEMS);
  storageSet(STORAGE_KEYS.history, updated);
  return updated;
};

export const deleteFromHistory = (id) => {
  const updated = loadHistory().filter((i) => i.id !== id);
  storageSet(STORAGE_KEYS.history, updated);
  return updated;
};

export const clearHistory = () => {
  storageSet(STORAGE_KEYS.history, []);
  return [];
};

// ─── Durum Tespiti ────────────────────────────────────────────────────────────

/**
 * Model yanıtından doğruluk durumunu çıkarır (TR / EN / AR).
 * Öncelik: yanıltıcı > yanlış > doğru > belirsiz
 */
export const determineDurum = (text) => {
  const t   = text.toLowerCase();
  const has = (...terms) => terms.some((w) => t.includes(w));

  if (has('yanıltıcı', 'misleading', 'مضلل', 'misleads', 'deceptive'))      return 'yaniltici';
  if (has('yanlış',    'false',      'خاطئ', 'incorrect', 'untrue'))         return 'yanlis';
  if (has('doğru',     'true',       'صحيح', 'correct',   'accurate', 'verified')) return 'dogru';
  return 'belirsiz';
};

// ─── Demo Yanıtları ───────────────────────────────────────────────────────────

const DEMO_RESPONSES = {
  dogru: `1. İçeriğin özeti:\nVerilen içerik güvenilir kaynaklarca doğrulanmış bilgiler içermektedir.\n\n2. Sonuç: Doğru\n\n3. Ana bulgular ve kanıtlar:\n• Resmî makamlar olayı doğrulamıştır\n• Reuters ve AA haberi teyit etmiştir\n• Birden fazla bağımsız kaynak uyuşmaktadır\n\n4. Önemli uyarılar:\nİçerik güncel ve tarafsız kaynaklardan alınmıştır.`,
  yanlis: `1. İçeriğin özeti:\nHaberde yer alan iddialar doğrulanamamış ya da yanlış olduğu kanıtlanmıştır.\n\n2. Sonuç: Yanlış\n\n3. Ana bulgular ve kanıtlar:\n• İlgili kurumlar resmi olarak yalanlamıştır\n• Birincil kaynak bulunamadı\n• Yanlış bağlamda kullanılan görsel saptandı\n\n4. Önemli uyarılar:\nBu tür içerikleri paylaşmadan önce birden fazla kaynakla teyit edin.`,
  yaniltici: `1. İçeriğin özeti:\nOlay gerçek olsa da sunuş biçimi okuyucuyu yanıltmaktadır.\n\n2. Sonuç: Yanıltıcı\n\n3. Ana bulgular ve kanıtlar:\n• Kullanılan görsel farklı bir tarihten alınmış\n• Bağlamdan kopuk istatistik kullanılmış\n• Eksik bilgiyle yanlış çıkarım yaptırılıyor\n\n4. Önemli uyarılar:\nOrijinal kaynağı ve tam bağlamı araştırın.`,
  belirsiz: `1. İçeriğin özeti:\nVerilen içerik henüz güvenilir kaynaklarca teyit edilmemiştir.\n\n2. Sonuç: Belirsiz\n\n3. Ana bulgular ve kanıtlar:\n• Yalnızca sosyal medyada yer almaktadır\n• Ana akım medyada haber yok\n• Resmi açıklama bekleniyor\n\n4. Önemli uyarılar:\nKesin bir kanaat bildirmek için yeterli veri bulunmamaktadır.`,
};

export const getDemoResponse = (url) => {
  const u = url.toLowerCase();
  if (u.includes('dogru'))     return DEMO_RESPONSES.dogru;
  if (u.includes('yanlis'))    return DEMO_RESPONSES.yanlis;
  if (u.includes('yaniltici')) return DEMO_RESPONSES.yaniltici;
  return DEMO_RESPONSES.belirsiz;
};

// ─── Claude API ───────────────────────────────────────────────────────────────

const ANTHROPIC_API_URL  = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MAX_TOKENS = 1024;

const _singleCall = async (prompt, apiKey, model) => {
  const res = await fetch(ANTHROPIC_API_URL, {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: DEFAULT_MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API hatası: ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? 'Yanıt alınamadı.';
};

/**
 * Claude API'yi çağırır.
 * API key yoksa / geçersizse → demo moda düşer.
 * 529 / overloaded hatalarında exponential back-off ile retry.
 */
export const callClaude = async (
  prompt,
  apiKey,
  model     = DEFAULT_SETTINGS.model,
  { retries = 2, baseDelay = 1000 } = {},
) => {
  // Demo mod: key yoksa veya geçerli prefix ile başlamıyorsa
  if (!isApiKeyActive(apiKey)) {
    await delay(1500);
    return getDemoResponse(prompt);
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await _singleCall(prompt, apiKey, model);
    } catch (err) {
      lastError = err;
      const retryable = err.message.includes('529') || err.message.includes('overloaded');
      if (!retryable || attempt === retries) break;
      await delay(baseDelay * 2 ** attempt);
    }
  }
  throw lastError;
};

// ─── API Anahtarı Doğrulama ───────────────────────────────────────────────────

/** Geçerli bir Anthropic API anahtarı mı? */
export const isApiKeyActive = (key) =>
  Boolean(key && key.startsWith(API_KEY_PREFIX));

/**
 * @returns {{ status: 'active'|'invalid'|'empty', message: string }}
 */
export const getApiKeyStatus = (key) => {
  if (!key)                         return { status: 'empty',   message: '— API anahtarı girilmedi, demo mod aktif' };
  if (!key.startsWith(API_KEY_PREFIX)) return { status: 'invalid', message: '⚠ Geçersiz format (sk-ant-api... ile başlamalı)' };
  return                                   { status: 'active',  message: '✓ API anahtarı aktif — gerçek analiz modu' };
};

// ─── Sosyal Paylaşım ──────────────────────────────────────────────────────────

export const buildShareUrl = (platform, url, durumCfg) => {
  const text = `Haber Doğrulama Sonucu: ${durumCfg.emoji} ${durumCfg.label}`;
  const map  = {
    twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  };
  return map[platform] ?? '#';
};

export const shareToSocial = (platform, url, durumCfg) => {
  window.open(buildShareUrl(platform, url, durumCfg), '_blank', 'width=600,height=400,noopener,noreferrer');
};

// ─── Clipboard ────────────────────────────────────────────────────────────────

export const copyToClipboard = async (text) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Eski tarayıcı fallback
    const el = Object.assign(document.createElement('textarea'), {
      value: text,
      style: 'position:fixed;opacity:0',
    });
    document.body.appendChild(el);
    el.focus(); el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
};

// ─── Async Yardımcıları ───────────────────────────────────────────────────────

export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const debounce = (fn, wait) => {
  let timer;
  const debounced = (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
};

export const throttle = (fn, limit) => {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= limit) { lastCall = now; fn(...args); }
  };
};

// ─── Biçimlendirme ────────────────────────────────────────────────────────────

export const formatDate = (iso, locale = 'tr-TR') =>
  new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

export const truncateUrl = (url, maxLen = HISTORY_LINK_PREVIEW_LEN) =>
  url.length > maxLen ? `${url.slice(0, maxLen)}…` : url;

// ─── CSS Değişkenleri ─────────────────────────────────────────────────────────

export const setCssVars = (vars) => {
  for (const [k, v] of Object.entries(vars))
    document.documentElement.style.setProperty(k, v);
};

export const hexWithAlpha = (hex, alpha = 0.13) =>
  `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
import { useState, useEffect, useRef } from 'react';
import './App.css';

// ─── Sabitler ───────────────────────────────────────────────────────────────

const DURUM_CONFIG = {
  dogru:     { color: '#10b981', label: 'Doğru',     emoji: '✓' },
  yanlis:    { color: '#ef4444', label: 'Yanlış',    emoji: '✗' },
  yaniltici: { color: '#f97316', label: 'Yanıltıcı', emoji: '⚠' },
  belirsiz:  { color: '#6b7280', label: 'Belirsiz',  emoji: '?' },
  hata:      { color: '#ef4444', label: 'Hata',      emoji: '⚠' },
};

const LANG_PROMPTS = {
  tr: (url, notlar, depth) => `Sen bir haber ve bilimsel makale doğrulama uzmanısın. Verilen içeriği analiz et ve YALNIZCA şu formatta yanıt ver:

1. İçeriğin özeti:
[2-3 cümlelik kısa özet]

2. Sonuç: [Doğru / Yanlış / Yanıltıcı / Belirsiz]

3. Ana bulgular ve kanıtlar:
[Madde madde bulgular]

4. Önemli uyarılar:
[Okuyucunun dikkat etmesi gerekenler]
${depth === 'deep' ? `
5. Kaynak önerileri:
[Doğrulama için başvurulabilecek güvenilir kaynaklar]

6. Bağlam ve geçmiş:
[Konuyla ilgili daha geniş bağlam]` : ''}

Analiz edilecek içerik: ${url}
${notlar ? `Ek notlar: ${notlar}` : ''}`,

  en: (url, notlar, depth) => `You are a fact-checking expert specializing in news and scientific articles. Analyze the given content and respond ONLY in this format:

1. Content summary:
[2-3 sentence summary]

2. Verdict: [True / False / Misleading / Uncertain]

3. Key findings and evidence:
[Bullet points]

4. Important caveats:
[What readers should watch out for]
${depth === 'deep' ? `
5. Source recommendations:
[Reliable sources for verification]

6. Context and background:
[Broader context]` : ''}

Content to analyze: ${url}
${notlar ? `Additional notes: ${notlar}` : ''}`,

  ar: (url, notlar, depth) => `أنت خبير في التحقق من الأخبار والمقالات العلمية. حلل المحتوى المعطى وأجب فقط بهذا التنسيق:

1. ملخص المحتوى:
[ملخص بجملتين أو ثلاث]

2. الحكم: [صحيح / خاطئ / مضلل / غير مؤكد]

3. النتائج والأدلة الرئيسية:
[نقاط]

4. تحذيرات مهمة:
[ما يجب على القراء الانتباه إليه]

المحتوى للتحليل: ${url}
${notlar ? `ملاحظات إضافية: ${notlar}` : ''}`,
};

// ─── Demo Yanıtları (API key yokken) ────────────────────────────────────────

const getDemoResponse = (url) => {
  const u = url.toLowerCase();
  if (u.includes('dogru'))
    return `1. İçeriğin özeti:\nVerilen içerik güvenilir kaynaklarca doğrulanmış bilgiler içermektedir.\n\n2. Sonuç: Doğru\n\n3. Ana bulgular ve kanıtlar:\n• Resmî makamlar olayı doğrulamıştır\n• Reuters ve AA haberi teyit etmiştir\n• Birden fazla bağımsız kaynak uyuşmaktadır\n\n4. Önemli uyarılar:\nİçerik güncel ve tarafsız kaynaklardan alınmıştır.`;
  if (u.includes('yanlis'))
    return `1. İçeriğin özeti:\nHaberde yer alan iddialar doğrulanamamış ya da yanlış olduğu kanıtlanmıştır.\n\n2. Sonuç: Yanlış\n\n3. Ana bulgular ve kanıtlar:\n• İlgili kurumlar resmi olarak yalanlamıştır\n• Birincil kaynak bulunamadı\n• Yanlış bağlamda kullanılan görsel saptandı\n\n4. Önemli uyarılar:\nBu tür içerikleri paylaşmadan önce birden fazla kaynakla teyit edin.`;
  if (u.includes('yaniltici'))
    return `1. İçeriğin özeti:\nOlay gerçek olsa da sunuş biçimi okuyucuyu yanıltmaktadır.\n\n2. Sonuç: Yanıltıcı\n\n3. Ana bulgular ve kanıtlar:\n• Kullanılan görsel farklı bir tarihten alınmış\n• Bağlamdan kopuk istatistik kullanılmış\n• Eksik bilgiyle yanlış çıkarım yaptırılıyor\n\n4. Önemli uyarılar:\nOrijinal kaynağı ve tam bağlamı araştırın.`;
  return `1. İçeriğin özeti:\nVerilen içerik henüz güvenilir kaynaklarca teyit edilmemiştir.\n\n2. Sonuç: Belirsiz\n\n3. Ana bulgular ve kanıtlar:\n• Yalnızca sosyal medyada yer almaktadır\n• Ana akım medyada haber yok\n• Resmi açıklama bekleniyor\n\n4. Önemli uyarılar:\nKesin bir kanaat bildirmek için yeterli veri bulunmamaktadır.`;
};

// ─── API ─────────────────────────────────────────────────────────────────────

const callClaude = async (prompt, apiKey, model) => {
  if (!apiKey || !apiKey.startsWith('sk-ant')) {
    await new Promise((r) => setTimeout(r, 2000)); // demo gecikme
    return getDemoResponse(prompt);
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API hatası: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || 'Yanıt alınamadı.';
};

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

const determineDurum = (text) => {
  const t = text.toLowerCase();
  if (
    (t.includes('doğru') || t.includes('true') || t.includes('صحيح')) &&
    !t.includes('yanlış') && !t.includes('yanıltıcı') &&
    !t.includes('false') && !t.includes('misleading')
  ) return 'dogru';
  if (t.includes('yanlış') || t.includes('false') || t.includes('خاطئ')) return 'yanlis';
  if (t.includes('yanıltıcı') || t.includes('misleading') || t.includes('مضلل')) return 'yaniltici';
  return 'belirsiz';
};

const loadSettings = () => {
  try { return JSON.parse(localStorage.getItem('yd_settings') || '{}'); }
  catch { return {}; }
};

const saveSettings = (s) => {
  localStorage.setItem('yd_settings', JSON.stringify(s));
};

const loadGecmisFromStorage = () => {
  try { return JSON.parse(localStorage.getItem('haber_gecmisi') || '[]'); }
  catch { return []; }
};

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export default function App() {
  // Mod
  const [mod, setModState] = useState('single');

  // Form
  const [link, setLink] = useState('');
  const [notlar, setNotlar] = useState('');
  const [compareLinks, setCompareLinks] = useState(['', '']);

  // Sonuçlar
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const [compareResults, setCompareResults] = useState([]);

  // Paneller
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gecmisOpen, setGecmisOpen] = useState(false);

  // Geçmiş
  const [gecmis, setGecmis] = useState([]);

  // Ayarlar state'leri
  const [apiKey, setApiKey] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);
  const [model, setModel] = useState('claude-sonnet-4-20250514');
  const [lang, setLang] = useState('tr');
  const [depth, setDepth] = useState('normal');
  const [accent, setAccent] = useState('#dc2626');
  const [siteTitle, setSiteTitle] = useState('Yalan mıyız?');
  const [badgeText, setBadgeText] = useState('DOĞRULUK KONTROLÜ SİSTEMİ');
  const [font, setFont] = useState('Georgia, serif');

  // Kaydet bildirimi
  const [saveConfirm, setSaveConfirm] = useState(false);

  // Kopyalandı
  const [kopyalandi, setKopyalandi] = useState(false);

  // ─── İlk yükleme ───────────────────────────────────────────────────────────

  useEffect(() => {
    const s = loadSettings();
    if (s.apiKey)    setApiKey(s.apiKey);
    if (s.model)     setModel(s.model);
    if (s.lang)      setLang(s.lang);
    if (s.depth)     setDepth(s.depth);
    if (s.accent)    setAccent(s.accent);
    if (s.siteTitle) setSiteTitle(s.siteTitle);
    if (s.badgeText) setBadgeText(s.badgeText);
    if (s.font)      setFont(s.font);
    setGecmis(loadGecmisFromStorage());
  }, []);

  // Dinamik vurgu rengi CSS değişkeni
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
    const dark = accent + '22';
    document.documentElement.style.setProperty('--accent-dim', dark);
  }, [accent]);

  // Yazı tipi
  useEffect(() => {
    document.body.style.fontFamily = font;
  }, [font]);

  // ─── Ayarlar kaydet ────────────────────────────────────────────────────────

  const handleSaveSettings = () => {
    saveSettings({ apiKey, model, lang, depth, accent, siteTitle, badgeText, font });
    setSaveConfirm(true);
    setTimeout(() => setSaveConfirm(false), 2000);
  };

  const handleResetSettings = () => {
    if (!window.confirm('Tüm ayarlar sıfırlanacak. Emin misiniz?')) return;
    localStorage.removeItem('yd_settings');
    window.location.reload();
  };

  // ─── Geçmiş ────────────────────────────────────────────────────────────────

  const saveToGecmis = (savedLink, savedSonuc) => {
    const item = {
      id: Date.now().toString(),
      link: savedLink,
      sonuc: savedSonuc,
      timestamp: new Date().toISOString(),
    };
    const updated = [item, ...loadGecmisFromStorage()].slice(0, 10);
    localStorage.setItem('haber_gecmisi', JSON.stringify(updated));
    setGecmis(updated);
  };

  const deleteFromGecmis = (id) => {
    const updated = loadGecmisFromStorage().filter((i) => i.id !== id);
    localStorage.setItem('haber_gecmisi', JSON.stringify(updated));
    setGecmis(updated);
  };

  const loadFromGecmis = (item) => {
    setModState('single');
    setLink(item.link);
    setSonuc(item.sonuc);
    setGecmisOpen(false);
  };

  // ─── Kontroller ────────────────────────────────────────────────────────────

  const singleCheck = async () => {
    if (!link.trim()) { alert('Lütfen bir link girin'); return; }
    setYukleniyor(true);
    setSonuc(null);
    try {
      const prompt = LANG_PROMPTS[lang](link, notlar, depth);
      const metin = await callClaude(prompt, apiKey, model);
      const result = { durum: determineDurum(metin), icerik: metin };
      setSonuc(result);
      saveToGecmis(link, result);
    } catch (e) {
      setSonuc({ durum: 'hata', icerik: `Hata: ${e.message}` });
    } finally {
      setYukleniyor(false);
    }
  };

  const multiCheck = async () => {
    const validLinks = compareLinks.filter((l) => l.trim());
    if (validLinks.length < 2) { alert('En az 2 link girin'); return; }
    setYukleniyor(true);
    setCompareResults([]);
    const results = [];
    for (const currentLink of validLinks) {
      try {
        const prompt = LANG_PROMPTS[lang](currentLink, '', depth);
        const metin = await callClaude(prompt, apiKey, model);
        results.push({ link: currentLink, durum: determineDurum(metin), icerik: metin });
      } catch (e) {
        results.push({ link: currentLink, durum: 'hata', icerik: `Hata: ${e.message}` });
      }
    }
    setCompareResults(results);
    setYukleniyor(false);
  };

  const haberiKontrolEt = () => (mod === 'single' ? singleCheck() : multiCheck());

  // ─── Karşılaştırma link yönetimi ──────────────────────────────────────────

  const addLinkField = () => {
    if (compareLinks.length < 5) setCompareLinks([...compareLinks, '']);
  };

  const updateCompareLink = (i, val) => {
    const updated = [...compareLinks];
    updated[i] = val;
    setCompareLinks(updated);
  };

  const removeCompareLink = (i) => {
    if (compareLinks.length > 2) setCompareLinks(compareLinks.filter((_, idx) => idx !== i));
  };

  // ─── Paylaş / Kopyala ─────────────────────────────────────────────────────

  const shareToSocial = (platform) => {
    if (!sonuc) return;
    const { emoji, label } = DURUM_CONFIG[sonuc.durum];
    const text = `Haber Doğrulama Sonucu: ${emoji} ${label}`;
    const urls = {
      twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`,
    };
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 2000);
  };

  // ─── Yardımcı değerler ────────────────────────────────────────────────────

  const isApiActive = apiKey && apiKey.startsWith('sk-ant');
  const isSubmitDisabled =
    yukleniyor ||
    (mod === 'single' ? !link.trim() : compareLinks.filter((l) => l.trim()).length < 2);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="container">
      <div className="bg-pattern" />
      <div className="bg-gradient" />

      <div className="content">

        {/* ── Header ── */}
        <header className="header">
          <div className="header-badge">{badgeText}</div>
          <h1 className="main-title">{siteTitle}</h1>
          <p className="subtitle">
            Haberleri ve makaleleri yapıştırın veya karşılaştırın.
            Dezenformasyonla mücadele için yapay zeka desteği.
          </p>

          <div className="mode-toggle">
            <button className={`mode-btn ${mod === 'single' ? 'active' : ''}`} onClick={() => { setModState('single'); setSonuc(null); setCompareResults([]); }}>
              🔗 Tekli Kontrol
            </button>
            <button className={`mode-btn ${mod === 'compare' ? 'active' : ''}`} onClick={() => { setModState('compare'); setSonuc(null); setCompareResults([]); }}>
              📊 Karşılaştır
            </button>
            <button className={`mode-btn ${gecmisOpen ? 'active' : ''}`} onClick={() => { setGecmisOpen(!gecmisOpen); setSettingsOpen(false); }}>
              🕐 Geçmiş <span className="gecmis-badge">{gecmis.length}</span>
            </button>
            <button className={`mode-btn ${settingsOpen ? 'active' : ''}`} onClick={() => { setSettingsOpen(!settingsOpen); setGecmisOpen(false); }}>
              ⚙️ Ayarlar
            </button>
          </div>
        </header>

        {/* ── Ayarlar Paneli ── */}
        {settingsOpen && (
          <div className="settings-panel">
            <div className="settings-header">
              <span className="settings-title">⚙ Kişisel Ayarlar</span>
              <button className="history-close-btn" onClick={() => setSettingsOpen(false)}>✕</button>
            </div>

            <div className="settings-grid">
              {/* API Key */}
              <div className="settings-section full-width">
                <span className="settings-label">🔑 Anthropic API Anahtarı</span>
                <div className="api-key-row">
                  <input
                    className="settings-input"
                    type={keyVisible ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    autoComplete="off"
                  />
                  <button className="toggle-key-btn" onClick={() => setKeyVisible(!keyVisible)}>
                    {keyVisible ? '🔒' : '👁'}
                  </button>
                </div>
                <div className={`api-key-status ${isApiActive ? 'ok' : 'empty'}`}>
                  {isApiActive
                    ? '✓ API anahtarı aktif — gerçek analiz modu'
                    : apiKey
                    ? '⚠ Geçersiz format (sk-ant... ile başlamalı)'
                    : '— API anahtarı girilmedi, demo mod aktif'}
                </div>
                <div className="api-key-note">
                  Anthropic Console'dan edinebilirsiniz:{' '}
                  <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
                    console.anthropic.com
                  </a>
                  {' '}— Anahtar yalnızca tarayıcınızda saklanır.
                </div>
              </div>

              {/* Model */}
              <div className="settings-section">
                <span className="settings-label">🤖 Model</span>
                <select className="model-select" value={model} onChange={(e) => setModel(e.target.value)}>
                  <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Önerilen)</option>
                  <option value="claude-opus-4-20250514">Claude Opus 4 (En Güçlü)</option>
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Hızlı)</option>
                </select>
              </div>

              {/* Dil */}
              <div className="settings-section">
                <span className="settings-label">🌐 Yanıt Dili</span>
                <div className="option-group">
                  {[['tr','🇹🇷 Türkçe'], ['en','🇬🇧 English'], ['ar','🇸🇦 العربية']].map(([code, label]) => (
                    <button key={code} className={`option-btn ${lang === code ? 'selected' : ''}`} onClick={() => setLang(code)}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Analiz Derinliği */}
              <div className="settings-section">
                <span className="settings-label">🔬 Analiz Modu</span>
                <div className="option-group">
                  {[['normal','Normal'], ['deep','Derin'], ['fast','Hızlı']].map(([key, label]) => (
                    <button key={key} className={`option-btn ${depth === key ? 'selected' : ''}`} onClick={() => setDepth(key)}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Yazı Tipi */}
              <div className="settings-section">
                <span className="settings-label">✍ Yazı Tipi</span>
                <div className="option-group">
                  {[['Georgia, serif','Georgia'], ['system-ui, sans-serif','System'], ['monospace','Mono']].map(([f, label]) => (
                    <button key={f} className={`option-btn ${font === f ? 'selected' : ''}`} style={{ fontFamily: f }} onClick={() => setFont(f)}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Vurgu Rengi */}
              <div className="settings-section">
                <span className="settings-label">🎨 Vurgu Rengi</span>
                <div className="color-options">
                  {['#dc2626','#7c3aed','#0891b2','#059669','#d97706'].map((c) => (
                    <div
                      key={c}
                      className={`color-dot ${accent === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setAccent(c)}
                    />
                  ))}
                </div>
              </div>

              {/* Site Başlığı */}
              <div className="settings-section">
                <span className="settings-label">📌 Site Başlığı</span>
                <input
                  className="settings-input"
                  type="text"
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                  placeholder="Yalan mıyız?"
                />
              </div>

              {/* Rozet */}
              <div className="settings-section">
                <span className="settings-label">🏷 Rozet Yazısı</span>
                <input
                  className="settings-input"
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="DOĞRULUK KONTROLÜ SİSTEMİ"
                />
              </div>
            </div>

            <hr className="settings-divider" />

            <div className="settings-actions">
              <button className="settings-save-btn" onClick={handleSaveSettings}>💾 Kaydet</button>
              <button className="settings-reset-btn" onClick={handleResetSettings}>Sıfırla</button>
              <span className={`settings-save-confirm ${saveConfirm ? 'show' : ''}`}>✓ Kaydedildi</span>
            </div>
          </div>
        )}

        {/* ── Geçmiş Paneli ── */}
        {gecmisOpen && (
          <div className="history-panel">
            <div className="history-header">
              <h3 className="history-title">Son Kontroller</h3>
              <button className="history-close-btn" onClick={() => setGecmisOpen(false)}>▲</button>
            </div>
            {gecmis.length === 0 ? (
              <p className="history-empty">Henüz kontrol edilmiş içerik yok</p>
            ) : (
              <div className="history-list">
                {gecmis.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-item-header">
                      <div className="history-badge" style={{ background: DURUM_CONFIG[item.sonuc.durum].color }}>
                        {DURUM_CONFIG[item.sonuc.durum].emoji}
                      </div>
                      <div className="history-item-info">
                        <p className="history-item-link">{item.link.slice(0, 55)}…</p>
                        <p className="history-item-time">{new Date(item.timestamp).toLocaleDateString('tr-TR')}</p>
                      </div>
                      <div className="history-item-actions">
                        <button className="history-action-btn" title="Görüntüle" onClick={() => loadFromGecmis(item)}>👁</button>
                        <button className="history-action-btn" title="Sil" onClick={() => deleteFromGecmis(item.id)}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Form ── */}
        <div className="form-card">
          {/* API uyarısı */}
          {!isApiActive && (
            <div className="no-api-warning">
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span className="no-api-warning-text">
                Demo moddasınız — gerçek analiz için{' '}
                <span className="no-api-warning-link" onClick={() => { setSettingsOpen(true); setGecmisOpen(false); }}>
                  API anahtarı ekleyin
                </span>.
              </span>
            </div>
          )}

          {/* Tekli mod */}
          {mod === 'single' && (
            <>
              <div className="input-group">
                <label className="input-label">🔗 Haber veya Makale Linki</label>
                <input
                  type="url"
                  className="input-field"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://www.ornek-haber.com/haber-basligi"
                  disabled={yukleniyor}
                />
              </div>
              <div className="input-group">
                <label className="input-label">
                  📄 Ek Notlar <span className="input-label-opt">(Opsiyonel)</span>
                </label>
                <textarea
                  className="textarea-field"
                  value={notlar}
                  onChange={(e) => setNotlar(e.target.value)}
                  placeholder="Kontrol edilmesini istediğiniz özel noktalar, iddia edilen bilgiler..."
                  rows={3}
                  disabled={yukleniyor}
                />
              </div>
            </>
          )}

          {/* Karşılaştırma modu */}
          {mod === 'compare' && (
            <div>
              <p className="compare-label">Karşılaştırmak istediğiniz linkleri girin:</p>
              {compareLinks.map((l, i) => (
                <div key={i} className="compare-link-group">
                  <span className="compare-link-number">{i + 1}</span>
                  <input
                    type="url"
                    className="compare-input"
                    value={l}
                    onChange={(e) => updateCompareLink(i, e.target.value)}
                    placeholder="https://..."
                    disabled={yukleniyor}
                  />
                  {compareLinks.length > 2 && (
                    <button className="remove-btn" onClick={() => removeCompareLink(i)} disabled={yukleniyor}>✕</button>
                  )}
                </div>
              ))}
              {compareLinks.length < 5 && (
                <button className="add-link-btn" onClick={addLinkField} disabled={yukleniyor}>
                  + Kaynak Ekle
                </button>
              )}
            </div>
          )}

          <button className="submit-btn" onClick={haberiKontrolEt} disabled={isSubmitDisabled}>
            {yukleniyor ? (
              <span className="loading-content">
                <span className="spinning">⟳</span>
                <span className="loading-text">Analiz ediliyor...</span>
              </span>
            ) : (
              mod === 'single' ? '✓ DOĞRULUĞU ANALİZ ET' : '📊 KAYNAKLARI KARŞILAŞTIR'
            )}
          </button>
        </div>

        {/* ── Tekli Sonuç ── */}
        {mod === 'single' && sonuc && (() => {
          const cfg = DURUM_CONFIG[sonuc.durum];
          return (
            <div className="result-card">
              <div className="result-header">
                <div className={`result-icon ${sonuc.durum}`}>{cfg.emoji}</div>
                <div className="result-title-wrapper">
                  <h2 className="result-title">Doğrulama Sonucu</h2>
                  <div className={`result-badge ${sonuc.durum}`}>{cfg.emoji} {cfg.label}</div>
                </div>
              </div>

              <div className="result-content">
                <div className="result-text">{sonuc.icerik}</div>
              </div>

              <div className="share-actions">
                <button className="share-btn x-btn" onClick={() => shareToSocial('twitter')}>𝕏 X'te Paylaş</button>
                <button className="share-btn wa-btn" onClick={() => shareToSocial('whatsapp')}>💬 WhatsApp</button>
                <button className="share-btn copy-link-btn" onClick={copyLink}>
                  {kopyalandi ? '✓ Kopyalandı' : '🔗 Bağlantıyı Kopyala'}
                </button>
              </div>

              <button className="reset-btn" onClick={() => { setSonuc(null); setLink(''); setNotlar(''); }}>
                + Yeni İçerik Kontrol Et
              </button>
            </div>
          );
        })()}

        {/* ── Karşılaştırma Sonuçları ── */}
        {mod === 'compare' && compareResults.length > 0 && (
          <div className="compare-results">
            <h2 className="compare-results-title">Karşılaştırma Sonuçları</h2>
            <div className="compare-grid">
              {compareResults.map((result, i) => {
                const cfg = DURUM_CONFIG[result.durum];
                return (
                  <div key={i} className="compare-card">
                    <div className="compare-card-header">
                      <div className="compare-card-badge" style={{ background: cfg.color }}>{cfg.emoji}</div>
                      <div>
                        <span className="compare-card-number">Kaynak {i + 1}</span>
                        <div className="compare-card-verdict" style={{ color: cfg.color }}>{cfg.label}</div>
                      </div>
                    </div>
                    <p className="compare-card-link" title={result.link}>{result.link}</p>
                    <div className="compare-card-content">{result.icerik}</div>
                  </div>
                );
              })}
            </div>
            <button className="reset-btn" onClick={() => { setCompareResults([]); setCompareLinks(['', '']); }}>
              + Yeni Karşılaştırma Yap
            </button>
          </div>
        )}

        <footer className="footer">
          <p>Yapay zeka destekli haber ve makale doğrulama sistemi</p>
          <p className="footer-small">v2.0 — Anthropic Claude</p>
        </footer>

      </div>
    </div>
  );
}
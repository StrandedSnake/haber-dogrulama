import React, { useState, useEffect } from 'react';
import './App.css';
import {
  CheckCircle2, XCircle, AlertCircle, Loader2,
  Link2, FileText, Play, X, Share2,
  MessageCircle, History, TrendingUp,
  ArrowRight, Plus, Trash2, Eye, ChevronDown, ChevronUp, Check
} from 'lucide-react';

const DURUM_CONFIG = {
  dogru:     { icon: CheckCircle2, color: '#10b981', label: 'Doğru',    emoji: '✓' },
  yanlis:    { icon: XCircle,      color: '#ef4444', label: 'Yanlış',   emoji: '✗' },
  yaniltici: { icon: AlertCircle,  color: '#f97316', label: 'Yanıltıcı', emoji: '⚠' },
  belirsiz:  { icon: AlertCircle,  color: '#6b7280', label: 'Belirsiz',  emoji: '?' },
  hata:      { icon: XCircle,      color: '#ef4444', label: 'Hata',     emoji: '⚠' },
};

export default function HaberDogrulamaSitesi() {
  const [mod, setMod] = useState('single');
  const [link, setLink] = useState('');
  const [links, setLinks] = useState(['', '']);
  const [notlar, setNotlar] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const [sonuclar, setSonuclar] = useState([]);
  const [gecmis, setGecmis] = useState([]);
  const [gecmisGoster, setGecmisGoster] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(link);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 2000);
  };

  useEffect(() => {
    loadGecmis();
  }, []);

  /* ─── Storage (localStorage ile Güncellendi) ─────────── */

  const loadGecmis = () => {
    try {
      const veriler = localStorage.getItem('haber_gecmisi');
      if (veriler) {
        const items = JSON.parse(veriler);
        // Tarihe göre sırala (en yeni en üstte)
        items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setGecmis(items.slice(0, 10));
      }
    } catch (e) {
      console.error("Geçmiş yüklenirken hata:", e);
    }
  };

  const saveToGecmis = (savedLink, savedSonuc) => {
    try {
      const item = {
        id: Date.now().toString(),
        link: savedLink,
        sonuc: savedSonuc,
        timestamp: new Date().toISOString(),
      };
      
      const mevcutGecmis = JSON.parse(localStorage.getItem('haber_gecmisi') || '[]');
      const yeniGecmis = [item, ...mevcutGecmis].slice(0, 10); // Sadece son 10 kaydı tut
      
      localStorage.setItem('haber_gecmisi', JSON.stringify(yeniGecmis));
      setGecmis(yeniGecmis);
    } catch (e) {
      console.error("Kaydedilirken hata:", e);
    }
  };

  const deleteFromGecmis = (id) => {
    try {
      const mevcutGecmis = JSON.parse(localStorage.getItem('haber_gecmisi') || '[]');
      const yeniGecmis = mevcutGecmis.filter(item => item.id !== id);
      
      localStorage.setItem('haber_gecmisi', JSON.stringify(yeniGecmis));
      setGecmis(yeniGecmis);
    } catch (e) {
      console.error("Silinirken hata:", e);
    }
  };

  /* ─── Helpers ──────────────────────────────────────────── */

  const determineDurum = (text) => {
    const t = text.toLowerCase();
    if (t.includes('doğru') && !t.includes('yanlış') && !t.includes('yanıltıcı')) return 'dogru';
    if (t.includes('yanlış'))   return 'yanlis';
    if (t.includes('yanıltıcı')) return 'yaniltici';
    return 'belirsiz';
  };

  /* SUNUM İÇİN MOCK (SAHTE) API ÇAĞRISI */
  const callClaude = async (prompt) => {
    // Sunumda "yapay zeka düşünüyor" hissiyatı vermek için 2 saniyelik bekleme
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Prompt'un içinden linki yakalayalım
    const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0].toLowerCase() : "";

    // Hata durumunu göstermek için:
    if (url.includes("hata")) {
      throw new Error("Sunucuya bağlanılamadı (Demo Hatası)");
    }

    // Doğru durumunu göstermek için:
    if (url.includes("dogru")) {
      return `1. Haberin özeti: İddia edilen olaylar ve veriler gerçeği yansıtmaktadır.
2. Sonuç: Doğru
3. Ana bulgular ve kanıtlar: Resmî makamlar ve güvenilir haber ajansları (Reuters, AA) bu durumu olay yerinden doğrulamıştır.
4. Önemli uyarılar: Metin tamamen objektif verilerle hazırlanmıştır, eksik bilgi bulunmamaktadır.`;
    } 
    
    // Yanlış durumunu göstermek için:
    else if (url.includes("yanlis")) {
      return `1. Haberin özeti: Haberde bahsedilen iddialar tamamen kurgusaldır.
2. Sonuç: Yanlış
3. Ana bulgular ve kanıtlar: İlgili kurumlar böyle bir durumun olmadığını resmî hesaplarından yalanlamıştır.
4. Önemli uyarılar: Bu haber halkı paniğe sürüklemek amacıyla üretilmiş bir dezenformasyondur.`;
    } 
    
    // Yanıltıcı durumunu göstermek için:
    else if (url.includes("yaniltici")) {
      return `1. Haberin özeti: Olayın yaşandığı doğru olsa da, kullanılan görseller ve bağlam farklıdır.
2. Sonuç: Yanıltıcı
3. Ana bulgular ve kanıtlar: Haberdeki video gerçek ancak geçmiş yıllarda farklı bir yerde çekilmiş.
4. Önemli uyarılar: Okuyucular görselin kaynağına dikkat etmelidir, bağlamdan koparılmış içerik.`;
    } 
    
    // Diğer tüm linkler için Belirsiz dönecek:
    else {
      return `1. Haberin özeti: İddialar henüz güvenilir kaynaklarca teyit edilmemiştir.
2. Sonuç: Belirsiz
3. Ana bulgular ve kanıtlar: Sadece birkaç anonim sosyal medya hesabı tarafından paylaşılmış, ana akım medyada yer almamıştır.
4. Önemli uyarılar: Konuyla ilgili yetkililerden resmî bir açıklama beklenmektedir, şu an için kesin bir yargıya varmak güçtür.`;
    }
  };

  /* ─── Kontrol işlemleri ────────────────────────────────── */

  const singleCheck = async () => {
    if (!link.trim()) { alert('Lütfen bir haber linki girin'); return; }
    setYukleniyor(true);
    setSonuc(null);
    try {
      const prompt = `Bu haber linkini kontrol et ve doğruluğunu değerlendir: ${link}
${notlar ? `Ek Notlar: ${notlar}` : ''}`;

      const metin = await callClaude(prompt);
      const result = { durum: determineDurum(metin), icerik: metin };
      setSonuc(result);
      saveToGecmis(link, result); // Burada await'i kaldırdık çünkü artık localStorage kullanıyoruz
    } catch {
      setSonuc({ durum: 'hata', icerik: 'Haberi kontrol ederken bir hata oluştu. Lütfen tekrar deneyin.' });
    } finally {
      setYukleniyor(false);
    }
  };

  const multiCheck = async () => {
    const validLinks = links.filter(l => l.trim());
    if (validLinks.length < 2) { alert('Karşılaştırma için en az 2 link girin'); return; }
    setYukleniyor(true);
    setSonuclar([]);
    const results = [];
    for (const currentLink of validLinks) {
      try {
        const prompt = `Bu haber linkini kontrol et: ${currentLink}`;
        const metin = await callClaude(prompt);
        results.push({ link: currentLink, durum: determineDurum(metin), icerik: metin });
      } catch {
        results.push({ link: currentLink, durum: 'hata', icerik: 'Kontrol edilemedi' });
      }
    }
    setSonuclar(results);
    setYukleniyor(false);
  };

  const haberiKontrolEt = () => mod === 'single' ? singleCheck() : multiCheck();

  /* ─── Paylaşma ─────────────────────────────────────────── */

  const shareToSocial = (platform) => {
    if (!sonuc) return;
    const { emoji, label } = DURUM_CONFIG[sonuc.durum];
    const text = `Haber Doğrulama Sonucu: ${emoji} ${label}`;
    const urls = {
      twitter:   `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
      whatsapp:  `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`,
    };
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  /* ─── Compare helpers ──────────────────────────────────── */

  const addLinkField = () => { if (links.length < 5) setLinks([...links, '']); };
  const updateLink = (i, val) => { const n = [...links]; n[i] = val; setLinks(n); };
  const removeLink = (i) => { if (links.length > 2) setLinks(links.filter((_, idx) => idx !== i)); };

  const isSubmitDisabled = yukleniyor || (
    mod === 'single' ? !link.trim() : links.filter(l => l.trim()).length < 2
  );

  /* ─── Render ────────────────────────────────────────────── */

  return (
    <div className="container">
      <div className="bg-pattern" />
      <div className="bg-gradient" />

      <div className="content">

        {/* ── Header ── */}
        <header className="header">
          <div className="header-badge">DOĞRULUK KONTROLÜ SİSTEMİ</div>
          <h1 className="main-title">Yalan mıyız?</h1>
          <p className="subtitle">Haberleri sürükleyin, yapıştırın veya karşılaştırın. Dezenformasyonla mücadele için yapay zeka desteği.</p>

          <div className="mode-toggle">
            <button className={`mode-btn ${mod === 'single' ? 'active' : ''}`} onClick={() => setMod('single')}>
              <Link2 size={18} /> Tekli Kontrol
            </button>
            <button className={`mode-btn ${mod === 'compare' ? 'active' : ''}`} onClick={() => setMod('compare')}>
              <TrendingUp size={18} /> Karşılaştır
            </button>
            <button className={`mode-btn ${gecmisGoster ? 'active' : ''}`} onClick={() => setGecmisGoster(!gecmisGoster)}>
              <History size={18} /> Geçmiş <span className="gecmis-badge">{gecmis.length}</span>
            </button>
          </div>
        </header>

        {/* ── Geçmiş ── */}
        {gecmisGoster && (
          <div className="history-panel">
            <div className="history-header">
              <h3 className="history-title">Son Kontroller</h3>
              <button className="history-close-btn" onClick={() => setGecmisGoster(false)}>
                <ChevronUp size={20} />
              </button>
            </div>
            {gecmis.length === 0 ? (
              <p className="history-empty">Henüz kontrol edilmiş haber yok</p>
            ) : (
              <div className="history-list">
                {gecmis.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-item-header">
                      <div
                        className="history-badge"
                        style={{ background: DURUM_CONFIG[item.sonuc.durum].color }}
                      >
                        {DURUM_CONFIG[item.sonuc.durum].emoji}
                      </div>
                      <div className="history-item-info">
                        <p className="history-item-link">{item.link.slice(0, 50)}…</p>
                        <p className="history-item-time">
                          {new Date(item.timestamp).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <div className="history-item-actions">
                        <button
                          className="history-action-btn"
                          title="Görüntüle"
                          onClick={() => { setLink(item.link); setSonuc(item.sonuc); setMod('single'); setGecmisGoster(false); }}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="history-action-btn"
                          title="Sil"
                          onClick={() => deleteFromGecmis(item.id)}
                        >
                          <Trash2 size={16} />
                        </button>
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
          {mod === 'single' ? (
            <>
              <div className="input-group">
                <label className="input-label">
                  <Link2 size={20} /> Haber Linki
                </label>
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
                  <FileText size={20} /> Ek Notlar <span className="input-label-opt">(Opsiyonel)</span>
                </label>
                <textarea
                  className="textarea-field"
                  value={notlar}
                  onChange={(e) => setNotlar(e.target.value)}
                  placeholder="Kontrol edilmesini istediğiniz özel noktalar..."
                  rows="3"
                  disabled={yukleniyor}
                />
              </div>
            </>
          ) : (
            <div>
              <p className="compare-label">Karşılaştırmak istediğiniz haber linklerini girin:</p>
              {links.map((l, i) => (
                <div key={i} className="compare-link-group">
                  <span className="compare-link-number">{i + 1}</span>
                  <input
                    type="url"
                    className="compare-input"
                    value={l}
                    onChange={(e) => updateLink(i, e.target.value)}
                    placeholder="https://www.ornek-haber.com/haber-basligi"
                    disabled={yukleniyor}
                  />
                  {links.length > 2 && (
                    <button className="remove-btn" onClick={() => removeLink(i)} disabled={yukleniyor}>
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
              {links.length < 5 && (
                <button className="add-link-btn" onClick={addLinkField} disabled={yukleniyor}>
                  <Plus size={18} /> Kaynak Ekle
                </button>
              )}
            </div>
          )}

          <button className="submit-btn" onClick={haberiKontrolEt} disabled={isSubmitDisabled}>
            {yukleniyor ? (
              <div className="loading-content"><Loader2 size={20} className="spinning" /> <span className="loading-text">Analiz Ediliyor...</span></div>
            ) : (
              <><CheckCircle2 size={20} /> {mod === 'single' ? 'DOĞRULUĞU ANALİZ ET' : 'KAYNAKLARI KARŞILAŞTIR'}</>
            )}
          </button>
        </div>

        {/* ── Tekli Sonuç ── */}
        {mod === 'single' && sonuc && (() => {
          const cfg = DURUM_CONFIG[sonuc.durum];
          const Icon = cfg.icon;
          return (
            <div className="result-card">
              <div className="result-header">
                <div className={`result-icon ${sonuc.durum}`}>
                  <Icon size={32} color="currentColor" />
                </div>
                <div className="result-title-wrapper">
                  <h2 className="result-title">Doğrulama Sonucu</h2>
                  <div className={`result-badge ${sonuc.durum}`}>
                    {cfg.emoji} {cfg.label}
                  </div>
                </div>
              </div>

              <div className="result-content">
                <div className="result-text">{sonuc.icerik}</div>
              </div>

              {/* Paylaşım Butonları */}
              <div className="share-actions">
                <button className="share-btn x-btn" onClick={() => shareToSocial('twitter')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  X'te Paylaş
                </button>
                <button className="share-btn wa-btn" onClick={() => shareToSocial('whatsapp')}>
                  <MessageCircle size={16} /> WhatsApp
                </button>
                <button className="share-btn copy-link-btn" onClick={copyToClipboard}>
                  {kopyalandi ? <Check size={16} color="#10b981" /> : <Link2 size={16} />}
                  {kopyalandi ? 'Kopyalandı' : 'Bağlantıyı Kopyala'}
                </button>
              </div>

              <button className="reset-btn" onClick={() => { setSonuc(null); setLink(''); setNotlar(''); }}>
                Yeni Haber Kontrol Et
              </button>
            </div>
          );
        })()}

        {/* ── Karşılaştırma Sonuçları ── */}
        {mod === 'compare' && sonuclar.length > 0 && (
          <div className="compare-results">
            <h2 className="compare-results-title">Karşılaştırma Sonuçları</h2>
            <div className="compare-grid">
              {sonuclar.map((result, i) => {
                const cfg = DURUM_CONFIG[result.durum];
                return (
                  <div key={i} className="compare-card">
                    <div className="compare-card-header">
                      <div className="compare-card-badge" style={{ background: cfg.color }}>
                        {cfg.emoji}
                      </div>
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
            <button className="reset-btn" onClick={() => { setSonuclar([]); setLinks(['', '']); }}>
              Yeni Karşılaştırma Yap
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="footer">
          <p>Yapay zeka destekli haber doğrulama sistemi</p>
          <p className="footer-small">v1.0.0 (Demo Mode)</p>
        </footer>

      </div>
    </div>
  );
}
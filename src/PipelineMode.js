// ─────────────────────────────────────────────────────────────────────────────
// src/components/PipelineMode.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';

// ─── Demo Verisi ──────────────────────────────────────────────────────────────

const PIPELINE_DEMO = {
  explanation: "Analiz edilen içerikte iki temel iddia tespit edilmiştir. Deprem büyüklüğü ve can kaybı rakamları resmi kaynaklardaki verilerle çelişmektedir; COVID aşısının etkisizliği iddiası ise DSÖ ve Sağlık Bakanlığı verilerine dayanılarak çürütülmüştür.",
  newly_checked: [
    {
      claim: "İstanbul depremi 7.2 büyüklüğünde oldu ve 500'den fazla kişi hayatını kaybetti.",
      passages: [
        "AFAD açıklamasına göre depremin büyüklüğü 6.8 olarak ölçülmüş, resmi can kaybı 47 olarak açıklanmıştır.",
        "Kandilli Rasathanesi depremi 6.9 büyüklüğünde kayıt altına almış, merkez üssünün Marmara Denizi'nde olduğunu bildirmiştir.",
      ],
    },
    {
      claim: "Yeni COVID varyantı mevcut aşıları tamamen etkisiz hale getirdi.",
      passages: [
        "DSÖ raporuna göre mevcut aşılar yeni varyanta karşı %68 oranında koruma sağlamaktadır.",
      ],
    },
  ],
  already_checked: [
    {
      claim: "Türkiye'nin yıllık enflasyonu %200'ü geçti.",
      links: ["https://tuik.gov.tr/rapor/2024-03"],
    },
  ],
};

// ─── ClaimCard ────────────────────────────────────────────────────────────────
// Not: Önceki versiyonda PipelineMode içinde tanımlanıyordu →
// her render'da yeniden oluşturuluyordu. Dışarı alınarak sabitlendi.

function ClaimCard({ item, cardKey, isOpen, onToggle }) {
  const passages = item.passages ?? [];
  const links    = item.links    ?? [];
  const hasBody  = passages.length > 0 || links.length > 0;
  const isNew    = cardKey.startsWith('new-');

  return (
    <div className="pipeline-claim-card">
      <div
        className={`pipeline-claim-header${hasBody ? ' clickable' : ''}`}
        onClick={() => hasBody && onToggle(cardKey)}
      >
        <div className="pipeline-claim-num">{parseInt(cardKey.split('-')[1], 10) + 1}</div>
        <div className="pipeline-claim-main">
          <div className="pipeline-claim-text">{item.claim}</div>
          <div className="pipeline-claim-tags">
            <span className={`pipeline-tag ${isNew ? 'pipeline-tag-new' : 'pipeline-tag-checked'}`}>
              {isNew ? '⬤ Yeni' : '✓ Kontrol Edildi'}
            </span>
          </div>
        </div>
        {hasBody && (
          <span className={`pipeline-claim-chevron${isOpen ? ' open' : ''}`}>⌄</span>
        )}
      </div>

      {isOpen && hasBody && (
        <div className="pipeline-claim-body">
          {passages.map((p, i) => <div key={i} className="pipeline-passage">"{p}"</div>)}
          {links.map((l, i) => (
            <a key={i} href={l} target="_blank" rel="noreferrer" className="pipeline-link-pill">{l}</a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PipelineMode ─────────────────────────────────────────────────────────────

function PipelineMode() {
  const [pipelineUrl, setPipelineUrl] = useState('');
  const [yukleniyor,  setYukleniyor]  = useState(false);
  const [hata,        setHata]        = useState('');
  const [veri,        setVeri]        = useState(null);
  const [aciklar,     setAciklar]     = useState({});

  const toggle = useCallback(
    (key) => setAciklar((prev) => ({ ...prev, [key]: !prev[key] })),
    [],
  );

  const veriGetir = async () => {
    const url = pipelineUrl.trim();
    if (!url) { setHata('Lütfen bir URL girin.'); return; }

    setHata('');
    setYukleniyor(true);
    setVeri(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setVeri(await res.json());
      setAciklar({});
    } catch (e) {
      setHata('Veri alınamadı: ' + e.message);
    } finally {
      setYukleniyor(false);
    }
  };

  const newClaims   = veri?.newly_checked   ?? [];
  const oldClaims   = veri?.already_checked ?? [];
  const explanation = veri?.explanation     ?? '';

  const handleReset = () => { setVeri(null); setPipelineUrl(''); };

  return (
    <div>
      <div className="form-card">
        <div className="input-group">
          <label className="input-label">⬡ Pipeline JSON URL</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="url"
              className="input-field"
              value={pipelineUrl}
              onChange={(e) => setPipelineUrl(e.target.value)}
              placeholder="https://xxxx.ngrok.io/results"
            />
            <button
              className="submit-btn"
              style={{ width: 'auto', marginTop: 0 }}
              onClick={veriGetir}
              disabled={yukleniyor}
            >
              {yukleniyor ? '...' : '→ Getir'}
            </button>
          </div>
          {hata && <p style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>{hata}</p>}
        </div>
      </div>

      {!veri && !yukleniyor && (
        <div className="pipeline-empty">
          <button className="mode-btn" onClick={() => setVeri(PIPELINE_DEMO)}>
            Demo veri yükle
          </button>
        </div>
      )}

      {veri && (
        <>
          <div className="pipeline-explanation">
            <div className="pipeline-explanation-text">{explanation}</div>
          </div>

          <div className="pipeline-claims-list">
            {newClaims.map((item, i) => (
              <ClaimCard
                key={`new-${i}`}
                item={item}
                cardKey={`new-${i}`}
                isOpen={!!aciklar[`new-${i}`]}
                onToggle={toggle}
              />
            ))}
            {oldClaims.map((item, i) => (
              <ClaimCard
                key={`old-${i}`}
                item={item}
                cardKey={`old-${i}`}
                isOpen={!!aciklar[`old-${i}`]}
                onToggle={toggle}
              />
            ))}
          </div>

          <button className="reset-btn" onClick={handleReset}>✕ Temizle</button>
        </>
      )}
    </div>
  );
}

export default PipelineMode;
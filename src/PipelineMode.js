// ─────────────────────────────────────────────────────────────────────────────
// src/components/PipelineMode.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';

// ─── Demo Verisi ──────────────────────────────────────────────────────────────

const API_ENDPOINT_FACT_CHECK = "http://localhost:5000/fact-check";
const API_ENDPOINT_FACT_CHECK_SINGLE = "http://localhost:5000/fact-check-single";
console.log("PipelineMode.jsx dosyası yüklendi");

const PIPELINE_DEMO = {
  explanation:
    "Analiz edilen içerikte iki temel iddia tespit edilmiştir. Deprem büyüklüğü ve can kaybı rakamları resmi kaynaklardaki verilerle çelişmektedir.",
  newly_checked: [
    {
      claim: "İstanbul depremi 7.2 büyüklüğünde oldu.",
      passages: [
        {
          title: "AFAD açıklaması",
          url: "https://example.com",
          passage: "AFAD açıklamasına göre depremin büyüklüğü 6.8 olarak ölçülmüştür.",
          deduction: "REFUTES",
        },
      ],
    },
  ],
  already_checked: [
    {
      extracted: "Türkiye'nin yıllık enflasyonu %200'ü geçti.",
      matched: "Türkiye'nin yıllık enflasyonu %200'ü geçtiği iddia edildi.",
      url: "https://tuik.gov.tr",
      is_correct: 0.8,
    },
  ],
};

// ─── ClaimCard ────────────────────────────────────────────────────────────────
// Not: Önceki versiyonda PipelineMode içinde tanımlanıyordu →
// her render'da yeniden oluşturuluyordu. Dışarı alınarak sabitlendi.

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function getClaimText(item, isNew) {
  if (item.claim) return item.claim;
  if (item.extracted) return item.extracted;
  if (item.matched) return item.matched;
  return isNew ? 'İddia metni bulunamadı' : 'Önceden kontrol edilmiş iddia';
}

function PassageItem({ passage }) {
  // Eski demo formatı string olduğu için geriye dönük destek
  if (typeof passage === 'string') {
    return <div className="pipeline-passage">"{passage}"</div>;
  }

  return (
    <div className="pipeline-passage">
      {passage.title && (
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          {passage.title}
        </div>
      )}

      {passage.passage && (
        <div style={{ marginBottom: 8 }}>
          "{passage.passage}"
        </div>
      )}

    {passage.deduction && (
      <div className={`deduction-badge ${getDeductionClass(passage.deduction)}`}>
        Sonuç: {formatDeduction(passage.deduction)}
      </div>
    )}

    <PassageScores passage={passage} />

      {passage.url && (
        <a
          href={passage.url}
          target="_blank"
          rel="noreferrer"
          className="pipeline-link-pill"
        >
          {passage.url}
        </a>
      )}
    </div>
  );
}

function getMainEvidenceScore(passage) {
  if (passage.passage_score_reranked !== null && passage.passage_score_reranked !== undefined) {
    return {
      label: 'Kanıt skoru',
      value: passage.passage_score_reranked,
      type: 'Cross-encoder'
    };
  }

  if (passage.passage_score !== null && passage.passage_score !== undefined) {
    return {
      label: 'Kanıt skoru',
      value: passage.passage_score,
      type: 'Cosine'
    };
  }

  return null;
}

function getDeductionClass(deduction) {
  if (!deduction) return "deduction-neutral";

  const label = deduction.toUpperCase();

  if (label === "SUPPORTS") return "deduction-supports";
  if (label === "CONTRADICTS") return "deduction-contradicts";
  if (label === "NOT_ENOUGH_INFO") return "deduction-not-enough";

  return "deduction-neutral";
}

function formatDeduction(deduction) {
  if (!deduction) return "";

  const label = deduction.toUpperCase();

  if (label === "SUPPORTS") return "Destekliyor";
  if (label === "CONTRADICTS") return "Çelişiyor";
  if (label === "NOT_ENOUGH_INFO") return "Yetersiz Kanıt";

  return deduction;
}

function PassageScores({ passage }) {
  const mainScore = getMainEvidenceScore(passage);

  const docScore = passage.doc_score;
  const docRerankScore = passage.doc_score_reranked;
  const passageScore = passage.passage_score;
  const passageRerankScore = passage.passage_score_reranked;

  if (!mainScore && !docScore && !docRerankScore && !passageScore && !passageRerankScore) {
    return null;
  }

  return (
    <div className="pipeline-score-row">
      {mainScore && (
        <span className="pipeline-score-pill primary">
          {mainScore.label}: {mainScore.value}
          <span className="pipeline-score-type"> {mainScore.type}</span>
        </span>
      )}

      {docRerankScore && (
        <span className="pipeline-score-pill">
          Doküman: {docRerankScore}
        </span>
      )}

      {!docRerankScore && docScore && (
        <span className="pipeline-score-pill">
          Doküman: {docScore}
        </span>
      )}
    </div>
  );
}

function ClaimCard({ item, cardKey, isOpen, onToggle }) {
  const isNew = cardKey.startsWith('new-');

  const passages = Array.isArray(item.passages) ? item.passages : [];

  // already_checked için sende url alanı geliyor
  const links = [
    ...(Array.isArray(item.links) ? item.links : []),
    ...(item.url ? [item.url] : []),
  ];

  const hasBody =
    passages.length > 0 ||
    links.length > 0 ||
    item.matched ||
    typeof item.is_correct === 'number';

  return (
    <div className="pipeline-claim-card">
      <div
        className={`pipeline-claim-header${hasBody ? ' clickable' : ''}`}
        onClick={() => hasBody && onToggle(cardKey)}
      >
        <div className="pipeline-claim-num">
          {parseInt(cardKey.split('-')[1], 10) + 1}
        </div>

        <div className="pipeline-claim-main">
          <div className="pipeline-claim-text">
            {getClaimText(item, isNew)}
          </div>

          <div className="pipeline-claim-tags">
            <span
              className={`pipeline-tag ${
                isNew ? 'pipeline-tag-new' : 'pipeline-tag-checked'
              }`}
            >
              {isNew ? '⬤ Yeni' : '✓ Kontrol Edildi'}
            </span>

            {!isNew && typeof item.is_correct === 'number' && (
              <span className="pipeline-tag pipeline-tag-checked">
                Benzerlik: %{(item.is_correct * 100).toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {hasBody && (
          <span className={`pipeline-claim-chevron${isOpen ? ' open' : ''}`}>
            ⌄
          </span>
        )}
      </div>

      {isOpen && hasBody && (
        <div className="pipeline-claim-body">
          {!isNew && item.matched && (
            <div className="pipeline-passage">
              <strong>Eşleşen eski iddia:</strong>
              <br />
              {item.matched}
            </div>
          )}

          {passages.map((p, i) => (
            <PassageItem key={i} passage={p} />
          ))}

          {links.map((l, i) => (
            <a
              key={i}
              href={l}
              target="_blank"
              rel="noreferrer"
              className="pipeline-link-pill"
            >
              {l}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function PipelineMode() {
  const [pipelineInput, setPipelineInput] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [veri, setVeri] = useState(null);
  const [aciklar, setAciklar] = useState({});

  const toggle = useCallback(
    (key) => setAciklar((prev) => ({ ...prev, [key]: !prev[key] })),
    []
  );

  const veriGetir = async () => {
    const input = pipelineInput.trim();

    if (!input) {
      setHata('Lütfen kontrol edilecek haber URL adresini veya iddia metnini girin.');
      return;
    }

    const inputIsUrl = isHttpUrl(input);

    const endpoint = inputIsUrl
      ? API_ENDPOINT_FACT_CHECK
      : API_ENDPOINT_FACT_CHECK_SINGLE;

    setHata('');
    setYukleniyor(true);
    setVeri(null);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: input }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(errorText || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setVeri(data);
      setAciklar({});
    } catch (e) {
      setHata('Veri alınamadı: ' + e.message);
    } finally {
      setYukleniyor(false);
    }
  };

  const newClaims = veri?.newly_checked ?? [];
  const oldClaims = veri?.already_checked ?? [];
  const explanation = veri?.explanation ?? '';

  const handleReset = () => {
    setVeri(null);
    setPipelineInput('');
    setHata('');
    setAciklar({});
  };

  return (
    <div>
      <div className="form-card">
        <div className="input-group">
          <label className="input-label">⬡ Haber URL veya İddia Metni</label>

          <div style={{ display: 'flex', gap: 12 }}>
            <textarea
              className="input-field"
              style={{ resize: 'none' }}
              value={pipelineInput}
              onChange={(e) => setPipelineInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !yukleniyor) {
                  e.preventDefault();
                  veriGetir();
                }
              }}
              placeholder="Haber URL'si veya kontrol edilecek tek bir iddia girin..."
              disabled={yukleniyor}
              rows={1}
            />

            <button
              className="submit-btn"
              style={{ width: 'auto', marginTop: 0 }}
              onClick={veriGetir}
              disabled={yukleniyor}
            >
              {yukleniyor ? 'Analiz ediliyor...' : '→ Analiz Et'}
            </button>
          </div>

          {hata && (
            <p style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>
              {hata}
            </p>
          )}
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
            <div
              className="pipeline-explanation-text"
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {explanation}
            </div>
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

          <button className="reset-btn" onClick={handleReset}>
            ✕ Temizle
          </button>
        </>
      )}
    </div>
  );
}

export default PipelineMode;
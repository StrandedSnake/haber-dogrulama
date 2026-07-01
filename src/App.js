// ─────────────────────────────────────────────────────────────────────────────
// src/App.js  —  Yalan mıyız? | v3.0
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import './App.css';
import PipelineMode from './PipelineMode';

import {
  DURUM_CONFIG,
  MODEL_OPTIONS,
  LANG_OPTIONS,
  DEPTH_OPTIONS,
  FONT_OPTIONS,
  ACCENT_COLORS,
} from './constants';

import {
  isApiKeyActive,
  getApiKeyStatus,
  shareToSocial,
  truncateUrl,
  formatDate,
} from './utils';

import {
  useSettings,
  useHistory,
  useChecker,
  useClipboard,
  usePanel,
} from './hooks';

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export default function App() {
  const [mod, setMod]                   = useState('pipeline');
  const [link, setLink]                 = useState('');
  const [notlar, setNotlar]             = useState('');
  const [compareLinks, setCompareLinks] = useState(['', '']);
  const [keyVisible, setKeyVisible]     = useState(false);

  const { settings, update, save, reset, saveConfirm } = useSettings();
  const { gecmis, save: saveHistory, remove: removeHistory, clear: clearHistory } = useHistory();
  const { copied, copy } = useClipboard();
  const panels = usePanel();

  const checker = useChecker(
    { apiKey: settings.apiKey, model: settings.model, lang: settings.lang, depth: settings.depth },
    saveHistory,
  );

  const isApiActive      = isApiKeyActive(settings.apiKey);
  const apiKeyStatus     = getApiKeyStatus(settings.apiKey);
  const isSubmitDisabled = checker.yukleniyor || (
    mod === 'single'
      ? !link.trim()
      : compareLinks.filter((l) => l.trim()).length < 2
  );

  const switchMod = (m) => {
    setMod(m);
    checker.clearSonuc();
    checker.clearCompare();
    panels.close();
  };

  const haberiKontrolEt = () =>
    mod === 'single'
      ? checker.singleCheck(link, notlar)
      : checker.multiCheck(compareLinks);

  const addLinkField = () => {
    if (compareLinks.length < 5) setCompareLinks([...compareLinks, '']);
  };
  const updateCompareLink = (i, val) => {
    const updated = [...compareLinks];
    updated[i] = val;
    setCompareLinks(updated);
  };
  const removeCompareLink = (i) => {
    if (compareLinks.length > 2)
      setCompareLinks(compareLinks.filter((_, idx) => idx !== i));
  };

  const loadFromGecmis = (item) => {
    setMod('single');
    setLink(item.link);
    checker.clearSonuc();
    panels.close();
  };

  return (
    <div className="container">
      <div className="bg-pattern" />
      <div className="bg-gradient" />

      <div className="content">

        <header className="header">
          <div className="header-badge">{settings.badgeText}</div>
          <h1 className="main-title">{settings.siteTitle}</h1>
          <p className="subtitle">
            Bilimsel haberleri ve iddiaları doğrulama ve
            dezenformasyonla mücadele için yapay zeka desteği.
          </p>

          <nav className="mode-toggle" aria-label="Mod seçimi">
            <button className={`mode-btn ${mod === 'pipeline' ? 'active' : ''}`} onClick={() => switchMod('pipeline')}>
              ⬡ Doğrulama
            </button>

            <button
              className={`mode-btn ${panels.isOpen('gecmis') ? 'active' : ''}`}
              onClick={() => panels.toggle('gecmis')}
              aria-expanded={panels.isOpen('gecmis')}
            >
              🕐 Geçmiş <span className="gecmis-badge">{gecmis.length}</span>
            </button>
            <button
              className={`mode-btn ${panels.isOpen('settings') ? 'active' : ''}`}
              onClick={() => panels.toggle('settings')}
              aria-expanded={panels.isOpen('settings')}
            >
              ⚙️ Ayarlar
            </button>
          </nav>
        </header>

        {panels.isOpen('settings') && (
          <SettingsPanel
            settings={settings}
            update={update}
            save={save}
            reset={reset}
            saveConfirm={saveConfirm}
            isApiActive={isApiActive}
            apiKeyStatus={apiKeyStatus}
            keyVisible={keyVisible}
            onToggleKeyVisible={() => setKeyVisible((v) => !v)}
            onClose={panels.close}
          />
        )}

        {panels.isOpen('gecmis') && (
          <HistoryPanel
            gecmis={gecmis}
            onLoad={loadFromGecmis}
            onDelete={removeHistory}
            onClearAll={clearHistory}
            onClose={panels.close}
          />
        )}

        {mod === 'pipeline' && <PipelineMode />}

        {mod !== 'pipeline' && (
          <CheckerForm
            mod={mod}
            link={link}
            setLink={setLink}
            notlar={notlar}
            setNotlar={setNotlar}
            compareLinks={compareLinks}
            onAddLink={addLinkField}
            onUpdateLink={updateCompareLink}
            onRemoveLink={removeCompareLink}
            isApiActive={isApiActive}
            yukleniyor={checker.yukleniyor}
            isSubmitDisabled={isSubmitDisabled}
            onSubmit={haberiKontrolEt}
            onOpenSettings={() => panels.toggle('settings')}
          />
        )}

        {mod === 'single' && checker.sonuc && (
          <SingleResult
            sonuc={checker.sonuc}
            link={link}
            copied={copied}
            onCopy={() => copy(link)}
            onShare={(platform) => shareToSocial(platform, link, DURUM_CONFIG[checker.sonuc.durum])}
            onReset={() => { checker.clearSonuc(); setLink(''); setNotlar(''); }}
          />
        )}

        {mod === 'compare' && checker.compareResults.length > 0 && (
          <CompareResults
            results={checker.compareResults}
            onReset={() => { checker.clearCompare(); setCompareLinks(['', '']); }}
          />
        )}

        <footer className="footer">
          <p>Yapay zeka destekli haber ve makale doğrulama sistemi</p>
        </footer>

      </div>
    </div>
  );
}

// ─── SettingsPanel ────────────────────────────────────────────────────────────

function SettingsPanel({
  settings, update, save, reset, saveConfirm,
  isApiActive, apiKeyStatus, keyVisible, onToggleKeyVisible, onClose,
}) {
  return (
    <div className="settings-panel" role="dialog" aria-label="Ayarlar">
      <div className="settings-header">
        <span className="settings-title">⚙ Kişisel Ayarlar</span>
        <button className="history-close-btn" onClick={onClose} aria-label="Kapat">✕</button>
      </div>

      <div className="settings-grid">

        <div className="settings-section full-width">
          <span className="settings-label">🔑 Anthropic API Anahtarı</span>
          <div className="api-key-row">
            <input
              className="settings-input"
              type={keyVisible ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder="sk-ant-api03-..."
              autoComplete="off"
              aria-label="API Anahtarı"
            />
            <button className="toggle-key-btn" onClick={onToggleKeyVisible} aria-label={keyVisible ? 'Gizle' : 'Göster'}>
              {keyVisible ? '🔒' : '👁'}
            </button>
          </div>
          <div className={`api-key-status ${apiKeyStatus.status === 'active' ? 'ok' : ''}`}>
            {apiKeyStatus.message}
          </div>
          <div className="api-key-note">
            Anthropic Console'dan:{' '}
            <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a>
            {' '}— Yalnızca tarayıcınızda saklanır.
          </div>
        </div>

        <div className="settings-section">
          <span className="settings-label">🤖 Model</span>
          <select className="model-select" value={settings.model} onChange={(e) => update({ model: e.target.value })}>
            {MODEL_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="settings-section">
          <span className="settings-label">🌐 Yanıt Dili</span>
          <div className="option-group">
            {LANG_OPTIONS.map(({ code, label }) => (
              <button key={code} className={`option-btn ${settings.lang === code ? 'selected' : ''}`} onClick={() => update({ lang: code })}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <span className="settings-label">🔬 Analiz Modu</span>
          <div className="option-group">
            {DEPTH_OPTIONS.map(({ key, label }) => (
              <button key={key} className={`option-btn ${settings.depth === key ? 'selected' : ''}`} onClick={() => update({ depth: key })}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <span className="settings-label">✍ Yazı Tipi</span>
          <div className="option-group">
            {FONT_OPTIONS.map(({ value, label }) => (
              <button key={value} className={`option-btn ${settings.font === value ? 'selected' : ''}`} style={{ fontFamily: value }} onClick={() => update({ font: value })}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <span className="settings-label">🎨 Vurgu Rengi</span>
          <div className="color-options">
            {ACCENT_COLORS.map((c) => (
              <div
                key={c}
                className={`color-dot ${settings.accent === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => update({ accent: c })}
                role="button"
                aria-label={`Renk: ${c}`}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && update({ accent: c })}
              />
            ))}
          </div>
        </div>

        <div className="settings-section">
          <span className="settings-label">📌 Site Başlığı</span>
          <input className="settings-input" type="text" value={settings.siteTitle} onChange={(e) => update({ siteTitle: e.target.value })} placeholder="Yalan mıyız?" />
        </div>

        <div className="settings-section">
          <span className="settings-label">🏷 Rozet Yazısı</span>
          <input className="settings-input" type="text" value={settings.badgeText} onChange={(e) => update({ badgeText: e.target.value })} placeholder="DOĞRULUK KONTROLÜ SİSTEMİ" />
        </div>

      </div>

      <hr className="settings-divider" />
      <div className="settings-actions">
        <button className="settings-save-btn" onClick={save}>💾 Kaydet</button>
        <button className="settings-reset-btn" onClick={reset}>Sıfırla</button>
        <span className={`settings-save-confirm ${saveConfirm ? 'show' : ''}`}>✓ Kaydedildi</span>
      </div>
    </div>
  );
}

// ─── HistoryPanel ─────────────────────────────────────────────────────────────

function HistoryPanel({ gecmis, onLoad, onDelete, onClearAll, onClose }) {
  return (
    <div className="history-panel" role="dialog" aria-label="Geçmiş">
      <div className="history-header">
        <h3 className="history-title">Son Kontroller</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {gecmis.length > 0 && (
            <button
              className="history-close-btn"
              onClick={() => { if (window.confirm('Tüm geçmiş silinecek?')) onClearAll(); }}
              title="Tümünü temizle"
              aria-label="Tümünü temizle"
            >🗑</button>
          )}
          <button className="history-close-btn" onClick={onClose} aria-label="Kapat">▲</button>
        </div>
      </div>

      {gecmis.length === 0 ? (
        <p className="history-empty">Henüz kontrol edilmiş içerik yok</p>
      ) : (
        <div className="history-list">
          {gecmis.map((item) => {
            const cfg = DURUM_CONFIG[item.sonuc.durum];
            return (
              <div key={item.id} className="history-item">
                <div className="history-item-header">
                  <div className="history-badge" style={{ background: cfg.color }}>{cfg.emoji}</div>
                  <div className="history-item-info">
                    <p className="history-item-link" title={item.link}>{truncateUrl(item.link)}</p>
                    <p className="history-item-time">{formatDate(item.timestamp)}</p>
                  </div>
                  <div className="history-item-actions">
                    <button className="history-action-btn" title="Görüntüle" onClick={() => onLoad(item)} aria-label="Görüntüle">👁</button>
                    <button className="history-action-btn" title="Sil" onClick={() => onDelete(item.id)} aria-label="Sil">🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CheckerForm ─────────────────────────────────────────────────────────────

function CheckerForm({
  mod, link, setLink, notlar, setNotlar,
  compareLinks, onAddLink, onUpdateLink, onRemoveLink,
  isApiActive, yukleniyor, isSubmitDisabled, onSubmit, onOpenSettings,
}) {
  return (
    <div className="form-card">
      {!isApiActive && (
        <div className="no-api-warning">
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span className="no-api-warning-text">
            Demo moddasınız — gerçek analiz için{' '}
            <span className="no-api-warning-link" onClick={onOpenSettings} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpenSettings()}>
              API anahtarı ekleyin
            </span>.
          </span>
        </div>
      )}

      {mod === 'single' && (
        <>
          <div className="input-group">
            <label className="input-label" htmlFor="news-link">🔗 Haber veya Makale Linki</label>
            <input
              id="news-link"
              type="url"
              className="input-field"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isSubmitDisabled && onSubmit()}
              placeholder="https://www.ornek-haber.com/haber-basligi"
              disabled={yukleniyor}
              aria-label="Haber linki"
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="notlar">
              📄 Ek Notlar <span className="input-label-opt">(Opsiyonel)</span>
            </label>
            <textarea
              id="notlar"
              className="textarea-field"
              value={notlar}
              onChange={(e) => setNotlar(e.target.value)}
              placeholder="Kontrol edilmesini istediğiniz özel noktalar..."
              rows={3}
              disabled={yukleniyor}
            />
          </div>
        </>
      )}

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
                onChange={(e) => onUpdateLink(i, e.target.value)}
                placeholder="https://..."
                disabled={yukleniyor}
                aria-label={`Kaynak ${i + 1}`}
              />
              {compareLinks.length > 2 && (
                <button className="remove-btn" onClick={() => onRemoveLink(i)} disabled={yukleniyor} aria-label={`Kaynak ${i + 1}'i kaldır`}>✕</button>
              )}
            </div>
          ))}
          {compareLinks.length < 5 && (
            <button className="add-link-btn" onClick={onAddLink} disabled={yukleniyor}>+ Kaynak Ekle</button>
          )}
        </div>
      )}

      <button className="submit-btn" onClick={onSubmit} disabled={isSubmitDisabled} aria-busy={yukleniyor}>
        {yukleniyor
          ? <span className="loading-content"><span className="spinning" aria-hidden>⟳</span><span className="loading-text">Analiz ediliyor...</span></span>
          : mod === 'single' ? '✓ DOĞRULUĞU ANALİZ ET' : '📊 KAYNAKLARI KARŞILAŞTIR'
        }
      </button>
    </div>
  );
}

// ─── SingleResult ─────────────────────────────────────────────────────────────

function SingleResult({ sonuc, link, copied, onCopy, onShare, onReset }) {
  const cfg = DURUM_CONFIG[sonuc.durum];
  return (
    <div className="result-card" role="region" aria-label="Doğrulama sonucu">
      <div className="result-header">
        <div className={`result-icon ${sonuc.durum}`} aria-hidden>{cfg.emoji}</div>
        <div className="result-title-wrapper">
          <h2 className="result-title">Doğrulama Sonucu</h2>
          <div className={`result-badge ${sonuc.durum}`}>{cfg.emoji} {cfg.label}</div>
        </div>
      </div>
      <div className="result-content">
        <div className="result-text">{sonuc.icerik}</div>
      </div>
      <div className="share-actions">
        <button className="share-btn x-btn"        onClick={() => onShare('twitter')}>𝕏 X'te Paylaş</button>
        <button className="share-btn wa-btn"        onClick={() => onShare('whatsapp')}>💬 WhatsApp</button>
        <button className="share-btn copy-link-btn" onClick={onCopy}>{copied ? '✓ Kopyalandı' : '🔗 Bağlantıyı Kopyala'}</button>
      </div>
      <button className="reset-btn" onClick={onReset}>+ Yeni İçerik Kontrol Et</button>
    </div>
  );
}

// ─── CompareResults ───────────────────────────────────────────────────────────

function CompareResults({ results, onReset }) {
  return (
    <div className="compare-results" role="region" aria-label="Karşılaştırma sonuçları">
      <h2 className="compare-results-title">Karşılaştırma Sonuçları</h2>
      <div className="compare-grid">
        {results.map((result, i) => {
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
              <p className="compare-card-link" title={result.link}>{truncateUrl(result.link)}</p>
              <div className="compare-card-content">{result.icerik}</div>
            </div>
          );
        })}
      </div>
      <button className="reset-btn" onClick={onReset}>+ Yeni Karşılaştırma Yap</button>
    </div>
  );
}
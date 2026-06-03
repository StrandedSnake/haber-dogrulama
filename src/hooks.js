// ─────────────────────────────────────────────────────────────────────────────
// src/hooks.js  —  Tüm custom hook'lar
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  loadSettings, saveSettings, resetSettings, setCssVars, hexWithAlpha,
  loadHistory, addToHistory, deleteFromHistory, clearHistory,
  callClaude, determineDurum, isValidUrl, copyToClipboard,
} from './utils';
import { LANG_PROMPTS } from './constants';

// ─── useSettings ─────────────────────────────────────────────────────────────

export const useSettings = () => {
  const [settings,    setSettings]    = useState(loadSettings);
  const [saveConfirm, setSaveConfirm] = useState(false);

  useEffect(() => {
    setCssVars({ '--accent': settings.accent, '--accent-dim': hexWithAlpha(settings.accent) });
  }, [settings.accent]);

  useEffect(() => {
    document.body.style.fontFamily = settings.font;
  }, [settings.font]);

  const update = useCallback((patch) => setSettings((prev) => ({ ...prev, ...patch })), []);

  const save = useCallback(() => {
    saveSettings(settings);
    setSaveConfirm(true);
    setTimeout(() => setSaveConfirm(false), 2000);
  }, [settings]);

  const reset = useCallback(() => {
    if (!window.confirm('Tüm ayarlar sıfırlanacak. Emin misiniz?')) return;
    resetSettings();
    window.location.reload();
  }, []);

  return { settings, update, save, reset, saveConfirm };
};

// ─── useHistory ──────────────────────────────────────────────────────────────

export const useHistory = () => {
  const [gecmis, setGecmis] = useState(loadHistory);

  const save   = useCallback((link, sonuc) => setGecmis(addToHistory(link, sonuc)),   []);
  const remove = useCallback((id)          => setGecmis(deleteFromHistory(id)),        []);
  const clear  = useCallback(()            => setGecmis(clearHistory()),               []);

  return { gecmis, save, remove, clear };
};

// ─── useChecker ──────────────────────────────────────────────────────────────

export const useChecker = (config, onSave) => {
  const [yukleniyor,     setYukleniyor]     = useState(false);
  const [sonuc,          setSonuc]          = useState(null);
  const [compareResults, setCompareResults] = useState([]);

  const { apiKey, model, lang, depth } = config;

  const _analyze = useCallback(async (link, notlar = '') => {
    const prompt = LANG_PROMPTS[lang](link, notlar, depth);
    const metin  = await callClaude(prompt, apiKey, model);
    return { durum: determineDurum(metin), icerik: metin };
  }, [apiKey, model, lang, depth]);

  const singleCheck = useCallback(async (link, notlar = '') => {
    if (!link.trim())    { alert('Lütfen bir link girin'); return; }
    if (!isValidUrl(link)) { alert('Geçerli bir URL girin (https://... ile başlamalı)'); return; }

    setYukleniyor(true);
    setSonuc(null);
    try {
      const result = await _analyze(link, notlar);
      setSonuc(result);
      onSave?.(link, result);
    } catch (e) {
      setSonuc({ durum: 'hata', icerik: `Hata: ${e.message}` });
    } finally {
      setYukleniyor(false);
    }
  }, [_analyze, onSave]);

  const multiCheck = useCallback(async (links) => {
    const valid   = links.filter((l) => l.trim());
    if (valid.length < 2) { alert('En az 2 link girin'); return; }

    const invalid = valid.filter((l) => !isValidUrl(l));
    if (invalid.length) { alert(`Geçersiz URL'ler:\n${invalid.join('\n')}`); return; }

    setYukleniyor(true);
    setCompareResults([]);

    const results = [];
    for (const link of valid) {
      try {
        results.push({ link, ...(await _analyze(link)) });
      } catch (e) {
        results.push({ link, durum: 'hata', icerik: `Hata: ${e.message}` });
      }
      setCompareResults([...results]); // her sonuçta UI'ı güncelle
    }
    setYukleniyor(false);
  }, [_analyze]);

  const clearSonuc   = useCallback(() => setSonuc(null),        []);
  const clearCompare = useCallback(() => setCompareResults([]), []);

  return { yukleniyor, sonuc, compareResults, singleCheck, multiCheck, clearSonuc, clearCompare };
};

// ─── useClipboard ─────────────────────────────────────────────────────────────

export const useClipboard = (feedbackMs = 2000) => {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text) => {
    if (await copyToClipboard(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), feedbackMs);
    }
  }, [feedbackMs]);

  return { copied, copy };
};

// ─── usePanel ────────────────────────────────────────────────────────────────

export const usePanel = () => {
  const [active, setActive] = useState(null);

  // Açık panele tekrar tıklanırsa kapanır, farklı panele tıklanırsa o açılır.
  const toggle = useCallback((name) => setActive((prev) => (prev === name ? null : name)), []);
  const close  = useCallback(() => setActive(null), []);
  const isOpen = useCallback((name) => active === name, [active]);

  return { active, toggle, close, isOpen };
};
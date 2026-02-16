import React, { useState } from 'react';
import './App.css';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Link2, FileText, Play, X } from 'lucide-react';

export default function HaberDogrulamaSitesi() {
  const [link, setLink] = useState('');
  const [notlar, setNotlar] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const [videoKartGoster, setVideoKartGoster] = useState(true);

  // Video URL'ini buradan değiştirebilirsiniz
  const videoURL = 'https://www.youtube.com/watch?v=yZVe4VMMaU8';

  const haberiKontrolEt = async () => {
    if (!link.trim()) {
      alert('Lütfen bir haber linki girin');
      return;
    }

    setYukleniyor(true);
    setSonuc(null);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `Bu haber linkini kontrol et ve doğruluğunu değerlendir: ${link}
              
${notlar ? `Ek Notlar: ${notlar}` : ''}

Lütfen şu formatta yanıt ver:
1. Haberin özeti
2. Doğruluk değerlendirmesi (Doğru/Yanıltıcı/Yanlış/Belirsiz)
3. Kanıtlar ve kaynaklar
4. Önemli detaylar ve uyarılar

Yanıtını Türkçe ver.`
            }
          ],
          tools: [
            {
              type: 'web_search_20250305',
              name: 'web_search'
            }
          ]
        })
      });

      const data = await response.json();
      
      const metinIcerik = data.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n\n');

      let durum = 'belirsiz';
      const kucukHarf = metinIcerik.toLowerCase();
      if (kucukHarf.includes('doğru') && !kucukHarf.includes('yanlış')) {
        durum = 'dogru';
      } else if (kucukHarf.includes('yanlış') || kucukHarf.includes('yanıltıcı')) {
        durum = 'yanlis';
      } else if (kucukHarf.includes('yanıltıcı')) {
        durum = 'yaniltici';
      }

      setSonuc({
        durum,
        icerik: metinIcerik
      });
    } catch (error) {
      console.error('Hata:', error);
      setSonuc({
        durum: 'hata',
        icerik: 'Haberi kontrol ederken bir hata oluştu. Lütfen tekrar deneyin.'
      });
    } finally {
      setYukleniyor(false);
    }
  };

  const durumRenkleri = {
    dogru: { icon: CheckCircle2 },
    yanlis: { icon: XCircle },
    yaniltici: { icon: AlertCircle },
    belirsiz: { icon: AlertCircle },
    hata: { icon: XCircle }
  };

  return (
    <div className="container">
      {/* Grid pattern arka plan */}
      <div className="background-grid">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(147, 197, 253, 0.1)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Diagonal lines */}
      <div className="background-diagonals">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="diagonals" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(147, 197, 253, 0.3)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diagonals)" />
        </svg>
      </div>

      {/* Floating Video Card */}
      {videoKartGoster && (
        <div className="video-card">
          <div className="video-card-wrapper">
            {/* Kapatma butonu */}
            <button
              onClick={() => setVideoKartGoster(false)}
              className="video-close-btn"
            >
              <X className="icon-sm" />
            </button>

            {/* Video önizleme */}
            <a
              href={videoURL}
              target="_blank"
              rel="noopener noreferrer"
              className="video-link"
            >
              {/* Thumbnail */}
              <div className="video-thumbnail">
                <div className="video-text">
                  <h3 className="video-title">GERİZEKALI</h3>
                  <h3 className="video-title">MIYIZ?</h3>
                </div>
                
                {/* Play butonu overlay */}
                <div className="video-overlay">
                  <div className="play-button">
                    <Play className="play-icon" />
                  </div>
                </div>
              </div>

              {/* Alt metin */}
              <div className="video-footer">
                <p className="video-footer-text">🎬 Videoyu İzle</p>
              </div>
            </a>

            {/* Pulse animasyonu */}
            <div className="video-pulse"></div>
          </div>
        </div>
      )}

      <div className="content-wrapper">
        {/* Header */}
        <header className="header">
          <h1 className="main-title">Gerizekalı mıyız?</h1>
          <p className="subtitle">
            Yapay zeka destekli haber doğrulama sistemi ile haberlerin doğruluğunu kontrol edin
          </p>
          <div className="header-divider">
            <div className="divider-line"></div>
            <span className="divider-text">AI-Powered Fact Checking</span>
            <div className="divider-line"></div>
          </div>
        </header>

        {/* Form Kartı */}
        <div className="form-card">
          <div className="form-content">
            {/* Link Input */}
            <div className="input-group">
              <label className="input-label">
                <Link2 className="label-icon" />
                Haber Linki
              </label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://www.ornek-haber.com/haber-basligi"
                className="input-field"
                disabled={yukleniyor}
              />
            </div>

            {/* Notlar Input */}
            <div className="input-group">
              <label className="input-label">
                <FileText className="label-icon" />
                Ek Notlar (Opsiyonel)
              </label>
              <textarea
                value={notlar}
                onChange={(e) => setNotlar(e.target.value)}
                placeholder="Kontrol edilmesini istediğiniz özel noktalar veya bağlam ekleyin..."
                rows="4"
                className="textarea-field"
                disabled={yukleniyor}
              />
            </div>

            {/* Kontrol Butonu */}
            <button
              onClick={haberiKontrolEt}
              disabled={yukleniyor || !link.trim()}
              className={`submit-button ${yukleniyor || !link.trim() ? 'disabled' : ''}`}
            >
              {yukleniyor ? (
                <>
                  <Loader2 className="button-icon spinning" />
                  Kontrol Ediliyor...
                </>
              ) : (
                <>
                  <CheckCircle2 className="button-icon" />
                  Haberi Kontrol Et
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sonuç Kartı */}
        {sonuc && (
          <div className="result-card">
            <div className="result-header">
              {(() => {
                const DurumIcon = durumRenkleri[sonuc.durum].icon;
                return (
                  <div className={`result-icon result-icon-${sonuc.durum}`}>
                    <DurumIcon className="icon-lg" />
                  </div>
                );
              })()}
              <div className="result-title-wrapper">
                <h2 className="result-title">Doğrulama Sonucu</h2>
                <div className={`result-badge result-badge-${sonuc.durum}`}>
                  {sonuc.durum === 'dogru' && '✓ Doğru'}
                  {sonuc.durum === 'yanlis' && '✗ Yanlış'}
                  {sonuc.durum === 'yaniltici' && '⚠ Yanıltıcı'}
                  {sonuc.durum === 'belirsiz' && '? Belirsiz'}
                  {sonuc.durum === 'hata' && '⚠ Hata'}
                </div>
              </div>
            </div>

            <div className="result-content">
              <div className="result-text">
                {sonuc.icerik}
              </div>
            </div>video-thumbnail

            {/* Yeni Kontrol Butonu */}
            <button
              onClick={() => {
                setSonuc(null);
                setLink('');
                setNotlar('');
              }}
              className="reset-button"
            >
              Yeni Haber Kontrol Et
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="footer">
          <p>Yapay zeka destekli haber doğrulama</p>
        </footer>
      </div>
    </div>
  );
}
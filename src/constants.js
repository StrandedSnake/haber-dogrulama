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
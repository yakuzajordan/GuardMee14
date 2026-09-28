import { routeToService, normalizeGravity } from './serviceRouter.js';

const TYPE_KEYWORDS = {
  incendie: ['feu', 'flamme', 'fumée', 'incendie', 'brûle'],
  accident: ['accident', 'voiture', 'collision', 'route', 'blessé', 'véhicule'],
  agression: ['agression', 'violence', 'bagarre', 'coup', 'arme'],
  inondation: ['inondation', 'eau', 'crue', 'submerg'],
  coupure: ['coupure', 'électricité', 'panne', 'blackout'],
  vol: ['vol', 'cambriolage', 'voleur'],
  danger_sanitaire: ['sanitaire', 'maladie', 'épidémie', 'déchet', 'contamination'],
  foule: ['foule', 'manifestation', 'attroupement', 'émeute'],
};

const mockAnalyze = (snapshotHint = '', userType = '') => {
  const text = `${snapshotHint} ${userType}`.toLowerCase();
  let type_detecte = userType || 'accident';
  let maxScore = 0;

  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    const score = keywords.filter((k) => text.includes(k)).length;
    if (score > maxScore) {
      maxScore = score;
      type_detecte = type;
    }
  }

  const graviteMap = {
    incendie: 'critique',
    agression: 'eleve',
    accident: 'eleve',
    inondation: 'eleve',
    foule: 'moyen',
    coupure: 'faible',
    vol: 'moyen',
    danger_sanitaire: 'eleve',
  };

  const descriptions = {
    incendie: 'Présence probable de flammes ou fumée dense détectée sur la scène.',
    accident: 'Scène compatible avec un accident de la circulation ou corporel.',
    agression: 'Situation suggérant une altercation ou violence entre personnes.',
    inondation: 'Zone inondée ou présence importante d\'eau signalée.',
    coupure: 'Panne d\'infrastructure ou coupure de service détectée.',
    vol: 'Incident lié à la sécurité des biens.',
    danger_sanitaire: 'Risque sanitaire ou conditions insalubres observées.',
    foule: 'Attroupement ou foule dense détectée.',
  };

  return {
    type_detecte,
    gravite: graviteMap[type_detecte] || 'moyen',
    description: descriptions[type_detecte] || 'Incident signalé en direct, analyse visuelle en cours de validation.',
    confidence: maxScore > 0 ? 0.65 + maxScore * 0.1 : 0.55,
    provider: 'mock',
  };
};

const analyzeWithOpenAI = async (snapshotBase64, userType) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const imageData = snapshotBase64.replace(/^data:image\/\w+;base64,/, '');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Tu es un système d'analyse d'urgence au Cameroun. Analyse l'image et réponds UNIQUEMENT en JSON valide:
{"type_detecte":"agression|accident|incendie|inondation|coupure|vol|danger_sanitaire|foule","gravite":"faible|moyen|eleve|critique","description":"description courte en français","confidence":0.0-1.0}`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Analyse cette scène d'urgence. Type suggéré par le citoyen: ${userType || 'inconnu'}` },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageData}` } },
          ],
        },
      ],
      max_tokens: 300,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);

  return {
    type_detecte: parsed.type_detecte || userType || 'accident',
    gravite: normalizeGravity(parsed.gravite),
    description: parsed.description || 'Analyse IA effectuée.',
    confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
    provider: 'openai',
  };
};

const analyzeWithGoogleVision = async (snapshotBase64) => {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) return null;

  const imageData = snapshotBase64.replace(/^data:image\/\w+;base64,/, '');

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageData },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'SAFE_SEARCH_DETECTION' },
          ],
        }],
      }),
    }
  );

  if (!response.ok) throw new Error(`Vision API error: ${response.status}`);
  const data = await response.json();
  const labels = data.responses?.[0]?.labelAnnotations?.map((l) => l.description.toLowerCase()) || [];
  const labelText = labels.join(' ');

  return mockAnalyze(labelText, '');
};

export const analyzeVideoContent = async ({ snapshotBase64, userType, userDescription }) => {
  try {
    if (snapshotBase64 && process.env.OPENAI_API_KEY) {
      const result = await analyzeWithOpenAI(snapshotBase64, userType);
      if (result) return { ...result, analysedAt: new Date() };
    }
    if (snapshotBase64 && process.env.GOOGLE_VISION_API_KEY) {
      const result = await analyzeWithGoogleVision(snapshotBase64);
      if (result) return { ...result, analysedAt: new Date() };
    }
  } catch (err) {
    console.warn('Analyse IA échouée, fallback mock:', err.message);
  }

  return {
    ...mockAnalyze(userDescription || '', userType),
    analysedAt: new Date(),
  };
};

export { routeToService };

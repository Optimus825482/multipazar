export const CAPAFY_PRODUCT_IDEAS = [
  {
    name: "Multi-Model AI Agent Starter Kit (GPT + Claude + Gemini)",
    category: "AI Chatbot & Agent",
    estimatedPrice: 49.99,
    estimatedMonthlySales: 600,
    estimatedMonthlyRevenue: 29994,
    demandScore: 9.7,
    supplyScore: 1.5,
    gapScore: 9.8,
    difficulty: "Zor",
    timeToCreate: "3-4 hafta",
    reason: "Multi-model agent gelistirme yeni ve cok talep goruyor. LangChain + CrewAI + OpenAI API entegrasyonlu complete starter kit pazarda neredeyse yok.",
  },
  {
    name: "AI Video Faceless Channel Automation Pack",
    category: "AI Video Uretimi",
    estimatedPrice: 34.99,
    estimatedMonthlySales: 1200,
    estimatedMonthlyRevenue: 41988,
    demandScore: 9.6,
    supplyScore: 1.2,
    gapScore: 9.8,
    difficulty: "Orta",
    timeToCreate: "2-3 hafta",
    reason: "Faceless YouTube/TikTok kanallari icin AI video uretim workflow'u. Sora + HeyGen + ElevenLabs entegrasyonu ile tam otomasyon paketi. Talep devasa, arz neredeyse sifir.",
  },
  {
    name: "Enterprise RAG Chatbot Builder (No-Code)",
    category: "AI Chatbot & Agent",
    estimatedPrice: 79.99,
    estimatedMonthlySales: 200,
    estimatedMonthlyRevenue: 15998,
    demandScore: 9.4,
    supplyScore: 1.2,
    gapScore: 9.6,
    difficulty: "Zor",
    timeToCreate: "4-6 hafta",
    reason: "Kurumsal RAG chatbot'lari icin no-code builder. PDF/website icerik entegrasyonu ile custom AI chatbot olusturma. Kurumsal pazarda $500+ satis potansiyeli.",
  },
  {
    name: "AI Music Producer Pack (Suno + Udio Prompts)",
    category: "AI Muzik & Ses Efektleri",
    estimatedPrice: 14.99,
    estimatedMonthlySales: 2000,
    estimatedMonthlyRevenue: 29980,
    demandScore: 9.0,
    supplyScore: 1.0,
    gapScore: 9.5,
    difficulty: "Kolay",
    timeToCreate: "1 hafta",
    reason: "AI muzik pazarinin rekabeti en dusuk (RI: 1.5). Suno ve Udio icin 500+ optimize edilmis prompt ile muzik uretim rehberi. Hizli olusturulabilir.",
  },
  {
    name: "AI Coding Assistant Mastery (Cursor + Claude Code)",
    category: "AI Kod Yazma Asistanlari",
    estimatedPrice: 29.99,
    estimatedMonthlySales: 800,
    estimatedMonthlyRevenue: 23992,
    demandScore: 9.7,
    supplyScore: 2.0,
    gapScore: 9.3,
    difficulty: "Orta",
    timeToCreate: "2-3 hafta",
    reason: "Developer'lar Cursor ve Claude Code icin prompt ve workflow rehberlerine odeme yapiyor. %65 buyume ile en hizli buyuyen kategorilerden.",
  },
  {
    name: "AI Social Media Content Factory (All-in-One)",
    category: "AI Yazi & Copywriting",
    estimatedPrice: 24.99,
    estimatedMonthlySales: 1500,
    estimatedMonthlyRevenue: 37485,
    demandScore: 9.3,
    supplyScore: 2.5,
    gapScore: 9.0,
    difficulty: "Orta",
    timeToCreate: "2-3 hafta",
    reason: "Instagram/TikTok/YouTube icin AI ile otomatik icerik uretim sistemi. Copywriting + Gorsel + Video script hepsi bir arada. Sosyal medya pazarlama en buyuk talep.",
  },
]

export const CAPAFY_DATA_SOURCES = [
  { name: "PromptBase", desc: "AI prompt marketplace verileri", url: "https://promptbase.com" },
  { name: "Runway AI / Sora", desc: "AI video pazar trendleri", url: "https://runwayml.com" },
  { name: "LangChain / CrewAI", desc: "AI agent framework ecosystem", url: "https://langchain.com" },
  { name: "ElevenLabs", desc: "AI ses pazar verileri", url: "https://elevenlabs.io" },
  { name: "Capafy Marketplace", desc: "AI skill pazaryeri verileri", url: "https://capafy.com" },
]

export function getCapafyCategorySlug(productName: string): string {
  const lower = productName.toLowerCase()
  if (lower.includes('prompt') || lower.includes('chatgpt') || lower.includes('claude') || lower.includes('midjourney')) return 'prompt-engineering'
  if (lower.includes('agent') || lower.includes('langchain') || lower.includes('crewai') || lower.includes('rag') || lower.includes('chatbot')) return 'ai-chatbot-agents'
  if (lower.includes('video') || lower.includes('sora') || lower.includes('faceless') || lower.includes('runway')) return 'ai-video-generation'
  if (lower.includes('elevenlabs') || lower.includes('voice') || lower.includes('clone')) return 'ai-voice-speech'
  if (lower.includes('seo') || lower.includes('content') || lower.includes('social media') || lower.includes('copywriting')) return 'ai-writing-copy'
  if (lower.includes('data analysis') || lower.includes('code interpreter')) return 'ai-data-analysis'
  if (lower.includes('music') || lower.includes('suno') || lower.includes('udio')) return 'ai-music-sound'
  if (lower.includes('gpt') || lower.includes('builder')) return 'ai-chatbot-agents'
  if (lower.includes('coding') || lower.includes('cursor') || lower.includes('copilot')) return 'ai-coding-assistants'
  if (lower.includes('automation') || lower.includes('workflow')) return 'ai-automation'
  return 'prompt-engineering'
}

// MIGRATED TO SCRAPING
export const CAPAFY_PRODUCT_IDEAS: any[] = []
export const CAPAFY_DATA_SOURCES = [
  { name: "Google Trends", desc: "Gercek arama hacmi trend verileri", url: "https://trends.google.com" },
  { name: "Capafy.com", desc: "Canli AI skill pazaryeri", url: "https://capafy.com" },
]
export function getCapafyCategorySlug(productName: string): string {
  const lower = productName.toLowerCase()
  if (lower.includes('prompt') || lower.includes('chatgpt') || lower.includes('claude') || lower.includes('midjourney')) return 'prompt-engineering'
  if (lower.includes('agent') || lower.includes('chatbot') || lower.includes('bot')) return 'ai-chatbot-agent'
  if (lower.includes('video') || lower.includes('sora') || lower.includes('runway') || lower.includes('heygen')) return 'ai-video-generation'
  if (lower.includes('image') || lower.includes('dall-e') || lower.includes('stable') || lower.includes('generation')) return 'ai-image-generation'
  if (lower.includes('voice') || lower.includes('audio') || lower.includes('eleven') || lower.includes('music')) return 'ai-audio-voice'
  if (lower.includes('automation') || lower.includes('workflow') || lower.includes('n8n') || lower.includes('zapier')) return 'ai-automation'
  if (lower.includes('langchain') || lower.includes('api') || lower.includes('sdk') || lower.includes('crewai')) return 'ai-development'
  if (lower.includes('market') || lower.includes('content') || lower.includes('seo')) return 'ai-marketing'
  if (lower.includes('analytics') || lower.includes('data') || lower.includes('report')) return 'ai-data-analytics'
  if (lower.includes('course') || lower.includes('tutorial') || lower.includes('learn') || lower.includes('guide')) return 'ai-education'
  if (lower.includes('writing') || lower.includes('copy') || lower.includes('blog') || lower.includes('article')) return 'ai-writing'
  return 'ai-business'
}

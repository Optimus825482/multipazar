// MIGRATED TO SCRAPING
export const GUMROAD_PRODUCT_IDEAS: any[] = []
export const GUMROAD_DATA_SOURCES = [
  { name: "Google Trends", desc: "Gercek arama hacmi trend verileri", url: "https://trends.google.com" },
  { name: "Gumroad.com", desc: "Canli urun listeleri (scraping)", url: "https://gumroad.com/discover" },
]
export function getGumroadCategorySlug(productName: string): string {
  const lower = productName.toLowerCase()
  if (lower.includes('software') || lower.includes('saas') || lower.includes('api') || lower.includes('boilerplate') || lower.includes('code') || lower.includes('programming')) return 'software-development'
  if (lower.includes('business') || lower.includes('money') || lower.includes('finance') || lower.includes('startup')) return 'business-money'
  if (lower.includes('3d') || lower.includes('blender') || lower.includes('vrchat') || lower.includes('game asset')) return '3d-assets'
  if (lower.includes('design') || lower.includes('ui') || lower.includes('ux') || lower.includes('graphic')) return 'design-graphics'
  if (lower.includes('prompt') || lower.includes('ai') || lower.includes('chatgpt') || lower.includes('midjourney')) return 'ai-prompts'
  if (lower.includes('notion') || lower.includes('template') || lower.includes('dashboard')) return 'notion-templates'
  if (lower.includes('video') || lower.includes('premiere') || lower.includes('motion')) return 'video-production'
  if (lower.includes('music') || lower.includes('audio') || lower.includes('preset')) return 'music-audio'
  if (lower.includes('game') || lower.includes('unity') || lower.includes('unreal')) return 'game-development'
  if (lower.includes('ebook') || lower.includes('writing') || lower.includes('book')) return 'writing-publishing'
  if (lower.includes('seo') || lower.includes('marketing')) return 'marketing-seo'
  if (lower.includes('self') || lower.includes('productivity') || lower.includes('growth')) return 'self-development'
  return 'software-development'
}

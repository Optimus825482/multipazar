// MIGRATED TO SCRAPING
export const UDEMY_PRODUCT_IDEAS: any[] = []
export const UDEMY_DATA_SOURCES = [
  { name: "Google Trends", desc: "Gercek arama hacmi trend verileri", url: "https://trends.google.com" },
  { name: "Udemy.com", desc: "Canli kurs listeleri (scraping)", url: "https://www.udemy.com" },
  { name: "ClassCentral", desc: "Online kurs pazar raporu", url: "https://www.classcentral.com/report" },
]
export function getUdemyCategorySlug(productName: string): string {
  const lower = productName.toLowerCase()
  if (lower.includes('python') || lower.includes('node.js') || lower.includes('react') || lower.includes('next.js') || lower.includes('javascript') || lower.includes('html') || lower.includes('css') || lower.includes('full-stack') || lower.includes('web') || lower.includes('bootcamp')) return 'software-development'
  if (lower.includes('machine learning') || lower.includes('data science') || lower.includes('deep learning') || lower.includes('ai') || lower.includes('nlp') || lower.includes('neural')) return 'data-science-ai'
  if (lower.includes('business') || lower.includes('entrepreneur') || lower.includes('finance') || lower.includes('management')) return 'business'
  if (lower.includes('aws') || lower.includes('azure') || lower.includes('cloud') || lower.includes('certif') || lower.includes('network') || lower.includes('security') || lower.includes('it')) return 'it-certification'
  if (lower.includes('ui') || lower.includes('ux') || lower.includes('design') || lower.includes('figma') || lower.includes('photoshop')) return 'design'
  if (lower.includes('market') || lower.includes('seo') || lower.includes('social media') || lower.includes('advert')) return 'marketing'
  if (lower.includes('personal') || lower.includes('leader') || lower.includes('communication') || lower.includes('time management')) return 'personal-development'
  if (lower.includes('photo') || lower.includes('video') || lower.includes('edit') || lower.includes('premiere')) return 'photography'
  if (lower.includes('health') || lower.includes('fitness') || lower.includes('nutrit') || lower.includes('meditat')) return 'health-fitness'
  if (lower.includes('music') || lower.includes('audio') || lower.includes('guitar') || lower.includes('piano')) return 'music'
  if (lower.includes('language') || lower.includes('english') || lower.includes('spanish') || lower.includes('french')) return 'language'
  if (lower.includes('academic') || lower.includes('research') || lower.includes('writing') || lower.includes('thesis')) return 'academic'
  return 'software-development'
}

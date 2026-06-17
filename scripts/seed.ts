import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const categories = [
  {
    name: "Notion Sablonlari",
    slug: "notion-templates",
    description: "Notion icin once hazirlanmis sablonlar, sistemler ve dashboardlar",
    icon: "LayoutTemplate",
    color: "#f97316",
    avgPrice: 19.99,
    totalProducts: 4250,
    totalRevenue: 2840000,
    searchVolume: 185000,
    demandScore: 9.2,
    supplyScore: 7.8,
    competitionIndex: 6.5,
    growthRate: 23.5,
    trendDirection: "up",
  },
  {
    name: "Online Kurslar",
    slug: "online-courses",
    description: "Dijital kurslar, egitim videolari ve ogrenme paketleri",
    icon: "GraduationCap",
    color: "#8b5cf6",
    avgPrice: 49.99,
    totalProducts: 3100,
    totalRevenue: 5200000,
    searchVolume: 142000,
    demandScore: 9.5,
    supplyScore: 6.2,
    competitionIndex: 5.8,
    growthRate: 31.2,
    trendDirection: "up",
  },
  {
    name: "eBook ve Rehberler",
    slug: "ebooks-guides",
    description: "Dijital kitaplar, rehberler, kilavuzlar ve el kitaplari",
    icon: "BookOpen",
    color: "#06b6d4",
    avgPrice: 14.99,
    totalProducts: 2800,
    totalRevenue: 1120000,
    searchVolume: 98000,
    demandScore: 7.4,
    supplyScore: 8.1,
    competitionIndex: 7.2,
    growthRate: 12.8,
    trendDirection: "stable",
  },
  {
    name: "UI/UX Tasarim Kaynaklari",
    slug: "ui-ux-design",
    description: "Wireframelar, prototipler, tasarim sistemleri ve Figma dosyalari",
    icon: "Palette",
    color: "#ec4899",
    avgPrice: 29.99,
    totalProducts: 1950,
    totalRevenue: 1950000,
    searchVolume: 76000,
    demandScore: 8.6,
    supplyScore: 5.9,
    competitionIndex: 4.8,
    growthRate: 28.4,
    trendDirection: "up",
  },
  {
    name: "Yazilim ve Araclar",
    slug: "software-tools",
    description: "SaaS araclar, eklentiler, scriptler ve yazilim bilesenleri",
    icon: "Code",
    color: "#10b981",
    avgPrice: 39.99,
    totalProducts: 1200,
    totalRevenue: 3100000,
    searchVolume: 89000,
    demandScore: 9.0,
    supplyScore: 4.3,
    competitionIndex: 3.5,
    growthRate: 35.7,
    trendDirection: "up",
  },
  {
    name: "Sosyal Medya Sablonlari",
    slug: "social-media-templates",
    description: "Instagram, TikTok, YouTube ve Pinterest icin tasarim sablonlari",
    icon: "Share2",
    color: "#f43f5e",
    avgPrice: 12.99,
    totalProducts: 3600,
    totalRevenue: 1440000,
    searchVolume: 134000,
    demandScore: 8.8,
    supplyScore: 8.5,
    competitionIndex: 7.8,
    growthRate: 18.6,
    trendDirection: "up",
  },
  {
    name: "Muzik ve Ses Efektleri",
    slug: "music-audio",
    description: "Lofi muzik paketleri, ses efektleri, podcast intro ve jinglelar",
    icon: "Music",
    color: "#a855f7",
    avgPrice: 24.99,
    totalProducts: 980,
    totalRevenue: 680000,
    searchVolume: 52000,
    demandScore: 7.2,
    supplyScore: 4.1,
    competitionIndex: 3.2,
    growthRate: 22.1,
    trendDirection: "up",
  },
  {
    name: "Fotografcilik ve Video",
    slug: "photography-video",
    description: "Lightroom presetleri, LUTlar, video sablonlari ve film efektleri",
    icon: "Camera",
    color: "#14b8a6",
    avgPrice: 21.99,
    totalProducts: 1650,
    totalRevenue: 1320000,
    searchVolume: 67000,
    demandScore: 8.1,
    supplyScore: 6.4,
    competitionIndex: 5.1,
    growthRate: 19.3,
    trendDirection: "up",
  },
  {
    name: "Yazi ve Kopyalama",
    slug: "writing-copywriting",
    description: "Kopya yazma sablonlari, prompt paketleri, icerik planlayicilari",
    icon: "PenTool",
    color: "#eab308",
    avgPrice: 16.99,
    totalProducts: 890,
    totalRevenue: 520000,
    searchVolume: 43000,
    demandScore: 7.8,
    supplyScore: 3.2,
    competitionIndex: 2.8,
    growthRate: 42.6,
    trendDirection: "up",
  },
  {
    name: "Is ve Girisimcilik",
    slug: "business-entrepreneurship",
    description: "Is planlari, startup kiti, CRM sablonlari, finansal modelleme araclar",
    icon: "Briefcase",
    color: "#3b82f6",
    avgPrice: 34.99,
    totalProducts: 780,
    totalRevenue: 1680000,
    searchVolume: 58000,
    demandScore: 8.4,
    supplyScore: 3.8,
    competitionIndex: 3.1,
    growthRate: 26.8,
    trendDirection: "up",
  },
  {
    name: "Saglik ve Wellness",
    slug: "health-wellness",
    description: "Fitness planlari, beslenme programlari, yoga kiti, meditasyon rehberleri",
    icon: "Heart",
    color: "#22c55e",
    avgPrice: 22.99,
    totalProducts: 1100,
    totalRevenue: 880000,
    searchVolume: 71000,
    demandScore: 8.3,
    supplyScore: 5.5,
    competitionIndex: 4.6,
    growthRate: 29.1,
    trendDirection: "up",
  },
  {
    name: "AI Prompt Paketleri",
    slug: "ai-prompts",
    description: "ChatGPT, Midjourney, DALL-E ve diger AI araclar icin prompt koleksiyonlari",
    icon: "Bot",
    color: "#6366f1",
    avgPrice: 9.99,
    totalProducts: 520,
    totalRevenue: 410000,
    searchVolume: 95000,
    demandScore: 9.4,
    supplyScore: 2.8,
    competitionIndex: 2.1,
    growthRate: 68.4,
    trendDirection: "up",
  },
]

interface ProductInput {
  name: string
  categoryId: string
  price: number
  salesCount: number
  rating: number
  reviewCount: number
  searchVolume: number
  demandScore: number
  supplyScore: number
  tags: string
  type: string
  avgMonthlySales: number
  priceRange: string
  isTrending: boolean
}

const productsData: Omit<ProductInput, 'categoryId'>[] = [
  // Notion Sablonlari
  { name: "Ultimate Notion Life OS", price: 24.99, salesCount: 18500, rating: 4.8, reviewCount: 2340, searchVolume: 22000, demandScore: 9.5, supplyScore: 6.2, tags: "productivity,life management,all-in-one", type: "template", avgMonthlySales: 1542, priceRange: "mid", isTrending: true },
  { name: "Notion Business Hub", price: 34.99, salesCount: 12300, rating: 4.7, reviewCount: 1890, searchVolume: 15000, demandScore: 8.9, supplyScore: 5.8, tags: "business,crm,project management", type: "template", avgMonthlySales: 1025, priceRange: "mid", isTrending: true },
  { name: "Student Notion Starter Pack", price: 9.99, salesCount: 22000, rating: 4.6, reviewCount: 3200, searchVolume: 18000, demandScore: 9.1, supplyScore: 7.5, tags: "student,education,academic", type: "template", avgMonthlySales: 1833, priceRange: "budget", isTrending: false },
  { name: "Freelancer Dashboard Notion", price: 19.99, salesCount: 8900, rating: 4.9, reviewCount: 1560, searchVolume: 11000, demandScore: 8.4, supplyScore: 4.5, tags: "freelancer,finance,tracking", type: "template", avgMonthlySales: 742, priceRange: "mid", isTrending: false },
  { name: "Content Creator Notion System", price: 29.99, salesCount: 6700, rating: 4.8, reviewCount: 980, searchVolume: 14000, demandScore: 9.2, supplyScore: 3.2, tags: "content creator,youtube,social media", type: "template", avgMonthlySales: 558, priceRange: "premium", isTrending: true },
  { name: "Notion Finance Tracker Pro", price: 14.99, salesCount: 14200, rating: 4.7, reviewCount: 2100, searchVolume: 12000, demandScore: 8.8, supplyScore: 5.1, tags: "finance,budget,money tracking", type: "template", avgMonthlySales: 1183, priceRange: "budget", isTrending: false },
  { name: "Notion AI Workflow Pack", price: 39.99, salesCount: 3400, rating: 4.9, reviewCount: 420, searchVolume: 16000, demandScore: 9.6, supplyScore: 2.1, tags: "ai,automation,workflow", type: "template", avgMonthlySales: 283, priceRange: "premium", isTrending: true },

  // Online Kurslar
  { name: "Full-Stack Web Dev Bootcamp", price: 79.99, salesCount: 9800, rating: 4.9, reviewCount: 4500, searchVolume: 25000, demandScore: 9.7, supplyScore: 4.5, tags: "web development,coding,programming", type: "course", avgMonthlySales: 817, priceRange: "premium", isTrending: true },
  { name: "YouTube Growth Masterclass", price: 49.99, salesCount: 15600, rating: 4.8, reviewCount: 3800, searchVolume: 32000, demandScore: 9.4, supplyScore: 5.2, tags: "youtube,content creation,video", type: "course", avgMonthlySales: 1300, priceRange: "premium", isTrending: true },
  { name: "AI Tools for Business", price: 59.99, salesCount: 7200, rating: 4.7, reviewCount: 2100, searchVolume: 28000, demandScore: 9.5, supplyScore: 2.8, tags: "ai,business,productivity", type: "course", avgMonthlySales: 600, priceRange: "premium", isTrending: true },
  { name: "Photography for Beginners", price: 34.99, salesCount: 11200, rating: 4.6, reviewCount: 2900, searchVolume: 18000, demandScore: 8.2, supplyScore: 6.8, tags: "photography,camera,editing", type: "course", avgMonthlySales: 933, priceRange: "mid", isTrending: false },
  { name: "Freelancing 101", price: 29.99, salesCount: 8500, rating: 4.8, reviewCount: 2400, searchVolume: 22000, demandScore: 9.0, supplyScore: 4.8, tags: "freelancing,business,career", type: "course", avgMonthlySales: 708, priceRange: "mid", isTrending: false },
  { name: "Prompt Engineering Mastery", price: 44.99, salesCount: 5400, rating: 4.9, reviewCount: 1600, searchVolume: 35000, demandScore: 9.7, supplyScore: 1.9, tags: "prompt engineering,ai,chatgpt", type: "course", avgMonthlySales: 450, priceRange: "premium", isTrending: true },
  { name: "Social Media Marketing Pro", price: 39.99, salesCount: 6800, rating: 4.7, reviewCount: 1900, searchVolume: 24000, demandScore: 8.9, supplyScore: 5.5, tags: "social media,marketing,digital marketing", type: "course", avgMonthlySales: 567, priceRange: "premium", isTrending: false },

  // eBook
  { name: "Startup Playbook", price: 19.99, salesCount: 7800, rating: 4.6, reviewCount: 1200, searchVolume: 14000, demandScore: 8.5, supplyScore: 5.2, tags: "startup,business,entrepreneurship", type: "ebook", avgMonthlySales: 650, priceRange: "mid", isTrending: false },
  { name: "SEO Ultimate Guide 2024", price: 14.99, salesCount: 9200, rating: 4.5, reviewCount: 1800, searchVolume: 16000, demandScore: 8.0, supplyScore: 7.1, tags: "seo,marketing,google", type: "ebook", avgMonthlySales: 767, priceRange: "budget", isTrending: false },
  { name: "Personal Finance Handbook", price: 12.99, salesCount: 11500, rating: 4.7, reviewCount: 2100, searchVolume: 12000, demandScore: 7.8, supplyScore: 6.4, tags: "finance,money,saving", type: "ebook", avgMonthlySales: 958, priceRange: "budget", isTrending: false },
  { name: "Remote Work Bible", price: 16.99, salesCount: 6400, rating: 4.8, reviewCount: 980, searchVolume: 15000, demandScore: 8.6, supplyScore: 3.5, tags: "remote work,digital nomad,work from home", type: "ebook", avgMonthlySales: 533, priceRange: "budget", isTrending: true },

  // UI/UX
  { name: "Complete Figma Design System", price: 49.99, salesCount: 5200, rating: 4.9, reviewCount: 1100, searchVolume: 18000, demandScore: 9.1, supplyScore: 3.8, tags: "figma,design system,ui kit", type: "design", avgMonthlySales: 433, priceRange: "premium", isTrending: true },
  { name: "Wireframe Kit Pro", price: 29.99, salesCount: 8900, rating: 4.7, reviewCount: 1560, searchVolume: 12000, demandScore: 8.5, supplyScore: 5.2, tags: "wireframe,prototype,ux", type: "design", avgMonthlySales: 742, priceRange: "mid", isTrending: false },
  { name: "Landing Page Templates Bundle", price: 39.99, salesCount: 7100, rating: 4.8, reviewCount: 1320, searchVolume: 15000, demandScore: 8.9, supplyScore: 4.1, tags: "landing page,template,web design", type: "design", avgMonthlySales: 592, priceRange: "premium", isTrending: true },
  { name: "Mobile App UI Kit", price: 34.99, salesCount: 4800, rating: 4.6, reviewCount: 890, searchVolume: 11000, demandScore: 8.3, supplyScore: 5.6, tags: "mobile app,ui kit,app design", type: "design", avgMonthlySales: 400, priceRange: "premium", isTrending: false },
  { name: "SaaS Dashboard UI Kit", price: 59.99, salesCount: 3200, rating: 4.9, reviewCount: 680, searchVolume: 14000, demandScore: 9.0, supplyScore: 2.4, tags: "saas,dashboard,admin panel", type: "design", avgMonthlySales: 267, priceRange: "premium", isTrending: true },

  // Yazilim
  { name: "Next.js SaaS Starter Kit", price: 79.99, salesCount: 4500, rating: 4.9, reviewCount: 980, searchVolume: 22000, demandScore: 9.3, supplyScore: 2.8, tags: "nextjs,saas,starter kit,boilerplate", type: "software", avgMonthlySales: 375, priceRange: "premium", isTrending: true },
  { name: "Chrome Extension Boilerplate", price: 49.99, salesCount: 3800, rating: 4.7, reviewCount: 720, searchVolume: 13000, demandScore: 8.7, supplyScore: 3.1, tags: "chrome extension,extension,boilerplate", type: "software", avgMonthlySales: 317, priceRange: "premium", isTrending: false },
  { name: "API Template Collection", price: 34.99, salesCount: 5200, rating: 4.8, reviewCount: 890, searchVolume: 11000, demandScore: 8.5, supplyScore: 3.5, tags: "api,rest,backend,nodejs", type: "software", avgMonthlySales: 433, priceRange: "premium", isTrending: false },
  { name: "WordPress Plugin Bundle", price: 44.99, salesCount: 2900, rating: 4.6, reviewCount: 540, searchVolume: 16000, demandScore: 8.2, supplyScore: 4.8, tags: "wordpress,plugin,cms", type: "software", avgMonthlySales: 242, priceRange: "premium", isTrending: false },
  { name: "Tailwind CSS Component Library", price: 29.99, salesCount: 6800, rating: 4.8, reviewCount: 1200, searchVolume: 19000, demandScore: 9.0, supplyScore: 3.2, tags: "tailwind,css,components,ui", type: "software", avgMonthlySales: 567, priceRange: "mid", isTrending: true },

  // Sosyal Medya
  { name: "Instagram Carousel Templates", price: 14.99, salesCount: 19200, rating: 4.7, reviewCount: 3400, searchVolume: 28000, demandScore: 9.3, supplyScore: 7.8, tags: "instagram,carousel,canva", type: "template", avgMonthlySales: 1600, priceRange: "budget", isTrending: true },
  { name: "TikTok Video Templates", price: 12.99, salesCount: 15800, rating: 4.6, reviewCount: 2800, searchVolume: 25000, demandScore: 9.1, supplyScore: 7.2, tags: "tiktok,video,short form", type: "template", avgMonthlySales: 1317, priceRange: "budget", isTrending: true },
  { name: "YouTube Thumbnail Pack", price: 19.99, salesCount: 12400, rating: 4.8, reviewCount: 2100, searchVolume: 20000, demandScore: 8.8, supplyScore: 6.5, tags: "youtube,thumbnail,graphics", type: "template", avgMonthlySales: 1033, priceRange: "mid", isTrending: false },
  { name: "Pinterest Pin Templates", price: 9.99, salesCount: 9600, rating: 4.5, reviewCount: 1800, searchVolume: 12000, demandScore: 7.6, supplyScore: 7.9, tags: "pinterest,pin,design", type: "template", avgMonthlySales: 800, priceRange: "budget", isTrending: false },

  // Muzik
  { name: "Lofi Beat Collection Vol.1", price: 29.99, salesCount: 5800, rating: 4.8, reviewCount: 890, searchVolume: 12000, demandScore: 8.4, supplyScore: 3.2, tags: "lofi,beats,music,background", type: "audio", avgMonthlySales: 483, priceRange: "premium", isTrending: true },
  { name: "Podcast Intro and Outro Pack", price: 24.99, salesCount: 4200, rating: 4.7, reviewCount: 620, searchVolume: 8000, demandScore: 7.8, supplyScore: 3.8, tags: "podcast,intro,outro,audio", type: "audio", avgMonthlySales: 350, priceRange: "mid", isTrending: false },
  { name: "Cinematic Sound Effects Library", price: 34.99, salesCount: 3100, rating: 4.9, reviewCount: 480, searchVolume: 10000, demandScore: 8.1, supplyScore: 2.8, tags: "sound effects,cinematic,sfx", type: "audio", avgMonthlySales: 258, priceRange: "premium", isTrending: false },
  { name: "YouTube SFX Bundle", price: 19.99, salesCount: 6200, rating: 4.6, reviewCount: 920, searchVolume: 11000, demandScore: 8.3, supplyScore: 4.1, tags: "youtube,sfx,sound effects", type: "audio", avgMonthlySales: 517, priceRange: "mid", isTrending: false },

  // Fotografcilik
  { name: "Cinematic LUT Pack", price: 24.99, salesCount: 8900, rating: 4.8, reviewCount: 1560, searchVolume: 14000, demandScore: 8.7, supplyScore: 4.5, tags: "luts,cinematic,color grading,video", type: "design", avgMonthlySales: 742, priceRange: "mid", isTrending: true },
  { name: "Lightroom Preset Bundle Pro", price: 19.99, salesCount: 11200, rating: 4.7, reviewCount: 2100, searchVolume: 18000, demandScore: 8.9, supplyScore: 6.2, tags: "lightroom,presets,photo editing", type: "design", avgMonthlySales: 933, priceRange: "mid", isTrending: false },
  { name: "Video Editing Transitions Pack", price: 29.99, salesCount: 6400, rating: 4.6, reviewCount: 1100, searchVolume: 11000, demandScore: 8.2, supplyScore: 5.8, tags: "transitions,video editing,premiere pro", type: "design", avgMonthlySales: 533, priceRange: "premium", isTrending: false },
  { name: "Drone Footage LUT Collection", price: 22.99, salesCount: 3800, rating: 4.8, reviewCount: 580, searchVolume: 8000, demandScore: 7.9, supplyScore: 3.2, tags: "drone,luts,aerial photography", type: "design", avgMonthlySales: 317, priceRange: "mid", isTrending: true },

  // Yazi
  { name: "AI Copywriting Template Pack", price: 19.99, salesCount: 4600, rating: 4.9, reviewCount: 780, searchVolume: 16000, demandScore: 9.2, supplyScore: 2.4, tags: "copywriting,ai,templates,writing", type: "other", avgMonthlySales: 383, priceRange: "mid", isTrending: true },
  { name: "Email Marketing Templates", price: 14.99, salesCount: 5800, rating: 4.7, reviewCount: 920, searchVolume: 12000, demandScore: 8.5, supplyScore: 3.6, tags: "email marketing,templates,email copy", type: "other", avgMonthlySales: 483, priceRange: "budget", isTrending: false },
  { name: "Blog Post Templates Collection", price: 12.99, salesCount: 3200, rating: 4.6, reviewCount: 540, searchVolume: 9000, demandScore: 7.8, supplyScore: 3.1, tags: "blog,templates,content writing", type: "other", avgMonthlySales: 267, priceRange: "budget", isTrending: false },
  { name: "Twitter/X Growth Toolkit", price: 16.99, salesCount: 6800, rating: 4.8, reviewCount: 1100, searchVolume: 14000, demandScore: 9.0, supplyScore: 2.8, tags: "twitter,x,growth,threads", type: "other", avgMonthlySales: 567, priceRange: "budget", isTrending: true },

  // Is
  { name: "Startup Financial Model", price: 49.99, salesCount: 3600, rating: 4.9, reviewCount: 680, searchVolume: 14000, demandScore: 8.8, supplyScore: 2.5, tags: "startup,financial model,excel", type: "other", avgMonthlySales: 300, priceRange: "premium", isTrending: true },
  { name: "Business Plan Template", price: 29.99, salesCount: 5200, rating: 4.7, reviewCount: 920, searchVolume: 12000, demandScore: 8.3, supplyScore: 4.8, tags: "business plan,template,proposal", type: "other", avgMonthlySales: 433, priceRange: "mid", isTrending: false },
  { name: "Invoice and Contract Templates", price: 19.99, salesCount: 7800, rating: 4.6, reviewCount: 1400, searchVolume: 10000, demandScore: 8.0, supplyScore: 5.2, tags: "invoice,contract,legal,template", type: "other", avgMonthlySales: 650, priceRange: "mid", isTrending: false },
  { name: "Investor Pitch Deck Kit", price: 59.99, salesCount: 2400, rating: 4.8, reviewCount: 420, searchVolume: 16000, demandScore: 9.1, supplyScore: 2.2, tags: "pitch deck,investor,startup,presentation", type: "other", avgMonthlySales: 200, priceRange: "premium", isTrending: true },

  // Saglik
  { name: "30-Day Fitness Challenge", price: 24.99, salesCount: 8200, rating: 4.7, reviewCount: 1500, searchVolume: 16000, demandScore: 8.5, supplyScore: 5.1, tags: "fitness,workout,exercise", type: "course", avgMonthlySales: 683, priceRange: "mid", isTrending: true },
  { name: "Meal Prep Guide and Planner", price: 19.99, salesCount: 9600, rating: 4.6, reviewCount: 1800, searchVolume: 14000, demandScore: 8.2, supplyScore: 5.8, tags: "meal prep,nutrition,healthy eating", type: "ebook", avgMonthlySales: 800, priceRange: "mid", isTrending: false },
  { name: "Yoga and Meditation Guide", price: 22.99, salesCount: 5800, rating: 4.8, reviewCount: 980, searchVolume: 12000, demandScore: 8.4, supplyScore: 4.2, tags: "yoga,meditation,mindfulness", type: "course", avgMonthlySales: 483, priceRange: "mid", isTrending: false },
  { name: "Mental Wellness Journal", price: 14.99, salesCount: 7200, rating: 4.7, reviewCount: 1200, searchVolume: 10000, demandScore: 8.1, supplyScore: 3.8, tags: "mental health,journal,wellness", type: "other", avgMonthlySales: 600, priceRange: "budget", isTrending: true },

  // AI Prompts
  { name: "ChatGPT Mega Prompt Pack", price: 12.99, salesCount: 14200, rating: 4.8, reviewCount: 2400, searchVolume: 38000, demandScore: 9.6, supplyScore: 2.5, tags: "chatgpt,prompts,ai,gpt", type: "other", avgMonthlySales: 1183, priceRange: "budget", isTrending: true },
  { name: "Midjourney Prompt Bible", price: 19.99, salesCount: 9800, rating: 4.7, reviewCount: 1800, searchVolume: 28000, demandScore: 9.4, supplyScore: 2.8, tags: "midjourney,prompts,ai art,image generation", type: "other", avgMonthlySales: 817, priceRange: "mid", isTrending: true },
  { name: "AI Business Prompt Collection", price: 14.99, salesCount: 7600, rating: 4.9, reviewCount: 1200, searchVolume: 22000, demandScore: 9.5, supplyScore: 2.1, tags: "ai,business,prompts,automation", type: "other", avgMonthlySales: 633, priceRange: "budget", isTrending: true },
  { name: "Claude and Gemini Prompt Pack", price: 9.99, salesCount: 5400, rating: 4.7, reviewCount: 890, searchVolume: 15000, demandScore: 9.2, supplyScore: 1.8, tags: "claude,gemini,prompts,ai", type: "other", avgMonthlySales: 450, priceRange: "budget", isTrending: true },
  { name: "AI Image Prompt Engineering Guide", price: 24.99, salesCount: 4200, rating: 4.8, reviewCount: 680, searchVolume: 20000, demandScore: 9.3, supplyScore: 1.5, tags: "ai art,prompt engineering,image generation", type: "course", avgMonthlySales: 350, priceRange: "premium", isTrending: true },
  { name: "AI Content Writing Prompts", price: 7.99, salesCount: 11000, rating: 4.6, reviewCount: 2100, searchVolume: 18000, demandScore: 9.1, supplyScore: 2.4, tags: "content writing,ai,prompts,copywriting", type: "other", avgMonthlySales: 917, priceRange: "budget", isTrending: false },
]

const categoryMapping: Record<string, string> = {
  "Ultimate Notion Life OS": "notion-templates",
  "Notion Business Hub": "notion-templates",
  "Student Notion Starter Pack": "notion-templates",
  "Freelancer Dashboard Notion": "notion-templates",
  "Content Creator Notion System": "notion-templates",
  "Notion Finance Tracker Pro": "notion-templates",
  "Notion AI Workflow Pack": "notion-templates",
  "Full-Stack Web Dev Bootcamp": "online-courses",
  "YouTube Growth Masterclass": "online-courses",
  "AI Tools for Business": "online-courses",
  "Photography for Beginners": "online-courses",
  "Freelancing 101": "online-courses",
  "Prompt Engineering Mastery": "online-courses",
  "Social Media Marketing Pro": "online-courses",
  "Startup Playbook": "ebooks-guides",
  "SEO Ultimate Guide 2024": "ebooks-guides",
  "Personal Finance Handbook": "ebooks-guides",
  "Remote Work Bible": "ebooks-guides",
  "Complete Figma Design System": "ui-ux-design",
  "Wireframe Kit Pro": "ui-ux-design",
  "Landing Page Templates Bundle": "ui-ux-design",
  "Mobile App UI Kit": "ui-ux-design",
  "SaaS Dashboard UI Kit": "ui-ux-design",
  "Next.js SaaS Starter Kit": "software-tools",
  "Chrome Extension Boilerplate": "software-tools",
  "API Template Collection": "software-tools",
  "WordPress Plugin Bundle": "software-tools",
  "Tailwind CSS Component Library": "software-tools",
  "Instagram Carousel Templates": "social-media-templates",
  "TikTok Video Templates": "social-media-templates",
  "YouTube Thumbnail Pack": "social-media-templates",
  "Pinterest Pin Templates": "social-media-templates",
  "Lofi Beat Collection Vol.1": "music-audio",
  "Podcast Intro and Outro Pack": "music-audio",
  "Cinematic Sound Effects Library": "music-audio",
  "YouTube SFX Bundle": "music-audio",
  "Cinematic LUT Pack": "photography-video",
  "Lightroom Preset Bundle Pro": "photography-video",
  "Video Editing Transitions Pack": "photography-video",
  "Drone Footage LUT Collection": "photography-video",
  "AI Copywriting Template Pack": "writing-copywriting",
  "Email Marketing Templates": "writing-copywriting",
  "Blog Post Templates Collection": "writing-copywriting",
  "Twitter/X Growth Toolkit": "writing-copywriting",
  "Startup Financial Model": "business-entrepreneurship",
  "Business Plan Template": "business-entrepreneurship",
  "Invoice and Contract Templates": "business-entrepreneurship",
  "Investor Pitch Deck Kit": "business-entrepreneurship",
  "30-Day Fitness Challenge": "health-wellness",
  "Meal Prep Guide and Planner": "health-wellness",
  "Yoga and Meditation Guide": "health-wellness",
  "Mental Wellness Journal": "health-wellness",
  "ChatGPT Mega Prompt Pack": "ai-prompts",
  "Midjourney Prompt Bible": "ai-prompts",
  "AI Business Prompt Collection": "ai-prompts",
  "Claude and Gemini Prompt Pack": "ai-prompts",
  "AI Image Prompt Engineering Guide": "ai-prompts",
  "AI Content Writing Prompts": "ai-prompts",
}

async function main() {
  console.log("Seeding database...")

  await db.product.deleteMany()
  await db.category.deleteMany()
  await db.marketInsight.deleteMany()
  await db.searchTrend.deleteMany()

  for (const cat of categories) {
    await db.category.create({ data: cat })
  }
  console.log(`Created ${categories.length} categories`)

  const categoryMap: Record<string, string> = {}
  for (const cat of categories) {
    const dbCat = await db.category.findFirst({ where: { slug: cat.slug } })
    if (dbCat) categoryMap[cat.slug] = dbCat.id
  }

  for (const p of productsData) {
    const slug = categoryMapping[p.name]
    const catId = slug ? categoryMap[slug] : null
    if (!catId) continue

    const revenue = p.price * p.salesCount
    const opportunityScore = Math.round(((p.demandScore * 10) - (p.supplyScore * 8)) * 10) / 10

    await db.product.create({
      data: {
        name: p.name,
        categoryId: catId,
        price: p.price,
        salesCount: p.salesCount,
        revenue: revenue,
        rating: p.rating,
        reviewCount: p.reviewCount,
        searchVolume: p.searchVolume,
        demandScore: p.demandScore,
        supplyScore: p.supplyScore,
        opportunityScore: Math.max(0, opportunityScore),
        tags: p.tags,
        createdAt: "2024-01-15",
        updatedAt: "2024-06-10",
        description: `${p.name} - ${p.tags}`,
        type: p.type,
        avgMonthlySales: p.avgMonthlySales,
        priceRange: p.priceRange,
        isTrending: p.isTrending,
      },
    })
  }
  console.log(`Created ${productsData.length} products`)

  const insights = [
    { title: "AI Prompt Paketleri Patlama Yasiyor", description: "AI prompt satislari son 6 ayda %68 artti ve talep halâ arzin cok ustunde. Bu kategori en buyuk firsati sunuyor.", insightType: "opportunity", impactScore: 9.6 },
    { title: "Notion + AI Entegrasyonu Yukuselte", description: "AI destekli Notion sablonlari %45 daha yuksek fiyatlara satiliyor ve 3x daha fazla talep goruyor.", insightType: "opportunity", impactScore: 8.8 },
    { title: "Yazi ve Kopyalama Nisinde Dev Acik", description: "Bu kategoride talep yuksek ancak arz cok dusuk. Rekabet endeksi 2.8 ile en dusuk seviyelerden biri.", insightType: "opportunity", impactScore: 9.2 },
    { title: "Sosyal Medya Sablonlari Rekabetci", description: "Bu kategoride 3600+ urun var ve rekabet endeksi 7.8. Yeni girenler icin ayirt edici olmayan urunler zorlanacak.", insightType: "warning", impactScore: 7.5 },
    { title: "Premium Fiyatlandirma Trendi", description: "$50+ fiyat araligindaki urunler satis hacmi dusuk olmasina ragmen toplam gelirde %38 paya sahip.", insightType: "trend", impactScore: 8.1 },
    { title: "Video Icerik Araclari Hizla Buyuyor", description: "YouTube, TikTok ve podcast icin arac paketleri aylik %29 buyume gosteriyor.", insightType: "trend", impactScore: 8.4 },
    { title: "SaaS Dashboard UI Kitleri Altin Degerinde", description: "SaaS dashboard tasarim kitleri dusuk rekabetle yuksek talep goruyor ve $60+ fiyata kolayca satilabiliyor.", insightType: "opportunity", impactScore: 9.0 },
    { title: "Freelancer Araclarina Talep Artiyor", description: "Freelancer ve serbest calisanlar icin ozel arac paketleri 6 ayda %34 buyume gosterdi.", insightType: "trend", impactScore: 8.2 },
    { title: "eBook Pazari Dogrusal Buyume", description: "eBook kategorisi istikrarli ancak yavas buyuyor (%12.8). Yeni girenler icin farklilasma kritik.", insightType: "warning", impactScore: 6.8 },
    { title: "Startup Ekosistemi Icin Araclar Acik", description: "Investor pitch deck, finansal model ve startup kiti pazarinda buyuk acik var. Talep yuksek ama arz cok sinirli.", insightType: "opportunity", impactScore: 9.4 },
  ]

  for (const insight of insights) {
    await db.marketInsight.create({ data: insight })
  }
  console.log(`Created ${insights.length} market insights`)

  const months = ["2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06", "2024-07", "2024-08", "2024-09", "2024-10", "2024-11", "2024-12"]
  const trendKeywords = [
    { keyword: "notion templates", baseVolume: 14000, growth: 1.02 },
    { keyword: "ai prompts", baseVolume: 8000, growth: 1.08 },
    { keyword: "online course", baseVolume: 11000, growth: 1.03 },
    { keyword: "figma ui kit", baseVolume: 6000, growth: 1.05 },
    { keyword: "chatgpt prompts", baseVolume: 12000, growth: 1.12 },
    { keyword: "midjourney prompts", baseVolume: 9000, growth: 1.09 },
    { keyword: "lofi beats", baseVolume: 4000, growth: 1.02 },
    { keyword: "lightroom presets", baseVolume: 8000, growth: 1.01 },
    { keyword: "startup template", baseVolume: 5000, growth: 1.04 },
    { keyword: "canva templates", baseVolume: 15000, growth: 1.02 },
    { keyword: "saas boilerplate", baseVolume: 7000, growth: 1.06 },
    { keyword: "youtube thumbnail", baseVolume: 6000, growth: 1.03 },
  ]

  for (const tk of trendKeywords) {
    for (let i = 0; i < months.length; i++) {
      const volume = Math.round(tk.baseVolume * Math.pow(tk.growth, i) * (0.9 + Math.random() * 0.2))
      await db.searchTrend.create({
        data: {
          keyword: tk.keyword,
          month: months[i],
          volume: volume,
        },
      })
    }
  }
  console.log(`Created search trends`)

  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

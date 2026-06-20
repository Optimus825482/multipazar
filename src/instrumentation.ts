export function register() {
  // Next.js 14+ instrumentation.ts
  // Bu fonksiyon server baslangicinda bir kere calisir
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import ile cron baslat (statik import'ta client-side'da patlamasin)
    import('./lib/cron').then(({ startCronJob }) => {
      startCronJob()
    }).catch((err) => {
      console.error('Cron baslatilamadi:', err)
    })
  }
}

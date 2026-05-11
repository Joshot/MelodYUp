import './globals.css'
export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'MelodYUp — Chord & Melody Analyzer',
  description: 'Upload any song and get real chord detection, melody, BPM, key analysis. Built by Hyvaroo Labs.',
}
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}

import './globals.css'

export const metadata = {
  title: 'Clínica Marla',
  description: 'Sistema de administración clínica',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
import './globals.css'
import { LangProvider } from '../lib/lang'

export const metadata = {
  title: 'Kruthik Farm — Farm Marketplace',
  description: 'Farm fresh products direct to you',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LangProvider>
          {children}
        </LangProvider>
      </body>
    </html>
  )
}

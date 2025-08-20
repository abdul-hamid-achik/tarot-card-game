import 'nextra-theme-docs/style.css'
import type { ReactNode } from 'react'
import { Layout } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'

export default async function RootLayout({ children }: { children: ReactNode }) {
  const pageMap = await getPageMap()
  return (
    <html lang="en">
      <body>
        <Layout pageMap={pageMap}>
          {children}
        </Layout>
      </body>
    </html>
  )
}

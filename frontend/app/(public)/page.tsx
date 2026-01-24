'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui'
import { Footer } from '@/components/layout'

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎨</span>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Drawing App
              </span>
            </div>
            <nav className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1">
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Create &amp; Draw
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Together
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              リアルタイムでみんなと一緒にお絵描き。
              創造性を共有し、コラボレーションで新しいアートを生み出そう。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  Get Started - It&apos;s Free
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  I already have an account
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features section */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Features
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="text-5xl mb-4">🖌️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Real-time Drawing
                </h3>
                <p className="text-gray-600">
                  描いた瞬間、全員に共有。リアルタイムで一緒にアートを作成。
                </p>
              </div>
              <div className="text-center p-6">
                <div className="text-5xl mb-4">💬</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Live Chat
                </h3>
                <p className="text-gray-600">
                  描きながらチャット。アイデアを共有し、コミュニケーション。
                </p>
              </div>
              <div className="text-center p-6">
                <div className="text-5xl mb-4">🎨</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Themed Rooms
                </h3>
                <p className="text-gray-600">
                  テーマを決めてルームを作成。同じテーマで描く楽しさ。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to start drawing?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              無料でアカウントを作成して、今すぐ描き始めよう。
            </p>
            <Link href="/auth/register">
              <Button
                variant="ghost"
                size="lg"
                className="bg-white text-purple-600 hover:bg-gray-100"
              >
                Create Free Account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

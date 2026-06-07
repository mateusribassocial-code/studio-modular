import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  const validPassword = process.env.DASHBOARD_PASSWORD
  if (!validPassword || password !== validPassword) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  const payload = JSON.stringify({
    client: 'dashboard',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
  })
  const token = Buffer.from(payload).toString('base64')

  const res = NextResponse.json({ ok: true })
  res.cookies.set('dashboard_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('dashboard_session')
  return res
}

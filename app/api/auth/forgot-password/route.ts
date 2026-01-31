import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import crypto from 'crypto'

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true })
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 hour from now

    // Delete any existing reset tokens for this user
    await db.verificationToken.deleteMany({
      where: {
        identifier: email.toLowerCase(),
      },
    })

    // Create new reset token
    await db.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token,
        expires,
      },
    })

    // In production, send email with reset link
    // For now, log the token (this would be replaced with actual email sending)
    console.log(`Password reset token for ${email}: ${token}`)
    console.log(`Reset URL would be: ${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`)

    // TODO: Integrate email service (e.g., SendGrid, Resend, etc.)
    // await sendEmail({
    //   to: email,
    //   subject: 'Reset your Spirit Connect password',
    //   html: `
    //     <h1>Reset your password</h1>
    //     <p>Click the link below to reset your password:</p>
    //     <a href="${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}">
    //       Reset Password
    //     </a>
    //     <p>This link will expire in 1 hour.</p>
    //   `,
    // })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

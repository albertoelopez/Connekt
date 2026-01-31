import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, token, password } = resetPasswordSchema.parse(body)

    // Find the verification token
    const verificationToken = await db.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email.toLowerCase(),
          token,
        },
      },
    })

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await db.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email.toLowerCase(),
            token,
          },
        },
      })

      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      )
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update user's password
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    // Delete the used token
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email.toLowerCase(),
          token,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}

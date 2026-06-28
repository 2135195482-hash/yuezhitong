import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || '0')
  const category = searchParams.get('category') || ''

  const where: Record<string, unknown> = { province: '广东', batch: '本科批' }
  if (year > 0) where.admissionYear = year
  if (category) where.category = category

  const sources = await prisma.admissionRecord.findMany({
    where,
    select: {
      sourceName: true,
      sourceUrl: true,
      sourceLevel: true,
      officialTitle: true,
      officialPublishedAt: true,
      admissionYear: true,
      verificationStatus: true,
    },
    distinct: ['sourceName', 'sourceUrl'],
    orderBy: [{ admissionYear: 'desc' }, { sourceLevel: 'asc' }],
  })

  return NextResponse.json({ sources })
}

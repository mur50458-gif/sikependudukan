import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT update bantuan & keterangan for penduduk sementara by NIK
export async function PUT(
  req: NextRequest,
  { params }: { params: { nik: string } }
) {
  try {
    const nik = decodeURIComponent(params.nik);
    const body = await req.json();

    const existing = await db.pendudukSementara.findUnique({ where: { nik } });
    if (!existing) {
      return NextResponse.json({ message: 'Tidak ada di data penduduk sementara' });
    }

    const updateData: any = {};
    if (body.bantuan !== undefined) {
      updateData.bantuan = Array.isArray(body.bantuan) ? JSON.stringify(body.bantuan) : body.bantuan;
    }
    if (body.bpjs !== undefined) updateData.bpjs = body.bpjs || null;
    if (body.keterangan !== undefined) updateData.keterangan = body.keterangan || null;

    await db.pendudukSementara.update({
      where: { nik },
      data: updateData,
    });

    // Propagate keterangan to family members if this is KK head
    if (existing.statusKeluarga === 'KEPALA KELUARGA' && body.keterangan !== undefined) {
      await db.pendudukSementara.updateMany({
        where: {
          noKK: existing.noKK,
          statusKeluarga: { not: 'KEPALA KELUARGA' },
        },
        data: { keterangan: updateData.keterangan },
      });
    }

    return NextResponse.json({ message: 'Penduduk sementara updated' });
  } catch (error) {
    console.error('Update semantara bantuan error:', error);
    return NextResponse.json({ message: 'Tidak ada di data penduduk sementara' });
  }
}

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

    // Always propagate bantuan/bpjs/keterangan to all family members in the same KK
    if (body.bantuan !== undefined || body.bpjs !== undefined || body.keterangan !== undefined) {
      const memberUpdate: any = {};
      if (body.bantuan !== undefined) memberUpdate.bantuan = updateData.bantuan;
      if (body.bpjs !== undefined) memberUpdate.bpjs = updateData.bpjs;
      if (body.keterangan !== undefined) memberUpdate.keterangan = updateData.keterangan;

      await db.pendudukSementara.updateMany({
        where: { noKK: existing.noKK, NOT: { nik } },
        data: memberUpdate,
      });
    }

    return NextResponse.json({ message: 'Penduduk sementara updated' });
  } catch (error) {
    console.error('Update semantara bantuan error:', error);
    return NextResponse.json({ message: 'Tidak ada di data penduduk sementara' });
  }
}

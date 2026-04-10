import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET single penduduk
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const data = await db.penduduk.findUnique({ where: { id } });
    if (!data) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

// PUT update penduduk
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();

    // Build update data from provided fields
    const updateData: any = {};

    if (body.noKK !== undefined) updateData.noKK = body.noKK;
    if (body.nik !== undefined) updateData.nik = body.nik;
    if (body.namaLengkap !== undefined) updateData.namaLengkap = body.namaLengkap;
    if (body.jenisKelamin !== undefined) updateData.jenisKelamin = body.jenisKelamin;
    if (body.statusKeluarga !== undefined) updateData.statusKeluarga = body.statusKeluarga;
    if (body.tempatLahir !== undefined) updateData.tempatLahir = body.tempatLahir;
    if (body.tanggalLahir !== undefined) updateData.tanggalLahir = body.tanggalLahir ? new Date(body.tanggalLahir) : undefined;
    if (body.agama !== undefined) updateData.agama = body.agama;
    if (body.pendidikan !== undefined) updateData.pendidikan = body.pendidikan;
    if (body.pekerjaan !== undefined) updateData.pekerjaan = body.pekerjaan;
    if (body.statusPerkawinan !== undefined) updateData.statusPerkawinan = body.statusPerkawinan;
    if (body.kewarganegaraan !== undefined) updateData.kewarganegaraan = body.kewarganegaraan;
    if (body.namaAyah !== undefined) updateData.namaAyah = body.namaAyah;
    if (body.namaIbu !== undefined) updateData.namaIbu = body.namaIbu;
    if (body.namaPanggilan !== undefined) updateData.namaPanggilan = body.namaPanggilan || null;
    if (body.noHP !== undefined) updateData.noHP = body.noHP || null;
    if (body.punyaKTP !== undefined) updateData.punyaKTP = body.punyaKTP;
    if (body.bantuan !== undefined) {
      if (Array.isArray(body.bantuan)) {
        updateData.bantuan = JSON.stringify(body.bantuan);
      } else {
        updateData.bantuan = body.bantuan;
      }
    }
    if (body.bpjs !== undefined) updateData.bpjs = body.bpjs || null;
    if (body.keterangan !== undefined) updateData.keterangan = body.keterangan || null;
    if (body.alamat !== undefined) updateData.alamat = body.alamat || null;
    if (body.rt !== undefined) updateData.rt = body.rt || null;
    if (body.rw !== undefined) updateData.rw = body.rw || null;
    if (body.kelurahan !== undefined) updateData.kelurahan = body.kelurahan || null;
    if (body.kecamatan !== undefined) updateData.kecamatan = body.kecamatan || null;
    if (body.kabupatenKota !== undefined) updateData.kabupatenKota = body.kabupatenKota || null;
    if (body.provinsi !== undefined) updateData.provinsi = body.provinsi || null;

    // KK head propagation: if updating bantuan or bpjs for KK head, propagate to family
    const existing = await db.penduduk.findUnique({ where: { id } });
    if (existing && existing.statusKeluarga === 'KEPALA KELUARGA') {
      const shouldPropagateBantuan = body.bantuan !== undefined;
      const shouldPropagateBpjs = body.bpjs !== undefined;

      if (shouldPropagateBantuan || shouldPropagateBpjs) {
        const members = await db.penduduk.findMany({
          where: { noKK: existing.noKK, id: { not: id } },
        });

        if (members.length > 0) {
          const memberUpdate: any = {};
          if (shouldPropagateBantuan) memberUpdate.bantuan = updateData.bantuan;
          if (shouldPropagateBpjs) memberUpdate.bpjs = updateData.bpjs;

          await db.penduduk.updateMany({
            where: { noKK: existing.noKK, id: { not: id } },
            data: memberUpdate,
          });
        }
      }
    }

    const data = await db.penduduk.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate data: ' + String(error.message || error) }, { status: 500 });
  }
}

// DELETE penduduk
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    await db.penduduk.delete({ where: { id } });
    return NextResponse.json({ message: 'Data berhasil dihapus' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 });
  }
}

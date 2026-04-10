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

    // Use transaction for atomic propagation + update
    const result = await db.$transaction(async (tx) => {
      // First update the person
      const data = await tx.penduduk.update({
        where: { id },
        data: updateData,
      });

      // Then propagate to all family members in the same KK
      // Hanya propagate field yang memiliki nilai (non-null, non-empty)
      let propagatedCount = 0;
      const memberUpdate: any = {};
      // Keterangan: propagate jika ada isinya (desil, DTK, dll)
      if (updateData.keterangan && updateData.keterangan !== null) {
        memberUpdate.keterangan = updateData.keterangan;
      }
      // BPJS: propagate jika ada isinya (bukan null)
      if (updateData.bpjs && updateData.bpjs !== null) {
        memberUpdate.bpjs = updateData.bpjs;
      }
      // Bantuan: propagate jika ada isinya (bukan array kosong "[]")
      if (updateData.bantuan && updateData.bantuan !== '[]') {
        memberUpdate.bantuan = updateData.bantuan;
      }

      if (Object.keys(memberUpdate).length > 0) {
        const propagationResult = await tx.penduduk.updateMany({
          where: { noKK: data.noKK, id: { not: id } },
          data: memberUpdate,
        });
        propagatedCount = propagationResult.count;
      }

      return { data, propagatedCount, propagatedNoKK: data.noKK };
    });

    console.log(`[PENDUDUK UPDATE] id=${id}, noKK=${result.propagatedNoKK}, propagated=${result.propagatedCount}, keterangan=${updateData.keterangan}, bpjs=${updateData.bpjs}`);

    return NextResponse.json({
      ...result.data,
      _debug: {
        propagatedCount: result.propagatedCount,
        propagatedNoKK: result.propagatedNoKK,
        sentKeterangan: body.keterangan,
        savedKeterangan: updateData.keterangan,
        memberUpdateKeterangan: updateData.keterangan,
        sentBpjs: body.bpjs,
        savedBpjs: updateData.bpjs,
      },
    });
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

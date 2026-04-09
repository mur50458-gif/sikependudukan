import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { toUpperCase, validateNIK, validateNoKK } from '@/lib/utils-kependudukan';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File diperlukan' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as string[][];

    let errors: string[] = [];

    // XLSX column mapping (data starts from Col B = index 0):
    const COL_NO_KK = 0, COL_NAMA = 1, COL_NIK = 2, COL_JENIS_KELAMIN = 3;
    const COL_STATUS_KELUARGA = 4, COL_TEMPAT_LAHIR = 5, COL_TGL_LAHIR = 6;
    const COL_AGAMA = 7, COL_PENDIDIKAN = 8, COL_PEKERJAAN = 9;
    const COL_STATUS_KAWIN = 10, COL_WARGANEGARA = 11;
    const COL_NAMA_AYAH = 12, COL_NAMA_IBU = 13, COL_PANGGILAN = 14;
    const COL_KETERANGAN = 15, COL_BPJS = 16;

    // 1) Pre-fetch all existing NIKs in ONE query
    const existingNiks = new Set(
      (await db.penduduk.findMany({ select: { nik: true } })).map(r => r.nik)
    );

    // 2) Parse all rows first, validate, collect into batch
    let currentNoKK = '';
    const batch: Record<string, unknown>[] = [];
    // Track bantuan & BPJS per KK from the KK head
    const kkBantuanMap = new Map<string, string>(); // noKK -> bantuan JSON string
    const kkBpjsMap = new Map<string, string | null>(); // noKK -> bpjs value

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 5) continue;

      const noKKRaw = row[COL_NO_KK] || '';
      const namaLengkap = (row[COL_NAMA] || '').trim();
      const nik = (row[COL_NIK] || '').trim();
      const jenisKelamin = (row[COL_JENIS_KELAMIN] || '').trim();
      const statusKeluarga = (row[COL_STATUS_KELUARGA] || '').trim();
      const tempatLahir = (row[COL_TEMPAT_LAHIR] || '').trim();
      const tanggalLahirRaw = (row[COL_TGL_LAHIR] || '').trim();
      const agama = (row[COL_AGAMA] || '').trim();
      const pendidikan = (row[COL_PENDIDIKAN] || '').trim();
      const pekerjaan = (row[COL_PEKERJAAN] || '').trim();
      const statusPerkawinan = (row[COL_STATUS_KAWIN] || '').trim();
      const kewarganegaraan = (row[COL_WARGANEGARA] || 'WNI').trim();
      const namaAyah = (row[COL_NAMA_AYAH] || '').trim();
      const namaIbu = (row[COL_NAMA_IBU] || '').trim();
      const namaPanggilan = (row[COL_PANGGILAN] || '').trim();
      const keterangan = (row[COL_KETERANGAN] || '').trim();
      const bpjs = (row[COL_BPJS] || '').trim();

      if (!namaLengkap) continue;
      if (!nik && !statusKeluarga && !tempatLahir) continue;

      if (noKKRaw) currentNoKK = noKKRaw.trim();

      if (!currentNoKK || !nik) {
        if (namaLengkap) errors.push(`Baris ${i + 1}: Data tidak lengkap - ${namaLengkap}`);
        continue;
      }

      if (!validateNIK(nik)) {
        errors.push(`Baris ${i + 1}: NIK tidak valid (${nik}) - ${namaLengkap}`);
        continue;
      }

      if (existingNiks.has(nik.toUpperCase())) {
        errors.push(`Baris ${i + 1}: NIK ${nik} sudah ada (${namaLengkap})`);
        continue;
      }

      // Parse tanggal lahir
      let tanggalLahirStr = tanggalLahirRaw;
      if (tanggalLahirRaw && tanggalLahirRaw.includes('/')) {
        const parts = tanggalLahirRaw.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1;
          const day = parseInt(parts[1]);
          let year = parseInt(parts[2]);
          if (year < 100) {
            const currentCentury2Digit = new Date().getFullYear() % 100;
            year = year > currentCentury2Digit ? 1900 + year : 2000 + year;
          }
          const date = new Date(year, month, day);
          tanggalLahirStr = date.toISOString().split('T')[0];
        }
      } else if (tanggalLahirRaw && !isNaN(Number(tanggalLahirRaw))) {
        const serialDate = parseInt(tanggalLahirRaw);
        const epoch = new Date(1899, 11, 30);
        const date = new Date(epoch.getTime() + serialDate * 86400000);
        tanggalLahirStr = date.toISOString().split('T')[0];
      }

      if (!tanggalLahirStr) {
        errors.push(`Baris ${i + 1}: Tanggal lahir tidak valid - ${namaLengkap}`);
        continue;
      }

      existingNiks.add(nik.toUpperCase());

      // Determine bantuan & bpjs: use KK head's value if member, or set from this row if KK head
      const isKKHead = toUpperCase(statusKeluarga) === 'KEPALA KELUARGA';
      let finalBantuan = '[]';
      let finalBpjs: string | null = null;

      if (isKKHead) {
        finalBantuan = '[]'; // BPJS and bantuan not in Excel import columns for penduduk
        finalBpjs = bpjs ? bpjs.toUpperCase() : null;
        kkBantuanMap.set(currentNoKK, finalBantuan);
        kkBpjsMap.set(currentNoKK, finalBpjs);
      } else {
        // Anggota: inherit from KK head if already seen
        finalBantuan = kkBantuanMap.get(currentNoKK) || '[]';
        finalBpjs = kkBpjsMap.get(currentNoKK) ?? null;
      }

      batch.push({
        noKK: currentNoKK,
        nik: nik.toUpperCase(),
        namaLengkap: toUpperCase(namaLengkap),
        jenisKelamin: toUpperCase(jenisKelamin),
        statusKeluarga: toUpperCase(statusKeluarga),
        tempatLahir: toUpperCase(tempatLahir),
        tanggalLahir: new Date(tanggalLahirStr),
        agama: toUpperCase(agama),
        pendidikan: toUpperCase(pendidikan),
        pekerjaan: toUpperCase(pekerjaan),
        statusPerkawinan: toUpperCase(statusPerkawinan),
        kewarganegaraan: toUpperCase(kewarganegaraan),
        namaAyah: toUpperCase(namaAyah),
        namaIbu: toUpperCase(namaIbu),
        namaPanggilan: namaPanggilan ? toUpperCase(namaPanggilan) : null,
        noHP: null,
        punyaKTP: 'BELUM',
        bantuan: finalBantuan,
        bpjs: finalBpjs,
        keterangan: keterangan || null,
        alamat: 'KP. CEMPLANG',
        rt: '001',
        rw: '002',
        kelurahan: 'SUKAMAJU',
        kecamatan: 'CIBUNGBULANG',
        kabupatenKota: 'BOGOR',
        provinsi: 'JAWA BARAT',
      });
    }

    // 3) Batch insert in chunks of 100
    let imported = 0;
    const CHUNK_SIZE = 100;
    for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
      const chunk = batch.slice(i, i + CHUNK_SIZE);
      const result = await db.penduduk.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      imported += result.count;
    }

    // 4) Propagate KK head's bantuan & BPJS to all existing family members in DB
    for (const [noKK, bantuan] of kkBantuanMap) {
      const bpjs = kkBpjsMap.get(noKK) ?? null;
      const propagateData: Record<string, unknown> = { bantuan };
      if (bpjs !== undefined) propagateData.bpjs = bpjs;
      await db.penduduk.updateMany({
        where: {
          noKK,
          statusKeluarga: { not: 'KEPALA KELUARGA' },
        },
        data: propagateData,
      });
    }

    return NextResponse.json({
      message: `Berhasil mengimpor ${imported} data penduduk`,
      imported,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Gagal mengimpor data: ' + String(error) }, { status: 500 });
  }
}

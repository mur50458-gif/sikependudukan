'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Statistik {
  totalKK: number;
  totalPenduduk: number;
  pendudukL: number;
  pendudukP: number;
  bayiL: number;
  bayiP: number;
  ageDist: Record<string, { l: number; p: number }>;
  wajibKTPL: number;
  wajibKTPP: number;
  wajibKTPList: {
    id: number;
    noKK: string;
    nik: string;
    namaLengkap: string;
    jenisKelamin: string;
    tempatLahir: string;
    tanggalLahir: string;
    statusKeluarga: string;
    punyaKTP: string;
  }[];
  kkL: number;
  kkP: number;
  sementaraL: number;
  sementaraP: number;
  sementaraKK: number;
  kejadianCounts: Record<string, { l: number; p: number }>;
}

export default function TabBeranda() {
  const [statistik, setStatistik] = useState<Statistik | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistik();
  }, []);

  const fetchStatistik = async () => {
    try {
      const res = await fetch('/api/statistik');
      if (res.ok) {
        const data = await res.json();
        setStatistik(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!statistik) {
    return <div className="p-4 text-center text-muted-foreground">Gagal memuat data statistik</div>;
  }

  // Build age distribution array (1-100)
  const ageData: { age: number; l: number; p: number }[] = [];
  for (let i = 1; i <= 100; i++) {
    const key = String(i);
    const d = statistik.ageDist[key];
    if (d && (d.l > 0 || d.p > 0)) {
      ageData.push({ age: i, l: d.l, p: d.p });
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-emerald-600 text-white border-0">
          <CardContent className="p-3">
            <p className="text-[10px] opacity-80 font-medium">TOTAL KK</p>
            <p className="text-2xl font-bold">{statistik.totalKK}</p>
            <div className="flex gap-2 mt-1 text-[10px] opacity-80">
              <span>L: {statistik.kkL}</span>
              <span>P: {statistik.kkP}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-teal-600 text-white border-0">
          <CardContent className="p-3">
            <p className="text-[10px] opacity-80 font-medium">TOTAL PENDUDUK</p>
            <p className="text-2xl font-bold">{statistik.totalPenduduk}</p>
            <div className="flex gap-2 mt-1 text-[10px] opacity-80">
              <span>L: {statistik.pendudukL}</span>
              <span>P: {statistik.pendudukP}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500 text-white border-0">
          <CardContent className="p-3">
            <p className="text-[10px] opacity-80 font-medium">BAYI (0-11 BLN)</p>
            <p className="text-2xl font-bold">{statistik.bayiL + statistik.bayiP}</p>
            <div className="flex gap-2 mt-1 text-[10px] opacity-80">
              <span>L: {statistik.bayiL}</span>
              <span>P: {statistik.bayiP}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-rose-500 text-white border-0">
          <CardContent className="p-3">
            <p className="text-[10px] opacity-80 font-medium">WAJIB KTP (BARU MASUK 17 TH)</p>
            <p className="text-2xl font-bold">{statistik.wajibKTPL + statistik.wajibKTPP}</p>
            <div className="flex gap-2 mt-1 text-[10px] opacity-80">
              <span>L: {statistik.wajibKTPL}</span>
              <span>P: {statistik.wajibKTPP}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-indigo-500 text-white border-0">
          <CardContent className="p-3">
            <p className="text-[10px] opacity-80 font-medium">PENDUDUK SEMENTARA</p>
            <p className="text-2xl font-bold">{statistik.sementaraKK} KK</p>
            <p className="text-lg font-semibold">{statistik.sementaraL + statistik.sementaraP} penduduk</p>
            <div className="flex gap-2 mt-1 text-[10px] opacity-80">
              <span>L: {statistik.sementaraL}</span>
              <span>P: {statistik.sementaraP}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Wajib KTP */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold text-emerald-700">
            Data Penduduk Wajib KTP (Baru Masuk 17 Tahun)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {statistik.wajibKTPList.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Tidak ada penduduk yang baru masuk usia 17 tahun</p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-rose-50 text-rose-700">
                    <th className="text-left p-2 font-semibold rounded-tl-lg">No</th>
                    <th className="text-left p-2 font-semibold">No. KK</th>
                    <th className="text-left p-2 font-semibold">NIK</th>
                    <th className="text-left p-2 font-semibold">Nama Lengkap</th>
                    <th className="text-left p-2 font-semibold">L/P</th>
                    <th className="text-left p-2 font-semibold">TTL</th>
                    <th className="text-left p-2 font-semibold">Status Keluarga</th>
                    <th className="text-left p-2 font-semibold rounded-tr-lg">KTP</th>
                  </tr>
                </thead>
                <tbody>
                  {statistik.wajibKTPList.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2 font-mono text-[10px]">{item.noKK}</td>
                      <td className="p-2 font-mono text-[10px]">{item.nik}</td>
                      <td className="p-2 font-medium">{item.namaLengkap}</td>
                      <td className="p-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          item.jenisKelamin === 'LAKI-LAKI' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                        }`}>
                          {item.jenisKelamin === 'LAKI-LAKI' ? 'L' : 'P'}
                        </span>
                      </td>
                      <td className="p-2">{item.tempatLahir}, {item.tanggalLahir}</td>
                      <td className="p-2">{item.statusKeluarga}</td>
                      <td className="p-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          item.punyaKTP === 'SUDAH' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {item.punyaKTP === 'SUDAH' ? 'Sudah' : 'Belum'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kejadian Bulan Ini */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold text-emerald-700">Kejadian Bulan Ini</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-4 gap-2">
            {(['LAHIR', 'MATI', 'PINDAH', 'DATANG'] as const).map((type) => {
              const d = statistik.kejadianCounts[type];
              const color = type === 'LAHIR' ? 'text-green-600 bg-green-50' 
                : type === 'MATI' ? 'text-red-600 bg-red-50'
                : type === 'PINDAH' ? 'text-orange-600 bg-orange-50'
                : 'text-blue-600 bg-blue-50';
              return (
                <div key={type} className={`${color} rounded-lg p-2 text-center`}>
                  <p className="text-[10px] font-semibold">{type}</p>
                  <p className="text-lg font-bold">{d.l + d.p}</p>
                  <div className="flex justify-center gap-2 text-[9px]">
                    <span>L: {d.l}</span>
                    <span>P: {d.p}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Age Distribution */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold text-emerald-700">Distribusi Usia Penduduk (1-100 Tahun)</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-1 max-h-72 overflow-y-auto text-[11px]">
            <div className="font-semibold bg-emerald-50 p-1.5 rounded">Usia (L/P)</div>
            <div className="font-semibold bg-emerald-50 p-1.5 rounded">Usia (L/P)</div>
            {Array.from({ length: Math.ceil(ageData.length / 2) }, (_, i) => (
              <div key={i} className="contents">
                <div className="flex justify-between p-1 border-b border-gray-50">
                  <span>Umur {ageData[i]?.age}</span>
                  <span className="font-medium">{ageData[i]?.l} / {ageData[i]?.p}</span>
                </div>
                <div className="flex justify-between p-1 border-b border-gray-50">
                  {ageData[i + Math.ceil(ageData.length / 2)] ? (
                    <>
                      <span>Umur {ageData[i + Math.ceil(ageData.length / 2)]?.age}</span>
                      <span className="font-medium">{ageData[i + Math.ceil(ageData.length / 2)]?.l} / {ageData[i + Math.ceil(ageData.length / 2)]?.p}</span>
                    </>
                  ) : (
                    <span>-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

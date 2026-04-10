'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShieldCheck, ExternalLink, Search, Save, Users, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface PendudukItem {
  id: number;
  noKK: string;
  nik: string;
  namaLengkap: string;
  jenisKelamin: string;
  statusKeluarga: string;
  bantuan: string;
  bpjs: string | null;
}

interface TabCekBantuanProps {
  isAdmin?: boolean;
}

const DESIL_OPTIONS = ['DESIL 1', 'DESIL 2', 'DESIL 3', 'DESIL 4', 'DESIL 5', 'DESIL 6-10'] as const;

export default function TabCekBantuan({ isAdmin = true }: TabCekBantuanProps) {
  const [allPenduduk, setAllPenduduk] = useState<PendudukItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPenduduk, setSelectedPenduduk] = useState<PendudukItem | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPenduduk = useCallback(async () => {
    try {
      const res = await fetch('/api/penduduk');
      if (res.ok) setAllPenduduk(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPenduduk(); }, [fetchPenduduk]);

  // Group penduduk by noKK
  const kkMap = new Map<string, PendudukItem[]>();
  allPenduduk.forEach(p => {
    if (!kkMap.has(p.noKK)) kkMap.set(p.noKK, []);
    kkMap.get(p.noKK)!.push(p);
  });

  // Search filter
  const searchLower = searchQuery.toLowerCase();
  const filteredPenduduk = searchQuery
    ? allPenduduk.filter(p =>
        p.namaLengkap.toLowerCase().includes(searchLower) ||
        p.nik.includes(searchQuery) ||
        p.noKK.includes(searchQuery)
      )
    : allPenduduk;

  const openCekBansos = async (nik: string) => {
    try {
      await navigator.clipboard.writeText(nik);
      toast.success(`NIK ${nik} disalin ke clipboard! Paste di website cekbansos.`);
    } catch {
      toast.info('NIK: ' + nik + ' — salin manual lalu paste di website.');
    }
    window.open('https://cekbansos.kemensos.go.id/', '_blank');
  };

  const openCekDTK = async (nik: string) => {
    try {
      await navigator.clipboard.writeText(nik);
      toast.success(`NIK ${nik} disalin ke clipboard! Paste di website cek DTK.`);
    } catch {
      toast.info('NIK: ' + nik + ' — salin manual lalu paste di website.');
    }
    window.open('https://cekdtk.kemensos.go.id/', '_blank');
  };

  const openUpdateBantuan = (p: PendudukItem) => {
    setSelectedPenduduk(p);
    setShowForm(true);
  };

  const handleSaveBantuan = async (desil: string, jenisBantuan: string[], bpjs: string) => {
    if (!selectedPenduduk) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/penduduk/${selectedPenduduk.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bantuan: jenisBantuan,
          bpjs: bpjs || null,
        }),
      });
      if (res.ok) {
        toast.success(`Data bantuan ${selectedPenduduk.namaLengkap} berhasil disimpan`);
        setShowForm(false);
        setSelectedPenduduk(null);
        fetchPenduduk();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal menyimpan');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const totalKK = kkMap.size;
  const totalPenduduk = allPenduduk.length;
  const punyaBantuan = allPenduduk.filter(p => {
    try {
      const arr = JSON.parse(p.bantuan || '[]');
      return arr.length > 0 && !arr.includes('TIDAK');
    } catch { return false; }
  }).length;
  const punyaBPJS = allPenduduk.filter(p => p.bpjs && p.bpjs !== 'TIDAK').length;

  // Group filtered by KK for display
  const filteredKKs = new Map<string, PendudukItem[]>();
  filteredPenduduk.forEach(p => {
    if (!filteredKKs.has(p.noKK)) filteredKKs.set(p.noKK, []);
    filteredKKs.get(p.noKK)!.push(p);
  });

  const renderKKList = () => (
    <ScrollArea className="max-h-[calc(100vh-380px)]">
      <div className="space-y-3">
        {Array.from(filteredKKs.entries()).map(([noKK, members]) => {
          const kkHead = members.find(m => m.statusKeluarga === 'KEPALA KELUARGA') || members[0];
          return (
            <Card key={noKK} className="overflow-hidden">
              {/* KK Header */}
              <button
                className="w-full text-left bg-emerald-50 hover:bg-emerald-100 transition p-3 flex items-center justify-between"
                onClick={() => {
                  const el = document.getElementById(`kk-${noKK}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  const content = document.getElementById(`kk-content-${noKK}`);
                  if (content) {
                    content.classList.toggle('hidden');
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-800">{kkHead.namaLengkap}</p>
                  <p className="text-[10px] text-emerald-600 font-mono">KK: {noKK}</p>
                  <p className="text-[10px] text-gray-500">{members.length} anggota</p>
                </div>
                <ChevronRight className="h-4 w-4 text-emerald-600 shrink-0" />
              </button>

              {/* KK Members - hidden by default when searching */}
              <div id={`kk-content-${noKK}`} className={searchQuery ? '' : 'hidden'}>
                <div className="border-t border-emerald-100">
                  {members.map(p => (
                    <div
                      key={p.nik}
                      id={`kk-${noKK}`}
                      className="flex items-center justify-between px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium truncate">{p.namaLengkap}</p>
                          {p.statusKeluarga === 'KEPALA KELUARGA' && (
                            <span className="text-[9px] bg-emerald-600 text-white px-1 rounded">KK</span>
                          )}
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {p.jenisKelamin === 'LAKI-LAKI' ? 'L' : 'P'}
                          </Badge>
                        </div>
                        <p className="text-[10px] font-mono text-gray-500">{p.nik}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {(() => {
                            try {
                              const arr = JSON.parse(p.bantuan || '[]');
                              if (arr.length > 0 && !arr.includes('TIDAK')) {
                                return arr.map((b: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
                                    {b}
                                  </Badge>
                                ));
                              }
                            } catch {}
                            return null;
                          })()}
                          {p.bpjs && p.bpjs !== 'TIDAK' && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-green-50 text-green-700 border-green-200">
                              BPJS: {p.bpjs}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px] px-2 text-blue-600"
                          onClick={() => openCekBansos(p.nik)}
                          title="Cek di cekbansos.kemensos.go.id"
                        >
                          <ExternalLink className="h-3 w-3 mr-0.5" /> Cek
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px] px-2 text-emerald-600"
                            onClick={() => openUpdateBantuan(p)}
                            title="Update data bantuan"
                          >
                            <Save className="h-3 w-3 mr-0.5" /> Update
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}

        {filteredKKs.size === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <ShieldCheck className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>Tidak ada data ditemukan</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-emerald-800">Cek Bantuan Sosial</h2>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs text-blue-700 border-blue-300"
            onClick={() => window.open('https://cekbansos.kemensos.go.id/', '_blank')}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Cek Bansos Kemensos
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs text-purple-700 border-purple-300"
            onClick={() => window.open('https://cekdtk.kemensos.go.id/', '_blank')}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Cek DTK Kemensos
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3">
          <p className="text-xs text-blue-800">
            <strong>Cara menggunakan:</strong> Cari penduduk → Klik &quot;Cek&quot; untuk buka website Kemensos → Isi CAPTCHA manual di website → Setelah dapat hasil, klik &quot;Update&quot; untuk simpan data bantuan ke sistem.
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-2.5 text-center">
            <p className="text-lg font-bold text-emerald-700">{totalKK}</p>
            <p className="text-[9px] text-muted-foreground">Total KK</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 text-center">
            <p className="text-lg font-bold text-emerald-700">{totalPenduduk}</p>
            <p className="text-[9px] text-muted-foreground">Penduduk</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 text-center">
            <p className="text-lg font-bold text-blue-600">{punyaBantuan}</p>
            <p className="text-[9px] text-muted-foreground">Penerima Bantuan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 text-center">
            <p className="text-lg font-bold text-green-600">{punyaBPJS}</p>
            <p className="text-[9px] text-muted-foreground">Punya BPJS</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          className="text-sm h-10 pr-9"
          placeholder="Cari nama, NIK, atau No. KK..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {/* KK List */}
      {renderKKList()}

      {/* Update Bantuan Dialog */}
      <UpdateBantuanDialog
        open={showForm}
        onOpenChange={setShowForm}
        penduduk={selectedPenduduk}
        saving={saving}
        onSave={handleSaveBantuan}
      />
    </div>
  );
}

// ==================== Update Bantuan Dialog ====================
function UpdateBantuanDialog({
  open,
  onOpenChange,
  penduduk,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  penduduk: PendudukItem | null;
  saving: boolean;
  onSave: (desil: string, jenisBantuan: string[], bpjs: string) => void;
}) {
  const [desil, setDesil] = useState('');
  const [jenisBantuan, setJenisBantuan] = useState<string[]>([]);
  const [bpjs, setBpjs] = useState('');

  const BANTUAN_OPTIONS = ['PKH', 'BPNT', 'BLT', 'BST', 'PIP', 'KUR', 'SUBSIDI', 'LAINNYA'];
  const BPJS_OPTIONS = ['TIDAK', 'PBI', 'MANDIRI', 'KETENAGAKERJAAN', 'JKN-KP'];

  useEffect(() => {
    if (penduduk && open) {
      try {
        const arr = JSON.parse(penduduk.bantuan || '[]');
        setJenisBantuan(arr.filter((b: string) => b !== 'TIDAK'));
      } catch {
        setJenisBantuan([]);
      }
      setBpjs(penduduk?.bpjs || '');
      setDesil('');
    }
  }, [penduduk, open]);

  const toggleBantuan = (item: string) => {
    setJenisBantuan(prev =>
      prev.includes(item) ? prev.filter(b => b !== item) : [...prev, item]
    );
  };

  const handleSave = () => {
    const result = jenisBantuan.length > 0 ? jenisBantuan : ['TIDAK'];
    onSave(desil, result, bpjs);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Data Bantuan</DialogTitle>
        </DialogHeader>
        {penduduk && (
          <div className="space-y-4">
            {/* Penduduk Info */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-sm font-semibold">{penduduk.namaLengkap}</p>
              <p className="text-[10px] text-gray-500 font-mono">NIK: {penduduk.nik}</p>
              <p className="text-[10px] text-gray-500">No. KK: {penduduk.noKK}</p>
            </div>

            {/* Desil */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Desil / DTK (opsional)</Label>
              <Select value={desil} onValueChange={setDesil}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Pilih Desil" />
                </SelectTrigger>
                <SelectContent>
                  {DESIL_OPTIONS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-gray-400">Data dari cek-dtk.kemensos.go.id</p>
            </div>

            {/* Jenis Bantuan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Jenis Bantuan</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {BANTUAN_OPTIONS.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBantuan(b)}
                    className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all ${
                      jenisBantuan.includes(b)
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      jenisBantuan.includes(b) ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                    }`}>
                      {jenisBantuan.includes(b) && (
                        <span className="text-white text-[10px]">✓</span>
                      )}
                    </span>
                    {b}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400">Data dari cekbansos.kemensos.go.id</p>
            </div>

            {/* BPJS */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status BPJS</Label>
              <Select value={bpjs} onValueChange={setBpjs}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Pilih status BPJS" />
                </SelectTrigger>
                <SelectContent>
                  {BPJS_OPTIONS.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

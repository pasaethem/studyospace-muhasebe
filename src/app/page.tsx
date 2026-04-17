"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Calendar, Users, Building2, Filter, X, Download, LogOut } from "lucide-react";

const ORTAKLAR = ["Ethem", "Ferdi", "Haydar", "Aden"];
const SUBELER = ["İstanbul", "Şanlıurfa"];
const ORTAK_SIFRELERI: Record<string, string> = {
  "Ethem": "ethem123",
  "Ferdi": "ferdi123",
  "Haydar": "haydar123",
  "Aden": "aden123",
};
// Sadece kendi şubesini görebilen kısıtlı ortaklar
const SUBE_KISITLI_ORTAKLAR: Record<string, string> = {
  "Aden": "Şanlıurfa",
};

const GIDER_KATEGORILERI: Record<string, string[]> = {
  "Çekim & Prodüksiyon": [
    "Çekim - Ulaşım (benzin/taksi)",
    "Çekim - Yemek / İkram",
    "Çekim - Konaklama (otel)",
    "Çekim - Şehir dışı bilet (otobüs/uçak)",
    "Çekim - Ekipman kiralama",
    "Çekim - Mekan kiralama / Stüdyo",
    "Çekim - Dış kaynak (freelance)",
  ],
  "Yazılım & Dijital": [
    "Yazılım abonelikleri (Canva, CapCut, Adobe)",
    "AI araçları (ChatGPT, Midjourney, Claude)",
    "Stok görsel/müzik (Envato, Shutterstock)",
    "Hosting / Domain / Bulut depolama",
    "Reklam bütçesi (Meta Ads, Google Ads)",
  ],
  "Ofis & Sabit Giderler": [
    "Kira",
    "Elektrik / Su / Doğalgaz",
    "İnternet / Telefon",
    "Personel maaşı",
    "SGK / Vergi",
    "Muhasebeci ücreti",
    "Kırtasiye / Ofis malzemesi",
    "Temizlik",
  ],
  "Diğer": [
    "Banka / POS komisyonu",
    "Bakım-onarım",
    "Ekipman alımı (kamera, bilgisayar)",
    "Temsil & Ağırlama",
    "Diğer gider",
  ],
};

const GELIR_KATEGORILERI = [
  "Müşteri ödemesi - Havale/EFT",
  "Müşteri ödemesi - Nakit",
  "Müşteri ödemesi - Kredi kartı/POS",
  "Müşteri ödemesi - Çek",
  "Avans / Kapora",
  "Diğer gelir",
];

type Kayit = {
  id: number;
  tip: "gelir" | "gider";
  tutar: number;
  kategori: string;
  aciklama: string | null;
  musteri: string | null;
  sehir: string;
  ortak: string;
  tarih: string;
  olusturma: string;
};

const formatTL = (n: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " ₺";
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
const todayISO = () => new Date().toISOString().split("T")[0];

export default function HomePage() {
  const [giris, setGiris] = useState<string | null>(null);
  const [girisOrtak, setGirisOrtak] = useState("Ethem");
  const [girisSifre, setGirisSifre] = useState("");
  const [girisHata, setGirisHata] = useState("");

  const [kayitlar, setKayitlar] = useState<Kayit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filtreSehir, setFiltreSehir] = useState("Hepsi");
  const [filtreOrtak, setFiltreOrtak] = useState("Hepsi");
  const [filtreDonem, setFiltreDonem] = useState("bu_ay");

  const [form, setForm] = useState({
    tip: "gider" as "gider" | "gelir",
    tutar: "",
    kategori: "",
    aciklama: "",
    musteri: "",
    sehir: "İstanbul",
    ortak: "Ethem",
    tarih: todayISO(),
  });

  // Giriş kontrolü (localStorage)
  useEffect(() => {
    const kaydedilmis = typeof window !== "undefined" ? localStorage.getItem("aktif_ortak") : null;
    if (kaydedilmis && ORTAKLAR.includes(kaydedilmis)) {
      setGiris(kaydedilmis);
    }
  }, []);

  // Veri yükle
  useEffect(() => {
    if (!giris) return;
    verileriYukle();
  }, [giris]);

  const verileriYukle = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("kayitlar")
      .select("*")
      .order("tarih", { ascending: false })
      .order("olusturma", { ascending: false });
    
    if (error) {
      console.error(error);
      alert("Veriler yüklenemedi: " + error.message);
    } else {
      setKayitlar(data || []);
    }
    setLoading(false);
  };

  const girisYap = () => {
    if (ORTAK_SIFRELERI[girisOrtak] === girisSifre) {
      localStorage.setItem("aktif_ortak", girisOrtak);
      setGiris(girisOrtak);
      const kisitliSube = SUBE_KISITLI_ORTAKLAR[girisOrtak];
      setForm((f) => ({ 
        ...f, 
        ortak: girisOrtak,
        sehir: kisitliSube || f.sehir,
      }));
      setGirisHata("");
    } else {
      setGirisHata("Şifre yanlış");
    }
  };

  const cikisYap = () => {
    localStorage.removeItem("aktif_ortak");
    setGiris(null);
    setGirisSifre("");
  };

  const kayitEkle = async () => {
    if (!form.tutar || !form.kategori) {
      alert("Lütfen tutar ve kategori alanlarını doldurun");
      return;
    }
    const { error } = await supabase.from("kayitlar").insert({
      tip: form.tip,
      tutar: parseFloat(form.tutar),
      kategori: form.kategori,
      aciklama: form.aciklama || null,
      musteri: form.musteri || null,
      sehir: form.sehir,
      ortak: giris!, // Güvenlik: Her zaman giriş yapan ortağın adıyla kaydet
      tarih: form.tarih,
    });

    if (error) {
      alert("Kayıt eklenemedi: " + error.message);
      return;
    }

    await verileriYukle();
    setModalOpen(false);
    setForm({
      tip: "gider",
      tutar: "",
      kategori: "",
      aciklama: "",
      musteri: "",
      sehir: form.sehir,
      ortak: giris || "Ethem",
      tarih: todayISO(),
    });
  };

  const kayitSil = async (id: number, kayitOrtak: string) => {
    if (kayitOrtak !== giris) {
      alert(`Bu kayıt ${kayitOrtak} tarafından eklendi. Sadece kendi kayıtlarınızı silebilirsiniz.`);
      return;
    }
    if (!confirm("Bu kayıt silinsin mi?")) return;
    const { error } = await supabase.from("kayitlar").delete().eq("id", id);
    if (error) {
      alert("Silinemedi: " + error.message);
      return;
    }
    await verileriYukle();
  };

  const filtrelenmis = useMemo(() => {
    const simdi = new Date();
    const bugun = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
    const kisitliSube = giris ? SUBE_KISITLI_ORTAKLAR[giris] : null;

    return kayitlar.filter((k) => {
      // Şube kısıtı: Aden sadece kendi şubesini görür
      if (kisitliSube && k.sehir !== kisitliSube) return false;
      
      if (filtreSehir !== "Hepsi" && k.sehir !== filtreSehir) return false;
      if (filtreOrtak !== "Hepsi" && k.ortak !== filtreOrtak) return false;

      const kayitTarih = new Date(k.tarih);
      if (filtreDonem === "bugun") {
        return kayitTarih.toDateString() === bugun.toDateString();
      }
      if (filtreDonem === "bu_hafta") {
        const haftaBasi = new Date(bugun);
        const gun = bugun.getDay() || 7;
        haftaBasi.setDate(bugun.getDate() - gun + 1);
        return kayitTarih >= haftaBasi;
      }
      if (filtreDonem === "bu_ay") {
        return kayitTarih.getMonth() === simdi.getMonth() && kayitTarih.getFullYear() === simdi.getFullYear();
      }
      return true;
    });
  }, [kayitlar, filtreSehir, filtreOrtak, filtreDonem]);

  const ozet = useMemo(() => {
    const gelir = filtrelenmis.filter((k) => k.tip === "gelir").reduce((s, k) => s + Number(k.tutar), 0);
    const gider = filtrelenmis.filter((k) => k.tip === "gider").reduce((s, k) => s + Number(k.tutar), 0);
    return { gelir, gider, net: gelir - gider };
  }, [filtrelenmis]);

  const ortakDagilim = useMemo(() => {
    return ORTAKLAR.map((o) => {
      const gider = filtrelenmis.filter((k) => k.ortak === o && k.tip === "gider").reduce((s, k) => s + Number(k.tutar), 0);
      const gelir = filtrelenmis.filter((k) => k.ortak === o && k.tip === "gelir").reduce((s, k) => s + Number(k.tutar), 0);
      return { isim: o, gider, gelir };
    });
  }, [filtrelenmis]);

  const sehirDagilim = useMemo(() => {
    return SUBELER.map((s) => {
      const gider = filtrelenmis.filter((k) => k.sehir === s && k.tip === "gider").reduce((su, k) => su + Number(k.tutar), 0);
      const gelir = filtrelenmis.filter((k) => k.sehir === s && k.tip === "gelir").reduce((su, k) => su + Number(k.tutar), 0);
      return { isim: s, gider, gelir, net: gelir - gider };
    });
  }, [filtrelenmis]);

  const kategoriDagilim = useMemo(() => {
    const map: Record<string, number> = {};
    filtrelenmis.filter((k) => k.tip === "gider").forEach((k) => {
      map[k.kategori] = (map[k.kategori] || 0) + Number(k.tutar);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtrelenmis]);

  const musteriDagilim = useMemo(() => {
    const map: Record<string, { gelir: number; gider: number }> = {};
    filtrelenmis.forEach((k) => {
      if (!k.musteri) return;
      if (!map[k.musteri]) map[k.musteri] = { gelir: 0, gider: 0 };
      map[k.musteri][k.tip] += Number(k.tutar);
    });
    return Object.entries(map)
      .map(([isim, v]) => ({ isim, ...v, net: v.gelir - v.gider }))
      .sort((a, b) => b.gelir + b.gider - (a.gelir + a.gider))
      .slice(0, 6);
  }, [filtrelenmis]);

  const hizliOzet = useMemo(() => {
    const simdi = new Date();
    const bugun = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
    const haftaBasi = new Date(bugun);
    const gun = bugun.getDay() || 7;
    haftaBasi.setDate(bugun.getDate() - gun + 1);
    const ayBasi = new Date(simdi.getFullYear(), simdi.getMonth(), 1);
    const kisitliSube = giris ? SUBE_KISITLI_ORTAKLAR[giris] : null;

    const hesapla = (baslangic: Date) => {
      const list = kayitlar.filter((k) => {
        if (kisitliSube && k.sehir !== kisitliSube) return false;
        return new Date(k.tarih) >= baslangic;
      });
      const gelir = list.filter((k) => k.tip === "gelir").reduce((s, k) => s + Number(k.tutar), 0);
      const gider = list.filter((k) => k.tip === "gider").reduce((s, k) => s + Number(k.tutar), 0);
      return { gelir, gider };
    };
    return {
      gunluk: hesapla(bugun),
      haftalik: hesapla(haftaBasi),
      aylik: hesapla(ayBasi),
    };
  }, [kayitlar, giris]);

  const exportCSV = () => {
    const kisitliSube = giris ? SUBE_KISITLI_ORTAKLAR[giris] : null;
    const exportKayitlar = kisitliSube ? kayitlar.filter((k) => k.sehir === kisitliSube) : kayitlar;
    const headers = ["Tarih", "Tip", "Tutar", "Kategori", "Müşteri", "Açıklama", "Şehir", "Ortak"];
    const rows = exportKayitlar.map((k) => [k.tarih, k.tip, k.tutar, k.kategori, k.musteri || "", k.aciklama || "", k.sehir, k.ortak]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studyospace-kasa-${todayISO()}.csv`;
    a.click();
  };

  // GİRİŞ EKRANI
  if (!giris) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full border border-stone-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-stone-900 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900">Studyospace Kasa</h1>
            <p className="text-stone-500 text-sm mt-1">Ortak muhasebe sistemi</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Ortak</label>
              <select
                value={girisOrtak}
                onChange={(e) => setGirisOrtak(e.target.value)}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
              >
                {ORTAKLAR.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Şifre</label>
              <input
                type="password"
                value={girisSifre}
                onChange={(e) => setGirisSifre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && girisYap()}
                placeholder="••••••"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
              />
            </div>
            {girisHata && <p className="text-rose-600 text-sm text-center">{girisHata}</p>}
            <button
              onClick={girisYap}
              className="w-full py-3 bg-stone-900 text-white rounded-lg font-semibold text-sm hover:bg-stone-800 transition"
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-500">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
              {giris && SUBE_KISITLI_ORTAKLAR[giris] 
                ? `${SUBE_KISITLI_ORTAKLAR[giris]} Kasası` 
                : "Studyospace Kasa"}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">Giriş: <span className="font-semibold">{giris}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
              title="CSV indir"
            >
              <Download className="w-4 h-4 text-stone-700" />
            </button>
            <button
              onClick={cikisYap}
              className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
              title="Çıkış"
            >
              <LogOut className="w-4 h-4 text-stone-700" />
            </button>
            <button
              onClick={() => { setForm((f) => ({ ...f, ortak: giris })); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Yeni Kayıt
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { etiket: "Bugün", veri: hizliOzet.gunluk },
            { etiket: "Bu Hafta", veri: hizliOzet.haftalik },
            { etiket: "Bu Ay", veri: hizliOzet.aylik },
          ].map((k) => (
            <div key={k.etiket} className="bg-white border border-stone-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-stone-500 text-xs font-medium uppercase tracking-wider mb-3">
                <Calendar className="w-3.5 h-3.5" />
                {k.etiket}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-stone-500 mb-1">Gelir</div>
                  <div className="text-lg font-bold text-emerald-600">{formatTL(k.veri.gelir)}</div>
                </div>
                <div>
                  <div className="text-xs text-stone-500 mb-1">Gider</div>
                  <div className="text-lg font-bold text-rose-600">{formatTL(k.veri.gider)}</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-stone-100 flex justify-between items-center">
                <span className="text-xs text-stone-500">Net</span>
                <span className={`text-sm font-bold ${k.veri.gelir - k.veri.gider >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatTL(k.veri.gelir - k.veri.gider)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-medium text-stone-700">Filtreler</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
              {[
                { v: "bugun", e: "Bugün" },
                { v: "bu_hafta", e: "Bu Hafta" },
                { v: "bu_ay", e: "Bu Ay" },
                { v: "hepsi", e: "Tümü" },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setFiltreDonem(o.v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    filtreDonem === o.v ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {o.e}
                </button>
              ))}
            </div>
            {!(giris && SUBE_KISITLI_ORTAKLAR[giris]) && (
              <select value={filtreSehir} onChange={(e) => setFiltreSehir(e.target.value)} className="px-3 py-1.5 bg-stone-100 border-0 rounded-lg text-xs font-medium text-stone-700 cursor-pointer">
                <option value="Hepsi">Tüm Şubeler</option>
                {SUBELER.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <select value={filtreOrtak} onChange={(e) => setFiltreOrtak(e.target.value)} className="px-3 py-1.5 bg-stone-100 border-0 rounded-lg text-xs font-medium text-stone-700 cursor-pointer">
              <option value="Hepsi">Tüm Ortaklar</option>
              {ORTAKLAR.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-50 text-xs font-medium uppercase tracking-wider mb-2">
              <TrendingUp className="w-4 h-4" /> Toplam Gelir
            </div>
            <div className="text-3xl font-bold">{formatTL(ozet.gelir)}</div>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-rose-50 text-xs font-medium uppercase tracking-wider mb-2">
              <TrendingDown className="w-4 h-4" /> Toplam Gider
            </div>
            <div className="text-3xl font-bold">{formatTL(ozet.gider)}</div>
          </div>
          <div className={`${ozet.net >= 0 ? "bg-gradient-to-br from-stone-800 to-stone-900" : "bg-gradient-to-br from-amber-600 to-amber-700"} text-white rounded-xl p-5 shadow-sm`}>
            <div className="flex items-center gap-2 text-stone-50 text-xs font-medium uppercase tracking-wider mb-2">
              <Wallet className="w-4 h-4" /> Net Durum
            </div>
            <div className="text-3xl font-bold">{formatTL(ozet.net)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-stone-500" />
              <h3 className="font-semibold text-stone-900">Ortak Bazında</h3>
            </div>
            <div className="space-y-3">
              {ortakDagilim.map((o) => {
                const maxGider = Math.max(...ortakDagilim.map((x) => x.gider), 1);
                return (
                  <div key={o.isim}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-stone-800 text-sm">{o.isim}</span>
                      <div className="flex gap-3 text-xs">
                        <span className="text-emerald-600 font-semibold">+{formatTL(o.gelir)}</span>
                        <span className="text-rose-600 font-semibold">-{formatTL(o.gider)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-400 rounded-full transition-all" style={{ width: `${(o.gider / maxGider) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!(giris && SUBE_KISITLI_ORTAKLAR[giris]) && (
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-4 h-4 text-stone-500" />
                <h3 className="font-semibold text-stone-900">Şube Bazında</h3>
              </div>
              <div className="space-y-3">
                {sehirDagilim.map((s) => (
                  <div key={s.isim} className="p-3 bg-stone-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-stone-800 text-sm">{s.isim}</span>
                      <span className={`text-sm font-bold ${s.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatTL(s.net)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-stone-500">Gelir: </span><span className="text-emerald-600 font-medium">{formatTL(s.gelir)}</span></div>
                      <div><span className="text-stone-500">Gider: </span><span className="text-rose-600 font-medium">{formatTL(s.gider)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <h3 className="font-semibold text-stone-900 mb-4">En Çok Harcama Kategorileri</h3>
            {kategoriDagilim.length === 0 ? (
              <p className="text-sm text-stone-400">Henüz kayıt yok</p>
            ) : (
              <div className="space-y-2">
                {kategoriDagilim.map(([kat, tutar]) => {
                  const max = kategoriDagilim[0][1];
                  return (
                    <div key={kat}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-stone-700 truncate pr-2">{kat}</span>
                        <span className="text-xs font-bold text-stone-900">{formatTL(tutar)}</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-stone-700 rounded-full" style={{ width: `${(tutar / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <h3 className="font-semibold text-stone-900 mb-4">Müşteri / Proje Bazında</h3>
            {musteriDagilim.length === 0 ? (
              <p className="text-sm text-stone-400">Henüz müşteri kaydı yok</p>
            ) : (
              <div className="space-y-2">
                {musteriDagilim.map((m) => (
                  <div key={m.isim} className="p-3 bg-stone-50 rounded-lg flex justify-between items-center">
                    <span className="font-medium text-stone-800 text-sm truncate pr-2">{m.isim}</span>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${m.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatTL(m.net)}</div>
                      <div className="text-xs text-stone-500">+{formatTL(m.gelir)} / -{formatTL(m.gider)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">Tüm Kayıtlar ({filtrelenmis.length})</h3>
          </div>
          {filtrelenmis.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-stone-400 text-sm">Bu filtreye uygun kayıt yok</p>
              <button onClick={() => { setForm((f) => ({ ...f, ortak: giris })); setModalOpen(true); }} className="mt-4 text-sm font-medium text-stone-900 hover:underline">
                İlk kaydı ekle →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filtrelenmis.map((k) => (
                <div key={k.id} className="px-5 py-3 hover:bg-stone-50 transition flex items-center gap-3">
                  <div className={`w-1 h-10 rounded-full ${k.tip === "gelir" ? "bg-emerald-500" : "bg-rose-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-900 text-sm">{k.kategori}</span>
                      {k.musteri && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">{k.musteri}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-stone-500 flex-wrap">
                      <span>{formatDate(k.tarih)}</span><span>·</span><span>{k.ortak}</span><span>·</span><span>{k.sehir}</span>
                      {k.aciklama && <><span>·</span><span className="italic truncate">{k.aciklama}</span></>}
                    </div>
                  </div>
                  <div className={`font-bold text-sm whitespace-nowrap ${k.tip === "gelir" ? "text-emerald-600" : "text-rose-600"}`}>
                    {k.tip === "gelir" ? "+" : "-"}{formatTL(Number(k.tutar))}
                  </div>
                  {k.ortak === giris ? (
                    <button onClick={() => kayitSil(k.id, k.ortak)} className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Sil">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="p-2 w-8 h-8" title="Başkasının kaydı" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">Yeni Kayıt</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setForm({ ...form, tip: "gider", kategori: "" })} className={`py-3 rounded-lg font-semibold text-sm transition ${form.tip === "gider" ? "bg-rose-500 text-white shadow-sm" : "bg-stone-100 text-stone-600"}`}>− Gider</button>
                <button onClick={() => setForm({ ...form, tip: "gelir", kategori: "" })} className={`py-3 rounded-lg font-semibold text-sm transition ${form.tip === "gelir" ? "bg-emerald-500 text-white shadow-sm" : "bg-stone-100 text-stone-600"}`}>+ Gelir</button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Tutar (₺)</label>
                <input type="number" step="0.01" value={form.tutar} onChange={(e) => setForm({ ...form, tutar: e.target.value })} placeholder="0,00" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-xl font-bold text-stone-900 focus:outline-none focus:border-stone-400" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Kategori</label>
                <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400">
                  <option value="">Seçin...</option>
                  {form.tip === "gider" ? (
                    Object.entries(GIDER_KATEGORILERI).map(([grup, katlar]) => (
                      <optgroup key={grup} label={grup}>
                        {katlar.map((k) => <option key={k} value={k}>{k}</option>)}
                      </optgroup>
                    ))
                  ) : (
                    GELIR_KATEGORILERI.map((k) => <option key={k} value={k}>{k}</option>)
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Müşteri / Proje (opsiyonel)</label>
                <input type="text" value={form.musteri} onChange={(e) => setForm({ ...form, musteri: e.target.value })} placeholder="Örn: X Markası" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Açıklama (opsiyonel)</label>
                <input type="text" value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} placeholder="Örn: Taksim-Mecidiyeköy taksi" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Şube</label>
                {giris && SUBE_KISITLI_ORTAKLAR[giris] ? (
                  <div className="px-4 py-3 bg-stone-100 rounded-lg text-sm text-stone-700 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    {SUBE_KISITLI_ORTAKLAR[giris]} <span className="text-xs font-normal text-stone-500">(sabit şube)</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {SUBELER.map((s) => (
                      <button key={s} onClick={() => setForm({ ...form, sehir: s })} className={`py-3 rounded-lg font-semibold text-sm transition ${form.sehir === s ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>{s}</button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Ortak</label>
                <div className="px-4 py-3 bg-stone-100 rounded-lg text-sm text-stone-700 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  {giris} <span className="text-xs font-normal text-stone-500">(giriş yapan ortak)</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Tarih</label>
                <input type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-stone-200 p-4 flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-lg font-semibold text-sm hover:bg-stone-200 transition">İptal</button>
              <button onClick={kayitEkle} className="flex-1 py-3 bg-stone-900 text-white rounded-lg font-semibold text-sm hover:bg-stone-800 transition">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

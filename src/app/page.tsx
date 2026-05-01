"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Calendar, Users, Building2, Filter, X, Download, LogOut, Camera, ImageIcon, Loader2, Key, Shield, Briefcase, Clock, CheckCircle2, AlertCircle, DollarSign, Phone, FileText, Edit2, UserCircle, CreditCard, Search } from "lucide-react";

const ORTAKLAR = ["Ethem", "Ferdi", "Aden"];
const SUBELER = ["İstanbul", "Şanlıurfa"];
const ADMIN_ORTAK = "Ethem"; // Herkesin şifresini değiştirebilir
// Sadece kendi şubesini görebilen kısıtlı ortaklar
const SUBE_KISITLI_ORTAKLAR: Record<string, string> = {
  "Aden": "Şanlıurfa",
};

const POZISYONLAR = [
  "Grafiker",
  "Videographer",
  "Meta Reklam Yönetimi",
  "Kreatif Director",
  "Sosyal Medya Uzmanı",
  "Ofis Ablası",
  "Küçük Ortak",
  "Kurgucu",
  "Asistan",
  "Stajyer",
];

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
  foto_url: string | null;
};

type Musteri = {
  id: number;
  firma_adi: string;
  tip: "aylik" | "proje";
  tutar: number;
  baslangic_tarihi: string;
  odeme_gunu: number | null;
  is_tanimi: string | null;
  sehir: string;
  iletisim_kisi: string | null;
  iletisim_telefon: string | null;
  aktif: boolean;
  notlar: string | null;
  ekleyen_ortak: string;
  olusturma: string;
};

type Odeme = {
  id: number;
  musteri_id: number;
  donem: string;
  beklenen_tutar: number;
  odenen_tutar: number;
  odeme_tarihi: string | null;
  durum: "bekliyor" | "kismi" | "tamamlandi" | "iptal";
  aciklama: string | null;
  olusturma: string;
};

type Calisan = {
  id: number;
  ad_soyad: string;
  pozisyon: string;
  maas: number;
  baslangic_tarihi: string;
  odeme_gunu: number;
  telefon: string | null;
  iban: string | null;
  sehir: string;
  aktif: boolean;
  notlar: string | null;
  ekleyen_ortak: string;
  olusturma: string;
};

type MaasOdemesi = {
  id: number;
  calisan_id: number;
  donem: string;
  beklenen_tutar: number;
  odenen_tutar: number;
  son_odeme_tarihi: string | null;
  durum: "bekliyor" | "kismi" | "tamamlandi" | "iptal";
  aciklama: string | null;
  olusturma: string;
};

const donemEtiket = (donem: string) => {
  const [yil, ay] = donem.split("-");
  const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  return `${aylar[parseInt(ay) - 1]} ${yil}`;
};

const suAnkiDonem = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const formatTL = (n: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " ₺";
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
const todayISO = () => new Date().toISOString().split("T")[0];

export default function HomePage() {
  const [giris, setGiris] = useState<string | null>(null);
  const [girisOrtak, setGirisOrtak] = useState("Ethem");
  const [girisSifre, setGirisSifre] = useState("");
  const [girisHata, setGirisHata] = useState("");
  const [girisYukleniyor, setGirisYukleniyor] = useState(false);

  // Şifre değiştirme modalı
  const [sifreModalOpen, setSifreModalOpen] = useState(false);
  const [sifreHedefOrtak, setSifreHedefOrtak] = useState("Ethem");
  const [eskiSifre, setEskiSifre] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [yeniSifre2, setYeniSifre2] = useState("");
  const [sifreHata, setSifreHata] = useState("");
  const [sifreBasari, setSifreBasari] = useState("");
  const [sifreYukleniyor, setSifreYukleniyor] = useState(false);

  const [kayitlar, setKayitlar] = useState<Kayit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filtreSehir, setFiltreSehir] = useState("Hepsi");
  const [filtreOrtak, setFiltreOrtak] = useState("Hepsi");
  const [filtreDonem, setFiltreDonem] = useState("bu_ay");
  const [ozelTarihBaslangic, setOzelTarihBaslangic] = useState("");
  const [ozelTarihBitis, setOzelTarihBitis] = useState("");
  const [aramaMetni, setAramaMetni] = useState("");

  // Sekme sistemi
  const [aktifSekme, setAktifSekme] = useState<"kasa" | "musteriler" | "calisanlar">("kasa");

  // Müşteriler
  const [musteriler, setMusteriler] = useState<Musteri[]>([]);
  const [odemeler, setOdemeler] = useState<Odeme[]>([]);
  const [musteriModalOpen, setMusteriModalOpen] = useState(false);
  const [duzenlenenMusteri, setDuzenlenenMusteri] = useState<Musteri | null>(null);
  const [musteriForm, setMusteriForm] = useState({
    firma_adi: "",
    tip: "aylik" as "aylik" | "proje",
    tutar: "",
    baslangic_tarihi: todayISO(),
    odeme_gunu: "1",
    is_tanimi: "",
    sehir: "İstanbul",
    iletisim_kisi: "",
    iletisim_telefon: "",
    notlar: "",
  });

  // Ödeme modalı
  const [odemeModalOpen, setOdemeModalOpen] = useState(false);
  const [secilenOdeme, setSecilenOdeme] = useState<Odeme | null>(null);
  const [odemeTutari, setOdemeTutari] = useState("");
  const [odemeTarihi, setOdemeTarihi] = useState(todayISO());
  const [odemeAciklama, setOdemeAciklama] = useState("");

  // Çalışanlar
  const [calisanlar, setCalisanlar] = useState<Calisan[]>([]);
  const [maasOdemeleri, setMaasOdemeleri] = useState<MaasOdemesi[]>([]);
  const [calisanModalOpen, setCalisanModalOpen] = useState(false);
  const [duzenlenenCalisan, setDuzenlenenCalisan] = useState<Calisan | null>(null);
  const [calisanForm, setCalisanForm] = useState({
    ad_soyad: "",
    pozisyon: "Grafiker",
    maas: "",
    baslangic_tarihi: todayISO(),
    odeme_gunu: "1",
    telefon: "",
    iban: "",
    sehir: "İstanbul",
    notlar: "",
  });

  // Maaş ödeme modalı
  const [maasOdemeModalOpen, setMaasOdemeModalOpen] = useState(false);
  const [secilenMaasOdeme, setSecilenMaasOdeme] = useState<MaasOdemesi | null>(null);
  const [maasOdemeTutari, setMaasOdemeTutari] = useState("");
  const [maasOdemeTarihi, setMaasOdemeTarihi] = useState(todayISO());
  const [maasOdemeAciklama, setMaasOdemeAciklama] = useState("");

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
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoYukleniyor, setFotoYukleniyor] = useState(false);
  const [buyukFoto, setBuyukFoto] = useState<string | null>(null);

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
    const [kayitlarRes, musterilerRes, odemelerRes, calisanlarRes, maasOdemeleriRes] = await Promise.all([
      supabase.from("kayitlar").select("*").order("tarih", { ascending: false }).order("olusturma", { ascending: false }),
      supabase.from("musteriler").select("*").order("firma_adi"),
      supabase.from("odemeler").select("*").order("donem", { ascending: false }),
      supabase.from("calisanlar").select("*").order("ad_soyad"),
      supabase.from("maas_odemeleri").select("*").order("donem", { ascending: false }),
    ]);
    
    if (kayitlarRes.error) {
      console.error(kayitlarRes.error);
    } else {
      setKayitlar(kayitlarRes.data || []);
    }

    if (musterilerRes.error) {
      console.error(musterilerRes.error);
    } else {
      setMusteriler(musterilerRes.data || []);
      await otomatikOdemeOlustur(musterilerRes.data || [], odemelerRes.data || []);
    }

    if (calisanlarRes.error) {
      console.error(calisanlarRes.error);
    } else {
      setCalisanlar(calisanlarRes.data || []);
      await otomatikMaasOlustur(calisanlarRes.data || [], maasOdemeleriRes.data || []);
    }

    // Tüm ödemeleri tekrar yükle (yeni eklenenler olabilir)
    const [guncelOdemeler, guncelMaaslar] = await Promise.all([
      supabase.from("odemeler").select("*").order("donem", { ascending: false }),
      supabase.from("maas_odemeleri").select("*").order("donem", { ascending: false }),
    ]);
    setOdemeler(guncelOdemeler.data || []);
    setMaasOdemeleri(guncelMaaslar.data || []);
    
    setLoading(false);
  };

  const otomatikOdemeOlustur = async (musterilerList: Musteri[], odemelerList: Odeme[]) => {
    const buAy = suAnkiDonem();
    const eklenecekler = [];
    
    for (const m of musterilerList) {
      if (!m.aktif || m.tip !== "aylik") continue;
      const baslangic = new Date(m.baslangic_tarihi);
      const baslangicDonemi = `${baslangic.getFullYear()}-${String(baslangic.getMonth() + 1).padStart(2, "0")}`;
      if (baslangicDonemi > buAy) continue;
      const varMi = odemelerList.some(o => o.musteri_id === m.id && o.donem === buAy);
      if (!varMi) {
        eklenecekler.push({
          musteri_id: m.id,
          donem: buAy,
          beklenen_tutar: m.tutar,
          durum: "bekliyor" as const,
        });
      }
    }
    
    if (eklenecekler.length > 0) {
      await supabase.from("odemeler").insert(eklenecekler);
    }
  };

  const otomatikMaasOlustur = async (calisanlarList: Calisan[], maasOdemeleriList: MaasOdemesi[]) => {
    const buAy = suAnkiDonem();
    const eklenecekler = [];
    
    for (const c of calisanlarList) {
      if (!c.aktif) continue;
      const baslangic = new Date(c.baslangic_tarihi);
      const baslangicDonemi = `${baslangic.getFullYear()}-${String(baslangic.getMonth() + 1).padStart(2, "0")}`;
      if (baslangicDonemi > buAy) continue;
      const varMi = maasOdemeleriList.some(m => m.calisan_id === c.id && m.donem === buAy);
      if (!varMi) {
        eklenecekler.push({
          calisan_id: c.id,
          donem: buAy,
          beklenen_tutar: c.maas,
          durum: "bekliyor" as const,
        });
      }
    }
    
    if (eklenecekler.length > 0) {
      await supabase.from("maas_odemeleri").insert(eklenecekler);
    }
  };

  const girisYap = async () => {
    setGirisYukleniyor(true);
    setGirisHata("");
    
    const { data, error } = await supabase
      .from("ortak_sifreleri")
      .select("sifre")
      .eq("ortak", girisOrtak)
      .single();

    setGirisYukleniyor(false);

    if (error || !data) {
      setGirisHata("Şifre kontrol edilemedi, tekrar deneyin");
      return;
    }

    if (data.sifre === girisSifre) {
      localStorage.setItem("aktif_ortak", girisOrtak);
      setGiris(girisOrtak);
      const kisitliSube = SUBE_KISITLI_ORTAKLAR[girisOrtak];
      setForm((f) => ({ 
        ...f, 
        ortak: girisOrtak,
        sehir: kisitliSube || f.sehir,
      }));
      setGirisSifre("");
    } else {
      setGirisHata("Şifre yanlış");
    }
  };

  const sifreDegistir = async () => {
    setSifreHata("");
    setSifreBasari("");

    if (!yeniSifre || !yeniSifre2) {
      setSifreHata("Lütfen yeni şifreyi iki kez girin");
      return;
    }
    if (yeniSifre.length < 4) {
      setSifreHata("Şifre en az 4 karakter olmalı");
      return;
    }
    if (yeniSifre !== yeniSifre2) {
      setSifreHata("Yeni şifreler eşleşmiyor");
      return;
    }

    setSifreYukleniyor(true);

    // Eski şifre doğrulaması (Ethem başkasının şifresini değiştirirken Ethem'in şifresi sorulur)
    const dogrulanacakOrtak = giris === ADMIN_ORTAK && sifreHedefOrtak !== giris 
      ? giris 
      : sifreHedefOrtak;

    const { data, error } = await supabase
      .from("ortak_sifreleri")
      .select("sifre")
      .eq("ortak", dogrulanacakOrtak)
      .single();

    if (error || !data) {
      setSifreHata("Doğrulama başarısız");
      setSifreYukleniyor(false);
      return;
    }

    if (data.sifre !== eskiSifre) {
      setSifreHata(giris === ADMIN_ORTAK && sifreHedefOrtak !== giris 
        ? "Kendi (Ethem) şifrenizi yanlış girdiniz" 
        : "Eski şifre yanlış");
      setSifreYukleniyor(false);
      return;
    }

    // Yeni şifreyi güncelle
    const { error: updateError } = await supabase
      .from("ortak_sifreleri")
      .update({ sifre: yeniSifre, guncelleme: new Date().toISOString() })
      .eq("ortak", sifreHedefOrtak);

    setSifreYukleniyor(false);

    if (updateError) {
      setSifreHata("Şifre güncellenemedi: " + updateError.message);
      return;
    }

    setSifreBasari(`${sifreHedefOrtak} şifresi başarıyla değiştirildi`);
    setEskiSifre("");
    setYeniSifre("");
    setYeniSifre2("");
    setTimeout(() => {
      setSifreModalOpen(false);
      setSifreBasari("");
    }, 2000);
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

    let foto_url: string | null = null;

    // Foto varsa önce yükle
    if (fotoFile && form.tip === "gider") {
      setFotoYukleniyor(true);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fotoFile.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("fisler")
        .upload(fileName, fotoFile);

      if (uploadError) {
        alert("Fotoğraf yüklenemedi: " + uploadError.message);
        setFotoYukleniyor(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("fisler").getPublicUrl(fileName);
      foto_url = urlData.publicUrl;
      setFotoYukleniyor(false);
    }

    const { error } = await supabase.from("kayitlar").insert({
      tip: form.tip,
      tutar: parseFloat(form.tutar),
      kategori: form.kategori,
      aciklama: form.aciklama || null,
      musteri: form.musteri || null,
      sehir: form.sehir,
      ortak: giris!,
      tarih: form.tarih,
      foto_url: foto_url,
    });

    if (error) {
      alert("Kayıt eklenemedi: " + error.message);
      return;
    }

    await verileriYukle();
    setModalOpen(false);
    setFotoFile(null);
    setFotoPreview(null);
    setForm({
      tip: "gider",
      tutar: "",
      kategori: "",
      aciklama: "",
      musteri: "",
      sehir: SUBE_KISITLI_ORTAKLAR[giris!] || form.sehir,
      ortak: giris || "Ethem",
      tarih: todayISO(),
    });
  };

  const fotoSec = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Fotoğraf çok büyük! Max 5MB olmalı.");
      return;
    }
    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const fotoKaldir = () => {
    setFotoFile(null);
    setFotoPreview(null);
  };

  // ========== MÜŞTERİ İŞLEMLERİ ==========
  
  const musteriKaydet = async () => {
    if (!musteriForm.firma_adi || !musteriForm.tutar) {
      alert("Firma adı ve tutar zorunludur");
      return;
    }

    const veri = {
      firma_adi: musteriForm.firma_adi,
      tip: musteriForm.tip,
      tutar: parseFloat(musteriForm.tutar),
      baslangic_tarihi: musteriForm.baslangic_tarihi,
      odeme_gunu: musteriForm.tip === "aylik" ? parseInt(musteriForm.odeme_gunu) : null,
      is_tanimi: musteriForm.is_tanimi || null,
      sehir: musteriForm.sehir,
      iletisim_kisi: musteriForm.iletisim_kisi || null,
      iletisim_telefon: musteriForm.iletisim_telefon || null,
      notlar: musteriForm.notlar || null,
      ekleyen_ortak: giris!,
    };

    if (duzenlenenMusteri) {
      const { error } = await supabase.from("musteriler").update(veri).eq("id", duzenlenenMusteri.id);
      if (error) { alert("Güncellenemedi: " + error.message); return; }
    } else {
      const { data, error } = await supabase.from("musteriler").insert(veri).select().single();
      if (error) { alert("Eklenemedi: " + error.message); return; }
      
      // Aylık ise bu ay için otomatik ödeme oluştur
      if (data && musteriForm.tip === "aylik") {
        const buAy = suAnkiDonem();
        const baslangic = new Date(musteriForm.baslangic_tarihi);
        const baslangicDonemi = `${baslangic.getFullYear()}-${String(baslangic.getMonth() + 1).padStart(2, "0")}`;
        if (baslangicDonemi <= buAy) {
          await supabase.from("odemeler").insert({
            musteri_id: data.id,
            donem: buAy,
            beklenen_tutar: parseFloat(musteriForm.tutar),
            durum: "bekliyor",
          });
        }
      }
      // Proje ise tek ödeme oluştur
      if (data && musteriForm.tip === "proje") {
        const baslangic = new Date(musteriForm.baslangic_tarihi);
        const donem = `${baslangic.getFullYear()}-${String(baslangic.getMonth() + 1).padStart(2, "0")}`;
        await supabase.from("odemeler").insert({
          musteri_id: data.id,
          donem: donem,
          beklenen_tutar: parseFloat(musteriForm.tutar),
          durum: "bekliyor",
        });
      }
    }

    await verileriYukle();
    setMusteriModalOpen(false);
    setDuzenlenenMusteri(null);
    setMusteriForm({
      firma_adi: "",
      tip: "aylik",
      tutar: "",
      baslangic_tarihi: todayISO(),
      odeme_gunu: "1",
      is_tanimi: "",
      sehir: "İstanbul",
      iletisim_kisi: "",
      iletisim_telefon: "",
      notlar: "",
    });
  };

  const musteriDuzenle = (m: Musteri) => {
    setDuzenlenenMusteri(m);
    setMusteriForm({
      firma_adi: m.firma_adi,
      tip: m.tip,
      tutar: String(m.tutar),
      baslangic_tarihi: m.baslangic_tarihi,
      odeme_gunu: String(m.odeme_gunu || 1),
      is_tanimi: m.is_tanimi || "",
      sehir: m.sehir,
      iletisim_kisi: m.iletisim_kisi || "",
      iletisim_telefon: m.iletisim_telefon || "",
      notlar: m.notlar || "",
    });
    setMusteriModalOpen(true);
  };

  const musteriSil = async (m: Musteri) => {
    if (!confirm(`"${m.firma_adi}" firmasını ve tüm ödeme kayıtlarını silmek istediğine emin misin?`)) return;
    const { error } = await supabase.from("musteriler").delete().eq("id", m.id);
    if (error) { alert("Silinemedi: " + error.message); return; }
    await verileriYukle();
  };

  const musteriPasifEt = async (m: Musteri) => {
    if (!confirm(`"${m.firma_adi}" firmasını pasife alıyorsun. Geçmişi kalır ama yeni aylık ödeme oluşmaz. Emin misin?`)) return;
    const { error } = await supabase.from("musteriler").update({ aktif: !m.aktif }).eq("id", m.id);
    if (error) { alert("Güncellenemedi: " + error.message); return; }
    await verileriYukle();
  };

  // ========== ÖDEME İŞLEMLERİ ==========

  const odemeModalAc = (o: Odeme) => {
    setSecilenOdeme(o);
    setOdemeTutari(String(o.beklenen_tutar - o.odenen_tutar));
    setOdemeTarihi(todayISO());
    setOdemeAciklama(o.aciklama || "");
    setOdemeModalOpen(true);
  };

  const odemeKaydet = async () => {
    if (!secilenOdeme) return;
    const girilen = parseFloat(odemeTutari);
    if (isNaN(girilen) || girilen <= 0) {
      alert("Geçerli bir tutar gir");
      return;
    }

    const yeniOdenen = Number(secilenOdeme.odenen_tutar) + girilen;
    let yeniDurum: "bekliyor" | "kismi" | "tamamlandi" = "bekliyor";
    if (yeniOdenen >= Number(secilenOdeme.beklenen_tutar)) yeniDurum = "tamamlandi";
    else if (yeniOdenen > 0) yeniDurum = "kismi";

    const { error } = await supabase.from("odemeler").update({
      odenen_tutar: yeniOdenen,
      odeme_tarihi: odemeTarihi,
      durum: yeniDurum,
      aciklama: odemeAciklama || null,
    }).eq("id", secilenOdeme.id);

    if (error) { alert("Kaydedilemedi: " + error.message); return; }
    await verileriYukle();
    setOdemeModalOpen(false);
    setSecilenOdeme(null);
  };

  const odemeSifirla = async (o: Odeme) => {
    if (!confirm("Bu ödeme kaydını sıfırlamak istediğine emin misin? (Ödeme tutarı 0'a döner)")) return;
    const { error } = await supabase.from("odemeler").update({
      odenen_tutar: 0,
      odeme_tarihi: null,
      durum: "bekliyor",
      aciklama: null,
    }).eq("id", o.id);
    if (error) { alert("Sıfırlanamadı: " + error.message); return; }
    await verileriYukle();
  };

  // ========== ÇALIŞAN İŞLEMLERİ ==========

  const calisanKaydet = async () => {
    if (!calisanForm.ad_soyad || !calisanForm.maas) {
      alert("Ad-Soyad ve maaş zorunludur");
      return;
    }

    const veri = {
      ad_soyad: calisanForm.ad_soyad,
      pozisyon: calisanForm.pozisyon,
      maas: parseFloat(calisanForm.maas),
      baslangic_tarihi: calisanForm.baslangic_tarihi,
      odeme_gunu: parseInt(calisanForm.odeme_gunu),
      telefon: calisanForm.telefon || null,
      iban: calisanForm.iban || null,
      sehir: calisanForm.sehir,
      notlar: calisanForm.notlar || null,
      ekleyen_ortak: giris!,
    };

    if (duzenlenenCalisan) {
      const { error } = await supabase.from("calisanlar").update(veri).eq("id", duzenlenenCalisan.id);
      if (error) { alert("Güncellenemedi: " + error.message); return; }
    } else {
      const { data, error } = await supabase.from("calisanlar").insert(veri).select().single();
      if (error) { alert("Eklenemedi: " + error.message); return; }
      
      // Bu ay için otomatik maaş ödemesi oluştur
      if (data) {
        const buAy = suAnkiDonem();
        const baslangic = new Date(calisanForm.baslangic_tarihi);
        const baslangicDonemi = `${baslangic.getFullYear()}-${String(baslangic.getMonth() + 1).padStart(2, "0")}`;
        if (baslangicDonemi <= buAy) {
          await supabase.from("maas_odemeleri").insert({
            calisan_id: data.id,
            donem: buAy,
            beklenen_tutar: parseFloat(calisanForm.maas),
            durum: "bekliyor",
          });
        }
      }
    }

    await verileriYukle();
    setCalisanModalOpen(false);
    setDuzenlenenCalisan(null);
    setCalisanForm({
      ad_soyad: "",
      pozisyon: "Grafiker",
      maas: "",
      baslangic_tarihi: todayISO(),
      odeme_gunu: "1",
      telefon: "",
      iban: "",
      sehir: "İstanbul",
      notlar: "",
    });
  };

  const calisanDuzenle = (c: Calisan) => {
    setDuzenlenenCalisan(c);
    setCalisanForm({
      ad_soyad: c.ad_soyad,
      pozisyon: c.pozisyon,
      maas: String(c.maas),
      baslangic_tarihi: c.baslangic_tarihi,
      odeme_gunu: String(c.odeme_gunu),
      telefon: c.telefon || "",
      iban: c.iban || "",
      sehir: c.sehir,
      notlar: c.notlar || "",
    });
    setCalisanModalOpen(true);
  };

  const calisanSil = async (c: Calisan) => {
    if (!confirm(`"${c.ad_soyad}" çalışanını ve tüm maaş kayıtlarını silmek istediğine emin misin?`)) return;
    const { error } = await supabase.from("calisanlar").delete().eq("id", c.id);
    if (error) { alert("Silinemedi: " + error.message); return; }
    await verileriYukle();
  };

  const calisanPasifEt = async (c: Calisan) => {
    if (!confirm(`"${c.ad_soyad}" çalışanını ${c.aktif ? 'pasife alıyorsun' : 'aktifleştiriyorsun'}. Geçmişi kalır. Emin misin?`)) return;
    const { error } = await supabase.from("calisanlar").update({ aktif: !c.aktif }).eq("id", c.id);
    if (error) { alert("Güncellenemedi: " + error.message); return; }
    await verileriYukle();
  };

  // ========== MAAŞ ÖDEME İŞLEMLERİ ==========

  const maasOdemeModalAc = (m: MaasOdemesi) => {
    setSecilenMaasOdeme(m);
    setMaasOdemeTutari(String(Number(m.beklenen_tutar) - Number(m.odenen_tutar)));
    setMaasOdemeTarihi(todayISO());
    setMaasOdemeAciklama(m.aciklama || "");
    setMaasOdemeModalOpen(true);
  };

  const maasOdemeKaydet = async () => {
    if (!secilenMaasOdeme) return;
    const girilen = parseFloat(maasOdemeTutari);
    if (isNaN(girilen) || girilen <= 0) {
      alert("Geçerli bir tutar gir");
      return;
    }

    const yeniOdenen = Number(secilenMaasOdeme.odenen_tutar) + girilen;
    let yeniDurum: "bekliyor" | "kismi" | "tamamlandi" = "bekliyor";
    if (yeniOdenen >= Number(secilenMaasOdeme.beklenen_tutar)) yeniDurum = "tamamlandi";
    else if (yeniOdenen > 0) yeniDurum = "kismi";

    const { error } = await supabase.from("maas_odemeleri").update({
      odenen_tutar: yeniOdenen,
      son_odeme_tarihi: maasOdemeTarihi,
      durum: yeniDurum,
      aciklama: maasOdemeAciklama || null,
    }).eq("id", secilenMaasOdeme.id);

    if (error) { alert("Kaydedilemedi: " + error.message); return; }
    await verileriYukle();
    setMaasOdemeModalOpen(false);
    setSecilenMaasOdeme(null);
  };

  const maasOdemeSifirla = async (m: MaasOdemesi) => {
    if (!confirm("Bu maaş ödeme kaydını sıfırlamak istediğine emin misin?")) return;
    const { error } = await supabase.from("maas_odemeleri").update({
      odenen_tutar: 0,
      son_odeme_tarihi: null,
      durum: "bekliyor",
      aciklama: null,
    }).eq("id", m.id);
    if (error) { alert("Sıfırlanamadı: " + error.message); return; }
    await verileriYukle();
  };

  const kayitSil = async (id: number, kayitOrtak: string, foto_url: string | null) => {
    if (kayitOrtak !== giris) {
      alert(`Bu kayıt ${kayitOrtak} tarafından eklendi. Sadece kendi kayıtlarınızı silebilirsiniz.`);
      return;
    }
    if (!confirm("Bu kayıt silinsin mi?")) return;

    // Foto varsa onu da sil
    if (foto_url) {
      const fileName = foto_url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("fisler").remove([fileName]);
      }
    }

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
      if (kisitliSube && k.sehir !== kisitliSube) return false;
      if (filtreSehir !== "Hepsi" && k.sehir !== filtreSehir) return false;
      if (filtreOrtak !== "Hepsi" && k.ortak !== filtreOrtak) return false;

      // Arama metni filtresi - açıklama, kategori, müşteri'de arama yapar
      if (aramaMetni.trim()) {
        const arama = aramaMetni.toLowerCase().trim();
        const aramaAlanlari = [
          k.aciklama?.toLowerCase() || "",
          k.kategori?.toLowerCase() || "",
          k.musteri?.toLowerCase() || "",
        ].join(" ");
        if (!aramaAlanlari.includes(arama)) return false;
      }

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
      if (filtreDonem === "gecen_ay") {
        const gecenAy = new Date(simdi.getFullYear(), simdi.getMonth() - 1, 1);
        return kayitTarih.getMonth() === gecenAy.getMonth() && kayitTarih.getFullYear() === gecenAy.getFullYear();
      }
      if (filtreDonem === "son_3_ay") {
        const ucAyOnce = new Date(simdi.getFullYear(), simdi.getMonth() - 3, 1);
        return kayitTarih >= ucAyOnce;
      }
      if (filtreDonem === "bu_yil") {
        return kayitTarih.getFullYear() === simdi.getFullYear();
      }
      if (filtreDonem === "ozel" && ozelTarihBaslangic && ozelTarihBitis) {
        const baslangic = new Date(ozelTarihBaslangic);
        const bitis = new Date(ozelTarihBitis);
        bitis.setHours(23, 59, 59, 999);
        return kayitTarih >= baslangic && kayitTarih <= bitis;
      }
      return true;
    });
  }, [kayitlar, filtreSehir, filtreOrtak, filtreDonem, giris, ozelTarihBaslangic, ozelTarihBitis, aramaMetni]);

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

  // Müşteri bazlı filtreleme
  const gorunenMusteriler = useMemo(() => {
    const kisitliSube = giris ? SUBE_KISITLI_ORTAKLAR[giris] : null;
    return musteriler.filter(m => {
      if (kisitliSube && m.sehir !== kisitliSube) return false;
      return true;
    });
  }, [musteriler, giris]);

  // Ciro özeti
  const ciroOzeti = useMemo(() => {
    const aylikAktif = gorunenMusteriler.filter(m => m.aktif && m.tip === "aylik");
    const toplamAylikCiro = aylikAktif.reduce((s, m) => s + Number(m.tutar), 0);
    const aktifMusteriSayisi = gorunenMusteriler.filter(m => m.aktif).length;
    const pasifMusteriSayisi = gorunenMusteriler.filter(m => !m.aktif).length;
    return { toplamAylikCiro, aktifMusteriSayisi, pasifMusteriSayisi };
  }, [gorunenMusteriler]);

  // Bu ay ödeme durumu
  const buAyOdemeleri = useMemo(() => {
    const buAy = suAnkiDonem();
    const gorunenMusteriIds = new Set(gorunenMusteriler.map(m => m.id));
    const buAyOdemeler = odemeler.filter(o => o.donem === buAy && gorunenMusteriIds.has(o.musteri_id));
    const beklenen = buAyOdemeler.reduce((s, o) => s + Number(o.beklenen_tutar), 0);
    const alinan = buAyOdemeler.reduce((s, o) => s + Number(o.odenen_tutar), 0);
    return { beklenen, alinan, kalan: beklenen - alinan, sayi: buAyOdemeler.length };
  }, [odemeler, gorunenMusteriler]);

  // Gecikmiş ödemeler
  const gecikmisOdemeler = useMemo(() => {
    const simdi = new Date();
    const gorunenMusteriMap = new Map(gorunenMusteriler.map(m => [m.id, m]));
    
    return odemeler
      .filter(o => {
        const m = gorunenMusteriMap.get(o.musteri_id);
        if (!m) return false;
        if (o.durum === "tamamlandi" || o.durum === "iptal") return false;
        
        // Ödeme günü geçmiş mi?
        const [yil, ay] = o.donem.split("-");
        if (m.tip === "aylik" && m.odeme_gunu) {
          const odemeGunTarihi = new Date(parseInt(yil), parseInt(ay) - 1, m.odeme_gunu);
          return simdi > odemeGunTarihi;
        }
        // Proje ise başlangıç tarihi geçmişse
        if (m.tip === "proje") {
          return new Date(m.baslangic_tarihi) < simdi;
        }
        return false;
      })
      .map(o => {
        const m = gorunenMusteriMap.get(o.musteri_id)!;
        const [yil, ay] = o.donem.split("-");
        const odemeGunTarihi = m.tip === "aylik" && m.odeme_gunu
          ? new Date(parseInt(yil), parseInt(ay) - 1, m.odeme_gunu)
          : new Date(m.baslangic_tarihi);
        const gecikmeGunu = Math.floor((simdi.getTime() - odemeGunTarihi.getTime()) / (1000 * 60 * 60 * 24));
        return { odeme: o, musteri: m, gecikmeGunu };
      })
      .sort((a, b) => b.gecikmeGunu - a.gecikmeGunu);
  }, [odemeler, gorunenMusteriler]);

  // Yaklaşan ödemeler (7 gün içinde)
  const yaklasanOdemeler = useMemo(() => {
    const simdi = new Date();
    const yediGunSonra = new Date();
    yediGunSonra.setDate(yediGunSonra.getDate() + 7);
    const gorunenMusteriMap = new Map(gorunenMusteriler.map(m => [m.id, m]));
    
    return odemeler
      .filter(o => {
        const m = gorunenMusteriMap.get(o.musteri_id);
        if (!m) return false;
        if (o.durum === "tamamlandi" || o.durum === "iptal") return false;
        
        const [yil, ay] = o.donem.split("-");
        if (m.tip === "aylik" && m.odeme_gunu) {
          const odemeGunTarihi = new Date(parseInt(yil), parseInt(ay) - 1, m.odeme_gunu);
          return odemeGunTarihi > simdi && odemeGunTarihi <= yediGunSonra;
        }
        return false;
      })
      .map(o => {
        const m = gorunenMusteriMap.get(o.musteri_id)!;
        const [yil, ay] = o.donem.split("-");
        const odemeGunTarihi = new Date(parseInt(yil), parseInt(ay) - 1, m.odeme_gunu!);
        const kalanGun = Math.ceil((odemeGunTarihi.getTime() - simdi.getTime()) / (1000 * 60 * 60 * 24));
        return { odeme: o, musteri: m, kalanGun };
      })
      .sort((a, b) => a.kalanGun - b.kalanGun);
  }, [odemeler, gorunenMusteriler]);

  // Çalışan filtreleme
  const gorunenCalisanlar = useMemo(() => {
    const kisitliSube = giris ? SUBE_KISITLI_ORTAKLAR[giris] : null;
    return calisanlar.filter(c => {
      if (kisitliSube && c.sehir !== kisitliSube) return false;
      return true;
    });
  }, [calisanlar, giris]);

  // Toplam maaş gideri
  const maasOzeti = useMemo(() => {
    const aktifCalisanlar = gorunenCalisanlar.filter(c => c.aktif);
    const toplamAylikMaas = aktifCalisanlar.reduce((s, c) => s + Number(c.maas), 0);
    return { 
      toplamAylikMaas, 
      aktifCalisanSayisi: aktifCalisanlar.length,
      pasifCalisanSayisi: gorunenCalisanlar.filter(c => !c.aktif).length,
    };
  }, [gorunenCalisanlar]);

  // Pozisyon bazlı dağılım
  const pozisyonDagilim = useMemo(() => {
    const map: Record<string, { sayi: number; toplamMaas: number }> = {};
    gorunenCalisanlar.filter(c => c.aktif).forEach(c => {
      if (!map[c.pozisyon]) map[c.pozisyon] = { sayi: 0, toplamMaas: 0 };
      map[c.pozisyon].sayi++;
      map[c.pozisyon].toplamMaas += Number(c.maas);
    });
    return Object.entries(map)
      .map(([pozisyon, v]) => ({ pozisyon, ...v }))
      .sort((a, b) => b.toplamMaas - a.toplamMaas);
  }, [gorunenCalisanlar]);

  // Bu ay maaş ödeme durumu
  const buAyMaaslari = useMemo(() => {
    const buAy = suAnkiDonem();
    const gorunenIds = new Set(gorunenCalisanlar.map(c => c.id));
    const buAyMaaslar = maasOdemeleri.filter(m => m.donem === buAy && gorunenIds.has(m.calisan_id));
    const beklenen = buAyMaaslar.reduce((s, m) => s + Number(m.beklenen_tutar), 0);
    const odenen = buAyMaaslar.reduce((s, m) => s + Number(m.odenen_tutar), 0);
    return { beklenen, odenen, kalan: beklenen - odenen, sayi: buAyMaaslar.length };
  }, [maasOdemeleri, gorunenCalisanlar]);

  // Geciken maaşlar
  const gecikenMaaslar = useMemo(() => {
    const simdi = new Date();
    const gorunenMap = new Map(gorunenCalisanlar.map(c => [c.id, c]));
    
    return maasOdemeleri
      .filter(m => {
        const c = gorunenMap.get(m.calisan_id);
        if (!c) return false;
        if (m.durum === "tamamlandi" || m.durum === "iptal") return false;
        const [yil, ay] = m.donem.split("-");
        const odemeGunTarihi = new Date(parseInt(yil), parseInt(ay) - 1, c.odeme_gunu);
        return simdi > odemeGunTarihi;
      })
      .map(m => {
        const c = gorunenMap.get(m.calisan_id)!;
        const [yil, ay] = m.donem.split("-");
        const odemeGunTarihi = new Date(parseInt(yil), parseInt(ay) - 1, c.odeme_gunu);
        const gecikmeGunu = Math.floor((simdi.getTime() - odemeGunTarihi.getTime()) / (1000 * 60 * 60 * 24));
        return { maas: m, calisan: c, gecikmeGunu };
      })
      .sort((a, b) => b.gecikmeGunu - a.gecikmeGunu);
  }, [maasOdemeleri, gorunenCalisanlar]);


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
              disabled={girisYukleniyor}
              className="w-full py-3 bg-stone-900 text-white rounded-lg font-semibold text-sm hover:bg-stone-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {girisYukleniyor ? <><Loader2 className="w-4 h-4 animate-spin" /> Giriş yapılıyor...</> : "Giriş Yap"}
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
              onClick={() => { 
                setSifreHedefOrtak(giris!); 
                setEskiSifre("");
                setYeniSifre("");
                setYeniSifre2("");
                setSifreHata("");
                setSifreBasari("");
                setSifreModalOpen(true); 
              }}
              className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
              title="Şifre Değiştir"
            >
              <Key className="w-4 h-4 text-stone-700" />
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
        {/* Sekmeler */}
        <div className="flex gap-1 bg-white border border-stone-200 p-1 rounded-xl w-fit">
          <button
            onClick={() => setAktifSekme("kasa")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              aktifSekme === "kasa" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Wallet className="w-4 h-4" /> Kasa
          </button>
          <button
            onClick={() => setAktifSekme("musteriler")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              aktifSekme === "musteriler" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Briefcase className="w-4 h-4" /> Müşteriler
            {gecikmisOdemeler.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white text-xs rounded-full">
                {gecikmisOdemeler.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setAktifSekme("calisanlar")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              aktifSekme === "calisanlar" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Users className="w-4 h-4" /> Çalışanlar
            {gecikenMaaslar.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white text-xs rounded-full">
                {gecikenMaaslar.length}
              </span>
            )}
          </button>
        </div>

        {aktifSekme === "kasa" && (
        <>
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
          {/* Arama kutusu */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              placeholder="Açıklama, kategori veya müşteri ara... (örn: market, taksi, X firma)"
              className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400 focus:bg-white transition"
            />
            {aramaMetni && (
              <button
                onClick={() => setAramaMetni("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
                title="Temizle"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-medium text-stone-700">Filtreler</span>
            {aramaMetni && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                "{aramaMetni}" araması aktif · {filtrelenmis.length} sonuç
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex flex-wrap gap-1 bg-stone-100 p-1 rounded-lg">
              {[
                { v: "bugun", e: "Bugün" },
                { v: "bu_hafta", e: "Bu Hafta" },
                { v: "bu_ay", e: "Bu Ay" },
                { v: "gecen_ay", e: "Geçen Ay" },
                { v: "son_3_ay", e: "Son 3 Ay" },
                { v: "bu_yil", e: "Bu Yıl" },
                { v: "hepsi", e: "Tümü" },
                { v: "ozel", e: "📅 Özel" },
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
          
          {/* Özel tarih aralığı - sadece "Özel" seçildiğinde göster */}
          {filtreDonem === "ozel" && (
            <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Başlangıç</label>
                <input
                  type="date"
                  value={ozelTarihBaslangic}
                  onChange={(e) => setOzelTarihBaslangic(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Bitiş</label>
                <input
                  type="date"
                  value={ozelTarihBitis}
                  onChange={(e) => setOzelTarihBitis(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>
              {(ozelTarihBaslangic || ozelTarihBitis) && (
                <button
                  onClick={() => { setOzelTarihBaslangic(""); setOzelTarihBitis(""); }}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition"
                >
                  Temizle
                </button>
              )}
              {ozelTarihBaslangic && ozelTarihBitis && (
                <div className="text-xs text-stone-500 self-center">
                  {formatDate(ozelTarihBaslangic)} - {formatDate(ozelTarihBitis)}
                </div>
              )}
            </div>
          )}
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
                  {k.foto_url && (
                    <button 
                      onClick={() => setBuyukFoto(k.foto_url)} 
                      className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                      title="Fişi görüntüle"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  )}
                  {k.ortak === giris ? (
                    <button onClick={() => kayitSil(k.id, k.ortak, k.foto_url)} className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Sil">
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
        </>
        )}

        {aktifSekme === "musteriler" && (
        <>
          {/* Ciro Özet Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-50 text-xs font-medium uppercase tracking-wider mb-2">
                <DollarSign className="w-4 h-4" /> Toplam Aylık Ciro
              </div>
              <div className="text-3xl font-bold">{formatTL(ciroOzeti.toplamAylikCiro)}</div>
              <div className="text-xs text-indigo-100 mt-2">{ciroOzeti.aktifMusteriSayisi} aktif müşteri</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-50 text-xs font-medium uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-4 h-4" /> Bu Ay Tahsil Edilen
              </div>
              <div className="text-3xl font-bold">{formatTL(buAyOdemeleri.alinan)}</div>
              <div className="text-xs text-emerald-100 mt-2">{formatTL(buAyOdemeleri.beklenen)} beklenen</div>
            </div>
            <div className={`${buAyOdemeleri.kalan > 0 ? "bg-gradient-to-br from-amber-500 to-amber-600" : "bg-gradient-to-br from-stone-700 to-stone-800"} text-white rounded-xl p-5 shadow-sm`}>
              <div className="flex items-center gap-2 text-amber-50 text-xs font-medium uppercase tracking-wider mb-2">
                <Clock className="w-4 h-4" /> Bu Ay Kalan Tahsilat
              </div>
              <div className="text-3xl font-bold">{formatTL(buAyOdemeleri.kalan)}</div>
              <div className="text-xs text-amber-100 mt-2">{buAyOdemeleri.sayi} ödeme takipte</div>
            </div>
          </div>

          {/* Gecikmiş Ödemeler */}
          {gecikmisOdemeler.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-rose-900">GECİKMİŞ ÖDEMELER ({gecikmisOdemeler.length})</h3>
              </div>
              <div className="space-y-2">
                {gecikmisOdemeler.map(({ odeme, musteri, gecikmeGunu }) => {
                  const kalan = Number(odeme.beklenen_tutar) - Number(odeme.odenen_tutar);
                  return (
                    <div key={odeme.id} className="bg-white border border-rose-200 rounded-lg p-3 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-stone-900 text-sm">{musteri.firma_adi}</div>
                        <div className="text-xs text-rose-600 font-medium">
                          {gecikmeGunu} gündür gecikmiş · {donemEtiket(odeme.donem)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-rose-600">{formatTL(kalan)}</div>
                        {odeme.durum === "kismi" && (
                          <div className="text-xs text-stone-500">Yarı ödendi</div>
                        )}
                      </div>
                      <button
                        onClick={() => odemeModalAc(odeme)}
                        className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition"
                      >
                        Ödeme Al
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Yaklaşan Ödemeler */}
          {yaklasanOdemeler.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-amber-900">YAKLAŞAN ÖDEMELER (7 gün)</h3>
              </div>
              <div className="space-y-2">
                {yaklasanOdemeler.map(({ odeme, musteri, kalanGun }) => {
                  const kalan = Number(odeme.beklenen_tutar) - Number(odeme.odenen_tutar);
                  return (
                    <div key={odeme.id} className="bg-white border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-stone-900 text-sm">{musteri.firma_adi}</div>
                        <div className="text-xs text-amber-700 font-medium">
                          {kalanGun} gün sonra · {musteri.odeme_gunu}. gün
                        </div>
                      </div>
                      <div className="font-bold text-amber-700">{formatTL(kalan)}</div>
                      <button
                        onClick={() => odemeModalAc(odeme)}
                        className="px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition"
                      >
                        Ödeme Al
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Yeni Müşteri Butonu */}
          <div className="flex justify-end">
            <button
              onClick={() => { 
                setDuzenlenenMusteri(null);
                setMusteriForm({
                  firma_adi: "",
                  tip: "aylik",
                  tutar: "",
                  baslangic_tarihi: todayISO(),
                  odeme_gunu: "1",
                  is_tanimi: "",
                  sehir: giris && SUBE_KISITLI_ORTAKLAR[giris] ? SUBE_KISITLI_ORTAKLAR[giris] : "İstanbul",
                  iletisim_kisi: "",
                  iletisim_telefon: "",
                  notlar: "",
                });
                setMusteriModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Yeni Müşteri
            </button>
          </div>

          {/* Müşteri Listesi */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200">
              <h3 className="font-semibold text-stone-900">
                Müşteriler ({gorunenMusteriler.length})
              </h3>
            </div>
            {gorunenMusteriler.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-400 text-sm">Henüz müşteri eklenmemiş</p>
                <p className="text-stone-400 text-xs mt-1">Yukarıdaki "Yeni Müşteri" butonuna basarak başla</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {gorunenMusteriler.map((m) => {
                  const musteriOdemeleri = odemeler.filter(o => o.musteri_id === m.id);
                  const toplamBeklenen = musteriOdemeleri.reduce((s, o) => s + Number(o.beklenen_tutar), 0);
                  const toplamAlinan = musteriOdemeleri.reduce((s, o) => s + Number(o.odenen_tutar), 0);
                  const aktifOdeme = musteriOdemeleri.find(o => o.durum !== "tamamlandi" && o.durum !== "iptal");
                  
                  return (
                    <div key={m.id} className={`p-4 ${!m.aktif ? "opacity-60" : ""}`}>
                      <div className="flex items-start gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          m.tip === "aylik" ? "bg-indigo-100 text-indigo-700" : "bg-purple-100 text-purple-700"
                        }`}>
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-stone-900">{m.firma_adi}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              m.tip === "aylik" ? "bg-indigo-100 text-indigo-700" : "bg-purple-100 text-purple-700"
                            }`}>
                              {m.tip === "aylik" ? "Aylık Sabit" : "Proje"}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-600">
                              {m.sehir}
                            </span>
                            {!m.aktif && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-rose-100 text-rose-700">
                                PASİF
                              </span>
                            )}
                          </div>
                          <div className="text-xl font-bold text-stone-900 mt-1">
                            {formatTL(Number(m.tutar))}
                            <span className="text-xs font-normal text-stone-500 ml-1">
                              {m.tip === "aylik" ? `/ ay · Her ayın ${m.odeme_gunu}. günü` : "tek seferlik"}
                            </span>
                          </div>
                          {m.is_tanimi && (
                            <p className="text-xs text-stone-600 mt-2 italic">"{m.is_tanimi}"</p>
                          )}
                          {(m.iletisim_kisi || m.iletisim_telefon) && (
                            <div className="flex items-center gap-3 text-xs text-stone-500 mt-2">
                              {m.iletisim_kisi && <span>{m.iletisim_kisi}</span>}
                              {m.iletisim_telefon && (
                                <a href={`tel:${m.iletisim_telefon}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                                  <Phone className="w-3 h-3" /> {m.iletisim_telefon}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => musteriDuzenle(m)}
                            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                            title="Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => musteriPasifEt(m)}
                            className="p-2 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title={m.aktif ? "Pasife al" : "Aktifleştir"}
                          >
                            {m.aktif ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => musteriSil(m)}
                            className="p-2 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Ödeme Geçmişi */}
                      {musteriOdemeleri.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-stone-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                              Ödeme Geçmişi
                            </span>
                            <span className="text-xs text-stone-500">
                              {formatTL(toplamAlinan)} / {formatTL(toplamBeklenen)}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {musteriOdemeleri.slice(0, 5).map((o) => {
                              const kalan = Number(o.beklenen_tutar) - Number(o.odenen_tutar);
                              return (
                                <div key={o.id} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg text-xs">
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    o.durum === "tamamlandi" ? "bg-emerald-500" :
                                    o.durum === "kismi" ? "bg-amber-500" :
                                    o.durum === "iptal" ? "bg-stone-400" :
                                    "bg-rose-500"
                                  }`} />
                                  <span className="font-semibold text-stone-700 w-24">{donemEtiket(o.donem)}</span>
                                  <span className="text-stone-500 flex-1">
                                    {o.durum === "tamamlandi" ? "✓ Tamamen ödendi" :
                                     o.durum === "kismi" ? `${formatTL(Number(o.odenen_tutar))} ödendi, ${formatTL(kalan)} kaldı` :
                                     o.durum === "iptal" ? "İptal" :
                                     `${formatTL(Number(o.beklenen_tutar))} bekleniyor`}
                                  </span>
                                  {o.durum !== "tamamlandi" && o.durum !== "iptal" && (
                                    <button
                                      onClick={() => odemeModalAc(o)}
                                      className="px-2 py-1 bg-stone-900 text-white text-xs font-semibold rounded hover:bg-stone-800"
                                    >
                                      Ödeme Al
                                    </button>
                                  )}
                                  {o.durum === "tamamlandi" && (
                                    <button
                                      onClick={() => odemeSifirla(o)}
                                      className="px-2 py-1 text-stone-500 hover:text-stone-900 text-xs"
                                      title="Sıfırla"
                                    >
                                      ↻
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {musteriOdemeleri.length > 5 && (
                              <p className="text-xs text-stone-400 text-center mt-1">
                                +{musteriOdemeleri.length - 5} eski ödeme daha
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
        )}

        {aktifSekme === "calisanlar" && (
        <>
          {/* Maaş Özet Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-violet-500 to-violet-600 text-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-violet-50 text-xs font-medium uppercase tracking-wider mb-2">
                <DollarSign className="w-4 h-4" /> Toplam Aylık Maaş Gideri
              </div>
              <div className="text-3xl font-bold">{formatTL(maasOzeti.toplamAylikMaas)}</div>
              <div className="text-xs text-violet-100 mt-2">{maasOzeti.aktifCalisanSayisi} aktif çalışan</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-50 text-xs font-medium uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-4 h-4" /> Bu Ay Ödenen
              </div>
              <div className="text-3xl font-bold">{formatTL(buAyMaaslari.odenen)}</div>
              <div className="text-xs text-emerald-100 mt-2">{formatTL(buAyMaaslari.beklenen)} beklenen</div>
            </div>
            <div className={`${buAyMaaslari.kalan > 0 ? "bg-gradient-to-br from-amber-500 to-amber-600" : "bg-gradient-to-br from-stone-700 to-stone-800"} text-white rounded-xl p-5 shadow-sm`}>
              <div className="flex items-center gap-2 text-amber-50 text-xs font-medium uppercase tracking-wider mb-2">
                <Clock className="w-4 h-4" /> Bu Ay Kalan
              </div>
              <div className="text-3xl font-bold">{formatTL(buAyMaaslari.kalan)}</div>
              <div className="text-xs text-amber-100 mt-2">{buAyMaaslari.sayi} maaş takipte</div>
            </div>
          </div>

          {/* Pozisyon Bazında Dağılım */}
          {pozisyonDagilim.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-stone-500" />
                <h3 className="font-semibold text-stone-900">Pozisyon Bazında Dağılım</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pozisyonDagilim.map((p) => (
                  <div key={p.pozisyon} className="p-3 bg-stone-50 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-stone-800 text-sm">{p.pozisyon}</span>
                      <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-bold">
                        {p.sayi} kişi
                      </span>
                    </div>
                    <div className="text-base font-bold text-stone-900">{formatTL(p.toplamMaas)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Geciken Maaşlar */}
          {gecikenMaaslar.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-rose-900">GECİKMİŞ MAAŞ ÖDEMELERİ ({gecikenMaaslar.length})</h3>
              </div>
              <div className="space-y-2">
                {gecikenMaaslar.map(({ maas, calisan, gecikmeGunu }) => {
                  const kalan = Number(maas.beklenen_tutar) - Number(maas.odenen_tutar);
                  return (
                    <div key={maas.id} className="bg-white border border-rose-200 rounded-lg p-3 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-stone-900 text-sm">{calisan.ad_soyad}</div>
                        <div className="text-xs text-rose-600 font-medium">
                          {gecikmeGunu} gündür gecikmiş · {donemEtiket(maas.donem)} · {calisan.pozisyon}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-rose-600">{formatTL(kalan)}</div>
                        {maas.durum === "kismi" && (
                          <div className="text-xs text-stone-500">Kısmi ödendi</div>
                        )}
                      </div>
                      <button
                        onClick={() => maasOdemeModalAc(maas)}
                        className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition"
                      >
                        Ödeme Yap
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Yeni Çalışan Butonu */}
          <div className="flex justify-end">
            <button
              onClick={() => { 
                setDuzenlenenCalisan(null);
                setCalisanForm({
                  ad_soyad: "",
                  pozisyon: "Grafiker",
                  maas: "",
                  baslangic_tarihi: todayISO(),
                  odeme_gunu: "1",
                  telefon: "",
                  iban: "",
                  sehir: giris && SUBE_KISITLI_ORTAKLAR[giris] ? SUBE_KISITLI_ORTAKLAR[giris] : "İstanbul",
                  notlar: "",
                });
                setCalisanModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Yeni Çalışan
            </button>
          </div>

          {/* Çalışan Listesi */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200">
              <h3 className="font-semibold text-stone-900">
                Çalışanlar ({gorunenCalisanlar.length})
              </h3>
            </div>
            {gorunenCalisanlar.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-400 text-sm">Henüz çalışan eklenmemiş</p>
                <p className="text-stone-400 text-xs mt-1">Yukarıdaki "Yeni Çalışan" butonuna basarak başla</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {gorunenCalisanlar.map((c) => {
                  const calisanMaaslari = maasOdemeleri.filter(m => m.calisan_id === c.id);
                  const aktifMaas = calisanMaaslari.find(m => m.durum !== "tamamlandi" && m.durum !== "iptal");
                  const toplamBeklenen = calisanMaaslari.reduce((s, m) => s + Number(m.beklenen_tutar), 0);
                  const toplamOdenen = calisanMaaslari.reduce((s, m) => s + Number(m.odenen_tutar), 0);
                  
                  return (
                    <div key={c.id} className={`p-4 ${!c.aktif ? "opacity-60" : ""}`}>
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
                          <UserCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-stone-900">{c.ad_soyad}</h4>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700">
                              {c.pozisyon}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-600">
                              {c.sehir}
                            </span>
                            {!c.aktif && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-rose-100 text-rose-700">
                                İŞTEN AYRILDI
                              </span>
                            )}
                          </div>
                          <div className="text-xl font-bold text-stone-900 mt-1">
                            {formatTL(Number(c.maas))}
                            <span className="text-xs font-normal text-stone-500 ml-1">
                              / ay · Her ayın {c.odeme_gunu}. günü
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-stone-500 mt-2 flex-wrap">
                            <span>Başlangıç: {formatDate(c.baslangic_tarihi)}</span>
                            {c.telefon && (
                              <a href={`tel:${c.telefon}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                                <Phone className="w-3 h-3" /> {c.telefon}
                              </a>
                            )}
                            {c.iban && (
                              <span className="flex items-center gap-1 text-stone-500">
                                <CreditCard className="w-3 h-3" /> {c.iban}
                              </span>
                            )}
                          </div>
                          {c.notlar && (
                            <p className="text-xs text-stone-600 mt-2 italic bg-stone-50 p-2 rounded">{c.notlar}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => calisanDuzenle(c)}
                            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                            title="Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => calisanPasifEt(c)}
                            className="p-2 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title={c.aktif ? "İşten ayrıl" : "İşe geri al"}
                          >
                            {c.aktif ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => calisanSil(c)}
                            className="p-2 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Maaş Geçmişi */}
                      {calisanMaaslari.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-stone-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                              Maaş Geçmişi
                            </span>
                            <span className="text-xs text-stone-500">
                              {formatTL(toplamOdenen)} / {formatTL(toplamBeklenen)}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {calisanMaaslari.slice(0, 5).map((m) => {
                              const kalan = Number(m.beklenen_tutar) - Number(m.odenen_tutar);
                              return (
                                <div key={m.id} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg text-xs">
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    m.durum === "tamamlandi" ? "bg-emerald-500" :
                                    m.durum === "kismi" ? "bg-amber-500" :
                                    m.durum === "iptal" ? "bg-stone-400" :
                                    "bg-rose-500"
                                  }`} />
                                  <span className="font-semibold text-stone-700 w-24">{donemEtiket(m.donem)}</span>
                                  <span className="text-stone-500 flex-1">
                                    {m.durum === "tamamlandi" ? "✓ Tamamen ödendi" :
                                     m.durum === "kismi" ? `${formatTL(Number(m.odenen_tutar))} verildi, ${formatTL(kalan)} kaldı` :
                                     m.durum === "iptal" ? "İptal" :
                                     `${formatTL(Number(m.beklenen_tutar))} bekliyor`}
                                  </span>
                                  {m.durum !== "tamamlandi" && m.durum !== "iptal" && (
                                    <button
                                      onClick={() => maasOdemeModalAc(m)}
                                      className="px-2 py-1 bg-stone-900 text-white text-xs font-semibold rounded hover:bg-stone-800"
                                    >
                                      Ödeme Yap
                                    </button>
                                  )}
                                  {m.durum === "tamamlandi" && (
                                    <button
                                      onClick={() => maasOdemeSifirla(m)}
                                      className="px-2 py-1 text-stone-500 hover:text-stone-900 text-xs"
                                      title="Sıfırla"
                                    >
                                      ↻
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {calisanMaaslari.length > 5 && (
                              <p className="text-xs text-stone-400 text-center mt-1">
                                +{calisanMaaslari.length - 5} eski maaş daha
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
        )}
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
              {form.tip === "gider" && (
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Fiş / Dekont Fotoğrafı (opsiyonel)</label>
                  {fotoPreview ? (
                    <div className="relative">
                      <img src={fotoPreview} alt="Fiş" className="w-full h-48 object-cover rounded-lg border border-stone-200" />
                      <button 
                        onClick={fotoKaldir}
                        className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-full shadow-md"
                      >
                        <X className="w-4 h-4 text-stone-700" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col items-center justify-center gap-1 py-4 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer transition">
                        <Camera className="w-5 h-5 text-stone-700" />
                        <span className="text-xs font-semibold text-stone-700">Kamera</span>
                        <input type="file" accept="image/*" capture="environment" onChange={fotoSec} className="hidden" />
                      </label>
                      <label className="flex flex-col items-center justify-center gap-1 py-4 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer transition">
                        <ImageIcon className="w-5 h-5 text-stone-700" />
                        <span className="text-xs font-semibold text-stone-700">Galeri</span>
                        <input type="file" accept="image/*" onChange={fotoSec} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Tarih</label>
                <input type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-stone-200 p-4 flex gap-2">
              <button onClick={() => { setModalOpen(false); setFotoFile(null); setFotoPreview(null); }} className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-lg font-semibold text-sm hover:bg-stone-200 transition">İptal</button>
              <button onClick={kayitEkle} disabled={fotoYukleniyor} className="flex-1 py-3 bg-stone-900 text-white rounded-lg font-semibold text-sm hover:bg-stone-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {fotoYukleniyor ? <><Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...</> : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {sifreModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-stone-700" />
                <h2 className="text-lg font-bold text-stone-900">Şifre Değiştir</h2>
              </div>
              <button onClick={() => setSifreModalOpen(false)} className="p-1 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Admin seçimi - sadece Ethem için */}
              {giris === ADMIN_ORTAK && (
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Hangi ortağın şifresini değiştireceksin?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ORTAKLAR.map((o) => (
                      <button
                        key={o}
                        onClick={() => { setSifreHedefOrtak(o); setEskiSifre(""); setSifreHata(""); }}
                        className={`py-2.5 rounded-lg font-semibold text-sm transition ${
                          sifreHedefOrtak === o ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {o} {o === giris && "(Sen)"}
                      </button>
                    ))}
                  </div>
                  {sifreHedefOrtak !== giris && (
                    <p className="text-xs text-amber-600 mt-2 flex items-start gap-1">
                      <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      Admin olarak değiştiriyorsun. Doğrulama için KENDİ (Ethem) şifreni gireceksin.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
                  {giris === ADMIN_ORTAK && sifreHedefOrtak !== giris 
                    ? "Kendi (Ethem) şifren" 
                    : "Mevcut Şifre"}
                </label>
                <input
                  type="password"
                  value={eskiSifre}
                  onChange={(e) => setEskiSifre(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
                  Yeni Şifre ({sifreHedefOrtak} için)
                </label>
                <input
                  type="password"
                  value={yeniSifre}
                  onChange={(e) => setYeniSifre(e.target.value)}
                  placeholder="En az 4 karakter"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
                  Yeni Şifre (Tekrar)
                </label>
                <input
                  type="password"
                  value={yeniSifre2}
                  onChange={(e) => setYeniSifre2(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>

              {sifreHata && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-rose-700 text-sm font-medium">{sifreHata}</p>
                </div>
              )}
              {sifreBasari && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-emerald-700 text-sm font-medium">✓ {sifreBasari}</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-stone-200 p-4 flex gap-2">
              <button
                onClick={() => setSifreModalOpen(false)}
                className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-lg font-semibold text-sm hover:bg-stone-200 transition"
              >
                İptal
              </button>
              <button
                onClick={sifreDegistir}
                disabled={sifreYukleniyor}
                className="flex-1 py-3 bg-stone-900 text-white rounded-lg font-semibold text-sm hover:bg-stone-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sifreYukleniyor ? <><Loader2 className="w-4 h-4 animate-spin" /> Güncelleniyor...</> : "Şifreyi Değiştir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MÜŞTERİ EKLE/DÜZENLE MODAL */}
      {musteriModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">
                {duzenlenenMusteri ? "Müşteri Düzenle" : "Yeni Müşteri"}
              </h2>
              <button onClick={() => { setMusteriModalOpen(false); setDuzenlenenMusteri(null); }} className="p-1 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Firma Adı</label>
                <input
                  type="text"
                  value={musteriForm.firma_adi}
                  onChange={(e) => setMusteriForm({ ...musteriForm, firma_adi: e.target.value })}
                  placeholder="Örn: X Kliniği"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Ödeme Tipi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setMusteriForm({ ...musteriForm, tip: "aylik" })}
                    className={`py-3 rounded-lg font-semibold text-sm transition ${musteriForm.tip === "aylik" ? "bg-indigo-500 text-white" : "bg-stone-100 text-stone-600"}`}>
                    Aylık Sabit
                  </button>
                  <button onClick={() => setMusteriForm({ ...musteriForm, tip: "proje" })}
                    className={`py-3 rounded-lg font-semibold text-sm transition ${musteriForm.tip === "proje" ? "bg-purple-500 text-white" : "bg-stone-100 text-stone-600"}`}>
                    Proje Bazlı
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
                  {musteriForm.tip === "aylik" ? "Aylık Ücret (₺)" : "Proje Bedeli (₺)"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={musteriForm.tutar}
                  onChange={(e) => setMusteriForm({ ...musteriForm, tutar: e.target.value })}
                  placeholder="0,00"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-xl font-bold text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
                  {musteriForm.tip === "aylik" ? "Sözleşme Başlangıç Tarihi" : "Proje Tarihi"}
                </label>
                <input
                  type="date"
                  value={musteriForm.baslangic_tarihi}
                  onChange={(e) => setMusteriForm({ ...musteriForm, baslangic_tarihi: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>

              {musteriForm.tip === "aylik" && (
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Her Ayın Kaçıncı Günü Ödenecek?</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={musteriForm.odeme_gunu}
                    onChange={(e) => setMusteriForm({ ...musteriForm, odeme_gunu: e.target.value })}
                    placeholder="Örn: 15"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">İş Tanımı (opsiyonel)</label>
                <textarea
                  value={musteriForm.is_tanimi}
                  onChange={(e) => setMusteriForm({ ...musteriForm, is_tanimi: e.target.value })}
                  placeholder="Örn: Aylık 20 reel, 10 story, 2 çekim, logo güncellemesi"
                  rows={3}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Şube</label>
                {giris && SUBE_KISITLI_ORTAKLAR[giris] ? (
                  <div className="px-4 py-3 bg-stone-100 rounded-lg text-sm text-stone-700 font-semibold">
                    {SUBE_KISITLI_ORTAKLAR[giris]} (sabit)
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {SUBELER.map((s) => (
                      <button key={s} onClick={() => setMusteriForm({ ...musteriForm, sehir: s })}
                        className={`py-3 rounded-lg font-semibold text-sm transition ${musteriForm.sehir === s ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">İletişim Kişisi (opsiyonel)</label>
                <input
                  type="text"
                  value={musteriForm.iletisim_kisi}
                  onChange={(e) => setMusteriForm({ ...musteriForm, iletisim_kisi: e.target.value })}
                  placeholder="Örn: Ahmet Bey"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Telefon (opsiyonel)</label>
                <input
                  type="tel"
                  value={musteriForm.iletisim_telefon}
                  onChange={(e) => setMusteriForm({ ...musteriForm, iletisim_telefon: e.target.value })}
                  placeholder="0555 555 5555"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Notlar (opsiyonel)</label>
                <textarea
                  value={musteriForm.notlar}
                  onChange={(e) => setMusteriForm({ ...musteriForm, notlar: e.target.value })}
                  placeholder="Önemli notlar, özel istekler..."
                  rows={2}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400 resize-none"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-stone-200 p-4 flex gap-2">
              <button onClick={() => { setMusteriModalOpen(false); setDuzenlenenMusteri(null); }} className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-lg font-semibold text-sm hover:bg-stone-200 transition">İptal</button>
              <button onClick={musteriKaydet} className="flex-1 py-3 bg-stone-900 text-white rounded-lg font-semibold text-sm hover:bg-stone-800 transition">
                {duzenlenenMusteri ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ÇALIŞAN EKLE/DÜZENLE MODAL */}
      {calisanModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">
                {duzenlenenCalisan ? "Çalışan Düzenle" : "Yeni Çalışan"}
              </h2>
              <button onClick={() => { setCalisanModalOpen(false); setDuzenlenenCalisan(null); }} className="p-1 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Ad Soyad</label>
                <input
                  type="text"
                  value={calisanForm.ad_soyad}
                  onChange={(e) => setCalisanForm({ ...calisanForm, ad_soyad: e.target.value })}
                  placeholder="Örn: Ferdi Dursun"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Pozisyon</label>
                <select
                  value={calisanForm.pozisyon}
                  onChange={(e) => setCalisanForm({ ...calisanForm, pozisyon: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                >
                  {POZISYONLAR.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Aylık Maaş (₺)</label>
                <input
                  type="number"
                  step="0.01"
                  value={calisanForm.maas}
                  onChange={(e) => setCalisanForm({ ...calisanForm, maas: e.target.value })}
                  placeholder="0,00"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-xl font-bold text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">İşe Başlangıç Tarihi</label>
                <input
                  type="date"
                  value={calisanForm.baslangic_tarihi}
                  onChange={(e) => setCalisanForm({ ...calisanForm, baslangic_tarihi: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Maaş Ödeme Günü (Her ayın kaçıncı günü?)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={calisanForm.odeme_gunu}
                  onChange={(e) => setCalisanForm({ ...calisanForm, odeme_gunu: e.target.value })}
                  placeholder="Örn: 5"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Şube</label>
                {giris && SUBE_KISITLI_ORTAKLAR[giris] ? (
                  <div className="px-4 py-3 bg-stone-100 rounded-lg text-sm text-stone-700 font-semibold">
                    {SUBE_KISITLI_ORTAKLAR[giris]} (sabit)
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {SUBELER.map((s) => (
                      <button key={s} onClick={() => setCalisanForm({ ...calisanForm, sehir: s })}
                        className={`py-3 rounded-lg font-semibold text-sm transition ${calisanForm.sehir === s ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Telefon (opsiyonel)</label>
                <input
                  type="tel"
                  value={calisanForm.telefon}
                  onChange={(e) => setCalisanForm({ ...calisanForm, telefon: e.target.value })}
                  placeholder="0555 555 5555"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">IBAN (opsiyonel)</label>
                <input
                  type="text"
                  value={calisanForm.iban}
                  onChange={(e) => setCalisanForm({ ...calisanForm, iban: e.target.value })}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Notlar (opsiyonel)</label>
                <textarea
                  value={calisanForm.notlar}
                  onChange={(e) => setCalisanForm({ ...calisanForm, notlar: e.target.value })}
                  placeholder="Önemli notlar..."
                  rows={2}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400 resize-none"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-stone-200 p-4 flex gap-2">
              <button onClick={() => { setCalisanModalOpen(false); setDuzenlenenCalisan(null); }} className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-lg font-semibold text-sm hover:bg-stone-200 transition">İptal</button>
              <button onClick={calisanKaydet} className="flex-1 py-3 bg-stone-900 text-white rounded-lg font-semibold text-sm hover:bg-stone-800 transition">
                {duzenlenenCalisan ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAAŞ ÖDEME MODAL */}
      {maasOdemeModalOpen && secilenMaasOdeme && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">Maaş Ödemesi Yap</h2>
              <button onClick={() => setMaasOdemeModalOpen(false)} className="p-1 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-stone-50 p-4 rounded-lg">
                <div className="text-xs text-stone-500 uppercase tracking-wider font-semibold mb-1">
                  {donemEtiket(secilenMaasOdeme.donem)}
                </div>
                <div className="text-sm text-stone-600">Maaş: <span className="font-bold">{formatTL(Number(secilenMaasOdeme.beklenen_tutar))}</span></div>
                <div className="text-sm text-stone-600">Şu ana kadar verilen: <span className="font-bold text-emerald-600">{formatTL(Number(secilenMaasOdeme.odenen_tutar))}</span></div>
                <div className="text-sm text-stone-600">Kalan borç: <span className="font-bold text-rose-600">{formatTL(Number(secilenMaasOdeme.beklenen_tutar) - Number(secilenMaasOdeme.odenen_tutar))}</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Ödenecek Tutar (₺)</label>
                <input
                  type="number"
                  step="0.01"
                  value={maasOdemeTutari}
                  onChange={(e) => setMaasOdemeTutari(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-xl font-bold focus:outline-none focus:border-stone-400"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setMaasOdemeTutari(String(Number(secilenMaasOdeme.beklenen_tutar) - Number(secilenMaasOdeme.odenen_tutar)))}
                    className="flex-1 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold hover:bg-stone-200">
                    Tamamı
                  </button>
                  <button onClick={() => setMaasOdemeTutari(String((Number(secilenMaasOdeme.beklenen_tutar) - Number(secilenMaasOdeme.odenen_tutar)) / 2))}
                    className="flex-1 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold hover:bg-stone-200">
                    Yarısı
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Ödeme Tarihi</label>
                <input
                  type="date"
                  value={maasOdemeTarihi}
                  onChange={(e) => setMaasOdemeTarihi(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Açıklama (opsiyonel)</label>
                <input
                  type="text"
                  value={maasOdemeAciklama}
                  onChange={(e) => setMaasOdemeAciklama(e.target.value)}
                  placeholder="Örn: Havale, Elden, Avans"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-stone-200 p-4 flex gap-2">
              <button onClick={() => setMaasOdemeModalOpen(false)} className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-lg font-semibold text-sm hover:bg-stone-200">İptal</button>
              <button onClick={maasOdemeKaydet} className="flex-1 py-3 bg-violet-600 text-white rounded-lg font-semibold text-sm hover:bg-violet-700">Ödemeyi Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* ÖDEME ALMA MODAL */}
      {odemeModalOpen && secilenOdeme && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">Ödeme Al</h2>
              <button onClick={() => setOdemeModalOpen(false)} className="p-1 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-stone-50 p-4 rounded-lg">
                <div className="text-xs text-stone-500 uppercase tracking-wider font-semibold mb-1">
                  {donemEtiket(secilenOdeme.donem)}
                </div>
                <div className="text-sm text-stone-600">Beklenen: <span className="font-bold">{formatTL(Number(secilenOdeme.beklenen_tutar))}</span></div>
                <div className="text-sm text-stone-600">Şu ana kadar ödenen: <span className="font-bold text-emerald-600">{formatTL(Number(secilenOdeme.odenen_tutar))}</span></div>
                <div className="text-sm text-stone-600">Kalan: <span className="font-bold text-rose-600">{formatTL(Number(secilenOdeme.beklenen_tutar) - Number(secilenOdeme.odenen_tutar))}</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Alınan Tutar (₺)</label>
                <input
                  type="number"
                  step="0.01"
                  value={odemeTutari}
                  onChange={(e) => setOdemeTutari(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-xl font-bold focus:outline-none focus:border-stone-400"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setOdemeTutari(String(Number(secilenOdeme.beklenen_tutar) - Number(secilenOdeme.odenen_tutar)))}
                    className="flex-1 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold hover:bg-stone-200">
                    Tamamı
                  </button>
                  <button onClick={() => setOdemeTutari(String((Number(secilenOdeme.beklenen_tutar) - Number(secilenOdeme.odenen_tutar)) / 2))}
                    className="flex-1 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold hover:bg-stone-200">
                    Yarısı
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Ödeme Tarihi</label>
                <input
                  type="date"
                  value={odemeTarihi}
                  onChange={(e) => setOdemeTarihi(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Açıklama (opsiyonel)</label>
                <input
                  type="text"
                  value={odemeAciklama}
                  onChange={(e) => setOdemeAciklama(e.target.value)}
                  placeholder="Örn: Havale - Ziraat Bankası"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-stone-200 p-4 flex gap-2">
              <button onClick={() => setOdemeModalOpen(false)} className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-lg font-semibold text-sm hover:bg-stone-200">İptal</button>
              <button onClick={odemeKaydet} className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700">Ödemeyi Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {buyukFoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setBuyukFoto(null)}
        >
          <button 
            onClick={() => setBuyukFoto(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img src={buyukFoto} alt="Fiş" className="max-w-full max-h-full object-contain rounded-lg" />
          <a 
            href={buyukFoto} 
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white text-stone-900 rounded-lg font-semibold text-sm hover:bg-stone-100"
          >
            Yeni sekmede aç
          </a>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

const SLIDES = [
  {
    title: "Belanja Segar, Diantar Cepat",
    subtitle: "Produk segar dari toko cabang terdekat dengan lokasi Anda.",
    gradient: "from-brand to-brand-dark",
  },
  {
    title: "Beli 1 Gratis 1",
    subtitle: "Promo mingguan untuk produk pilihan, cek halaman produk sekarang.",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    title: "Gratis Ongkir untuk Pelanggan Setia",
    subtitle: "Kumpulkan transaksi dan nikmati voucher gratis ongkos kirim.",
    gradient: "from-lime-500 to-green-600",
  },
];

export function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[index];

  return (
    <section className="relative overflow-hidden">
      <div className={`bg-gradient-to-br ${slide.gradient} px-4 py-14 text-white sm:py-20`}>
        <div className="mx-auto max-w-6xl">
          <h1 className="max-w-md text-3xl font-bold sm:text-4xl">{slide.title}</h1>
          <p className="mt-3 max-w-md text-white/90">{slide.subtitle}</p>
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 w-2 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

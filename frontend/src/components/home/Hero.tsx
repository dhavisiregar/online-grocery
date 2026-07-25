"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      <div
        key={slide.title}
        className={`animate-fade-in bg-linear-to-br ${slide.gradient} px-4 py-16 text-white sm:py-24`}
      >
        <div className="mx-auto max-w-6xl">
          <h1 className="max-w-lg text-3xl font-bold tracking-tight text-balance sm:text-5xl">{slide.title}</h1>
          <p className="mt-4 max-w-md text-base text-white/90 sm:text-lg">{slide.subtitle}</p>
          <Link
            href="/products"
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-dark shadow-soft-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
          >
            Belanja Sekarang <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

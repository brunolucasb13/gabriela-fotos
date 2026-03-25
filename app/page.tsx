import { Camera, Heart, Sparkles } from "lucide-react";

import { PhotoUploadForm } from "@/components/photo-upload-form";
import { EVENT_COPY } from "@/lib/constants";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-8 h-52 w-52 animate-float rounded-full bg-blush/55 blur-3xl" />
        <div className="absolute -right-16 top-28 h-52 w-52 animate-float rounded-full bg-champagne blur-3xl [animation-delay:180ms]" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-rose-100/70 blur-3xl" />
      </div>

      <section className="relative mx-auto w-full max-w-xl animate-fadeUp">
        <div className="glass-card mb-4 px-5 py-7 sm:px-8 sm:py-10">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-rose-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-700">
            <Sparkles className="h-3.5 w-3.5" />
            1 ano da Gabriela
          </p>

          <h1 className="font-display text-[2rem] leading-[1.12] text-ink sm:text-[2.6rem]">
            {EVENT_COPY.title}
          </h1>

          <p className="mt-4 text-pretty text-[1.02rem] leading-relaxed text-rose-900/85 sm:text-lg">
            {EVENT_COPY.subtitle}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-rose-700/90">
            <div className="rounded-2xl border border-rose-100 bg-rose-50/90 px-3 py-2">
              <p className="flex items-center gap-2 font-medium">
                <Camera className="h-4 w-4" />
                Até 10 fotos por envio
              </p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/90 px-3 py-2">
              <p className="flex items-center gap-2 font-medium">
                <Heart className="h-4 w-4" />
                Envio privado e seguro
              </p>
            </div>
          </div>
        </div>

        <PhotoUploadForm />

        <p className="mt-5 px-1 text-center text-sm text-rose-700/85">
          {EVENT_COPY.footerMessage}
        </p>
      </section>
    </main>
  );
}


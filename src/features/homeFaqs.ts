import { isGoogleSignInEnabled } from "../config/features";
import { escapeHtml } from "../utils/format";

interface FaqItem {
  id: string;
  featured?: boolean;
  requiresGoogleSignIn?: boolean;
  question: string;
  answer: string;
  answerLocalOnly?: string;
}

interface FaqCategory {
  id: string;
  name: string;
  nameLocalOnly?: string;
  faqs: FaqItem[];
}

interface FaqDataset {
  categories?: FaqCategory[];
}

/**
 * Hydrates the homepage FAQ list from /data/faqs.json when not already pre-rendered at build time.
 */
export async function initHomeFaqs(): Promise<void> {
  const container = document.getElementById("homeFaqList");
  if (!container || container.querySelector("details")) return;

  try {
    const res = await fetch("./data/faqs.json");
    if (!res.ok) return;
    const data = (await res.json()) as FaqDataset;
    const googleEnabled = isGoogleSignInEnabled();
    const allItems = (data.categories ?? [])
      .flatMap((cat) => cat.faqs)
      .filter((item) => googleEnabled || !item.requiresGoogleSignIn)
      .map((item) => ({
        ...item,
        answer: googleEnabled ? item.answer : item.answerLocalOnly ?? item.answer,
      }));
    const featured = allItems.filter((item) => item.featured);
    const homeItems = featured.length > 0 ? featured : allItems.slice(0, 5);
    if (homeItems.length === 0) return;

    container.innerHTML = homeItems
      .map(
        (item) => `
          <details id="home-faq-${escapeHtml(item.id)}" class="group bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 transition-all hover:border-slate-700 open:border-indigo-500/40">
            <summary class="flex items-center justify-between cursor-pointer font-semibold text-xs sm:text-sm text-slate-200 group-hover:text-white list-none select-none">
              <span>${escapeHtml(item.question)}</span>
              <svg class="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div class="mt-2 text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800/60">
              ${escapeHtml(item.answer)}
            </div>
          </details>
        `,
      )
      .join("");
  } catch {
    // Non-critical fallback when offline without pre-rendered HTML
  }
}

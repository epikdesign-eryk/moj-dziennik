"use client";

// Hook dodający „mobilne" zachowanie do poziomego kontenera scrollowanego na
// desktopie:
//   1. Kółko myszy (ruch pionowy) przewija kontener w poziomie.
//   2. Przeciąganie z wciśniętym lewym przyciskiem przesuwa zawartość — tak jak
//      palcem na ekranie dotykowym.
//
// Listener `wheel` musi być non-passive (żeby `preventDefault` zadziałał),
// dlatego rejestrujemy go ręcznie przez addEventListener zamiast onWheel.
//
// Zwraca `true`, gdy trwa przeciąganie (przydatne do zmiany kursora / select).

import { useEffect, useRef, useState, type RefObject } from "react";

/** Po przekroczeniu tylu px ruchu traktujemy gest jako przeciąganie, nie klik. */
const DRAG_THRESHOLD = 5;

export function useDragScroll(
  ref: RefObject<HTMLElement | null>,
): boolean {
  const [isDragging, setIsDragging] = useState(false);

  // Stan gestu trzymamy w ref, by nie wywoływać re-renderów przy każdym ruchu.
  const state = useRef({
    down: false,
    moved: false,
    startX: 0,
    startScroll: 0,
  });

  // Stan płynnej animacji kółka: docelowa pozycja + uchwyt klatki rAF.
  const anim = useRef({ target: 0, raf: 0 });

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;

    // --- Płynne dojeżdżanie do celu (lerp w pętli rAF) ------------------
    function step() {
      const node = ref.current;
      if (node === null) return;
      const current = node.scrollLeft;
      const diff = anim.current.target - current;
      // Blisko celu — kończymy, by uniknąć drgania na ostatnich pikselach.
      if (Math.abs(diff) < 0.5) {
        node.scrollLeft = anim.current.target;
        anim.current.raf = 0;
        return;
      }
      // 0.18 = „miękkość"; mniejsze = wolniej i gładziej, większe = ostrzej.
      node.scrollLeft = current + diff * 0.18;
      anim.current.raf = requestAnimationFrame(step);
    }

    // --- Kółko myszy: pion → poziom -------------------------------------
    function onWheel(e: WheelEvent) {
      const node = ref.current;
      if (node === null) return;
      // Gdy gest jest głównie poziomy (touchpad), zostawiamy natywne zachowanie.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      // Nie ma czego przewijać — nie blokujemy scrolla strony.
      if (node.scrollWidth <= node.clientWidth) return;
      e.preventDefault();

      const max = node.scrollWidth - node.clientWidth;
      // Gdy animacja nie trwa, startujemy od realnej pozycji (nie od starego celu).
      const base = anim.current.raf === 0 ? node.scrollLeft : anim.current.target;
      anim.current.target = Math.max(0, Math.min(max, base + e.deltaY));
      if (anim.current.raf === 0) {
        anim.current.raf = requestAnimationFrame(step);
      }
    }

    // --- Przeciąganie myszką --------------------------------------------
    function onPointerDown(e: PointerEvent) {
      // Tylko lewy przycisk myszy; dotyk/pen obsługuje natywny scroll.
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      const node = ref.current;
      if (node === null) return;
      // Przerywamy ewentualny dojazd kółka — przeciąganie ma priorytet.
      if (anim.current.raf !== 0) {
        cancelAnimationFrame(anim.current.raf);
        anim.current.raf = 0;
      }
      state.current = {
        down: true,
        moved: false,
        startX: e.clientX,
        startScroll: node.scrollLeft,
      };
    }

    function onPointerMove(e: PointerEvent) {
      const s = state.current;
      if (!s.down) return;
      const node = ref.current;
      if (node === null) return;
      const dx = e.clientX - s.startX;
      if (!s.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
      if (!s.moved) {
        s.moved = true;
        setIsDragging(true);
        // Przejmujemy wskaźnik, by ciągnąć także poza obszarem elementu.
        node.setPointerCapture?.(e.pointerId);
      }
      e.preventDefault();
      node.scrollLeft = s.startScroll - dx;
    }

    function endDrag() {
      const s = state.current;
      if (!s.down) return;
      s.down = false;
      if (s.moved) setIsDragging(false);
    }

    // Po przeciągnięciu blokujemy „klik", który inaczej wybrałby dzień.
    function onClickCapture(e: MouseEvent) {
      if (state.current.moved) {
        e.stopPropagation();
        e.preventDefault();
        state.current.moved = false;
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("click", onClickCapture, true);

    return () => {
      if (anim.current.raf !== 0) cancelAnimationFrame(anim.current.raf);
      anim.current.raf = 0;
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, [ref]);

  return isDragging;
}

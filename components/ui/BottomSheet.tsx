"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { ReactNode, useEffect } from "react";

export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dragControls = useDragControls();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-surface shadow-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
          >
            {/* Only this handle area can start a drag-to-dismiss gesture,
                so scrolling the content below never gets hijacked. */}
            <div
              className="flex shrink-0 cursor-grab justify-center bg-surface pt-3 pb-1 active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: "none" }}
            >
              <div className="h-1.5 w-10 rounded-full bg-line" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

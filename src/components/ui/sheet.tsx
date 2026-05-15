import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right" | "bottom";
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, side = "left", children, className }: SheetProps) {
  const variants = {
    left: {
      initial: { x: "-100%" },
      animate: { x: 0 },
      exit: { x: "-100%" },
      className: "left-0 top-0 h-full w-[300px]",
    },
    right: {
      initial: { x: "100%" },
      animate: { x: 0 },
      exit: { x: "100%" },
      className: "right-0 top-0 h-full w-[300px]",
    },
    bottom: {
      initial: { y: "100%" },
      animate: { y: 0 },
      exit: { y: "100%" },
      className: "bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl",
    },
  };

  const config = variants[side];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={config.initial}
            animate={config.animate}
            exit={config.exit}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn("fixed z-50 bg-white shadow-2xl", config.className, className)}
          >
            {side === "bottom" && (
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1.5 w-12 rounded-full bg-gray-300" />
              </div>
            )}
            {side !== "bottom" && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X size={20} />
              </button>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

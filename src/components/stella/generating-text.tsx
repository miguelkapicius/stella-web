"use client";

/**
 * @author: @dorian_baffier
 * @description: Shimmer Text
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { cn } from "@/lib/utils";
import { Text } from "lucide-react";
import { motion } from "motion/react";

interface Text_01Props {
  text: string;
  className?: string;
}

export default function GeneratingText({
  text = "Gerando resposta...",
  className,
}: Text_01Props) {
  return (
    <div className="flex items-center justify-center">
      <motion.div
        className="relative py-2 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className={cn(
            "text-2xl font-bold bg-gradient-to-r flex items-center gap-3 from-neutral-950 via-neutral-400 to-neutral-950 dark:from-white dark:via-neutral-600 dark:to-white bg-[length:200%_100%] bg-clip-text text-transparent",
            className
          )}
          animate={{
            backgroundPosition: ["200% center", "-200% center"],
          }}
          transition={{
            duration: 2.5,
            ease: "linear",
            repeat: Number.POSITIVE_INFINITY,
          }}
        >
          {text}
        </motion.h1>
      </motion.div>
    </div>
  );
}

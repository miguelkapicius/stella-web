/**
 * @author: @dorian_baffier
 * @description: Typewriter
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { motion, useAnimate } from "motion/react";
import React, { useEffect, useRef } from "react";

interface TypewriterSequence {
  text: string;
  deleteAfter?: boolean;
  pauseAfter?: number;
}

interface TypewriterTitleProps {
  sequences?: TypewriterSequence[];
  typingSpeed?: number;
  startDelay?: number;
  autoLoop?: boolean;
  loopDelay?: number;
}

function TypewriterTitle({
  sequences,
  typingSpeed = 10,
  startDelay = 500,
  autoLoop = false,
  loopDelay = 2000,
}: TypewriterTitleProps) {
  const [scope, animate] = useAnimate();
  const lastTextRef = useRef<string>("");

  useEffect(() => {
    if (!sequences || sequences.length === 0) return;

    const newText = sequences[0].text;

    // Se o texto não mudou, não reinicia a animação
    if (lastTextRef.current === newText) return;
    lastTextRef.current = newText;

    let isActive = true;

    const typeText = async () => {
      const titleElement = scope.current.querySelector("[data-typewriter]");
      if (!titleElement) return;

      // Reset da opacidade e texto
      await animate(scope.current, { opacity: 1 });
      titleElement.textContent = "";

      // Wait for initial delay on first run
      await new Promise((resolve) => setTimeout(resolve, startDelay));

      for (const sequence of sequences) {
        if (!isActive) break;

        // Type out the sequence text
        for (let i = 0; i < sequence.text.length; i++) {
          if (!isActive) break;
          titleElement.textContent = sequence.text.slice(0, i + 1);
          await new Promise((resolve) => setTimeout(resolve, typingSpeed));
        }

        if (sequence.pauseAfter) {
          await new Promise((resolve) =>
            setTimeout(resolve, sequence.pauseAfter)
          );
        }

        if (sequence.deleteAfter) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          for (let i = sequence.text.length; i > 0; i--) {
            if (!isActive) break;
            titleElement.textContent = sequence.text.slice(0, i);
            await new Promise((resolve) =>
              setTimeout(resolve, typingSpeed / 2)
            );
          }
        }
      }

      if (autoLoop && isActive) {
        await new Promise((resolve) => setTimeout(resolve, loopDelay));
        if (isActive) typeText();
      }
    };

    typeText();

    return () => {
      isActive = false;
    };
  }, [sequences, typingSpeed, startDelay, autoLoop, loopDelay, animate, scope]);

  return (
    <div className="relative w-full">
      <div className="relative z-10 flex flex-col" ref={scope}>
        <motion.div
          className="text-5xl bg-gradient-to-r from-stone-100/60 via-stone-100 to-stone-100/60 bg-clip-text text-transparent flex items-center gap-2 font-medium max-w-4xl text-center mx-auto leading-14"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span
            data-typewriter
            className="inline-block animate-cursor pr-1 tracking-tight py-2"
          >
            {sequences![0].text}
          </span>
        </motion.div>
      </div>
    </div>
  );
}

export const MemoTypewriterTitle = React.memo(TypewriterTitle);

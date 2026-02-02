'use client'

export const cardVariants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: (index: number) => ({
    scale: 1,
    opacity: 1,
    transition: {
      delay: index * 0.3,
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
    },
  }),
  hover: {
    scale: 1.05,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 10,
    },
  },
  tap: {
    scale: 0.95,
  },
  drag: {
    opacity: 0.8,
    scale: 1.05,
    zIndex: 1000,
  },
}

export const editModeButtonVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
    },
  },
  exit: {
    scale: 0,
    opacity: 0,
  },
}

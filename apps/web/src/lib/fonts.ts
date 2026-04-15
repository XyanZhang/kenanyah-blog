import localFont from 'next/font/local'

export const plusJakartaSans = localFont({
  src: '../assets/fonts/PlusJakartaSans.ttf',
  variable: '--font-sans',
  display: 'swap',
  weight: '200 800',
})

export const spaceGrotesk = localFont({
  src: '../assets/fonts/SpaceGrotesk.ttf',
  variable: '--font-display',
  display: 'swap',
  weight: '300 700',
})

export const nunito = localFont({
  src: '../assets/fonts/Nunito.ttf',
  variable: '--font-motto',
  display: 'swap',
  weight: '200 1000',
})

export const lxgwWenKaiTc = localFont({
  src: [
    {
      path: '../assets/fonts/LXGWWenKaiTC-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../assets/fonts/LXGWWenKaiTC-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-blog',
  display: 'swap',
})

export const cormorantGaramond = localFont({
  src: '../assets/fonts/CormorantGaramond.ttf',
  variable: '--font-pictures-serif',
  display: 'swap',
  weight: '300 700',
})

export const manrope = localFont({
  src: '../assets/fonts/Manrope.ttf',
  variable: '--font-pictures-sans',
  display: 'swap',
  weight: '200 800',
})

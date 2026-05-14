import localFont from 'next/font/local';

export const montserrat = localFont({
  src: [
    { path: '../../public/asserts/Montserrat-Regular.otf', weight: '400', style: 'normal' },
  ],
  display: 'swap',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
});

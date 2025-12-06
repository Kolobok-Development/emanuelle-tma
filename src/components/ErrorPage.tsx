'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset?: () => void
}) {
  const t = useTranslations();
  
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>{t('errors.unhandledError.title')}</h2>
      <blockquote>
        <code>
          {error.message}
        </code>
      </blockquote>
      {reset && <button onClick={() => reset()}>{t('errors.unhandledError.tryAgain')}</button>}
    </div>
  );
}
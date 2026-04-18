import { Suspense } from 'react';

import ReportClient from './ReportClient';

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="report-page">
          <div className="report-page-inner">
            <p>Loading…</p>
          </div>
        </div>
      }
    >
      <ReportClient />
    </Suspense>
  );
}

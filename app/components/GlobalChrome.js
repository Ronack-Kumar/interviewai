'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase';

export default function GlobalChrome() {
  const [toast, setToast] = useState({ msg: '', show: false, err: false });

  return (
    <>
      <div
        className={`global-toast ${toast.show ? 'show' : ''}`}
        role="status"
        style={
          toast.err ? { borderColor: 'var(--error)', color: 'var(--error)' } : undefined
        }
      >
        {toast.msg}
      </div>
    </>
  );
}

import { redirect } from 'next/navigation';

export default function ReportSessionRedirect({ params }) {
  const id = params?.sessionId;
  if (!id || typeof id !== 'string') {
    redirect('/');
  }
  redirect(`/report?session_id=${encodeURIComponent(id)}`);
}

import { Loader2, AlertTriangle, PackageSearch } from 'lucide-react';

export function LoadingState({ text = 'Загрузка…' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
      <p>{text}</p>
    </div>
  );
}

export function ErrorState({ text = 'Что-то пошло не так' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-rose-500">
      <AlertTriangle className="h-8 w-8" />
      <p>{text}</p>
    </div>
  );
}

export function EmptyState({ text = 'Ничего не найдено' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <PackageSearch className="h-10 w-10" />
      <p className="max-w-sm text-center">{text}</p>
    </div>
  );
}

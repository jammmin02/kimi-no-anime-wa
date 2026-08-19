'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { ja } from '@/lib/i18n/ja';
import type { LoginErrorResponse } from '@/lib/types/auth';

const MESSAGES = ja.auth.login;

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setGeneralError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        // セッション Cookie は fetch のレスポンスで発行済みだが、RootLayout(Navbar に
        // ログイン状態を渡すサーバーコンポーネント)はソフトナビゲーションだけでは
        // 再実行されないことがあるため、遷移後に明示的に refresh してヘッダーの
        // ログイン状態を最新化する。
        router.push('/mypage');
        router.refresh();
        return;
      }

      const data: LoginErrorResponse = await response
        .json()
        .catch(() => ({ error: 'invalidCredentials' }));
      setGeneralError(MESSAGES.errors[data.error] ?? MESSAGES.errors.generic);
    } catch {
      setGeneralError(MESSAGES.errors.generic);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{MESSAGES.title}</CardTitle>
        <CardDescription>{MESSAGES.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={MESSAGES.emailLabel} required>
            {(fieldId) => (
              <Input
                id={fieldId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                invalid={Boolean(generalError)}
                required
              />
            )}
          </FormField>

          <FormField label={MESSAGES.passwordLabel} required>
            {(fieldId) => (
              <Input
                id={fieldId}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                invalid={Boolean(generalError)}
                required
              />
            )}
          </FormField>

          {generalError && <p className="text-error text-sm">{generalError}</p>}

          <Button type="submit" isLoading={isSubmitting} className="mt-2">
            {isSubmitting ? MESSAGES.submitting : MESSAGES.submit}
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          {MESSAGES.signupPrompt}{' '}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            {MESSAGES.signupLink}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

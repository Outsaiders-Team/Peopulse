import { NextResponse } from 'next/server';
import type { ApiErrorBody } from './types';

export function apiError(status: number, detail: string) {
  return NextResponse.json<ApiErrorBody>({ detail }, { status });
}

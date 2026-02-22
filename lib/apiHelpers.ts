import { NextResponse } from 'next/server';

interface ErrorResponse {
  error: string;
  status: number;
}

export function handleError(error: any, message: string = 'Internal Server Error'): NextResponse<ErrorResponse> {
  console.error(message, error);
  return NextResponse.json(
    { error: message },
    { status: 500 }
  );
}

export function handleValidationError(message: string): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { error: message },
    { status: 400 }
  );
}

export function handleNotFound(message: string = 'Not found'): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { error: message },
    { status: 404 }
  );
}

export function handleUnauthorized(message: string = 'Unauthorized'): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

export function handleForbidden(message: string = 'Forbidden'): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}
